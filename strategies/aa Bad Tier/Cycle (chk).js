/**
 * Roulette Strategy: "The Cycle"
 * * Source: CEG Dealer School (https://www.youtube.com/watch?v=u8CThLljCvY)
 * * The Logic: 
 * This is a 4-step positive progression system that aims to use casino money 
 * (profits) to fund increasingly aggressive inside bets.
 * - Step 1: Bet 2 Dozens (covering roughly 66% of the board).
 * - Step 2: Reinvest the profit into 5 non-touching Corners.
 * - Step 3: Reinvest the cumulative profit into 3 Double Streets (Lines).
 * - Step 4: Spread the accumulated profit across multiple Lines and Corners for a final large payout.
 * * The Progression:
 * - Win Step 1 -> Advance to Step 2 using the profit.
 * - Win Step 2 -> Advance to Step 3 using the profit.
 * - Win Step 3 -> Advance to Step 4 using the profit.
 * - Win Step 4 -> Cycle complete, lock up profits, and reset to Step 1.
 * - Loss at ANY step -> Reset immediately to Step 1 (No Martingale/chasing losses).
 * * The Goal:
 * To start a "money printing cycle" by risking a moderate initial outside bet,
 * and parlaying the winnings through successive inside bet hits to maximize ROI 
 * while protecting the original buy-in.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (typeof state.step === 'undefined') {
        state.step = 1;               // Start at Step 1
        state.lastBankroll = bankroll; // Track to detect wins/losses
        state.placedBet = false;      // Prevent stepping up on the very first spin
    }

    // 2. Determine Win/Loss of Previous Spin
    // We check if the bankroll increased to determine if the last step was successful.
    if (spinHistory.length > 0 && state.placedBet) {
        if (bankroll > state.lastBankroll) {
            // We won the previous step! Advance the cycle.
            state.step++;
            if (state.step > 4) {
                state.step = 1; // Completed the cycle, start over.
            }
        } else {
            // We lost. Reset the cycle back to Step 1.
            state.step = 1;
        }
    }

    // Update trackers for the next spin evaluation
    state.lastBankroll = bankroll;
    state.placedBet = true;

    // 3. Define Base Units and Arrays
    const insideUnit = config.betLimits.min;
    const outsideUnit = config.betLimits.minOutside;
    let bets = [];

    // 4. Execute Step Logic
    switch (state.step) {
        case 1:
            // Step 1: Two Dozens. 
            // Scaled dynamically. The video uses 5 units ($25) per dozen.
            let step1Amount = Math.max(outsideUnit, insideUnit * 5);
            step1Amount = Math.min(step1Amount, config.betLimits.max);
            
            bets.push({ type: 'dozen', value: 1, amount: step1Amount });
            bets.push({ type: 'dozen', value: 2, amount: step1Amount });
            break;

        case 2:
            // Step 2: 5 non-touching corners. 
            // Video uses 1 unit ($5) per corner.
            let step2Amount = Math.max(insideUnit, 1);
            step2Amount = Math.min(step2Amount, config.betLimits.max);

            // Arbitrary spread of non-touching corners
            [1, 8, 16, 23, 32].forEach(cornerVal => {
                bets.push({ type: 'corner', value: cornerVal, amount: step2Amount });
            });
            break;

        case 3:
            // Step 3: 3 Double Streets (Lines).
            // Video uses 3 units ($15) per line.
            let step3Amount = Math.max(insideUnit * 3, config.betLimits.min);
            step3Amount = Math.min(step3Amount, config.betLimits.max);

            // Arbitrary spread of lines to cover different sections
            [1, 13, 25].forEach(lineVal => {
                bets.push({ type: 'line', value: lineVal, amount: step3Amount });
            });
            break;

        case 4:
            // Step 4: Mix of lines and corners to reinvest the ~$90 profit (18 units).
            // We use 6 lines at 2 units each, and 6 corners at 1 unit each.
            let step4LineAmount = Math.max(insideUnit * 2, config.betLimits.min);
            step4LineAmount = Math.min(step4LineAmount, config.betLimits.max);
            
            let step4CornerAmount = Math.max(insideUnit * 1, config.betLimits.min);
            step4CornerAmount = Math.min(step4CornerAmount, config.betLimits.max);

            // 6 Double Streets
            [1, 7, 13, 19, 25, 31].forEach(lineVal => {
                bets.push({ type: 'line', value: lineVal, amount: step4LineAmount });
            });
            
            // 6 Corners (offset to not sit directly inside the lines heavily)
            [2, 8, 14, 20, 26, 32].forEach(cornerVal => {
                bets.push({ type: 'corner', value: cornerVal, amount: step4CornerAmount });
            });
            break;
    }

    return bets;
}