/**
 * Thomastown Roulette Strategy
 * * Source: "HOW YOU CAN WIN $2000.00 A DAY PLAYING ROULETTE!" by The Roulette Master
 * * The Logic:
 * This strategy attempts to fluidly transition between capitalizing on color streaks and chop (alternating) streaks.
 * It analyzes the wheel's history (ignoring zeroes):
 * - If the last two valid colors are the same (e.g., Red, Red), it assumes a Color Streak and bets that color to continue the pattern.
 * - If the last two valid colors are different (e.g., Red, Black), it assumes a Chop Streak and bets the first color to continue the chop (Red, Black -> Red).
 * * The Progression:
 * This is an aggressive progression system that constantly increases the bet size to recover losses and lock in profits:
 * - After a LOSS (including 0/00): Increase the bet by 2 units.
 * - After a WIN: Increase the bet by 1 unit.
 * * The Goal:
 * The strategy aims for a hard session profit target equivalent to 80 base units (e.g., $2000 profit on $25 base bets as shown in the video).
 * Once the profit target is reached, the progression resets to the minimum base bet to secure the profits and start a new cycle.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseBet = config.betLimits.minOutside;
    
    // Determine the unit increment size based on the simulator's configuration
    const incrementAmount = config.incrementMode === 'fixed' ? config.minIncrementalBet : baseBet;
    
    // Calculate the profit goal (80 units)
    const profitTarget = 80 * baseBet;

    // 1. Initialize State on the first spin
    if (state.currentBetAmount === undefined) {
        state.currentBetAmount = baseBet;
        state.sessionStartBankroll = bankroll;
        state.lastTarget = null;
    }

    // 2. Progression Logic (Execute only if there is history)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const currentProfit = bankroll - state.sessionStartBankroll;

        // Check if the daily profit goal has been reached
        if (currentProfit >= profitTarget) {
            state.currentBetAmount = baseBet; // Reset to base bet
            state.sessionStartBankroll = bankroll; // Set new watermark
        } else if (state.lastTarget) {
            // Did the last bet win?
            const didWin = (lastSpin.winningColor === state.lastTarget);
            
            if (didWin) {
                // WIN: Go up 1 unit
                state.currentBetAmount += incrementAmount;
            } else {
                // LOSS (including zeroes): Go up 2 units
                state.currentBetAmount += (incrementAmount * 2);
            }
        }
    }

    // 3. Target Selection Logic (Chop or Streak)
    let targetColor = 'red'; // Default starting color
    
    // Filter out green zeroes to accurately read the Red/Black flow
    const validHistory = spinHistory
        .map(s => s.winningColor)
        .filter(color => color === 'red' || color === 'black');

    if (validHistory.length >= 2) {
        const prev1 = validHistory[validHistory.length - 1]; // Very last color
        const prev2 = validHistory[validHistory.length - 2]; // Color before that

        if (prev1 === prev2) {
            // Streak pattern detected (e.g., Red, Red) -> Bet to continue the streak
            targetColor = prev1;
        } else {
            // Chop pattern detected (e.g., Black, Red) -> Bet to continue the chop (expecting Black)
            targetColor = prev2;
        }
    } else if (validHistory.length === 1) {
        // Only one valid spin so far, expect a streak
        targetColor = validHistory[0];
    }

    // 4. Clamp Bet to Table Limits
    let amount = Math.max(state.currentBetAmount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);
    
    // Persist the clamped amount so we don't infinitely increase virtual math beyond table limits
    state.currentBetAmount = amount;
    state.lastTarget = targetColor;

    // 5. Return the bet instruction
    return [{ type: targetColor, amount: amount }];
}