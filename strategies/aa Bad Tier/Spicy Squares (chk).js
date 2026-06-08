/**
 * Strategy Name: Spicy Squares (Modified 5 to 6 Corners with Fixed Dual-Pattern Randomization)
 * YouTube Channel: CEG Dealer School
 * Source URL: https://youtu.be/4mDNDSYXnPw?si=jHHKvhYm2cBZu4Zw
 * * Detailed Strategy Logic:
 * 1. Base Setup:
 * The strategy chooses exactly one initial corner completely at random. Based on which master pattern 
 * that corner belongs to, it activates one of two strictly defined, column-alternating, non-overlapping templates:
 * - Pattern A: [1, 8, 13, 20, 25, 32]
 * - Pattern B: [2, 7, 14, 19, 26, 31]
 * * 2. Progression Levels (Steps):
 * - Step 1 ("Base Heat"): Bet 1 base unit on a random selection of 5 corners out of the 6 corners belonging to 
 * the activated pattern. If any corner wins, advance to Step 2. If it loses, repeat Step 1.
 * - Step 2 ("Starting to Cook"): Expand the layout to include all 6 corners of the selected pattern template. 
 * Take the net profit from Step 1, divide it by 5, and add that amount to all corners except the one that just 
 * won (which remains at the base minimum unit). If a corner wins at Step 2, advance to Step 3. If it loses, reset to Step 1.
 * - Step 3 ("Hellfire"): Maintain the 6-corner layout. Take the net profit from Step 2, divide it by 5, and distribute 
 * it evenly to the 5 non-winning corners. The corner that won in Step 2 remains at the base minimum unit. After Step 3 
 * completes, reset back to Step 1.
 * * 3. Peak Session Profit & Randomization Rule:
 * - Tracks the peak bankroll achieved during the session (`state.peakBankroll`).
 * - Whenever a new peak is hit or a loss occurs, it resets to Step 1 and picks a new random initial corner 
 * to generate a fresh pattern layout with a randomized 5-corner starting subset.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine baseline inside table minimum limit
    const minInsideBet = config.betLimits.min;

    // Predefined non-overlapping master tracks
    const patternA = [1, 8, 13, 20, 25, 32];
    const patternB = [2, 7, 14, 19, 26, 31];

    // Helper function to pick a pattern track and randomize which corner acts as the 6th expansion slot
    function generateConfiguredLayout() {
        const masterTrack = Math.random() < 0.5 ? patternA : patternB;
        
        // Clone and randomly shuffle to make sure the starting 5 and the 6th expansion element are completely randomized
        let shuffled = [...masterTrack];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Helper function to return the 4 numbers included in a corner identified by its top-left number
    function getCornerNumbers(topLeft) {
        return [topLeft, topLeft + 1, topLeft + 3, topLeft + 4];
    }

    // Helper utility to evaluate if a roulette spin result hit a specific corner
    function isCornerWinner(winningNumber, cornerTopLeft) {
        return getCornerNumbers(cornerTopLeft).includes(winningNumber);
    }

    // 2. Track Session Peak Profit and Initialize State
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
    }

    // Reset layout tracking if peak session profit is achieved or exceeded
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
        state.currentStep = 1;
        state.activeCorners = generateConfiguredLayout();
        state.previousBets = null;
    }

    // Run initial cycle generation setup if state variables do not exist
    if (!state.currentStep || !state.activeCorners) {
        state.currentStep = 1;
        state.activeCorners = generateConfiguredLayout();
        state.previousBets = null;
    }

    // 3. Process Spin Outcomes and Progression Updates
    if (spinHistory && spinHistory.length > 0 && state.previousBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        let winningCornerValue = null;
        let totalInvested = 0;
        let totalReturned = 0;

        // Compute exact net performance metrics based on previous betting choices
        for (const cornerVal in state.previousBets) {
            const betAmount = state.previousBets[cornerVal];
            totalInvested += betAmount;
            if (isCornerWinner(lastNum, parseInt(cornerVal))) {
                winningCornerValue = parseInt(cornerVal);
                totalReturned += betAmount * 9; 
            }
        }

        const netProfit = totalReturned - totalInvested;

        if (winningCornerValue !== null && netProfit > 0) {
            if (state.currentStep === 1) {
                state.currentStep = 2;
            } else if (state.currentStep === 2) {
                state.currentStep = 3;
            } else {
                // Step 3 cycle complete -> reset and roll a new configured tracks configuration
                state.currentStep = 1;
                state.activeCorners = generateConfiguredLayout();
            }
            state.lastWinningCorner = winningCornerValue;
            state.lastRoundProfit = netProfit;
        } else {
            // Loss or zero profit registered -> drop back to step 1 and pick a fresh layout tracking set
            state.currentStep = 1;
            state.activeCorners = generateConfiguredLayout();
            state.lastWinningCorner = null;
            state.lastRoundProfit = 0;
        }
    }

    // 4. Constructing Upcoming Betting Array Based on Current Step
    let instructions = [];
    let currentBetsTracker = {};

    const runtimeFive = state.activeCorners.slice(0, 5);
    const runtimeSix = state.activeCorners;

    if (state.currentStep === 1) {
        for (let i = 0; i < runtimeFive.length; i++) {
            let amount = minInsideBet;
            amount = Math.max(amount, config.betLimits.min);
            amount = Math.min(amount, config.betLimits.max);
            
            instructions.push({
                type: 'corner',
                value: runtimeFive[i],
                amount: amount
            });
            currentBetsTracker[runtimeFive[i]] = amount;
        }
    } 
    else if (state.currentStep === 2) {
        const profitShare = state.lastRoundProfit / 5;

        for (let i = 0; i < runtimeSix.length; i++) {
            let amount = minInsideBet;
            
            if (runtimeSix[i] !== state.lastWinningCorner) {
                amount += profitShare; 
            }

            amount = Math.max(amount, config.betLimits.min);
            amount = Math.min(amount, config.betLimits.max);

            instructions.push({
                type: 'corner',
                value: runtimeSix[i],
                amount: amount
            });
            currentBetsTracker[runtimeSix[i]] = amount;
        }
    } 
    else if (state.currentStep === 3) {
        const profitShare = state.lastRoundProfit / 5;

        for (let i = 0; i < runtimeSix.length; i++) {
            let amount = minInsideBet;
            
            if (runtimeSix[i] !== state.lastWinningCorner) {
                amount += profitShare; 
            }

            amount = Math.max(amount, config.betLimits.min);
            amount = Math.min(amount, config.betLimits.max);

            instructions.push({
                type: 'corner',
                value: runtimeSix[i],
                amount: amount
            });
            currentBetsTracker[runtimeSix[i]] = amount;
        }
    }

    // Save accurate record of current stakes to state for exact net profit calculation on the next spin
    state.previousBets = currentBetsTracker;

    return instructions;
}