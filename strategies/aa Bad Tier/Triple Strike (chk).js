/**
 * Strategy Name: Triple Strike Roulette Strategy
 * Source: https://youtu.be/l7stfwuXKAU (The Roulette Master)
 *
 * Description:
 * The Triple Strike strategy is a high-coverage system designed by Jeffrey Eisenberg. 
 * It targets 29 numbers on the table layout, focusing heavily on the 2nd and 3rd columns, 
 * with dedicated hedges on the 31-36 Double Street and the Zero pocket to insulate against 
 * misses in the 1st column.
 *
 * Full Logic Details:
 * - A bet is placed on every single spin unconditionally.
 * - The strategy covers 29 numbers using 7 specific position bets:
 *   1. Corner covering 2, 3, 5, 6
 *   2. Corner covering 8, 9, 11, 12
 *   3. Corner covering 14, 15, 17, 18
 *   4. Corner covering 20, 21, 23, 24
 *   5. Corner covering 26, 27, 29, 30
 *   6. Double Street (Line) covering 31, 32, 33, 34, 35, 36
 *   7. Straight Up bet on number 0
 *
 * Full Bet Progression Details:
 * - Base Unit Bets: 
 *   Each of the 5 Corners receives 5 units.
 *   The Double Street receives 6 units.
 *   The Zero Straight Up position receives 1 unit.
 * - Progression Element:
 *   The strategy maintains a flat multiplier level across spins. Wins do not alter the level.
 *   If the strategy registers 3 consecutive losses (3 strikes), the progression multiplier doubles,
 *   multiplying all position values, and the strike count resets. 
 *   Upon hitting any covered winning number, the multiplier resets back to level 1.
 *
 * Goal:
 * - Target Profit: Target window of $500.
 * - Stop Loss: Protected by a $2,000 session bankroll rule built into the design.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Configurations
    if (!state.multiplier) {
        state.multiplier = 1;
    }
    if (state.consecutiveLosses === undefined) {
        state.consecutiveLosses = 0;
    }

    // Explicit covered numbers based on the strategy grid positions
    const coveredNumbers = [
        0,
        2, 3, 5, 6,
        8, 9, 11, 12,
        14, 15, 17, 18,
        20, 21, 23, 24,
        26, 27, 29, 30,
        31, 32, 33, 34, 35, 36
    ];

    // 2. Process History and Update Progression Mechanics
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastWinningNumber = lastResult.winningNumber;

        if (coveredNumbers.includes(lastWinningNumber)) {
            // Hit occurred -> Reset progression tracks entirely
            state.multiplier = 1;
            state.consecutiveLosses = 0;
        } else {
            // Miss occurred -> Track strike progression
            state.consecutiveLosses += 1;
            if (state.consecutiveLosses >= 3) {
                state.multiplier *= 2; 
                state.consecutiveLosses = 0; // Clear the strike counter bucket
            }
        }
    }

    // 3. Calculate Base Multipliers and Apply Dynamic Level Progression
    let cornerBetAmount = 5 * state.multiplier;
    let lineBetAmount = 6 * state.multiplier;
    let zeroBetAmount = 1 * state.multiplier;

    // Clamp calculated individual position amounts strictly to table boundaries
    cornerBetAmount = Math.max(Math.min(cornerBetAmount, config.betLimits.max), config.betLimits.minOutside);
    lineBetAmount = Math.max(Math.min(lineBetAmount, config.betLimits.max), config.betLimits.minOutside);
    zeroBetAmount = Math.max(Math.min(zeroBetAmount, config.betLimits.max), config.betLimits.min);

    // 4. Return Strategy Layout Map Configurations
    return [
        { type: 'corner', value: 2, amount: cornerBetAmount },
        { type: 'corner', value: 8, amount: cornerBetAmount },
        { type: 'corner', value: 14, amount: cornerBetAmount },
        { type: 'corner', value: 20, amount: cornerBetAmount },
        { type: 'corner', value: 26, amount: cornerBetAmount },
        { type: 'line', value: 31, amount: lineBetAmount },
        { type: 'number', value: 0, amount: zeroBetAmount }
    ];
}