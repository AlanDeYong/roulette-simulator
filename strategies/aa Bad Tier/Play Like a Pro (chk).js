/**
 * SOURCE: VIPER STRATEGIES - PLAY LIKE A PRO SMART AND SAFER BETS!
 * URL: https://www.youtube.com/watch?v=COekbJe-yCc
 * * THE LOGIC: 
 * This strategy relies on "Recency Bias" rather than the Gambler's Fallacy. 
 * Instead of betting against a streak, it looks at the last 15 spins and 
 * places a 1:1 outside bet (Red/Black) on the outcome that is currently hitting 
 * the most frequently.
 * * THE PROGRESSION:
 * A combination of soft progression and flat-betting match play:
 * - Level 1: 1 unit. Win -> Reset to L1. Lose -> L2.
 * - Level 2: 2 units. Win -> Reset to L1. Lose -> L3.
 * - Level 3: 3 units. Win -> Reset to L1. Lose -> L4.
 * - Level 4+ (Recovery Mode): Bets remain FLAT at 3 units. You play a "Best of 3" set.
 * - If you get 2 wins in the set, you move DOWN one level (e.g., L4 to L3).
 * - If you get 2 losses in the set, you move UP one level (e.g., L4 to L5).
 * - Any time you reach a new session high (break even or profit), reset to L1.
 * * THE GOAL:
 * The strategy operates on strict session limits. The target profit is +5 units, 
 * and the hard stop-loss is -10 units. 
 * Note: To keep the simulator running continuously, hitting either the profit target 
 * or the stop-loss will simply "reset" the session baseline and start fresh.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    const unitSize = config.betLimits.minOutside;

    if (state.sessionStartBankroll === undefined) {
        state.sessionStartBankroll = bankroll;
        state.level = 1;
        state.setWins = 0;
        state.setLosses = 0;
        state.lastBetType = null;
    }

    // 2. Process the previous spin result
    if (spinHistory.length > 0 && state.lastBetType) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const won = (lastResult.winningColor === state.lastBetType);

        let currentSessionProfit = bankroll - state.sessionStartBankroll;

        // Check if we hit our Stop Win (+5 units) or Stop Loss (-10 units)
        if (currentSessionProfit >= 5 * unitSize || currentSessionProfit <= -10 * unitSize) {
            // In a real casino, you walk away. Here, we reset the session to keep simulating.
            state.sessionStartBankroll = bankroll;
            state.level = 1;
            state.setWins = 0;
            state.setLosses = 0;
        } 
        // If we are back in profit for the session, reset progression
        else if (currentSessionProfit > 0) {
            state.level = 1;
            state.setWins = 0;
            state.setLosses = 0;
        } 
        // Handle progression climbing/dropping
        else {
            if (state.level < 4) {
                if (won) {
                    state.level = 1; // Any win in first 3 levels resets
                } else {
                    state.level++;   // Move up a level on loss
                }
            } else {
                // Level 4+ (Recovery / Best of 3 mode)
                if (won) state.setWins++;
                else state.setLosses++;

                if (state.setWins === 2) {
                    state.level--; // Drop down a level
                    state.setWins = 0;
                    state.setLosses = 0;
                } else if (state.setLosses === 2) {
                    state.level++; // Climb up a level
                    state.setWins = 0;
                    state.setLosses = 0;
                }
            }
        }
    }

    // 3. Determine Recency Bias (Look at the last 15 spins)
    let redCount = 0;
    let blackCount = 0;
    const lookback = Math.min(15, spinHistory.length);
    
    for (let i = spinHistory.length - lookback; i < spinHistory.length; i++) {
        if (spinHistory[i].winningColor === 'red') redCount++;
        if (spinHistory[i].winningColor === 'black') blackCount++;
    }
    
    // Bet on whatever is hitting more. Default to Red if tied or no history.
    const targetBetType = redCount >= blackCount ? 'red' : 'black';

    // 4. Calculate Bet Amount based on Current Level
    let unitsToBet = 1;
    if (state.level === 1) unitsToBet = 1;
    else if (state.level === 2) unitsToBet = 2;
    else if (state.level >= 3) unitsToBet = 3; // The bet amount caps at 3 units

    let amount = unitsToBet * unitSize;

    // 5. Clamp to Limits
    amount = Math.max(amount, config.betLimits.minOutside); 
    amount = Math.min(amount, config.betLimits.max);

    // 6. Save state for next spin and return bet
    state.lastBetType = targetBetType;
    
    return [{ type: targetBetType, amount: amount }];
}