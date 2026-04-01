/**
 * THE TRIFECTA ROULETTE STRATEGY
 * * Source: Roulette Strategy Lab
 * Channel: Roulette Strategy Lab (Terry)
 * URL: https://www.youtube.com/watch?v=MqHdCXQXNPM
 * * THE LOGIC:
 * This is a high-coverage strategy (covering 28/37 or 28/38 numbers) that bets 
 * on the 1st Dozen, 2nd Dozen, and the 2nd Column simultaneously.
 * - Coverage: ~75% of the board.
 * - "Jackpot" Numbers: 2, 5, 8, 11, 14, 17, 20, 23 (These are in Dozen 1/2 AND Column 2).
 * - Standard Wins: 1st or 2nd Dozen numbers outside the 2nd Column.
 * - Losses: 0, 00, and numbers 25-36 that are not in the 2nd Column.
 * * THE PROGRESSION:
 * 1. Base Ratio: 2:2:1 (e.g., $10 on Dozen 1, $10 on Dozen 2, $5 on Column 2).
 * 2. On a Net Loss spin: Increase the progression by 1 level (add the base units to each bet).
 * 3. On a Win spin (Standard or Jackpot): If session profit is not yet reached, STAY at the 
 * current elevated bet level. Do not decrease.
 * 4. Reset: Once the bankroll exceeds the session's starting bankroll (any net profit), 
 * reset all bets to the base level.
 * * THE GOAL:
 * To grind out consistent wins by covering most of the table and using a unit-add 
 * progression to recover from the high-cost losses.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.sessionStartBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // 2. Logic Check (Skip if it's the very first spin of the session)
    if (spinHistory.length > 0) {
        // RESET CONDITION: If we are in profit for the session, reset to Level 1
        if (bankroll > state.sessionStartBankroll) {
            state.level = 1;
            state.sessionStartBankroll = bankroll; // Update session start to lock in profit
        } 
        // INCREMENT CONDITION: If the last spin resulted in a net bankroll decrease
        else if (bankroll < state.lastBankroll) {
            state.level++;
        }
        // STAY CONDITION: If we won but haven't hit session profit, level remains unchanged
    }

    // 3. Define Base Units based on Table Limits
    // The strategy uses a 2:2:1 ratio. We use minOutside as the base "1" unit.
    const unit = config.betLimits.minOutside;
    const dozenBase = unit * 2;
    const columnBase = unit;

    // 4. Calculate Current Bet Amounts
    let dozenAmount = dozenBase * state.level;
    let columnAmount = columnBase * state.level;

    // 5. Respect Bet Limits & Clamp
    // Ensure dozen bets are within limits
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    // Ensure column bet is within limits
    columnAmount = Math.max(columnAmount, config.betLimits.minOutside);
    columnAmount = Math.min(columnAmount, config.betLimits.max);

    // 6. Update lastBankroll for the next spin comparison
    // We store the bankroll as it is now (post-payout of previous spin, pre-betting for current)
    state.lastBankroll = bankroll;

    // 7. Return Bet Array
    return [
        { type: 'dozen', value: 1, amount: dozenAmount },
        { type: 'dozen', value: 2, amount: dozenAmount },
        { type: 'column', value: 2, amount: columnAmount }
    ];
}