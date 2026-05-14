/*
 * Mark Ganon's "Surefire Roulette System"
 * Source: https://youtu.be/nfi3HYDa3E8 (The Roulette Master)
 *
 * The Logic:
 * - Consistently place a single bet on the 3rd Column.
 *
 * The Progression:
 * - Start with a base bet of $3 (or the table's minimum outside bet if higher).
 * - After a WIN: Maintain the current bet size. Reset the "loss counter" to 0.
 * - After a LOSS: Increment the "loss counter" by 1.
 * - If you experience TWO consecutive losses at the *current* bet amount, increase the bet 
 *   by $1 (or config.minIncrementalBet). The "loss counter" then resets to 0.
 *
 * The Goal / Reset Condition:
 * - The primary goal is to reach $200 in profit, achieved by grinding out $100 milestones.
 * - Whenever the session profit reaches a $100 multiple (e.g., +$100, +$200), the bet size 
 *   resets entirely back to the starting base bet to lock in the gains and restart the sequence.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and progression variables
    // Strategy starts at $3, but we must respect the table's minimum outside bet
    const baseBet = Math.max(3, config.betLimits.minOutside);
    const increment = config.minIncrementalBet || 1;
    const profitMilestone = 100; // Reset bet every $100 in profit

    // 2. Initialize State on first run
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.currentBetAmount = baseBet;
        state.lossesAtCurrentAmount = 0;
        state.profitTarget = profitMilestone;
    }

    // 3. Process the last spin result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Check if the 3rd column hit (numbers 3, 6, 9... 36)
        // Ensure we explicitly exclude 0 and 00
        const isWin = lastNum !== 0 && lastNum !== '00' && (lastNum % 3 === 0);

        if (isWin) {
            // Reset the loss counter for the current bet level
            state.lossesAtCurrentAmount = 0;

            // Check if we hit our profit milestone
            const currentProfit = bankroll - state.initialBankroll;
            if (currentProfit >= state.profitTarget) {
                // Milestone reached: reset progression back to base bet
                state.currentBetAmount = baseBet;
                // Increment target for the next $100 milestone
                state.profitTarget += profitMilestone;
            }
        } else {
            // It's a loss
            state.lossesAtCurrentAmount += 1;

            // If we've lost twice at the current bet size, increase the bet
            if (state.lossesAtCurrentAmount >= 2) {
                state.currentBetAmount += increment;
                state.lossesAtCurrentAmount = 0; // Reset counter for the new bet size
            }
        }
    }

    // 4. Clamp the calculated bet amount to ensure it respects table limits
    let finalBetAmount = state.currentBetAmount;
    finalBetAmount = Math.max(finalBetAmount, config.betLimits.minOutside);
    finalBetAmount = Math.min(finalBetAmount, config.betLimits.max);
    
    // Sync state to clamped amount to prevent logic drift
    state.currentBetAmount = finalBetAmount; 

    // 5. Return the bet placement
    return [
        { type: 'column', value: 3, amount: finalBetAmount }
    ];
}