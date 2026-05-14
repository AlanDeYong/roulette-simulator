/**
 * Source: https://youtu.be/QPoNbKGYBMQ?si=V861u__2hRSz7z6z
 * Logic: Bet 1 unit each on 8 specific streets: 1, 4, 7, 16, 19, 28, 31, 34.
 * Progression: Martingale (double bet size) strictly on losses. 
 * Skip & Step-Down Mode: On a loss after the 3rd double, real betting stops for exactly 1 spin. It then resumes betting stepped down to the 2nd double level (4x base unit).
 * Goal: Recover losses via Martingale; mitigate severe drawdowns by skipping a spin and stepping down the progression; reset to base unit only upon reaching all-time bankroll high.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (state.maxBankroll === undefined) state.maxBankroll = config.startingBankroll || bankroll;
    if (state.lastBankroll === undefined) state.lastBankroll = bankroll;
    if (state.betMultiplier === undefined) state.betMultiplier = 1;
    if (state.doubleCount === undefined) state.doubleCount = 0;
    if (state.shouldSkipNextBet === undefined) state.shouldSkipNextBet = false;
    if (state.isSkippingNextEvaluation === undefined) state.isSkippingNextEvaluation = false;

    const targetStreets = [1, 4, 7, 16, 19, 28, 31, 34];

    // 2. Evaluate History and Apply Progression Logic
    if (spinHistory.length > 0) {
        if (state.isSkippingNextEvaluation) {
            // We placed no bets on the last spin; skip win/loss evaluation
            state.isSkippingNextEvaluation = false;
        } else {
            if (bankroll >= state.maxBankroll) {
                // All-time high reached: Reset progression
                state.betMultiplier = 1;
                state.doubleCount = 0;
                state.maxBankroll = bankroll;
            } else if (bankroll < state.lastBankroll) {
                // Spin lost: Apply Martingale or trigger Skip/Step-Down
                state.doubleCount++;
                
                if (state.doubleCount > 3) {
                    // 4th consecutive loss (loss AFTER the 3rd double). 
                    state.shouldSkipNextBet = true;
                    // Step down to 2nd double (Base unit x 4)
                    state.betMultiplier = 4; 
                    state.doubleCount = 2; // Sync tracking count
                } else {
                    state.betMultiplier *= 2;
                }
            }
            // If bankroll increased but < maxBankroll, multiplier remains unchanged
        }
    }

    // 3. Update Bankroll State
    state.lastBankroll = bankroll;

    // 4. Handle Skip Output
    if (state.shouldSkipNextBet) {
        state.shouldSkipNextBet = false;
        state.isSkippingNextEvaluation = true;
        return []; // Place no bets for 1 spin
    }

    // 5. Calculate, Clamp, and Generate Real Bets
    const multiplier = Math.max(1, state.betMultiplier || 1);
    let amount = config.betLimits.min * multiplier;
    amount = Math.min(amount, config.betLimits.max);

    const maxPerBetForAll = Math.floor(bankroll / targetStreets.length);
    if (maxPerBetForAll >= config.betLimits.min) {
        amount = Math.min(amount, maxPerBetForAll);
        return targetStreets.map(streetStartNum => ({
            type: 'street',
            value: streetStartNum,
            amount: amount
        }));
    }

    const affordableAtMinCount = Math.min(targetStreets.length, Math.floor(bankroll / config.betLimits.min));
    if (affordableAtMinCount <= 0) return [];

    amount = config.betLimits.min;
    return targetStreets.slice(0, affordableAtMinCount).map(streetStartNum => ({
        type: 'street',
        value: streetStartNum,
        amount: amount
    }));
}
