/**
 * Racetrack Roulette Strategy
 * Source: https://www.youtube.com/watch?v=kRl1f30T-e0&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=5
 * The Logic: Bets on the next 10 numbers counter-clockwise from the last hit number on a standard European wheel.
 * The Progression: 
 * - Initial bet: 1 base unit.
 * - First 4 losses: Increase by 1 base unit each time (1 -> 2 -> 3 -> 4 -> 5 units).
 * - Next 3 losses: Double up the previous bet amount (10 -> 20 -> 40 units).
 * - Reset: On any win, or after the 7th consecutive loss (to restart the sequence).
 * The Goal: Capitalize on wheel sectors/physical clusters while utilizing a mixed linear-then-aggressive martingale progression to recover losses.
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
        state.lastBetNumbers = [];
    }

    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNumber = lastResult.winningNumber;

    // Check win/loss to update progression
    if (state.lastBetNumbers.length > 0) {
        if (state.lastBetNumbers.includes(lastNumber)) {
            // Win - reset progression
            state.lossCount = 0;
        } else {
            // Loss - increment progression
            state.lossCount++;
        }
    }

    // Progression logic limit
    // Reset after 7th loss (bet 40 units) as the rule specifies "next 3 losses double up"
    if (state.lossCount > 7) {
        state.lossCount = 0;
    }

    // Determine current multiplier based on the loss count
    let multiplier = 1;
    if (state.lossCount <= 4) {
        multiplier = 1 + state.lossCount; // Results in 1, 2, 3, 4, 5
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

    // Find the last hit number on the wheel
    const startIndex = ccWheel.indexOf(lastNumber);
    if (startIndex === -1) return []; // Safety fallback

    const bets = [];
    const betNumbers = [];

    // Select the next 10 numbers counter-clockwise
    for (let i = 1; i <= 10; i++) {
        const nextIndex = (startIndex + i) % ccWheel.length;
        const targetNumber = ccWheel[nextIndex];

        betNumbers.push(targetNumber);
        bets.push({
            type: 'number',
            value: targetNumber,
            amount: amount
        });
    }

    // Store selected numbers in state for the next spin's win/loss check
    state.lastBetNumbers = betNumbers;

    return bets;
}