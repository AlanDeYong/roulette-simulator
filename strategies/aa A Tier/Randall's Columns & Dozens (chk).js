/**
 * Strategy: Randall's Strategy (Randall's Columns & Dozens)
 * Source: "Extremely Close Match! Raptor vs Randalls | Roulette Bracket Challenge"
 * YouTube Channel: The Roulette Factory (https://youtu.be/gEI26oRsIbM)
 *
 * The Full Logic in Detail:
 * - Position 1: 2nd Dozen (Numbers 13-24)
 * - Position 2: 2nd Column (Numbers 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35)
 * - Four overlapping jackpot numbers: 14, 17, 20, 23 (where both bets hit).
 *
 * The Full Bet Progression in Detail:
 * - Initial Bet: 1 unit on the 2nd Dozen and 1 unit on the 2nd Column.
 * - Full Loss (neither bet hits): Increase bet on both positions by 1 unit (+1 unit to Dozen, +1 unit to Column).
 * - Partial Hit (one bet hits, one misses):
 *     - If the payout achieves a new session high bankroll, reset back to base level (1 unit).
 *     - If still in a deficit relative to session high, hold bet level ("bets stay here") and spin again.
 * - Overlapping Hit (both bets hit):
 *     - If new session high is achieved, reset back to base level (1 unit).
 *     - Otherwise, continue at current level until recovering past the session peak.
 *
 * The Goal:
 * - Steadily accumulate profit via high-probability coverage and overlapping hits while recovering 
 *   drawdowns by stepping up 1 unit per total loss and resetting to base upon reaching a new session high.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and increment size for outside bets
    const unit = config.betLimits && config.betLimits.minOutside ? config.betLimits.minOutside : 5;
    const minIncrement = config.minIncrementalBet || 1;
    const increment = config.incrementMode === 'base' ? unit : minIncrement;

    // 2. Initialize persistent state variables
    if (state.currentMultiplier === undefined) {
        state.currentMultiplier = 1;
    }
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
    }
    if (state.lastBetAmount === undefined) {
        state.lastBetAmount = unit;
    }

    // 3. Process previous spin if history is available
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;

        // Check if winning number is in 2nd Dozen (13-24)
        const hitDozen = winningNumber >= 13 && winningNumber <= 24;

        // Check if winning number is in 2nd Column (2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35)
        const hitColumn = winningNumber > 0 && (winningNumber % 3 === 2);

        // Update session high if current bankroll made a new high
        if (bankroll > state.sessionHigh) {
            state.sessionHigh = bankroll;
            state.currentMultiplier = 1;
        } else if (bankroll >= state.sessionHigh) {
            // Reached break-even with session high
            state.currentMultiplier = 1;
        } else {
            // We are below session high
            if (!hitDozen && !hitColumn) {
                // Full loss: Increase progression by 1 increment
                state.currentMultiplier += (increment / unit);
            }
            // Partial win (one hit) or overlapping win that didn't reach session high:
            // Bet stays at the current level ("bets stay here") to continue recovery
        }
    } else {
        // First spin of the session
        state.sessionHigh = bankroll;
        state.currentMultiplier = 1;
    }

    // 4. Calculate and clamp bet amounts to table limits
    let betAmount = unit * state.currentMultiplier;

    // Clamp bet amount
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    state.lastBetAmount = betAmount;

    // 5. Return bet placements: 2nd Dozen and 2nd Column
    return [
        { type: 'dozen', value: 2, amount: betAmount },
        { type: 'column', value: 2, amount: betAmount }
    ];
}