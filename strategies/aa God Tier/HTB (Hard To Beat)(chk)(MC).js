/**
 * HTB (Hard To Beat) Roulette Strategy
 * 
 * Source: https://youtu.be/V3_ObhwxGmg (Gamblers University)
 * 
 * The Full Logic in details:
 * This strategy covers a vast majority of the board using a specific combination of outside bets 
 * to generate frequent hits and minimize variance. The baseline layout consists of:
 * - 1 unit on the 2nd Dozen
 * - 1 unit on the 3rd Dozen
 * - 1 unit on the 2nd Column
 * - 2 units on High (19-36)
 * 
 * The Full Bet Progression in details:
 * - The system tracks your highest bankroll achieved during the session (Session High).
 * - If a spin results in a net loss (bankroll is lower than before the spin), the progression level increases by 1.
 * - If a spin results in a net win or break-even, but the bankroll remains below the session high, the progression level stays the same.
 * - If the bankroll reaches or exceeds the session high, the progression resets to Level 1, and the session high is updated to the new bankroll.
 * - Bet increments: As the level increases, bets increase. Depending on `config.incrementMode`, they increase either by their base amount ('base') or a fixed minimum increment ('fixed').
 * 
 * The Goal:
 * - The creator's target is 30 to 35 units of profit (e.g., $30 on a $5 starting layout). 
 * - This function uses a strict stop-loss/take-profit condition and will halt (return null) once a profit of +30 base units is achieved.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.minOutside;
    const targetProfit = 30000 * unit;
    
    // 2. Initialize State on first spin
    if (state.startingBankroll === undefined) {
        state.startingBankroll = bankroll;
        state.sessionHigh = bankroll;
        state.progression = 1;
        state.lastBankroll = bankroll;
    } else {
        // 3. Evaluate previous spin outcome and adjust progression
        const netSpinProfit = bankroll - state.lastBankroll;
        
        if (bankroll >= state.sessionHigh) {
            if (bankroll > state.sessionHigh) {
                state.sessionHigh = bankroll;
            }
            state.progression = 1; // Reset to base level on reaching/exceeding session high
        } else if (netSpinProfit < 0) {
            state.progression++; // Increase level on a net loss
        }
        
        state.lastBankroll = bankroll;
    }
    
    // 4. Check Goal Condition
    if (bankroll >= state.startingBankroll + targetProfit) {
        return null; // Target reached, stop betting
    }
    
    // 5. Calculate Bet Amounts with Progression & Increment Mode Fallbacks
    const getBetAmount = (initialMultiplier) => {
        const initialBet = initialMultiplier * unit;
        
        // Safety fallback: Default to 1 if minIncrementalBet is missing or undefined
        const safeMinIncrement = config.minIncrementalBet || 1; 
        const increment = config.incrementMode === 'base' ? initialBet : safeMinIncrement;
        
        let amount = initialBet + (increment * (state.progression - 1));
        
        // Secondary safety catch for any NaN injection
        if (isNaN(amount)) {
            amount = initialBet;
        }
        
        // Clamp to limits
        return Math.min(config.betLimits.max, Math.max(amount, config.betLimits.minOutside));
    };

    // 6. Return Bet Placements
    return [
        { type: 'dozen', value: 2, amount: getBetAmount(1) },
        { type: 'dozen', value: 3, amount: getBetAmount(1) },
        { type: 'column', value: 2, amount: getBetAmount(1) },
        { type: 'high', amount: getBetAmount(2) }
    ];
}