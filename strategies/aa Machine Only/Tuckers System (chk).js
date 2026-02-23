/**
 * Tucker's System Roulette Strategy
 * * Source: "The Roulette Master" YouTube Channel
 * Video URL: https://www.youtube.com/watch?v=G5fphWBpsWM
 * * The Logic: 
 * Bets are placed on four specific outside/multiplier sections to achieve high board coverage:
 * 1. Low (1-18)
 * 2. 1st Dozen
 * 3. 1st Column
 * 4. 2nd Column
 * * The Progression: 
 * This is an aggressive linear recovery system based on a "high-water mark" of session profit.
 * - The strategy tracks the highest session profit achieved so far.
 * - If the current bankroll profit is GREATER THAN the highest recorded profit, the highest profit 
 * is updated, and the bet size resets to 1 base unit on each of the 4 spots.
 * - If a loss occurs (causing current profit to fall below the highest recorded profit), the system 
 * enters recovery. The bet size increases by 1 base unit on *every single subsequent spin* * (regardless of whether those individual recovery spins win or lose) until the total profit 
 * finally surpasses the previous high-water mark.
 * * The Goal: 
 * To continuously push the total session profit higher by leveraging compounding wins or 
 * overpowering drawdowns through aggressive linear bet increases. There is no hard stop-loss 
 * coded; it relies on hitting table limits or bankroll exhaustion if a severe cold streak occurs.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on the first run
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.highestProfit = 0;
        state.currentLevel = 1;
        state.initialized = true;
    }

    // 2. Calculate Current Session Profit
    const currentProfit = bankroll - state.initialBankroll;

    // 3. Evaluate Progression Logic (only after at least one spin has occurred)
    if (spinHistory.length > 0) {
        if (currentProfit > state.highestProfit) {
            // New high-water mark reached: Reset progression
            state.highestProfit = currentProfit;
            state.currentLevel = 1;
        } else {
            // In a drawdown: Increment bet level by 1 unit for every spin
            state.currentLevel += 1;
        }
    }

    // 4. Calculate Base Unit and Current Bet Amount
    const unit = config.betLimits.minOutside;
    let amount = state.currentLevel * unit;

    // 5. Clamp Amount to Config Limits
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 6. Construct and Return the 4 Bets
    return [
        { type: 'low', amount: amount },
        { type: 'dozen', value: 1, amount: amount },
        { type: 'column', value: 1, amount: amount },
        { type: 'column', value: 2, amount: amount }
    ];
}