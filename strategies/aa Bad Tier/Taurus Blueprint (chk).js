/**
 * Source: The Lucky Felt (YouTube) - https://youtu.be/cqxCkqRMEks
 * 
 * The Full Logic in details: 
 * - The "Taurus Blueprint" covers ~73% of the board with a combination of Dozens and Splits.
 * - Bets are placed on the 1st Dozen, 3rd Dozen, and two specific Splits in the 2nd Dozen (14/17 and 20/23).
 * - Triggers:
 *   - "Wash": If the ball lands in the 1st or 3rd Dozen, it pays 2:1. The profit perfectly covers the lost splits, resulting in a net profit of exactly 0. The progression stays the same (stand your ground).
 *   - "Win": If the ball lands on one of the splits (14, 17, 20, 23), it pays 17:1, resulting in a large net profit. The progression resets to step 1.
 *   - "Loss": If the ball lands on 0, 00, or any uncovered number in the 2nd Dozen, the entire bet is lost, and the progression advances to the next step.
 * 
 * The Full Bet Progression in details:
 * - Step 1: 2 units on 1st/3rd Dozens, 1 unit on splits 14/17 and 20/23.
 * - Step 2 (after 1st loss): 3 units on Dozens, 2 units on splits (add exactly 1 unit to every position).
 * - Step 3 (after 2nd loss): 4 units on Dozens, 3 units on splits.
 * - Step 4 (after 3rd loss): 5 units on Dozens, 4 units on splits (The Final Stand).
 * - Pragmatic Reset: If a 4th consecutive loss occurs, accept the variance and reset entirely to Step 1.
 * - Unit calculation relies on table limits to maintain the 2:1 Dozen to Split ratio.
 * 
 * The Goal:
 * - Massive board coverage designed as a "comp grinder" to churn through table volume with low variance, 
 *   protecting capital through washes while waiting for the inside trap (the splits) to hit for profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    // To maintain the 2:1 ratio for Dozen:Split, ensure 2 * unit meets the minimum for outside bets
    let unit = config.betLimits.min;
    if (2 * unit < config.betLimits.minOutside) {
        unit = Math.ceil(config.betLimits.minOutside / 2);
    }
    
    // 2. Initialize State
    if (!state.progression) {
        state.progression = 1;
    }
    
    // 3. Process Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        // Define outcome conditions
        const isWash = (num >= 1 && num <= 12) || (num >= 25 && num <= 36);
        const isWin = [14, 17, 20, 23].includes(num);
        
        if (isWin) {
            state.progression = 1; // Win resets progression
        } else if (!isWash) {
            // It's a loss (0, 00, or uncovered 2nd dozen numbers)
            state.progression++;
            
            // Pragmatic Reset after 4th loss
            if (state.progression > 4) {
                state.progression = 1;
            }
        }
        // If isWash, progression remains unchanged as net profit is 0
    }
    
    // 4. Calculate Bet Amounts
    const initialDozen = 2 * unit;
    const initialSplit = 1 * unit;
    
    // Handle increment mode config
    const dozenIncrement = config.incrementMode === 'base' ? initialDozen : (config.minIncrementalBet * unit);
    const splitIncrement = config.incrementMode === 'base' ? initialSplit : (config.minIncrementalBet * unit);
    
    let dozenAmount = initialDozen + ((state.progression - 1) * dozenIncrement);
    let splitAmount = initialSplit + ((state.progression - 1) * splitIncrement);
    
    // 5. Clamp to Limits
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);
    
    splitAmount = Math.max(splitAmount, config.betLimits.min);
    splitAmount = Math.min(splitAmount, config.betLimits.max);
    
    // 6. Construct and Return Bets
    return [
        { type: 'dozen', value: 1, amount: dozenAmount },
        { type: 'dozen', value: 3, amount: dozenAmount },
        { type: 'split', value: [14, 17], amount: splitAmount },
        { type: 'split', value: [20, 23], amount: splitAmount }
    ];
}