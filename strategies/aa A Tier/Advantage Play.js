/**
 * Strategy: Advantage Play Roulette (Steve's System)
 * Source: THEROULETTEMASTERTV (https://www.youtube.com/watch?v=aygf2FDfSgI)
 *
 * The Logic:
 * 1.  **Bet Coverage**: Covers approximately 66% of the table by betting on TWO Dozens simultaneously (24 numbers).
 * - This implementation defaults to Dozen 1 (1-12) and Dozen 2 (13-24).
 * 2.  **The Progression**:
 * - **After a Loss** (Result is Dozen 3 or Zero): Increase the bet on EACH dozen by 1 unit.
 * (e.g., $10 -> $20 -> $30). This is a linear progression, not a Martingale.
 * - **After a Win** (Result is in Dozen 1 or 2): Keep the bet amount exactly the same.
 * (e.g., Win at $30 -> Next bet is $30).
 * 3.  **The Goal (Reset)**:
 * - The strategy aims for a profit of 15% of the starting bankroll.
 * - When the current bankroll hits this target, the progression fully resets to the base unit.
 * - A new target is then set (Current Target + 15%).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Limits
    const minBet = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    // 2. Initialize State
    if (!state.initialized) {
        state.startingBankroll = bankroll;
        state.unitSize = minBet;            // Base betting unit (e.g., $5 or $10)
        state.currentUnit = state.unitSize; // Current bet per Dozen
        state.dozens = [1, 2];              // Betting on Dozen 1 and Dozen 2
        
        // Calculate the 15% profit target
        state.profitTarget = state.startingBankroll * 0.15;
        state.nextBankrollTarget = state.startingBankroll + state.profitTarget;
        
        state.initialized = true;
    }

    // 3. Process Last Spin (if it exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Determine if we won the previous bet
        // We win if the number falls into Dozen 1 (1-12) or Dozen 2 (13-24)
        // We lose if it hits Dozen 3 (25-36) or Zero (0)
        let won = false;
        if (lastNum >= 1 && lastNum <= 24) {
            won = true;
        }

        // Apply Advantage Play Progression
        if (won) {
            // On Win: STICK. Keep the bet amount the same.
            // (No change to state.currentUnit)
        } else {
            // On Loss: INCREASE. Add 1 unit to the bet.
            state.currentUnit += state.unitSize;
        }

        // Check Goal/Reset Condition
        // If we have reached the 15% profit target, reset everything.
        if (bankroll >= state.nextBankrollTarget) {
            state.currentUnit = state.unitSize; // Reset to base unit
            state.nextBankrollTarget += state.profitTarget; // Set next milestone
        }
    }

    // 4. Validate Limits (Clamp)
    let finalAmount = state.currentUnit;
    
    // Ensure we don't bet less than table minimum
    finalAmount = Math.max(finalAmount, minBet);
    
    // Ensure we don't exceed table maximum
    finalAmount = Math.min(finalAmount, maxBet);

    // 5. Place Bets
    // We place two bets, one on each of the selected dozens
    return [
        { type: 'dozen', value: state.dozens[0], amount: finalAmount },
        { type: 'dozen', value: state.dozens[1], amount: finalAmount }
    ];
}