/**
 * Perfect Pattern Roulette Strategy
 * Source: The Roulette Master (YouTube) - "THE ROULETTE PATTERN METHOD THAT BEATS RANDOM PLAY!"
 *
 * The Logic:
 * - The strategy utilizes a 7-unit weighted spread creating an overlap (4 units on a Target Dozen, 
 * 3 units on the 1st Column). Numbers where the Dozen and Column intersect are "jackpot" numbers.
 * - Target Selection alternates between two states after a sequence win:
 * 1. "Follow the Winner": Bets on the Dozen that hit on the most recent spin.
 * 2. "Longest Slept": Bets on the Dozen that has gone the longest without hitting.
 *
 * The Progression:
 * - Employs a unique 3-step loss recovery sequence:
 * - Loss 1: Increase bet multiplier by 1 (+1).
 * - Loss 2: Increase bet multiplier by 1 (+1).
 * - Loss 3: Double the current multiplier (*2).
 * - Continues this (+1, +1, Double) cycle on prolonged losing streaks.
 * - Reset multiplier to 1 after a win.
 *
 * The Goal:
 * - Systematically grind out session profits while utilizing the overlap to capture larger 
 * payouts, relying on the aggressive 3-step multiplier to recover from variance.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State variables on the first spin
    if (!state.initialized) {
        state.targetMode = 'follow'; // Toggles between 'follow' and 'longest'
        state.lossCount = 0;
        state.multiplier = 1;
        state.dozenSleepTimer = { 1: 0, 2: 0, 3: 0 }; 
        state.lastTargetDozen = 1; // Default starting dozen
        state.initialized = true;
    }

    const baseUnit = config.betLimits.minOutside;

    // 2. Process the previous spin result (if available)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Determine the dozen of the last spin
        let lastDozen = 0;
        if (lastNum >= 1 && lastNum <= 12) lastDozen = 1;
        else if (lastNum >= 13 && lastNum <= 24) lastDozen = 2;
        else if (lastNum >= 25 && lastNum <= 36) lastDozen = 3;

        // Update Sleep Timers
        for (let d = 1; d <= 3; d++) {
            if (d === lastDozen) {
                state.dozenSleepTimer[d] = 0;
            } else {
                state.dozenSleepTimer[d]++;
            }
        }

        // Determine if our last bet was a winner (Checking if the Target Dozen or 1st Column hit)
        // A win in either is considered a hit for progression purposes in this overlap system
        let isWin = false;
        if (lastDozen === state.lastTargetDozen && lastDozen !== 0) isWin = true;
        
        // Column 1 contains numbers: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
        if (lastNum !== 0 && lastNum !== '00' && (lastNum - 1) % 3 === 0) {
            isWin = true;
        }

        // Apply Progression Logic
        if (isWin) {
            state.lossCount = 0;
            state.multiplier = 1;
            // Toggle the mode after a win
            state.targetMode = (state.targetMode === 'follow') ? 'longest' : 'follow';
        } else {
            state.lossCount++;
            // The 3-step ladder: +1, +1, Double
            if (state.lossCount % 3 === 0) {
                state.multiplier *= 2;
            } else {
                state.multiplier += 1;
            }
        }

        // Calculate Next Target Dozen
        if (state.targetMode === 'follow') {
            // Follow the winner. If a zero hit, stick to the last known target.
            if (lastDozen !== 0) {
                state.lastTargetDozen = lastDozen;
            }
        } else {
            // Find the longest slept dozen
            let maxSleep = -1;
            let longestSleptDozen = state.lastTargetDozen;
            for (let d = 1; d <= 3; d++) {
                if (state.dozenSleepTimer[d] > maxSleep) {
                    maxSleep = state.dozenSleepTimer[d];
                    longestSleptDozen = d;
                }
            }
            state.lastTargetDozen = longestSleptDozen;
        }
    }

    // 3. Calculate Bet Amounts
    // Distributing the "7 unit" ratio (4 on Dozen, 3 on Column)
    let dozenAmount = Math.floor(4 * baseUnit * state.multiplier);
    let columnAmount = Math.floor(3 * baseUnit * state.multiplier);

    // 4. Clamp to Config Limits
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    columnAmount = Math.max(columnAmount, config.betLimits.minOutside);
    columnAmount = Math.min(columnAmount, config.betLimits.max);

    // Stop betting if bankroll cannot cover the minimum spread
    if (bankroll < (dozenAmount + columnAmount)) {
        return []; 
    }

    // 5. Return the overlapping spread
    return [
        { type: 'dozen', value: state.lastTargetDozen, amount: dozenAmount },
        { type: 'column', value: 1, amount: columnAmount }
    ];
}