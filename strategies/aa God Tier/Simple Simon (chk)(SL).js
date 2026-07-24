/**
 * Strategy Name: Simple Simon Strategy (Modified)
 * Source: YouTube - Gamblers University (https://youtu.be/KhoB2L76oB4)
 * 
 * The Full Logic in Detail:
 * - The strategy cycles through all six even-money outside bets in a fixed sequential order:
 *   Low (1-18) -> Even -> Red -> Black -> Odd -> High (19-36).
 * - It starts at the first bet type ('low') with a base unit bet.
 * - If a spin wins, the strategy moves to the next bet type in the sequence and resets the bet to the base unit.
 * - If a spin loses (including hitting a green 0 or 00), the strategy stays on the current bet type and applies a Martingale progression.
 * - Modification: On the 4th consecutive loss, the strategy skips betting for the next 3 spins. On the 4th spin after the skip, 
 *   it resumes betting on the same position at the next Martingale progression level.
 * 
 * The Full Bet Progression in Detail:
 * - Martingale progression: Double the bet amount after each loss on the same position.
 * - Progression resets to 1x base unit immediately upon any win, moving to the next position in the cycle.
 * 
 * The Goal:
 * - Target profit is typically 10% of the starting bankroll (or 10 base units). 
 * - The session stops once the target profit is reached or the bankroll can no longer sustain the next progression step.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit from config
    const baseUnit = config.betLimits.minOutside;

    // 2. Initialize State variables on the first run
    if (!state.initialized) {
        state.betSequence = ['low', 'even', 'red', 'black', 'odd', 'high'];
        state.currentIndex = 0;
        state.currentMultiplier = 1;
        state.startingBankroll = bankroll;
        state.targetProfit = baseUnit * 10000; // Target 10 units profit
        state.consecutiveLosses = 0;
        state.skipSpinsRemaining = 0;
        state.initialized = true;
    }

    // Check if goal is already reached
    if (bankroll >= state.startingBankroll + state.targetProfit) {
        return [];
    }

    // 3. Process previous spin history if it exists
    if (spinHistory.length > 0) {
        // If we were in the middle of skipping spins, decrement the counter and do not evaluate win/loss
        if (state.skipSpinsRemaining > 0) {
            state.skipSpinsRemaining--;
            // If we are still skipping, return empty array immediately
            if (state.skipSpinsRemaining > 0) {
                return [];
            }
            // If skipSpinsRemaining hits 0, this spin is the 4th spin where we resume at the next betting level
        } else {
            const lastSpin = spinHistory[spinHistory.length - 1];
            const lastBetType = state.betSequence[state.currentIndex];
            
            // Determine if the last bet was a win
            let won = false;
            if (lastSpin.winningColor !== 'green') {
                if (lastBetType === 'red' && lastSpin.winningColor === 'red') won = true;
                else if (lastBetType === 'black' && lastSpin.winningColor === 'black') won = true;
                else if (lastBetType === 'even' && lastSpin.winningNumber % 2 === 0 && lastSpin.winningNumber !== 0) won = true;
                else if (lastBetType === 'odd' && lastSpin.winningNumber % 2 !== 0) won = true;
                else if (lastBetType === 'low' && lastSpin.winningNumber >= 1 && lastSpin.winningNumber <= 18) won = true;
                else if (lastBetType === 'high' && lastSpin.winningNumber >= 19 && lastSpin.winningNumber <= 36) won = true;
            }

            if (won) {
                // Move to the next bet type in sequence and reset multiplier/loss counters
                state.currentIndex = (state.currentIndex + 1) % state.betSequence.length;
                state.currentMultiplier = 1;
                state.consecutiveLosses = 0;
            } else {
                // Increment loss counter and double the progression multiplier
                state.consecutiveLosses++;
                state.currentMultiplier *= 2;

                // Trigger 3-spin skip on the 4th consecutive loss
                if (state.consecutiveLosses === 4) {
                    state.skipSpinsRemaining = 3;
                    state.consecutiveLosses = 0; // Reset counter for the next round of progression
                    return []; // Skip betting on the immediate next spin
                }
            }
        }
    }

    // 4. Calculate next bet amount
    let betAmount = baseUnit * state.currentMultiplier;

    // 5. Clamp to table limits
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // If bankroll cannot cover the bet, place all remaining or skip
    if (bankroll < betAmount) {
        if (bankroll >= config.betLimits.minOutside) {
            betAmount = bankroll; // Go all-in with remaining bankroll if it meets table minimums
        } else {
            return []; // Stop betting if table minimum cannot be covered
        }
    }

    // 6. Return the constructed bet object
    return [{
        type: state.betSequence[state.currentIndex],
        amount: betAmount
    }];
}