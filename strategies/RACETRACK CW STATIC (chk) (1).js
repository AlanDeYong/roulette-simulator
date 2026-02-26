/**
 * Racetrack Roulette Strategy (Clockwise, Locked Numbers on Loss)
 * Source: Adapted from https://www.youtube.com/watch?v=kRl1f30T-e0&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=5
 * The Logic: Bets on 10 numbers *clockwise* from the last hit. 
 * - CRITICAL CHANGE: If a bet loses, the same 10 numbers are bet again. New numbers are ONLY calculated on a reset (a win, or max loss limit reached).
 * The Progression: 
 * - Initial bet: 1 base unit.
 * - First 4 losses: Increase by 1 base unit each time (1 -> 2 -> 3 -> 4 -> 5 units).
 * - Next 3 losses: Double up the previous bet amount (10 -> 20 -> 40 units).
 * - Reset: On any win, or after the 7th consecutive loss.
 * The Goal: Capitalize on a specific wheel sector hitting within an 8-spin window, using a linear-then-aggressive martingale progression.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Wait for at least one spin to determine the starting point
    if (!spinHistory || spinHistory.length === 0) {
        return [];
    }

    const unit = config.betLimits.min;

    // Clockwise layout of a standard European single-zero wheel (Reading right from 0)
    const clockwiseWheel = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 
        23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];

    // Initialize state
    if (typeof state.lossCount === 'undefined') {
        state.lossCount = 0;
        state.lockedNumbers = []; // Store the numbers we are currently betting on
    }

    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNumber = lastResult.winningNumber;
    let needsNewNumbers = false;

    // Evaluate the previous spin to update progression and trigger resets
    if (state.lockedNumbers.length > 0) {
        if (state.lockedNumbers.includes(lastNumber)) {
            // Win - reset progression and trigger new number selection
            state.lossCount = 0;
            needsNewNumbers = true;
        } else {
            // Loss - increment progression, keep the same numbers
            state.lossCount++;
        }
    } else {
        // First time betting - we need to pick numbers
        needsNewNumbers = true;
    }

    // Hard reset after 7th loss (betting 40 units per number)
    if (state.lossCount > 7) {
        state.lossCount = 0;
        needsNewNumbers = true; // Max loss reached, pick new numbers based on the latest hit
    }

    // Determine current multiplier based on the loss count
    let multiplier = 1;
    if (state.lossCount <= 4) {
        multiplier = 1 + state.lossCount; // Scales: 1, 2, 3, 4, 5
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

    // If a reset occurred, calculate the new 10 clockwise numbers
    if (needsNewNumbers) {
        const startIndex = clockwiseWheel.indexOf(lastNumber);
        if (startIndex === -1) return []; // Fallback

        const newNumbers = [];
        for (let i = 1; i <= 10; i++) {
            const nextIndex = (startIndex + i) % clockwiseWheel.length;
            newNumbers.push(clockwiseWheel[nextIndex]);
        }
        // Save the new numbers to state
        state.lockedNumbers = newNumbers;
    }

    // Generate the bets using the locked numbers (either newly calculated or held from previous spins)
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