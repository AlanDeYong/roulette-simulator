/**
 * Strategy: DAVID VS GOLIATH
 * Source: https://www.youtube.com/watch?v=o8mpbUrYkKg&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=2 (Roulette strategy)
 * 
 * The Full Logic in details:
 * - The strategy is a progression-based sequence covering multiple street bets to accumulate profit while managing drawdowns.
 * - It assesses the previous spin's result to determine the next step in an 8-level progression.
 * - A win occurs if the ball lands on any number covered by the current active streets.
 * 
 * The Full Bet Progression in details:
 * - Level 1: 1 unit on streets 1, 4, 7. (Total: 3u)
 * - Level 2 (On loss): Double bets -> 2 units on streets 1, 4, 7. (Total: 6u)
 * - Level 3 (On loss): Add bets -> 2 units each on streets 1, 4, 7, 10, 13, 16. (Total: 12u)
 * - Level 4 (On loss): Double bets -> 4 units each on streets 1, 4, 7, 10, 13, 16. (Total: 24u)
 * - Level 5 (On loss): Add bets -> 4 units each on streets 1, 4, 7, 10, 13, 16, 19, 22, 25. (Total: 36u)
 * - Level 6 (On loss): Double bets -> 8 units each on 9 streets (1 to 25). (Total: 72u)
 * - Level 7 (On loss): Increase all by 5 units -> 13 units each on 9 streets. (Total: 117u)
 * - Level 8 (On loss): Double bets -> 26 units each on 9 streets. (Total: 234u)
 * 
 * - On Win:
 *   - If current bankroll is at or exceeds the session's peak bankroll (profit reached): Reset to Level 1.
 *   - If NOT at peak profit:
 *     - If at Level 6 or higher (Levels 6, 7, 8): Drop down one level.
 *     - If at Level 5 or lower: Rebet (stay at the current level).
 * - On Level 8 Loss: Resets to Level 1 to prevent runaway bust.
 * 
 * The Goal:
 * - To constantly establish a new session peak bankroll by absorbing losses with controlled spread expansions and step-downs upon winning.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 0; // 0-indexed representation of Levels 1 to 8
        state.peakBankroll = bankroll;
        state.lastHistoryLength = 0;
        
        state.LEVELS = [
            { streets: [1, 4, 7], unitMultiplier: 1 },                                     // L1
            { streets: [1, 4, 7], unitMultiplier: 2 },                                     // L2
            { streets: [1, 4, 7, 10, 13, 16], unitMultiplier: 2 },                         // L3
            { streets: [1, 4, 7, 10, 13, 16], unitMultiplier: 4 },                         // L4
            { streets: [1, 4, 7, 10, 13, 16, 19, 22, 25], unitMultiplier: 4 },             // L5
            { streets: [1, 4, 7, 10, 13, 16, 19, 22, 25], unitMultiplier: 8 },             // L6
            { streets: [1, 4, 7, 10, 13, 16, 19, 22, 25], unitMultiplier: 13 },            // L7
            { streets: [1, 4, 7, 10, 13, 16, 19, 22, 25], unitMultiplier: 26 }             // L8
        ];
    }

    // 2. Process the Last Spin
    if (spinHistory.length > 0 && state.lastHistoryLength !== spinHistory.length) {
        state.lastHistoryLength = spinHistory.length;
        
        const lastSpinResult = spinHistory[spinHistory.length - 1].winningNumber;
        const num = typeof lastSpinResult === 'string' && lastSpinResult === '00' ? -1 : parseInt(lastSpinResult, 10);
        
        const lastLevel = state.LEVELS[state.level];
        
        // A street starting at `s` covers `s`, `s+1`, `s+2`
        const isWin = num > 0 && lastLevel.streets.some(s => num >= s && num <= s + 2);

        if (isWin) {
            if (bankroll >= state.peakBankroll) {
                // Reached or exceeded session peak profit -> Reset
                state.level = 0;
            } else {
                // Win, but haven't recovered all previous losses
                if (state.level >= 5) { // Level 6 is index 5
                    state.level--; // Drop down one level
                }
                // Else stay at the same level (rebet)
            }
        } else {
            // Loss -> Move up the progression
            state.level++;
            
            // Safety cap: If we exceed Level 8, reset to Level 1
            if (state.level >= state.LEVELS.length) {
                state.level = 0;
            }
        }
    }

    // Update peak bankroll after evaluating win/loss logic for the next iteration checks
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 3. Build Bets for Current Level
    const currentLevel = state.LEVELS[state.level];
    const baseUnit = config.betLimits.min;
    
    // Calculate raw amount and clamp it to limits
    let betAmount = baseUnit * currentLevel.unitMultiplier;
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 4. Return Bet Array
    return currentLevel.streets.map(streetStart => ({
        type: 'street',
        value: streetStart,
        amount: betAmount
    }));
}