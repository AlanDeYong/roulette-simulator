/*
 * Modified Seesaw Roulette Strategy (Constant Toggle)
 * * The Logic: 
 * - Plays Setup A (Low + 3rd Dozen).
 * - Win or loss, it ALWAYS switches to the other setup for the next spin.
 * - If the previous spin lost, the overall bet multiplier doubles.
 * - If the previous spin won and broke a new session profit, the multiplier resets to 1.
 * - If the previous spin won but is still in drawdown, the multiplier stays the same to recover.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (state.highWaterMark === undefined) {
        state.highWaterMark = bankroll;
        state.currentSetup = 'A';
        state.multiplier = 1;
        state.bankrollBeforeSpin = bankroll;
    }

    // 2. Process Previous Spin Result (if this isn't the first spin)
    if (spinHistory.length > 0) {
        const netProfit = bankroll - state.bankrollBeforeSpin;
        
        // Evaluate against Session High Water Mark
        if (bankroll > state.highWaterMark) {
            // New session profit achieved: Reset multiplier
            state.highWaterMark = bankroll;
            state.multiplier = 1;
            // Note: We do NOT force currentSetup back to 'A' here, preserving the seesaw.
        } else if (netProfit < 0) {
            // Loss: Double the multiplier
            state.multiplier *= 2;
        }

        // UNCONDITIONAL TOGGLE: Switch layout regardless of win or loss
        state.currentSetup = state.currentSetup === 'A' ? 'B' : 'A';
    }

    // Snapshot bankroll to calculate net profit on the next invocation
    state.bankrollBeforeSpin = bankroll;

    // 3. Determine Base Units & Construct Bets
    let bets = [];

    if (state.currentSetup === 'A') {
        // Setup A: 3 units on Low, 2 units on Dozen 3
        const unitA = config.betLimits.minOutside; 
        
        let lowAmount = (unitA * 3) * state.multiplier;
        let dozenAmount = (unitA * 2) * state.multiplier;

        // Clamp to configured limits
        lowAmount = Math.max(config.betLimits.minOutside, Math.min(lowAmount, config.betLimits.max));
        dozenAmount = Math.max(config.betLimits.minOutside, Math.min(dozenAmount, config.betLimits.max));

        bets.push({ type: 'low', amount: lowAmount });
        bets.push({ type: 'dozen', value: 3, amount: dozenAmount });

    } else {
        // Setup B: 1 unit on 5 separate Line bets (Double Streets)
        const unitB = config.betLimits.min;
        
        let lineAmount = (unitB * 1) * state.multiplier;
        
        // Clamp to configured limits
        lineAmount = Math.max(config.betLimits.min, Math.min(lineAmount, config.betLimits.max));

        // Place bets on the first 5 double streets, covering numbers 1 through 30
        const lineStarts = [1, 7, 13, 19, 25];
        for (let startNum of lineStarts) {
            bets.push({ type: 'line', value: startNum, amount: lineAmount });
        }
    }

    return bets;
}