/**
 * Blue Ribbon Special Roulette Strategy
 * * Source: The Roulette Master (YouTube) - https://www.youtube.com/watch?v=p-4g62VuTzU
 * * The Logic: 
 * Places 8 overlapping "line" (double street) bets to cover 27 numbers. 
 * Specifically covers rows 2 through 10 (numbers 4-30). 
 * - Middle numbers (7-27) are covered by two overlapping line bets.
 * - Edge numbers (4-6, 28-30) are covered by only one line bet.
 * - Uncovered numbers (0, 00, 1-3, 31-36) are not covered at all.
 * * The Progression:
 * - On a Full Win (Hits middle, Net Profit > 0): Decrease bet size by 1 unit.
 * - On a Partial Loss (Hits edge, Net Profit < 0): Increase bet size by 1 unit.
 * - On a Total Loss (Misses all, Net Profit = max loss): Increase bet size by 2 units.
 * * The Goal: Ride out variance and capitalize on a streak of middle numbers 
 * to reach session profit, using a tiered progression to recover from losses 
 * without aggressively over-leveraging the bankroll on a single miss.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define base layout and starting units
    const baseUnit = config.betLimits.min;
    // Starting numbers for the 8 overlapping double streets (line bets)
    const lineStarts = [4, 7, 10, 13, 16, 19, 22, 25];
    
    // 2. Initialize progression state
    if (typeof state.currentUnitMultiplier === 'undefined') {
        state.currentUnitMultiplier = 1; // Start at 1 base unit per position
    }
    
    // Determine the step size based on configuration mode
    const incrementStep = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);

    // 3. Evaluate the previous spin to adjust the progression multiplier
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        let linesWon = 0;
        
        // Calculate how many of our line bets covered the winning number
        for (let i = 0; i < lineStarts.length; i++) {
            let start = lineStarts[i];
            // A line bet covers 6 consecutive numbers
            if (num >= start && num <= start + 5) {
                linesWon++;
            }
        }
        
        // A line bet pays 5:1. Total return = 6 units (5 profit + 1 returned original bet)
        const totalReturnUnits = linesWon * 6;
        const totalCostUnits = 8; // 8 bets placed
        
        if (totalReturnUnits > totalCostUnits) {
            // Full Win: Decrease multiplier by 1 (minimum 1)
            state.currentUnitMultiplier = Math.max(1, state.currentUnitMultiplier - 1);
        } else if (totalReturnUnits > 0 && totalReturnUnits < totalCostUnits) {
            // Partial Loss: Increase multiplier by 1
            state.currentUnitMultiplier += 1;
        } else if (totalReturnUnits === 0) {
            // Total Loss: Increase multiplier by 2
            state.currentUnitMultiplier += 2;
        }
    }
    
    // 4. Calculate the target bet amount for this round
    let amount = baseUnit + ((state.currentUnitMultiplier - 1) * incrementStep);
    
    // 5. Clamp the amount strictly to the configuration limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);
    
    // 6. Safety Bankroll Check: Ensure we have enough for all 8 bets
    if (amount * 8 > bankroll) {
         amount = Math.floor(bankroll / 8);
         // If we can't afford the table minimum across the layout, return no bets
         if (amount < config.betLimits.min) {
             return [];
         }
    }

    // 7. Construct and return the final bet array
    const bets = [];
    for (let i = 0; i < lineStarts.length; i++) {
        bets.push({
            type: 'line',
            value: lineStarts[i],
            amount: amount
        });
    }
    
    return bets;
}