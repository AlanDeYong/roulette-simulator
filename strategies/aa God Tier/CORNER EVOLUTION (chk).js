/**
 * Strategy: CORNER EVOLUTION
 * 
 * Source:
 * - YouTube Channel: Bet With Mo
 * - Video URL: https://youtu.be/N6xarJq0LNk
 * 
 * Full Logic Details:
 * - Triggers: Bets are placed on every spin based on the current progression level.
 * - Win/Loss Condition:
 *   - On a Loss: The strategy advances to the next level of the progression.
 *   - Order of Operations for Progression: 
 *     1. "Rebet" (carry over the exact bets from the previous level).
 *     2. Increase those existing bets by the specified unit amount.
 *     3. Add any new positional bets required for the new level.
 *   - On a Win: If the bankroll reaches or exceeds the session's peak profit, 
 *     the strategy resets to Level 1. If not, it maintains the current level ("rebet").
 * 
 * Full Bet Progression Details (Dynamically Built):
 * - Level 1: 1 unit each on Corner (1) and Line/Street (7).
 * - Level 2: Rebet L1, increase all by 1 unit.
 * - Level 3: Rebet L2, increase all by 2 units, then add Corner (13) and Corner (17) at 2 units each.
 * - Level 4: Rebet L3, increase all by 3 units, then add Line/Street (19) at 4 units.
 * - Level 5: Rebet L4, increase all by 4 units, then add Corner (25) at 7 units.
 * - Level 6: Rebet L5, increase all by 5 units. (True math yields 85 units total following strict rules).
 * - Level 7: Rebet L6, double all bets.
 * - Level 8: Rebet L7, double all bets.
 * 
 * The Goal:
 * - Secure incremental wins and reset progression upon reaching new session bankroll peaks.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;

    // 1. Initialize Persistent State
    if (!state.level) state.level = 1;
    if (!state.peakBankroll) state.peakBankroll = bankroll;

    // Update peak bankroll if current bankroll is higher
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Evaluate Last Spin Result to advance or reset
    if (spinHistory.length > 0) {
        const previousBankroll = state.lastBankroll || bankroll;
        
        if (bankroll >= state.peakBankroll) {
            // Reached session's peak profit -> Reset to Level 1
            state.level = 1;
        } else if (bankroll < previousBankroll) {
            // Loss -> Advance level
            state.level = Math.min(state.level + 1, 8);
        }
        // If it was a win but peak not reached, state.level remains unchanged ("rebet")
    }
    
    // Save current bankroll for the next spin comparison
    state.lastBankroll = bankroll;

    // 3. Dynamically Build the Progression ("Rebet -> Increase -> Add New")
    let currentBets = [];

    // Level 1 Base
    currentBets.push({ type: 'corner', value: 1, amount: 1 });
    currentBets.push({ type: 'line', value: 7, amount: 1 });

    if (state.level >= 2) {
        // Level 2: Rebet L1, increase existing by 1
        currentBets.forEach(b => b.amount += 1);
    }
    if (state.level >= 3) {
        // Level 3: Rebet L2, increase existing by 2, THEN add new
        currentBets.forEach(b => b.amount += 2);
        currentBets.push({ type: 'corner', value: 13, amount: 2 });
        currentBets.push({ type: 'corner', value: 17, amount: 2 });
    }
    if (state.level >= 4) {
        // Level 4: Rebet L3, increase existing by 3, THEN add new
        currentBets.forEach(b => b.amount += 3);
        currentBets.push({ type: 'line', value: 19, amount: 4 });
    }
    if (state.level >= 5) {
        // Level 5: Rebet L4, increase existing by 4, THEN add new
        currentBets.forEach(b => b.amount += 4);
        currentBets.push({ type: 'corner', value: 25, amount: 7 });
    }
    if (state.level >= 6) {
        // Level 6: Rebet L5, increase existing by 5
        currentBets.forEach(b => b.amount += 5);
    }
    if (state.level >= 7) {
        // Level 7: Rebet L6, double all existing bets
        currentBets.forEach(b => b.amount *= 2);
    }
    if (state.level >= 8) {
        // Level 8: Rebet L7, double all existing bets
        currentBets.forEach(b => b.amount *= 2);
    }

    // 4. Apply Table Limits and Formatting
    const finalBets = currentBets.map(bet => {
        let amt = bet.amount * unit;
        
        // Clamp to table limits
        amt = Math.max(amt, config.betLimits.min);
        amt = Math.min(amt, config.betLimits.max);

        return {
            type: bet.type,
            value: bet.value,
            amount: amt
        };
    });

    return finalBets;
}