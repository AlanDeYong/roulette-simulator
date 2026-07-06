/**
 * Firehouse Strategy
 * * Source: https://youtu.be/GHV-6jMRjj4 (The Roulette Master)
 * * The Full Logic in details:
 * This strategy capitalizes on overlapping probabilities by placing four equal Outside bets: 
 * 1st Dozen, 2nd Dozen, Red, and Odd. 
 * The logic is based on the high density of Red and Odd numbers in the first two dozens 
 * (e.g., 1, 3, 5, 7, 9 are all red and odd in the 1st dozen). This overlap allows for 
 * multiple payouts when a target number hits.
 * * The Full Bet Progression in details:
 * - Initial Bet: 1 base unit is placed on each of the 4 positions.
 * - After a net loss (payout is less than the total bet amount), increase ALL bets by 1 unit.
 * - After a net win or break-even, but the overall sequence is NOT in profit, keep the bets exactly the same.
 * - After a win that puts the bankroll at a new session high, reset all bets to the initial 1 base unit.
 * * The Goal:
 * Achieve consistent new session highs (session profit). There is no explicit stop-loss 
 * other than hitting the table maximum limits or bankroll exhaustion.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Defensive Config Fallbacks (Prevents NaN errors if config is missing properties)
    const minOutside = (config && config.betLimits && config.betLimits.minOutside) ? config.betLimits.minOutside : 5;
    const maxLimit = (config && config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;
    const incMode = (config && config.incrementMode) ? config.incrementMode : 'base';
    const minInc = (config && config.minIncrementalBet) ? config.minIncrementalBet : 1;

    // 2. Initialize State
    if (state.progression === undefined) {
        state.progression = 1;
        state.referenceBankroll = bankroll;
    }

    // 3. Track Sequence Profit / Loss (Only evaluate if we've actually spun)
    if (spinHistory.length > 0 && state.bankrollBeforeLastSpin !== undefined) {
        if (bankroll > state.referenceBankroll) {
            // Reached a new session high: Reset progression
            state.referenceBankroll = bankroll;
            state.progression = 1;
        } else {
            // Evaluate the net result of the previous spin
            const netProfit = bankroll - state.bankrollBeforeLastSpin;
            if (netProfit < 0) {
                // Net loss: Increase progression by 1 level
                state.progression += 1;
            }
            // If netProfit >= 0 but no new high, keep the progression the same
        }
    }

    // Store the current bankroll to evaluate the next spin's net result
    state.bankrollBeforeLastSpin = bankroll;

    // 4. Calculate Bet Amount based on Increment Mode
    let amount;
    if (incMode === 'fixed') {
        amount = minOutside + (minInc * (state.progression - 1));
    } else {
        // 'base' increment mode: multiply the base unit
        amount = minOutside * state.progression;
    }

    // 5. Ultimate Fallback & Clamping to Limits
    if (isNaN(amount) || amount <= 0) {
        amount = minOutside; // Fail-safe to ensure amount is always a valid number
    }
    amount = Math.max(amount, minOutside);
    amount = Math.min(amount, maxLimit);

    // 6. Place Bets
    return [
        { type: 'dozen', value: 1, amount: amount },
        { type: 'dozen', value: 2, amount: amount },
        { type: 'red', amount: amount },
        { type: 'odd', amount: amount }
    ];
}