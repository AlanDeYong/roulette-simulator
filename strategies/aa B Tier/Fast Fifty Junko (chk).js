/*
 * Strategy: Fast 50
 * Source: Junko Bodie - https://youtu.be/IBKAjWlw3Ew
 * 
 * The Logic: This hit-and-run strategy covers roughly half the board using a 5-unit base layout:
 *            - 3 units are placed on a Dozen (e.g., 1st Dozen).
 *            - 1 unit is placed on a Corner in a different dozen (e.g., Corner 14).
 *            - 1 unit is placed on another Corner in that same different dozen (e.g., Corner 20).
 *            This creates a high-coverage net. Any hit on the dozen or the corners results in a net profit.
 * 
 * The Progression: Martingale. If a spin results in a total miss (net loss), the entire bet 
 *                  multiplier is doubled for the next spin to recoup losses. If the spin is a 
 *                  win, the multiplier resets to 1.
 * 
 * The Goal: To secure a quick target profit of 10 base units (e.g., $50 if the base unit is a $5 chip). 
 *           Once the session bankroll is at or above the starting bankroll + target profit, the 
 *           function stops placing bets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base units and target
    // We use minOutside as the foundational unit to mimic the $5 chips used in the video.
    const unit = config.betLimits.minOutside; 
    const targetProfit = 10000 * unit; 

    // 2. Initialize State on the first spin
    if (state.startingBankroll === undefined) {
        state.startingBankroll = bankroll;
        state.multiplier = 1;
        state.lastBankroll = bankroll;
    }

    // 3. Evaluate Goal Condition
    const currentProfit = bankroll - state.startingBankroll;
    if (currentProfit >= targetProfit) {
        // Target achieved: Stop betting completely.
        return []; 
    }

    // 4. Update Progression based on the previous spin's financial outcome
    if (spinHistory.length > 0) {
        if (bankroll < state.lastBankroll) {
            // Net loss on the last spin -> Double the bet size
            state.multiplier *= 2;
        } else if (bankroll > state.lastBankroll) {
            // Net win on the last spin -> Reset progression
            state.multiplier = 1;
        }
        // If bankroll is unchanged, the multiplier remains the same.
    }

    // 5. Calculate Bet Amounts
    let dozenBet = 3 * unit * state.multiplier;
    let corner1Bet = 1 * unit * state.multiplier;
    let corner2Bet = 1 * unit * state.multiplier;

    // 6. Clamp to Limits
    // Ensure the Martingale progression does not exceed table maximums
    dozenBet = Math.min(dozenBet, config.betLimits.max);
    dozenBet = Math.max(dozenBet, config.betLimits.minOutside);

    // Corners are inside bets, so they check against min, but still capped by max
    corner1Bet = Math.min(corner1Bet, config.betLimits.max);
    corner1Bet = Math.max(corner1Bet, config.betLimits.min); 

    corner2Bet = Math.min(corner2Bet, config.betLimits.max);
    corner2Bet = Math.max(corner2Bet, config.betLimits.min);

    // Update lastBankroll for the next spin's evaluation
    state.lastBankroll = bankroll;

    // 7. Return the Bet Layout
    // - 1st Dozen covers numbers 1-12
    // - Corner 14 covers 14, 15, 17, 18 (Middle Dozen)
    // - Corner 20 covers 20, 21, 23, 24 (Middle Dozen)
    return [
        { type: 'dozen', value: 1, amount: dozenBet },
        { type: 'corner', value: 14, amount: corner1Bet },
        { type: 'corner', value: 20, amount: corner2Bet }
    ];
}