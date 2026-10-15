/**
 * Racetrack Roulette Strategy (Counter-Clockwise, Locked Numbers on Loss)
 * Source: Adapted from https://www.youtube.com/watch?v=kRl1f30T-e0&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=5
 * The Logic: Bets on 10 numbers *counter-clockwise* from the last hit. 
 * - CRITICAL CHANGE: If a bet loses, the same 10 numbers are bet again. New numbers are ONLY calculated on a reset (a win, or max loss limit reached).
 * The Progression: 
 * - Initial bet: 1 base unit.
 * - First 4 losses: Increase by 1 base unit each time (1 -> 2 -> 3 -> 4 -> 5 units).
 * - Next 3 losses: Double up the previous bet amount (10 -> 20 -> 40 units).
 * - Reset: On any win, or after the 7th consecutive loss.
 * The Goal: Target a static counter-clockwise wheel sector over an 8-spin window, relying on the linear/aggressive martingale to recover losses before resetting.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Wait for at least one spin to determine the starting point
    if (!spinHistory || spinHistory.length === 0) {
        return [];
    }

    const unit = config.betLimits.min;

    // Counter-clockwise layout of a standard European single-zero wheel
    const ccWheel = [
        0, 26, 3, 35, 12, 28, 7, 29, 18, 22, 9, 31, 14, 20, 1, 33, 16, 
        24, 5, 10, 23, 8, 30, 11, 36, 13, 27, 6, 34, 17, 25, 2, 21, 4, 19, 15, 32
    ];

    // Initialize state
    if (typeof state.lossCount === 'undefined') {
        state.lossCount = 0;
        state.lockedNumbers = []; // Store the 10 numbers we are currently tracking
    }

    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNumber = lastResult.winningNumber;
    let needsNewNumbers = false;

    // Evaluate the previous spin to update progression and check for resets
    if (state.lockedNumbers.length > 0) {
        if (state.lockedNumbers.includes(lastNumber)) {
            // Win - reset progression and trigger calculation of a new sector
            state.lossCount = 0;
            needsNewNumbers = true;
        } else {
            // Loss - increment progression, keep targeting the same sector
            state.lossCount++;
        }
    } else {
        // First time placing bets - we must pick numbers
        needsNewNumbers = true;
    }

    // Hard reset after 7th loss (which was a 40-unit bet per number)
    if (state.lossCount > 7) {
        state.lossCount = 0;
        needsNewNumbers = true; // Cycle over, pick new numbers based on the latest hit
    }

    // Determine current multiplier based on the progression rules
    let multiplier = 1;
    if (state.lossCount <= 4) {
        multiplier = 1 + state.lossCount; // Scales linearly: 1, 2, 3, 4, 5
    } else if (state.lossCount === 5) {
        multiplier = 10;
    } else if (state.lossCount === 6) {
        multiplier = 20;
    } else if (state.lossCount === 7) {
        multiplier = 40;
    }

    // Calculate and clamp the bet amount
    let amount = unit * multiplier;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // If a reset occurred, calculate the new 10 counter-clockwise numbers
    if (needsNewNumbers) {
        const startIndex = ccWheel.indexOf(lastNumber);
        if (startIndex === -1) return []; // Fallback for invalid wheel hit

        const newNumbers = [];
        for (let i = 1; i <= 10; i++) {
            const nextIndex = (startIndex + i) % ccWheel.length;
            newNumbers.push(ccWheel[nextIndex]);
        }
        // Save the newly calculated numbers to state
        state.lockedNumbers = newNumbers;
    }

    // Generate the bets using the locked numbers
    const bets = [];
    for (let i = 0; i < state.lockedNumbers.length; i++) {
        bets.push({
            type: 'number',
            value: state.lockedNumbers[i],
            amount: amount
        });
    }

    return bets;
}