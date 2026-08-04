/**
 * 🥇Any Dozen & 4 Corners in 2 Dozens, The Ultimate $2,000 Roulette Bankroll Strategy (Step-by-Step)
 * Source: https://youtu.be/_YU3460mVjw (WillVegas)
 *
 * The Full Logic in details:
 * This strategy covers 28 numbers on the roulette board by betting:
 * - 2nd Dozen (covers 13-24)
 * - Corner 2 (covers 2, 3, 5, 6)
 * - Corner 7 (covers 7, 8, 10, 11)
 * - Corner 26 (covers 26, 27, 29, 30)
 * - Corner 31 (covers 31, 32, 34, 35)
 * The base bet ratio is 3 units on the Dozen and 1 unit on each Corner (7 units total). 
 * Any hit returns 9 units, yielding a guaranteed 2-unit net profit.
 * 
 * The Full Bet Progression in details:
 * - Initial Bet: Multiplier is 1x.
 * - After a loss: The multiplier doubles (Martingale).
 * - After a win (in a drawdown): The multiplier REMAINS at the current elevated level 
 *   to continue clawing back losses, because a 9:7 payout does not recover a full loss.
 * - After a win (peak profit reached): Once the bankroll hits a new high-water mark 
 *   (recovering all losses), the multiplier resets to 1x.
 * 
 * The Goal:
 * To hit-and-run for a quick profit of $200 - $300 within 15-20 minutes, using 
 * the $2,000 bankroll to float the aggressive doubling sequence.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State for Progression and Peak Bankroll Tracking
    if (state.multiplier === undefined) {
        state.multiplier = 1;
        state.peakBankroll = bankroll;
    }

    // 2. Update the High-Water Mark 
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 3. Check the previous spin to determine win/loss and update progression
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const num = lastResult.winningNumber;
        
        // Define all 28 winning numbers covered by the board layout
        const winningNumbers = [
            2, 3, 5, 6, 
            7, 8, 10, 11, 
            13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 
            26, 27, 29, 30, 
            31, 32, 34, 35
        ];
        
        if (winningNumbers.includes(num)) {
            // WIN: Only reset if the bankroll has fully recovered back to the peak
            if (bankroll >= state.peakBankroll) {
                state.multiplier = 1;
            }
            // If still below peak, multiplier stays exactly where it is to continue recovery
        } else {
            // LOSS: Double the bets
            state.multiplier *= 2;
        }
    }

    // 4. Determine base units respecting table limits
    const cornerBaseUnit = Math.max(
        config.betLimits.min, 
        Math.ceil(config.betLimits.minOutside / 3)
    );
    const dozenBaseUnit = cornerBaseUnit * 3;

    // 5. Calculate Current Bet Amounts
    let cornerAmount = cornerBaseUnit * state.multiplier;
    let dozenAmount = dozenBaseUnit * state.multiplier;

    // 6. Clamp to Max Limits to ensure we don't violate table rules
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    // 7. Return Bet Placements
    return [
        { type: 'dozen', value: 2, amount: dozenAmount },
        { type: 'corner', value: 2, amount: cornerAmount },
        { type: 'corner', value: 7, amount: cornerAmount },
        { type: 'corner', value: 26, amount: cornerAmount },
        { type: 'corner', value: 31, amount: cornerAmount }
    ];
}