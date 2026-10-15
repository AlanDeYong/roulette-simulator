/**
 * ROULETTE STRATEGY: Roulette Jackpot
 * 
 * Source: https://youtu.be/E5DLtC33HA8 (Gamblers University)
 * 
 * The Full Logic in details: 
 * - The strategy bets on one Dozen and one Column simultaneously.
 * - Initial placement covers the 1st Dozen and 1st Column.
 * - The positions shift to the next Dozen and Column (e.g., 1st->2nd->3rd->1st) 
 *   ONLY when a new "session high" bankroll is achieved.
 * - If a new session high is not achieved, the bets remain on the current Dozen and Column.
 * 
 * The Full Bet Progression in details:
 * - Base bet starts at the table's minimum outside bet (or designated base unit) for EACH position.
 * - After EVERY spin where a new session high is NOT reached (whether it's a total loss or a partial win), 
 *   the bet size is increased by 1 incremental unit on both positions.
 * - When a new session high bankroll is reached, the bet sizes immediately reset back to the base unit.
 * 
 * The Goal: 
 * - To hit a "Jackpot number" (a number covered by BOTH the active Dozen and Column), resulting in a double win 
 *   that pushes the bankroll to a new session high and recovers all incremental losses.
 * - (Video goal: $20 profit on a $200 buy-in).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.minOutside;
    const increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);

    // 1. Initialize State on first run
    if (state.initialized === undefined) {
        state.initialized = true;
        state.sessionHigh = bankroll;
        state.currentBet = baseUnit;
        state.dozen = 1;
        state.column = 1;
        state.lastSpinCount = spinHistory.length;
    }

    // 2. Process Spin History
    if (spinHistory.length > 0 && state.lastSpinCount !== spinHistory.length) {
        if (bankroll > state.sessionHigh) {
            // Reached a new session high: Reset progression and shift positions
            state.sessionHigh = bankroll;
            state.currentBet = baseUnit;
            state.dozen = state.dozen === 3 ? 1 : state.dozen + 1;
            state.column = state.column === 3 ? 1 : state.column + 1;
        } else {
            // Did not reach a new session high: Increase bet on both positions
            state.currentBet += increment;
        }
        
        state.lastSpinCount = spinHistory.length;
    }

    // 3. Calculate amount and CLAMP TO LIMITS
    let amount = state.currentBet;
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 4. Ensure sufficient bankroll for both bets
    if (amount * 2 > bankroll) {
        amount = Math.floor(bankroll / 2); 
        if (amount < config.betLimits.minOutside) {
            return []; // Not enough funds to meet minimum table limits for two bets
        }
    }

    // 5. Return Bets
    return [
        { type: 'dozen', value: state.dozen, amount: amount },
        { type: 'column', value: state.column, amount: amount }
    ];
}