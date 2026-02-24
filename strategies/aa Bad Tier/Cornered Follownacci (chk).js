/*
 * SOURCE: CEG Dealer School - "Win Almost Every Single Time || Cornered Follownacci"
 * URL: https://www.youtube.com/watch?v=M2SG0L5PqLc
 * * THE LOGIC: 
 * This is a dozen-betting strategy. You begin by betting on the 2nd Dozen. 
 * If you lose, your next bet "follows the ball" (e.g., if the losing spin landed on 4, 
 * which is the 1st Dozen, your next bet is placed on the 1st Dozen). 
 * If a 0 or 00 lands, the strategy defaults back to targeting the 2nd Dozen.
 * * THE PROGRESSION: 
 * It utilizes the Fibonacci sequence (1, 1, 2, 3, 5, 8, 13, 21, 34, 55...) as a multiplier 
 * against the base unit. After a loss, move one step forward in the sequence. 
 * After a win, completely reset the progression back to the first step and target the 2nd Dozen.
 * * THE GOAL: 
 * Grind small base-unit profits. The strategy includes a strict stop-loss: if you hit 
 * 10 consecutive losses, you accept the wipeout, reset the progression, and start over 
 * to prevent catastrophic bankroll drain.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.fibIndex === undefined) {
        state.fibIndex = 0;
        state.consecutiveLosses = 0;
        state.targetDozen = 2; // Always start on the 2nd dozen
        state.lastBetDozen = null; // Track what we actually bet on to evaluate win/loss
        // Pre-compute Fibonacci sequence for multipliers
        state.fibSequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987]; 
    }

    // Helper function to determine the dozen of a number
    const getDozen = (num) => {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0; // 0 or 00
    };

    // 2. Evaluate Previous Spin (if history exists)
    if (spinHistory.length > 0 && state.lastBetDozen !== null) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastSpinDozen = getDozen(lastSpin.winningNumber);

        // Check if our last bet won
        if (state.lastBetDozen === lastSpinDozen) {
            // WIN: Reset everything
            state.fibIndex = 0;
            state.consecutiveLosses = 0;
            state.targetDozen = 2;
        } else {
            // LOSS: Progress sequence and update target
            state.fibIndex++;
            state.consecutiveLosses++;

            // Stop-Loss Condition: 10 losses in a row
            if (state.consecutiveLosses >= 10) {
                state.fibIndex = 0;
                state.consecutiveLosses = 0;
                state.targetDozen = 2;
            } else {
                // Follow the ball logic
                if (lastSpinDozen === 0) {
                    state.targetDozen = 2; // Any 0 restarts target on second dozen
                } else {
                    state.targetDozen = lastSpinDozen;
                }
            }
        }
    }

    // 3. Calculate Bet Amount
    const baseUnit = config.betLimits.minOutside;
    
    // Safety check in case fibIndex exceeds our pre-calculated array (though stop-loss at 10 prevents this)
    const safeFibIndex = Math.min(state.fibIndex, state.fibSequence.length - 1);
    const multiplier = state.fibSequence[safeFibIndex];
    
    let amount = baseUnit * multiplier;

    // 4. Clamp to Limits
    amount = Math.max(amount, config.betLimits.minOutside); 
    amount = Math.min(amount, config.betLimits.max);

    // 5. Place Bet and Update Tracking State
    state.lastBetDozen = state.targetDozen;

    return [{ 
        type: 'dozen', 
        value: state.targetDozen, 
        amount: amount 
    }];
}