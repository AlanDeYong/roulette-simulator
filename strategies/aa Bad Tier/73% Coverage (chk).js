/**
 * Roulette Strategy: 73% Coverage Strategy ($1 Base Unit Progression - Updated)
 * 
 * Source:
 * - Video URL: https://youtu.be/qGrjukwTLhE
 * - Channel: Spin Till You Win Creator of Wheel Pulse Pro Max
 * 
 * The Full Logic in Details:
 * - Covers ~73% of the board using two Dozen bets (1st Dozen and 3rd Dozen) 
 *   plus two Double Street (Line) bets: Double Street 10-15 and Double Street 28-33.
 * - Bet Placements per Phase:
 *   1. Outside Bet: 1st 12 ('dozen', value: 1)
 *   2. Outside Bet: 3rd 12 ('dozen', value: 3)
 *   3. Inside Bet: Double Street 10-15 ('line', value: 10)
 *   4. Inside Bet: Double Street 28-33 ('line', value: 28)
 * 
 * The Full Bet Progression in Details:
 * - The strategy follows a 5-Level progression upon losses:
 *   - Level 1: 1st 12 = 4u, 3rd 12 = 4u, Line 10-15 = 2u, Line 28-33 = 1u (Total: 11 units)
 *   - Level 2: 1st 12 = 26u, 3rd 12 = 26u, Line 10-15 = 13u, Line 28-33 = 1u (Total: 66 units)
 *   - Level 3: 1st 12 = 158u, 3rd 12 = 158u, Line 10-15 = 79u, Line 28-33 = 1u (Total: 396 units)
 *   - Level 4: 1st 12 = 950u, 3rd 12 = 950u, Line 10-15 = 475u, Line 28-33 = 1u (Total: 2376 units)
 *   - Level 5: 1st 12 = 5702u, 3rd 12 = 5702u, Line 10-15 = 2851u, Line 28-33 = 1u (Total: 14256 units)
 * - Win Rule: On any net win, immediately reset back to Level 1.
 * - Loss Rule: On a net loss, advance to the next level (Level 1 -> 2 -> 3 -> 4 -> 5).
 *   If a loss occurs at Level 5, reset back to Level 1.
 * 
 * The Goal:
 * - Generate consistent wins covering 73% of outcomes and recover losses through progressive scaling.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize strategy state
    if (state.level === undefined) {
        state.level = 0; // 0-indexed (Level 1 = 0)
        state.previousBankroll = bankroll;
    }

    // 2. Evaluate previous spin outcome and adjust progression level
    if (spinHistory.length > 0) {
        const netChange = bankroll - state.previousBankroll;
        
        if (netChange > 0) {
            // Reset to Level 1 on win
            state.level = 0;
        } else if (netChange < 0) {
            // Advance level on loss
            state.level++;
            if (state.level >= 5) {
                state.level = 0;
            }
        }
    }
    state.previousBankroll = bankroll;

    // 3. Define Progression Schema
    const levels = [
        // Level 1 (11 units total)
        { dozen1: 4, dozen3: 4, line10: 2, line28: 1 },
        // Level 2 (66 units total)
        { dozen1: 26, dozen3: 26, line10: 13, line28: 1 },
        // Level 3 (396 units total)
        { dozen1: 158, dozen3: 158, line10: 79, line28: 1 },
        // Level 4 (2376 units total)
        { dozen1: 950, dozen3: 950, line10: 475, line28: 1 },
        // Level 5 (14256 units total)
        { dozen1: 5702, dozen3: 5702, line10: 2851, line28: 1 }
    ];

    const currentSchema = levels[state.level];

    // 4. Respect bet limits
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 1;
    const maxBet = config.betLimits.max || 500;

    function getBetAmount(units, isOutside) {
        const baseUnit = isOutside ? minOutside : minInside;
        const minLimit = isOutside ? minOutside : minInside;
        let amount = units * baseUnit;
        amount = Math.max(amount, minLimit);
        amount = Math.min(amount, maxBet);
        return amount;
    }

    // 5. Build and return bets array
    return [
        { type: 'dozen', value: 1, amount: getBetAmount(currentSchema.dozen1, true) },
        { type: 'dozen', value: 3, amount: getBetAmount(currentSchema.dozen3, true) },
        { type: 'line', value: 10, amount: getBetAmount(currentSchema.line10, false) },
        { type: 'line', value: 28, amount: getBetAmount(currentSchema.line28, false) }
    ];
}