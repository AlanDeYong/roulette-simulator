/**
 * Source: THEROULETTEMASTERTV (https://www.youtube.com/watch?v=b8eL7gvqQno)
 * * The Logic: 
 * The system places two concurrent bets of equal value on outside even-money sections: 'Low' (1-18) and 'Even'.
 * It aims to generate a high frequency of "break-even" spins (where one bet wins and the other loses) to safely 
 * cycle capital and accumulate massive casino comp/tier credits without rapidly draining the bankroll.
 * * The Progression:
 * - Total Win (Both bets win): Reset the bet amount back to the base minimum unit.
 * - Break Even (One bet wins, one loses): Keep the bet size exactly the same.
 * - Total Loss (Both bets lose, e.g., on High/Odd or Zero): Double the current bet amount, AND add an 
 * additional incremental unit to each position.
 * * The Goal: 
 * Maximize table playtime and comp accumulation while surviving variance, ultimately securing profit 
 * by eventually hitting a "Total Win" at a higher tier of the progression.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit using the outside bet minimum
    const baseUnit = config.betLimits.minOutside;
    
    // 2. Initialize State for tracking the progression amount per position
    if (state.currentBetAmount === undefined) {
        state.currentBetAmount = baseUnit;
    }

    // 3. Process the last spin result to adjust the progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = parseInt(lastSpin.winningNumber, 10); // Ensure integer evaluation
        
        let wins = 0;
        
        // Evaluate 'Low' bet (1 through 18)
        if (!isNaN(num) && num >= 1 && num <= 18) {
            wins++;
        }
        
        // Evaluate 'Even' bet (0 and 00 are not even in roulette)
        if (!isNaN(num) && num > 0 && num % 2 === 0) {
            wins++;
        }
        
        // Apply progression rules based on win count
        if (wins === 2) {
            // Total Win: Reset to base level
            state.currentBetAmount = baseUnit;
        } else if (wins === 1) {
            // Break Even: No change to bet amount
        } else if (wins === 0) {
            // Total Loss: Double the bet and add the configured increment
            let increment = config.incrementMode === 'base' 
                ? baseUnit 
                : (config.minIncrementalBet !== undefined ? config.minIncrementalBet : 1);
                
            state.currentBetAmount = (state.currentBetAmount * 2) + increment;
        }
    }

    // 4. CLAMP TO LIMITS
    let amount = state.currentBetAmount;
    
    // Ensure it doesn't fall below the minimum outside bet
    amount = Math.max(amount, config.betLimits.minOutside); 
    
    // Ensure individual bet doesn't exceed maximum table limit
    amount = Math.min(amount, config.betLimits.max);

    // Bankroll safety check: adjust if the player cannot afford both bets at the current tier
    if ((amount * 2) > bankroll) {
        amount = Math.floor(bankroll / 2);
    }

    // If we cannot even afford the minimum limit, return no bets to signal stop-loss/ruin
    if (amount < config.betLimits.minOutside) {
        return []; 
    }

    // 5. Return Bets
    return [
        { type: 'low', amount: amount },
        { type: 'even', amount: amount }
    ];
}