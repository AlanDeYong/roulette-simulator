/**
 * ============================================================================
 * Strategy: Joe's Four-Point Roulette System (1-3-2-6 Progression on Two Dozens)
 * Source: "HOW JOE MAKES A LIVING PLAYING ROULETTE!" by The Roulette Master
 * URL: https://youtu.be/D-UJBrkIY-E
 * ============================================================================
 * 
 * 1. THE FULL LOGIC IN DETAIL:
 *    - Bet Locations: Always placed simultaneously on the 1st Dozen (1-12) 
 *      and the 3rd Dozen (25-36).
 *    - Covering 24 out of 37 numbers (European) gives a ~64.86% win rate per spin.
 *    - A spin is a WIN if the winning number lands in 1-12 or 25-36.
 *    - A spin is a LOSS if the winning number lands in 13-24 (2nd Dozen), 0, or 00.
 *
 * 2. THE FULL BET PROGRESSION IN DETAIL:
 *    - Sequence Multipliers: [1x, 3x, 2x, 6x] of the current base unit.
 *    - Base Unit: Starts at the minimum outside bet (`config.betLimits.minOutside`).
 *    - On WIN:
 *        * If at step 1 (1x): Advance to step 2 (3x base unit).
 *        * If at step 2 (3x): Advance to step 3 (2x base unit).
 *        * If at step 3 (2x): Advance to step 4 (6x base unit).
 *        * If at step 4 (6x): Cycle complete! Reset the base unit back to the 
 *          initial minimum outside bet and restart at step 1 (1x).
 *    - On LOSS (at ANY step):
 *        * The 1-3-2-6 sequence is broken.
 *        * Increase the base unit by 1 unit step (or config.minIncrementalBet).
 *        * Reset the sequence pointer back to step 1 (1x of the new base unit).
 *
 * 3. THE GOAL & STOP CONDITIONS:
 *    - Target Profit: Complete full 4-win streaks (1-3-2-6) multiple times.
 *    - Stop Loss: Cease betting if the bankroll cannot cover the minimum required bet.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minOutside = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;
    const unitStep = config.minIncrementalBet || minOutside;

    // Multiplier progression for the 4-point system (1-3-2-6)
    const MULTIPLIERS = [1, 3, 2, 6];

    // Initialize persistent state
    if (state.baseUnit === undefined) {
        state.baseUnit = minOutside;
        state.stepIndex = 0; // index 0 = 1x, 1 = 3x, 2 = 2x, 3 = 6x
    }

    // Process previous spin outcome if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Check if last spin was a win on 1st Dozen (1-12) or 3rd Dozen (25-36)
        const won = (lastNum >= 1 && lastNum <= 12) || (lastNum >= 25 && lastNum <= 36);

        if (won) {
            if (state.stepIndex >= MULTIPLIERS.length - 1) {
                // Completed the full 4-point cycle (1-3-2-6)
                state.baseUnit = minOutside;
                state.stepIndex = 0;
            } else {
                // Advance to the next point in the 1-3-2-6 sequence
                state.stepIndex++;
            }
        } else {
            // Loss at any point in the sequence:
            // Increase base unit by 1 step and reset to step 0 (1x)
            state.baseUnit += unitStep;
            state.stepIndex = 0;
        }
    }

    // Calculate current bet amount per dozen
    const multiplier = MULTIPLIERS[state.stepIndex];
    let amountPerDozen = state.baseUnit * multiplier;

    // Clamp bet amount to table limits
    amountPerDozen = Math.max(amountPerDozen, minOutside);
    amountPerDozen = Math.min(amountPerDozen, maxBet);

    // Ensure bankroll is sufficient for both dozen bets
    const totalRequired = amountPerDozen * 2;
    if (bankroll < totalRequired) {
        // If bankroll cannot afford standard bet, try betting whatever is left equally
        const affordableAmount = Math.floor(bankroll / 2);
        if (affordableAmount < minOutside) {
            return []; // Stop betting if unable to meet minimum table limits
        }
        amountPerDozen = affordableAmount;
    }

    return [
        { type: 'dozen', value: 1, amount: amountPerDozen },
        { type: 'dozen', value: 3, amount: amountPerDozen }
    ];
}