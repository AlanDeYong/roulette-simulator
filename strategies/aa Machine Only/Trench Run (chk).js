/**
 * SOURCE:
 * - URL: https://youtu.be/uMuDhTJbVcU?si=HQSvTNjJdL1Ne7yt
 * - YouTube Channel: The Lucky Felt
 * * STRATEGY LOGIC:
 * - Name: "The Trench Run" (The Flawless Expansion Trap) - Bayesian Markov Predictor with Peak Reset
 * - Concept: This is a positive progression strategy leveraging outside Dozens bets 
 * to guarantee a mathematical net profit on wins, which fully funds an expanding 
 * trap of straight-up inside numbers.
 * - Modifications:
 * 1. Advanced Predictive Analytics: Utilizes a first-order Markov Transition Matrix combined with a 
 * Laplace-smoothed Bayesian probability estimator. It dynamically tracks the exact conditional-probability 
 * array P(X_n | X_n-1) of which number is physically most likely to land next given the current pocket position.
 * 2. High-Water Mark Peak Reset: Tracks the absolute maximum bankroll achieved during the session. 
 * The moment the *current* bankroll surpasses this tracking mark, profits are officially locked in, 
 * the inside progression state is cleanly wiped out, and the game resets safely back to base units.
 * - Trigger conditions: 
 * - Active every spin.
 * - On Loss: Flat bet the current state (no increase in amounts).
 * - On Win: Expand dozens coverage and add/increase an inside straight-up number based on maximum matrix score.
 * * BET PROGRESSION:
 * - Initial Setup / Post-Peak Reset:
 * - 3 units on the 1st Dozen.
 * - 3 units on the 2nd Dozen.
 * - Inside trap array completely cleared.
 * - On Loss: 
 * - Rebet the exact same setup and amounts (Flat bet losses).
 * - On Win:
 * - Add 1 unit to the 1st Dozen bet.
 * - Add 1 unit to the 2nd Dozen bet.
 * - Select an inside straight-up number based on the highest first-order conditional probability score.
 * * THE GOAL:
 * - Target Profit: 20% of the starting bankroll.
 * - Stop-Loss: Complete bankroll depletion or inability to satisfy minimal bet lines.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Target Tracking & High-Water Mark Setup
    if (state.targetProfit === undefined) {
        state.targetProfit = bankroll + (config.startingBankroll * 0.20);
    }

    if (bankroll >= state.targetProfit) {
        return null; 
    }

    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
    }

    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;

    // Physical wheel layouts for neighborhood calculations
    const euroWheel = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    const amerWheel = [0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, 100, 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2]; // 100 represents 00

    const activeWheel = config.tableType === 'american' ? amerWheel : euroWheel;
    const totalPockets = activeWheel.length;

    // Separate baseline helper to clear progression variables clean without dropping historical predictive data
    const resetProgression = () => {
        state.dozen1Units = 3;
        state.dozen2Units = 3;
        state.insideTrap = {};
    };

    // 2. State Initialization & Peak Detection Routing
    if (!state.initialized) {
        resetProgression();
        // Keep the transition matrix persistent throughout the runtime so it doesn't forget trends on reset
        state.transitionMatrix = Array.from({ length: totalPockets }, () => new Array(totalPockets).fill(0));
        state.initialized = true;
    } 
    // FIXED ORDER OF EXECUTION: Process the incoming spin to record the matrix transition *before* wiping state via reset
    else if (spinHistory.length > 0) {
        if (spinHistory.length > 1) {
            let prevNum = spinHistory[spinHistory.length - 2].winningNumber;
            let currentNum = spinHistory[spinHistory.length - 1].winningNumber;

            if (prevNum === '00') prevNum = 100;
            if (currentNum === '00') currentNum = 100;

            const prevIdx = activeWheel.indexOf(prevNum);
            const currentIdx = activeWheel.indexOf(currentNum);

            if (prevIdx !== -1 && currentIdx !== -1) {
                state.transitionMatrix[prevIdx][currentIdx] += 1;
            }
        }

        // Check if a new all-time high water mark peak has been achieved by the last spin's payout
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll; 
            resetProgression(); 
        } else {
            // Process regular win progression tracking if bankroll is beneath or equal to current peak
            const lastSpin = spinHistory[spinHistory.length - 1];
            let lastNum = lastSpin.winningNumber;
            if (lastNum === '00') lastNum = 100;

            const hitDozen1 = (lastNum >= 1 && lastNum <= 12);
            const hitDozen2 = (lastNum >= 13 && lastNum <= 24);
            const hitInsideTrap = state.insideTrap[lastNum] !== undefined;

            if (hitDozen1 || hitDozen2 || hitInsideTrap) {
                state.dozen1Units += 1;
                state.dozen2Units += 1;

                let targetDozen = 1;
                if (hitDozen2 || (hitInsideTrap && lastNum >= 13 && lastNum <= 24)) {
                    targetDozen = 2;
                }

                const start = targetDozen === 1 ? 1 : 13;
                const end = targetDozen === 1 ? 12 : 24;

                let chosenNumber = null;
                let maxProbability = -1;
                const candidates = [];

                const currentWheelIdx = activeWheel.indexOf(lastNum);

                for (let i = start; i <= end; i++) {
                    const targetWheelIdx = activeWheel.indexOf(i);
                    if (targetWheelIdx === -1) continue;

                    let score = 0;
                    if (currentWheelIdx !== -1) {
                        const transitionsFromCurrent = state.transitionMatrix[currentWheelIdx].reduce((a, b) => a + b, 0);
                        const specificTransitionCount = state.transitionMatrix[currentWheelIdx][targetWheelIdx];
                        
                        // Laplace smoothed calculation model
                        score = (specificTransitionCount + 1) / (transitionsFromCurrent + totalPockets);
                    }

                    if (score > maxProbability) {
                        maxProbability = score;
                        candidates.length = 0;
                        candidates.push(i);
                    } else if (score === maxProbability) {
                        candidates.push(i);
                    }
                }

                if (candidates.length > 0) {
                    const randIndex = Math.floor(Math.random() * candidates.length);
                    chosenNumber = candidates[randIndex];
                } else {
                    chosenNumber = lastNum;
                }

                if (state.insideTrap[chosenNumber] !== undefined) {
                    const increment = config.incrementMode === 'base' ? 1 : (config.minIncrementalBet / minInside);
                    state.insideTrap[chosenNumber] += increment;
                } else {
                    state.insideTrap[chosenNumber] = 1;
                }
            }
        }
    }

    // 3. Build the Executable Bet Payload Array
    const bets = [];

    let d1Amount = minOutside * state.dozen1Units;
    d1Amount = Math.min(Math.max(d1Amount, minOutside), config.betLimits.max);
    bets.push({ type: 'dozen', value: 1, amount: d1Amount });

    let d2Amount = minOutside * state.dozen2Units;
    d2Amount = Math.min(Math.max(d2Amount, minOutside), config.betLimits.max);
    bets.push({ type: 'dozen', value: 2, amount: d2Amount });

    for (const [numberStr, units] of Object.entries(state.insideTrap)) {
        let targetNumber = parseInt(numberStr, 10);
        let insideAmount = minInside * units;
        insideAmount = Math.min(Math.max(insideAmount, minInside), config.betLimits.max);
        
        if (targetNumber === 100) {
            bets.push({ type: 'number', value: '00', amount: insideAmount });
        } else {
            bets.push({ type: 'number', value: targetNumber, amount: insideAmount });
        }
    }

    // 4. Financial Margin Check
    const totalBetCost = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBetCost > bankroll) {
        return null; 
    }

    return bets;
}