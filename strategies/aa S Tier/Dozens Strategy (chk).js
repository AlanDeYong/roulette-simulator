/**
 * 'Dozens' Roulette Strategy
 * * Source: https://youtu.be/Y8jLRAmJRtU (Gamblers University)
 * * The Full Logic in details:
 * - The strategy achieves high table coverage (~63%) by betting on the Dozens, combined with 
 * a unique recovery mechanism utilizing the 3rd Dozen when a loss occurs.
 * - Triggers & Conditions:
 * - Phase 1 (Default): Bet on both the 1st and 2nd Dozens simultaneously.
 * - If Phase 1 wins, you stay in Phase 1.
 * - If Phase 1 loses, you trigger Phase 2 to recover: bet on the 3rd Dozen ONLY.
 * - If Phase 2 wins, the loss is exactly recovered, and you return to Phase 1.
 * - If Phase 2 loses, the recovery failed, and you return to Phase 1 to try again with a larger bet.
 * * The Full Bet Progression in details:
 * - Initial Bet: 1 base unit (e.g., $5) on both the 1st and 2nd Dozen.
 * - Win on Phase 1 (1st & 2nd Dozen): 
 * - If you reached a new session high bankroll, reset the bet to the base unit.
 * - If you are still in a drawdown (recovering past losses), INCREASE the bet size by 1 increment and stay in Phase 1.
 * - Loss on Phase 1 (1st & 2nd Dozen):
 * - Switch to Phase 2 (3rd Dozen only). Keep the bet amount EXACTLY the same.
 * - Win on Phase 2 (3rd Dozen):
 * - Switch back to Phase 1 (1st & 2nd Dozen). Keep the bet amount EXACTLY the same.
 * - Loss on Phase 2 (3rd Dozen):
 * - Switch back to Phase 1 (1st & 2nd Dozen). INCREASE the bet amount by 1 increment.
 * - Note: The unit increment respects `config.incrementMode` (falls back to base unit if undefined).
 * * The Goal:
 * - The target profit is 10 base units (e.g., $50 profit on a $5 base unit). 
 * - The function returns an empty array to stop betting once the target is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialization and Core Parameters
    const unit = (config.betLimits && config.betLimits.minOutside) ? config.betLimits.minOutside : 5;
    
    // Safely determine increment to prevent NaN errors
    const increment = config.incrementMode === 'base' 
        ? unit 
        : (config.minIncrementalBet !== undefined ? config.minIncrementalBet : unit);

    // Initialize State variables on the very first run
    if (state.startingBankroll === undefined) {
        state.startingBankroll = bankroll;
        state.highWaterMark = bankroll;
        state.phase = 'two_dozens'; // Can be 'two_dozens' or 'one_dozen'
        state.currentAmount = unit;
    }

    // Set target using the dynamically locked starting bankroll
    const targetBankroll = state.startingBankroll + (10000 * unit);

    // Stop betting if the win goal is achieved
    if (bankroll >= targetBankroll) {
        return [];
    }

    // 2. Track the highest bankroll achieved
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
    }

    // 3. Process the Result of the Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        let wonLastSpin = false;

        // Evaluate if our last bet was a winner based on the state phase we were in
        if (state.phase === 'two_dozens') {
            // Winning numbers for 1st (1-12) and 2nd (13-24) Dozens
            if (lastSpin.winningNumber >= 1 && lastSpin.winningNumber <= 24) {
                wonLastSpin = true;
            }
        } else if (state.phase === 'one_dozen') {
            // Winning numbers for 3rd (25-36) Dozen
            if (lastSpin.winningNumber >= 25 && lastSpin.winningNumber <= 36) {
                wonLastSpin = true;
            }
        }

        // Apply Phase and Progression Transitions
        if (state.phase === 'two_dozens') {
            if (wonLastSpin) {
                if (bankroll >= state.highWaterMark) {
                    state.phase = 'two_dozens';
                    state.currentAmount = unit; // Reset to base unit
                } else {
                    state.phase = 'two_dozens';
                    state.currentAmount += increment; // Increase bet to push for recovery
                }
            } else {
                state.phase = 'one_dozen';
                // currentAmount stays the same for the single dozen recovery
            }
        } else if (state.phase === 'one_dozen') {
            if (wonLastSpin) {
                state.phase = 'two_dozens';
                if (bankroll >= state.highWaterMark) {
                    state.currentAmount = unit;
                }
                // If we didn't hit a new high, currentAmount stays the same as we transition back
            } else {
                state.phase = 'two_dozens';
                state.currentAmount += increment; // Failed recovery, increase bet and switch back
            }
        }
    }

    // Safety fallback to prevent silent NaN failures from cascading
    if (isNaN(state.currentAmount) || state.currentAmount === undefined) {
        state.currentAmount = unit;
    }

    // 4. Clamp the Bet Amount to Table Limits
    let amount = state.currentAmount;
    if (config.betLimits) {
        if (config.betLimits.minOutside !== undefined) amount = Math.max(amount, config.betLimits.minOutside);
        if (config.betLimits.max !== undefined) amount = Math.min(amount, config.betLimits.max);
    }
    
    // Sync the clamped amount back to state
    state.currentAmount = amount;

    // 5. Build and Return the Bets
    let bets = [];
    if (state.phase === 'two_dozens') {
        bets.push({ type: 'dozen', value: 1, amount: amount });
        bets.push({ type: 'dozen', value: 2, amount: amount });
    } else {
        bets.push({ type: 'dozen', value: 3, amount: amount });
    }

    return bets;
}