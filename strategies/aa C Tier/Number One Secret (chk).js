/**
 * Source: https://www.youtube.com/watch?v=V7q-EZBGH-M (Roulette Strategy Lab)
 * Strategy: "Number One Secret Roulette Strategy"
 * * The Logic: Place 4 corner bets (1 base unit each) and 1 column bet on the 3rd Column (2 base units).
 * The corners chosen here are 1, 7, 13, and 19 to completely avoid overlapping with the 3rd column, 
 * matching the video's "break even" mechanic when only the 3rd column hits.
 * * The Progression: This is a negative progression system. 
 * - If the net profit for a spin is negative (a loss), increase the bet size on all spots.
 * - If the net profit is 0 (break even), maintain the current bet size.
 * - If the net profit is positive (a win), maintain the bet size until the overall session is in profit.
 * * The Goal: Continue the progression loop until the current bankroll exceeds the session's 
 * starting bankroll. Once session profit is achieved, reset all bets back to the initial base units.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State & Determine Spin Outcome
    if (state.sessionStartingBankroll === undefined) {
        state.sessionStartingBankroll = bankroll;
        state.progressionLevel = 1;
    }

    if (state.prevBankroll !== undefined) {
        // Calculate the net profit of the spin that just resolved
        let spinProfit = bankroll - state.prevBankroll;
        
        // Progression trigger: Net loss on the spin
        if (spinProfit < 0) {
            state.progressionLevel++;
        }
        
        // Reset trigger: Overall session profit achieved
        if (bankroll > state.sessionStartingBankroll) {
            state.sessionStartingBankroll = bankroll;
            state.progressionLevel = 1;
        }
    }
    
    // Save current bankroll for the next spin's profit calculation
    state.prevBankroll = bankroll;

    // 2. Define Base Units
    const cornerBaseBet = config.betLimits.min;
    // Ensure column bet is at least the outside minimum, aiming for the 2x ratio used in the strategy
    const columnBaseBet = Math.max(config.betLimits.minOutside, cornerBaseBet * 2);

    // 3. Calculate Increments based on config.incrementMode
    let cornerBetAmount, columnBetAmount;
    
    if (config.incrementMode === 'fixed') {
        // Add a fixed amount for each level above 1
        cornerBetAmount = cornerBaseBet + (config.minIncrementalBet * (state.progressionLevel - 1));
        columnBetAmount = columnBaseBet + (config.minIncrementalBet * (state.progressionLevel - 1));
    } else {
        // 'base' mode: multiply the base bet by the progression level
        cornerBetAmount = cornerBaseBet * state.progressionLevel;
        columnBetAmount = columnBaseBet * state.progressionLevel;
    }

    // 4. Clamp to Limits (Crucial for simulation stability)
    cornerBetAmount = Math.max(cornerBetAmount, config.betLimits.min);
    cornerBetAmount = Math.min(cornerBetAmount, config.betLimits.max);
    
    columnBetAmount = Math.max(columnBetAmount, config.betLimits.minOutside);
    columnBetAmount = Math.min(columnBetAmount, config.betLimits.max);

    // 5. Construct Bet Array
    const bets = [
        { type: 'corner', value: 1, amount: cornerBetAmount },   // Covers 1, 2, 4, 5
        { type: 'corner', value: 7, amount: cornerBetAmount },   // Covers 7, 8, 10, 11
        { type: 'corner', value: 13, amount: cornerBetAmount },  // Covers 13, 14, 16, 17
        { type: 'corner', value: 19, amount: cornerBetAmount },  // Covers 19, 20, 22, 23
        { type: 'column', value: 3, amount: columnBetAmount }    // Covers 3rd column (multiplier)
    ];

    return bets;
}