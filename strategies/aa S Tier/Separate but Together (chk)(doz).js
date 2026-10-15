/**
 * Separate but Together (Dozen Variation - Corrected)
 * 
 * Logic:
 * - Place 1 unit bet on 1st and 3rd Dozens. (1 unit = config.betLimits.minOutside)
 * - On loss: Increase both Dozen bets by 1 unit.
 * - Wait: If 2nd Dozen hits 2x in a row, stop betting until 1st/3rd hits. Resume with +1 unit increase.
 * - Win: 
 *      - If session profit >= peak: Reset to 1 unit base state.
 *      - If not at peak: Keep BOTH dozens active, and increase bets by 1 unit.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (typeof state.betUnit === 'undefined') {
        state.betUnit = 1; // Represents the multiplier (1x, 2x, 3x base unit)
        state.waiting = false;
        state.secondDozenStreak = 0;
        state.peakProfit = 0;
        state.currentProfit = 0;
    }

    // Determine the actual dollar value of 1 "unit"
    const unitValue = config.betLimits.minOutside;

    // 2. Process Result and Session Profit
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const num = lastResult.winningNumber;
        
        // If we were not waiting in the previous spin, bets were placed on both dozens
        const placedBetsThisRound = !state.waiting;

        if (placedBetsThisRound) {
            // We always bet 2 units total (1 on 1st Dozen, 1 on 3rd Dozen)
            const totalBetPlaced = 2 * (state.betUnit * unitValue);
            
            // Determine if we won
            const won1st = (num >= 1 && num <= 12);
            const won3rd = (num >= 25 && num <= 36);
            const won = won1st || won3rd;
            
            // Outside Dozen payout is 2:1 (Pays 2x bet amount + original bet returned = 3x)
            const wonAmount = won ? ((state.betUnit * unitValue) * 3) : 0;
            
            // Update Profit Tracker
            state.currentProfit += (wonAmount - totalBetPlaced);
            if (state.currentProfit > state.peakProfit) {
                state.peakProfit = state.currentProfit;
            }

            // Logic Updates: Win/Loss
            if (won) {
                if (state.currentProfit >= state.peakProfit) {
                    // Reset to base state
                    state.betUnit = 1;
                    state.secondDozenStreak = 0;
                } else {
                    // Not at peak: keep both dozens and increase
                    state.betUnit += 1;
                    state.secondDozenStreak = 0;
                }
            } else {
                // Loss
                if (num >= 13 && num <= 24) {
                    state.secondDozenStreak += 1;
                    if (state.secondDozenStreak >= 2) {
                        state.waiting = true;
                    } else {
                        state.betUnit += 1;
                    }
                } else {
                    // Zero hits
                    state.secondDozenStreak = 0;
                    state.betUnit += 1;
                }
            }
        } else if (state.waiting) {
            // Check if wait condition ends (1st or 3rd dozen hits)
            if ((num >= 1 && num <= 12) || (num >= 25 && num <= 36)) {
                state.waiting = false;
                state.secondDozenStreak = 0;
                state.betUnit += 1; // Increase upon resuming
            }
        }
    }

    // 3. Generate Bets
    if (state.waiting) return []; // Place no bets while waiting

    let betList = [];
    
    // Calculate final actual bet amount and clamp to max limits
    let actualBetAmount = state.betUnit * unitValue;
    actualBetAmount = Math.min(actualBetAmount, config.betLimits.max);

    // Place bets on both Dozens
    betList.push({ type: 'dozen', value: 1, amount: actualBetAmount });
    betList.push({ type: 'dozen', value: 3, amount: actualBetAmount });

    return betList;
}