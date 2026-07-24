/*
 * Strategy Name: Nine Lives Strategy
 * Source: https://youtu.be/eBjWREX5cm4 (The Roulette Master, system by Chris)
 *
 * The Full Logic in details:
 * - The strategy places bets on 9 specific streets, deliberately leaving out the streets
 *   starting with 4, 16, and 19 (as well as the zeroes).
 * - The 9 active streets are those starting with: 1, 7, 10, 13, 22, 25, 28, 31, and 34.
 * - These specific streets are selected because of their proximity around the zeroes on the wheel.
 *
 * The Full Bet Progression in details:
 * - It uses a Fibonacci progression based on unit multipliers: 1, 2, 3, 5, 8, 13, 21, 34, 55, etc.
 * - After any LOSS, the progression moves up one step, applying the next Fibonacci multiplier to all active streets.
 * - After any WIN, the bet size does NOT increase. Instead, the specific street that just won
 *   is REMOVED from the active betting list, reducing table exposure. The remaining streets 
 *   continue to be bet at the exact same progression level.
 *
 * The Goal:
 * - Generate a session profit while safely recovering from losing streaks without drastic doubling.
 * - Stop-loss/Reset condition: If at any point after a win, the current bankroll reaches or 
 *   exceeds the highest recorded session bankroll (high-water mark), the strategy RESETS 
 *   completely: restoring all 9 streets and returning to the base level 1-unit bet.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (state.fibIndex === undefined) {
        state.baseStreets = [1, 7, 10, 13, 22, 25, 28, 31, 34];
        state.streets = [...state.baseStreets];
        state.fibSeq = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];
        state.fibIndex = 0;
        state.refBankroll = bankroll; // Tracks the high-water mark
        state.lastBankroll = bankroll;
    }

    // 2. Process the previous spin (if any)
    if (spinHistory.length > 0) {
        const wonLastSpin = bankroll > state.lastBankroll;

        if (wonLastSpin) {
            // Check if we hit our session profit goal (new high-water mark)
            if (bankroll >= state.refBankroll) {
                state.refBankroll = bankroll; // Update the high-water mark
                
                // Reset progression and restore all streets
                state.fibIndex = 0;
                state.streets = [...state.baseStreets];
            } else {
                // We won, but haven't fully recovered. 
                // Remove the winning street from active bets.
                const lastResult = spinHistory[spinHistory.length - 1].winningNumber;
                
                // Calculate which street the number belongs to
                if (lastResult > 0) { // Exclude 0 or 00
                    const winStreet = Math.floor((lastResult - 1) / 3) * 3 + 1;
                    state.streets = state.streets.filter(s => s !== winStreet);
                }

                // Failsafe: if we somehow removed all streets, reset to avoid 0 bets
                if (state.streets.length === 0) {
                    state.fibIndex = 0;
                    state.streets = [...state.baseStreets];
                }
            }
        } else {
            // We lost. Increase Fibonacci progression index.
            state.fibIndex++;
            
            // Cap the fib index to prevent out-of-bounds errors on deep losing streaks
            if (state.fibIndex >= state.fibSeq.length) {
                state.fibIndex = state.fibSeq.length - 1;
            }
        }
    }

    // 3. Calculate Bet Amount
    const unit = config.incrementMode === 'base' ? config.betLimits.min : (config.minIncrementalBet || config.betLimits.min);
    let multiplier = state.fibSeq[state.fibIndex];
    let amount = unit * multiplier;

    // 4. Clamp to Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Update lastBankroll BEFORE returning
    state.lastBankroll = bankroll;

    // 6. Construct and Return Bets
    const bets = [];
    for (const s of state.streets) {
        bets.push({ type: 'street', value: s, amount: amount });
    }

    return bets;
}