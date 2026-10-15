/**
 * Racetrack Roulette Strategy (Clockwise Variant)
 * Source: Adapted from https://www.youtube.com/watch?v=kRl1f30T-e0&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=5
 * The Logic: Bets on the next 10 numbers *clockwise* from the last hit number on a standard European wheel.
 * The Progression: 
 * - Initial bet: 1 base unit.
 * - First 4 losses: Increase by 1 base unit each time (1 -> 2 -> 3 -> 4 -> 5 units).
 * - Next 3 losses: Double up the previous bet amount (10 -> 20 -> 40 units).
 * - Reset: On any win, or after the 7th consecutive loss (to restart the sequence).
 * The Goal: Capitalize on wheel sectors/physical clusters in the opposite direction, utilizing the same linear-then-aggressive martingale progression to recover losses.
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

    // Initialize state variables for tracking wins/losses and progression
    if (typeof state.lossCount === 'undefined') {
        state.lossCount = 0;
        state.lastBetNumbers = [];
    }

    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNumber = lastResult.winningNumber;

    // Evaluate the previous spin to update the progression
    if (state.lastBetNumbers.length > 0) {
        if (state.lastBetNumbers.includes(lastNumber)) {
            // Win - reset progression
            state.lossCount = 0;
        } else {
            // Loss - increment progression
            state.lossCount++;
        }
    }

    // Hard reset after 7th loss (betting 40 units per number)
    if (state.lossCount > 7) {
        state.lossCount = 0;
    }

    // Determine current multiplier based on the loss count rules
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

    // Calculate and clamp the bet amount to the defined table limits
    let amount = unit * multiplier;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // Locate the last hit number on the clockwise wheel array
    const startIndex = clockwiseWheel.indexOf(lastNumber);
    if (startIndex === -1) return []; // Fallback in case of unexpected input

    const bets = [];
    const betNumbers = [];

    // Select the next 10 numbers clockwise
    for (let i = 1; i <= 10; i++) {
        // Use modulo to wrap around the array if we pass the end
        const nextIndex = (startIndex + i) % clockwiseWheel.length;
        const targetNumber = clockwiseWheel[nextIndex];

        betNumbers.push(targetNumber);
        bets.push({
            type: 'number',
            value: targetNumber,
            amount: amount
        });
    }

    // Persist selected numbers in state to check for win/loss on the next spin
    state.lastBetNumbers = betNumbers;

    return bets;
}