/**
 * Roulette Gold System
 * Source: https://www.youtube.com/watch?v=w37wJ2dYq3Q (THEROULETTEMASTERTV)
 * * The Logic: 
 * This strategy bets on two dozens simultaneously (1st and 2nd Dozen), covering 
 * numbers 1-24. A win occurs if the ball lands on 1 through 24. A loss occurs 
 * on 25-36 or the green zero(s).
 * * The Progression:
 * The system uses a staggered negative progression to protect the bankroll. 
 * The unit multipliers follow this ladder: 1, 3, 3, 7, 7, 15, 15, 31, 31...
 * - On a win: Move exactly one step down the ladder (until back to the base bet of 1).
 * - On a loss: Move exactly one step up the ladder.
 * This means after the base bet, each escalated tier is repeated once before doubling 
 * and adding a unit.
 * * The Goal:
 * Safely grind out small profits while mitigating the steep bankroll drawdowns 
 * typical of standard Martingale systems by spreading risk across repeated tiers.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.step === undefined) {
        state.step = 0; // 0 represents the base unit multiplier
    }

    // 2. Process Previous Spin (if any)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // 1st and 2nd Dozen cover numbers 1 through 24
        const won = lastSpin.winningNumber >= 1 && lastSpin.winningNumber <= 24;

        if (won) {
            // Move one step back down the ladder, floor at 0
            state.step = Math.max(0, state.step - 1);
        } else {
            // Move one step up the ladder
            state.step++;
        }
    }

    // 3. Determine Multiplier for Current Step
    let multiplier = 1;
    if (state.step > 0) {
        // Step 1,2 -> Tier 1 -> Multiplier 3
        // Step 3,4 -> Tier 2 -> Multiplier 7
        // Step 5,6 -> Tier 3 -> Multiplier 15
        const tier = Math.floor((state.step + 1) / 2);
        multiplier = Math.pow(2, tier + 1) - 1;
    }

    // 4. Calculate Bet Amount
    const baseUnit = config.betLimits.minOutside;
    let amount = baseUnit * multiplier;

    // 5. Clamp to Limits
    amount = Math.max(amount, baseUnit);
    amount = Math.min(amount, config.betLimits.max);

    // 6. Bankroll Protection
    // We need to place 2 bets. Check if we have enough funds.
    if (bankroll < amount * 2) {
        amount = Math.floor(bankroll / 2);
        // If we can't afford the minimum outside bet on both, stop betting (bust)
        if (amount < baseUnit) {
            return []; 
        }
    }

    // 7. Execute Bets on 1st and 2nd Dozen
    return [
        { type: 'dozen', value: 1, amount: amount },
        { type: 'dozen', value: 2, amount: amount }
    ];
}