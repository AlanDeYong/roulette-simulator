/**
 * High Five Roulette Strategy
 * * Source: https://youtu.be/iL3pycQHJMk (Gamblers University)
 * * The Full Logic in details:
 * The strategy spreads bets across 24 numbers to ensure a high win rate. 
 * Because total payout on any hit is higher than the total bet spread, every hit generates net profit.
 * 17 and 20 are "Jackpot numbers" as they overlap the 2nd Dozen and a Split bet simultaneously.
 * * The Full Bet Progression in details:
 * - Base Bets (Ratio): 5 units on 2nd Dozen, 2 units on Corners 1-5 & 31-35, 1 unit on Splits 8-11, 17-20, & 26-29.
 * - On a Loss: Double all bets (Standard Martingale).
 * - On a Win (Partial Recovery): If the bankroll increases but remains below the session high, maintain the current bet level.
 * - On a Win (Full Recovery): If the bankroll reaches or exceeds the highest recorded point of the session, reset to the base level.
 * * The Goal:
 * - Target Profit: +10% of the starting buy-in (e.g., $100 profit on a $1,000 bankroll).
 * - Stop-Loss: Complete bankroll depletion, or table max limits capping the Martingale progression.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish Dynamic Base Units to strictly respect table limits
    const unit = config.betLimits.min;
    const baseAmounts = {
        dozen: Math.max(5 * unit, config.betLimits.minOutside),
        corner: 2 * unit,
        split: 1 * unit
    };

    // 2. State Initialization and Session Watermark Tracking
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
        state.currentMultiplier = 1;
        state.initialized = true;
    } else {
        // If we hit or exceed our session high, reset the progression
        if (bankroll >= state.sessionHigh) {
            state.sessionHigh = bankroll;
            state.currentMultiplier = 1;
        } else if (spinHistory.length > 0) {
            // We are below the session high. Determine if the previous spin was a loss.
            const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
            
            // All numbers covered by the High Five strategy layout
            const winningNumbers = [
                1, 2, 4, 5, 8, 11, 13, 14, 15, 16, 17, 18, 
                19, 20, 21, 22, 23, 24, 26, 29, 31, 32, 34, 35
            ];
            
            const isWin = winningNumbers.includes(lastSpin);
            
            // Martingale: Double progression exclusively on a loss
            if (!isWin) {
                state.currentMultiplier *= 2;
            }
        }
    }

    // 3. Calculate Scaling Bet Amounts and Clamp to Table Maximums
    const dozenAmt = Math.min(baseAmounts.dozen * state.currentMultiplier, config.betLimits.max);
    const cornerAmt = Math.min(baseAmounts.corner * state.currentMultiplier, config.betLimits.max);
    const splitAmt = Math.min(baseAmounts.split * state.currentMultiplier, config.betLimits.max);

    // 4. Dispatch Bets
    const bets = [
        { type: 'dozen', value: 2, amount: dozenAmt },
        { type: 'corner', value: 1, amount: cornerAmt }, // 1-5 Corner (1 is top-left)
        { type: 'corner', value: 31, amount: cornerAmt }, // 31-35 Corner (31 is top-left)
        { type: 'split', value: [8, 11], amount: splitAmt },
        { type: 'split', value: [17, 20], amount: splitAmt },
        { type: 'split', value: [26, 29], amount: splitAmt }
    ];

    // Filter safety check to ensure valid amounts
    return bets.filter(b => b.amount >= config.betLimits.min);
}