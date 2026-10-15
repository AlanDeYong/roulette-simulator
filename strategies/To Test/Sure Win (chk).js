/**
 * SURE WIN ROULETTE SYSTEM
 * Source: https://www.youtube.com/watch?v=2U7NNMFkeR0 (The Roulette Master)
 * * The Logic:
 * - Places two simultaneous outside bets: the 2nd Dozen and the 2nd Column.
 * - This creates a net coverage of 20 numbers, with 4 numbers acting as "jackpots" (overlapping).
 * * The Progression:
 * - The base bet size is set dynamically using the table's minimum outside bet (`config.betLimits.minOutside`).
 * - After a LOSS (meaning the spun number is neither in the 2nd dozen nor the 2nd column), 
 * the bet amount on EACH position increases by the base unit.
 * - After a WIN (either the dozen hits, the column hits, or both hit), the bet amount 
 * remains EXACTLY the same. The progression does not reset on a standard win.
 * * The Goal:
 * - Micro-Goal (Reset Condition): Whenever the bankroll hits a profit milestone of 25 base units 
 * (e.g., +$50 profit if the base bet is $2), the bets reset back down to the base unit.
 * - Macro-Goal (Stop Condition): The session stops entirely when the total profit reaches 
 * 100 base units (e.g., +$200 profit on a $2 base bet), simulating the player's mandatory break period.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first spin
    if (state.baseUnit === undefined) {
        state.baseUnit = config.betLimits.minOutside;
        state.currentBetAmount = state.baseUnit;
        
        // Trackers for our micro and macro goals
        state.sessionStartBankroll = bankroll;
        state.milestoneStartBankroll = bankroll;
    }

    const currentProfit = bankroll - state.sessionStartBankroll;
    const milestoneProfit = bankroll - state.milestoneStartBankroll;
    
    // Define targets based on the base unit to ensure scalability across different table limits
    const microGoal = 25 * state.baseUnit;  // The $50 reset target in the video
    const macroGoal = 50000 * state.baseUnit; // The $200 stop-session target in the video

    // 2. Check Macro-Goal (Take Profit / Session End)
    if (currentProfit >= macroGoal) {
        return []; // Stop betting
    }

    // 3. Check Micro-Goal (Reset Progression)
    if (milestoneProfit >= microGoal) {
        state.currentBetAmount = state.baseUnit;
        state.milestoneStartBankroll = bankroll; // Establish the new floor for the next $50 run
    } 
    // 4. Handle Progression based on the previous spin
    else if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = parseInt(lastSpin.winningNumber, 10);
        
        // Guard against 0 and 00
        const isZero = (lastSpin.winningNumber === 0 || lastSpin.winningNumber === '00' || lastSpin.winningNumber === '0');
        
        // Evaluate if we hit our positions
        const isDozen2 = !isZero && (num >= 13 && num <= 24);
        const isColumn2 = !isZero && (num % 3 === 2);

        // A loss in this system ONLY occurs when we hit neither position
        const isLoss = !isDozen2 && !isColumn2;

        if (isLoss) {
            state.currentBetAmount += state.baseUnit;
        }
    }

    // 5. Clamp to Limits
    let finalAmount = Math.max(state.currentBetAmount, config.betLimits.minOutside);
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // 6. Return Bets
    return [
        { type: 'dozen', value: 2, amount: finalAmount },
        { type: 'column', value: 2, amount: finalAmount }
    ];
}