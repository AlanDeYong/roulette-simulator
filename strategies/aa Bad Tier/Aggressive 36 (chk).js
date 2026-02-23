/**
 * Strategy: Aggressive 36 Method (Corrected 39-Unit Variation)
 * Source: https://www.youtube.com/watch?v=P9rpGmIybBM (Ninja Gamblers)
 * * The Logic: A high-coverage flat-betting system covering 37 out of 37/38 numbers.
 * Base proportions: 22 units on High (19-36), 14 units on 1st Dozen (1-12), 
 * 2 units on a Double Street ('line' 13-18), and 1 unit straight-up on Zero (0).
 * Total spread: 39 units.
 * * The Progression: Flat betting only. Does not change size based on spinHistory.
 * * The Goal: Stop betting once a +50% profit target is reached on the starting
 * bankroll, or if the current bankroll cannot cover the full 39-unit spread.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Rule 6: State Persistence & Initialization
    if (!state.initialized) {
        state.startingBankroll = bankroll;
        state.profitTarget = bankroll + (bankroll * 0.50); 
        state.initialized = true;
    }

    // Stop Condition: Target Reached
    if (bankroll >= state.profitTarget) {
        return []; // Rule 3: Return empty array for no bets
    }

    // 1. Determine Base Unit (Rule 5: Respect Limits)
    // The lowest proportional bet is 1 unit (on zero). It must clear the inside minimum.
    const baseUnit = Math.max(1, config.betLimits.min);

    // 2. Calculate Proportional Bet Amounts
    let highAmount = 22 * baseUnit;
    let dozenAmount = 14 * baseUnit;
    let doubleStreetAmount = 2 * baseUnit;
    let zeroAmount = 1 * baseUnit;

    // 3. Clamp to Limits (Rule 5)
    // Outside bets (High, Dozen)
    highAmount = Math.max(highAmount, config.betLimits.minOutside);
    highAmount = Math.min(highAmount, config.betLimits.max);
    
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    // Inside bets (Double Street / Line, Zero)
    doubleStreetAmount = Math.max(doubleStreetAmount, config.betLimits.min);
    doubleStreetAmount = Math.min(doubleStreetAmount, config.betLimits.max);
    
    zeroAmount = Math.max(zeroAmount, config.betLimits.min);
    zeroAmount = Math.min(zeroAmount, config.betLimits.max);

    // 4. Bankroll Check
    const totalBet = highAmount + dozenAmount + doubleStreetAmount + zeroAmount;
    if (bankroll < totalBet) {
        return []; // Insufficient funds, cease betting
    }

    // 5. Return Bet Objects (Rule 3)
    return [
        { type: 'high', amount: highAmount },
        { type: 'dozen', value: 1, amount: dozenAmount },
        { type: 'line', value: 13, amount: doubleStreetAmount },
        { type: 'number', value: 0, amount: zeroAmount }
    ];
}