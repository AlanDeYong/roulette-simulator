/**
 * Strategy Name: The Bouncer Strategy
 * Source: The Roulette Master (YouTube) - https://www.youtube.com/watch?v=A3sSmsFw1h4
 * 
 * The Full Logic in details:
 * This strategy sweeps across the bottom row of outside bets on the roulette layout 
 * from left to right. It places one bet per spin, cycling through the following 
 * sequence continuously: Low (1-18), Even, Red, Black, Odd, High (19-36). After betting 
 * on High, the sequence wraps back around to Low. This continuous movement gives 
 * the strategy its "Bouncer" name. It avoids long losing streaks associated with 
 * betting on a single static option.
 * 
 * The Full Bet Progression in details:
 * The strategy uses a classic d'Alembert progression combined with the sweeping motion:
 * 1. The initial bet is the table minimum for outside bets.
 * 2. If the bet loses, the next bet amount is increased by 1 unit.
 * 3. If the bet wins, the next bet amount is decreased by 1 unit (clamped to the minimum limit).
 * 
 * The Goal:
 * The creator dictates a daily target goal of +8 base units (e.g., winning $200 on a $25 base).
 * Once the bankroll hits a profit of +8 units from the session's start, the progression
 * is completely reset to the base unit, and a new session baseline is established to simulate
 * "cashing out" and starting a fresh day.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialization
    if (!state.initialized) {
        // The sequence maps directly from left to right across the standard roulette table layout
        state.sequence = ['low', 'even', 'red', 'black', 'odd', 'high'];
        state.currentIndex = 0;
        
        state.currentBetAmount = config.betLimits.minOutside;
        state.sessionStartBankroll = bankroll;
        state.initialized = true;
    }

    // 2. Progression Update Logic (Runs if there is history)
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastBet = state.lastBetType;
        let isWin = false;
        
        // Evaluate Win/Loss for the previous bet
        if (lastResult.winningColor !== 'green') {
            switch (lastBet) {
                case 'red': 
                    isWin = (lastResult.winningColor === 'red'); 
                    break;
                case 'black': 
                    isWin = (lastResult.winningColor === 'black'); 
                    break;
                case 'even': 
                    isWin = (lastResult.winningNumber % 2 === 0); 
                    break;
                case 'odd': 
                    isWin = (lastResult.winningNumber % 2 !== 0); 
                    break;
                case 'low': 
                    isWin = (lastResult.winningNumber >= 1 && lastResult.winningNumber <= 18); 
                    break;
                case 'high': 
                    isWin = (lastResult.winningNumber >= 19 && lastResult.winningNumber <= 36); 
                    break;
            }
        }
        
        // Determine increment amount based on configuration
        let increment = config.incrementMode === 'base' ? config.betLimits.minOutside : (config.minIncrementalBet || 1);
        
        // Apply d'Alembert Progression
        if (isWin) {
            state.currentBetAmount -= increment; // Down on a win
        } else {
            state.currentBetAmount += increment; // Up on a loss
        }
        
        // Clamp bounds to table limits before verifying the profit target
        state.currentBetAmount = Math.max(state.currentBetAmount, config.betLimits.minOutside);
        state.currentBetAmount = Math.min(state.currentBetAmount, config.betLimits.max);
        
        // Check Session Goal: Target is +8 Base Units
        let targetProfit = state.sessionStartBankroll + (8 * config.betLimits.minOutside);
        if (bankroll >= targetProfit) {
            // Goal achieved! Reset progression to minimum and lock in new session milestone.
            state.currentBetAmount = config.betLimits.minOutside;
            state.sessionStartBankroll = bankroll; 
        }
        
        // Advance to the next outside bet in the sequence
        state.currentIndex = (state.currentIndex + 1) % state.sequence.length;
    }

    // 3. Track state to evaluate next spin and return bet
    state.lastBetType = state.sequence[state.currentIndex];

    return [{
        type: state.lastBetType,
        amount: state.currentBetAmount
    }];
}