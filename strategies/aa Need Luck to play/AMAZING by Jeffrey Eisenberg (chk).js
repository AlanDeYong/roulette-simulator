/**
 * AMAZING ROULETTE STRATEGY (by Jeffrey Eisenberg)
 *
 * Source: The Roulette Master (YouTube) - http://www.youtube.com/watch?v=lDXs58oEPkI
 *
 * The Logic:
 * This strategy covers 13 distinct numbers spread evenly across the wheel using four inside bets:
 * 1. A split on [0, 2]
 * 2. A corner on 1, 2, 4, 5 (Value: 1)
 * 3. A corner on 13, 14, 16, 17 (Value: 13)
 * 4. A corner on 32, 33, 35, 36 (Value: 32)
 * Note: The number '2' is a "jackpot" number because it is covered by BOTH the split 
 * and the first corner bet, paying out double if it hits.
 *
 * The Progression:
 * - Bets start at a base unit (e.g., 5).
 * - After a LOSS: The bet size on *each* position increases by 2 increments.
 * - After a WIN (and in overall session profit): All bets reset to the base unit.
 * - After a WIN (but still negative for the session): The bet size decreases by 1 increment.
 *
 * The Goal:
 * - Stop betting and "declare victory" once a 25% profit of the starting bankroll is achieved.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialization
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.targetProfit = bankroll * 3; // 25% cash-out goal
        
        // Strategy naturally uses $5 units, so we default to 5 or the table min if higher
        state.baseUnit = Math.max(config.betLimits.min, 5); 
        state.currentBetAmount = state.baseUnit;
        
        state.initialized = true;
    }

    // 2. Check Stop Condition
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        // Goal reached: Stop placing bets
        return []; 
    }

    // 3. Process Previous Spin History
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // The specific numbers covered by our 4 betting positions
        const coveredNumbers = [0, 1, 2, 4, 5, 13, 14, 16, 17, 32, 33, 35, 36];
        const isWin = coveredNumbers.includes(lastSpin.winningNumber);
        
        // Are we currently up for the session?
        const inSessionProfit = bankroll >= state.initialBankroll;

        // Determine the increment step based on user config
        const increment = config.incrementMode === 'base' ? state.baseUnit : config.minIncrementalBet;

        if (isWin) {
            if (inSessionProfit) {
                // Win + Session Profit = Complete Reset
                state.currentBetAmount = state.baseUnit;
            } else {
                // Win + Negative Session = Drop 1 increment to stair-step down
                state.currentBetAmount -= increment;
            }
        } else {
            // Loss = Add 2 increments to chase recovery
            state.currentBetAmount += (2 * increment);
        }

        // Ensure the bet never drops below the base unit
        if (state.currentBetAmount < state.baseUnit) {
            state.currentBetAmount = state.baseUnit;
        }
    }

    // 4. Calculate Final Bet Amount (Clamp to Config Limits)
    let amount = state.currentBetAmount;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Place Bets
    return [
        { type: 'split', value: [0, 2], amount: amount },
        { type: 'corner', value: 1, amount: amount },
        { type: 'corner', value: 13, amount: amount },
        { type: 'corner', value: 32, amount: amount }
    ];
}