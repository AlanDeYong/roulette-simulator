/**
 * Source: https://youtu.be/QPoNbKGYBMQ?si=V861u__2hRSz7z6z
 * Logic: Bet 1 unit each on 8 specific streets: 1, 4, 7, 16, 19, 28, 31, 34. 
 * Progression: Martingale (double bet size) strictly on losses. If a spin wins but the all-time bankroll high is not achieved, the bet size is maintained.
 * Goal: Recover losses via Martingale and secure profit, resetting progression to base unit only when the all-time bankroll high is reached or exceeded.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (state.maxBankroll === undefined) state.maxBankroll = config.startingBankroll || bankroll;
    if (state.currentUnit === undefined) state.currentUnit = config.betLimits.min;
    if (state.lastBankroll === undefined) state.lastBankroll = bankroll;

    let amount = state.currentUnit;

    // 2. Evaluate History and Apply Progression
    if (spinHistory.length > 0) {
        if (bankroll >= state.maxBankroll) {
            // Goal achieved: Reset to base unit and set new high
            amount = config.betLimits.min;
            state.maxBankroll = bankroll;
        } else if (bankroll < state.lastBankroll) {
            // Spin lost: Apply Martingale
            amount = state.currentUnit * 2;
        }
        // If bankroll increased but is still < maxBankroll, amount remains state.currentUnit
    }

    // 3. Clamp to Configuration Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 4. Generate and Return Bets
    // Note: Adjusted 33 to 34 to align with standard roulette street starting numbers.
    const targetStreets = [1, 4, 7, 16, 19, 28, 31, 34];

    const maxPerBetForAll = Math.floor(bankroll / targetStreets.length);
    if (maxPerBetForAll >= config.betLimits.min) {
        amount = Math.min(amount, maxPerBetForAll);
    } else {
        const affordableAtMinCount = Math.min(targetStreets.length, Math.floor(bankroll / config.betLimits.min));
        if (affordableAtMinCount <= 0) return [];
        amount = config.betLimits.min;
        const bets = targetStreets.slice(0, affordableAtMinCount).map(streetStartNum => ({
            type: 'street',
            value: streetStartNum,
            amount: amount
        }));
        state.currentUnit = amount;
        state.lastBankroll = bankroll;
        return bets;
    }

    state.currentUnit = amount;
    state.lastBankroll = bankroll;

    return targetStreets.map(streetStartNum => ({
        type: 'street',
        value: streetStartNum,
        amount: amount
    }));
}
