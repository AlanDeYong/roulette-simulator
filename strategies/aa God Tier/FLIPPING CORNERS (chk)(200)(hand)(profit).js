/**
 * FLIPPING CORNERS
 * * Source: https://youtu.be/q7ieyLh-JO8 (Bet With Mo)
 * * The Full Logic in details:
 * This strategy involves betting on consecutive, non-overlapping corners to systematically 
 * increase board coverage. A win at peak profit resets the entire progression back to the beginning. 
 * If a win occurs but session peak profit is not reached, the bet is repeated.
 * On a loss, the strategy advances to the next level by introducing a new corner bet and doubling 
 * the existing bet sizes across all active corners. 
 * * The Full Bet Progression in details:
 * The strategy has a 7-step progression. On a loss, advance to the next step. On a win, reset to Step 1 if at peak profit, otherwise rebet.
 * - Step 1: Place 1 unit on Corner 1 (covering 1, 2, 4, 5). Total bet = 1 unit.
 * - Step 2: Add 1 unit to Corner 7, then double all bets. Result: 2 units each on Corners 1 & 7. Total bet = 4 units.
 * - Step 3: Add 2 units to Corner 13, then double all bets. Result: 4 units each on Corners 1, 7, 13. Total bet = 12 units.
 * - Step 4: Add 4 units to Corner 19, then double all bets. Result: 8 units each on 4 corners. Total bet = 32 units.
 * - Step 5: Add 8 units to Corner 25, then double all bets. Result: 16 units each on 5 corners. Total bet = 80 units.
 * - Step 6: Add 16 units to Corner 31, then double all bets. Result: 32 units each on 6 corners. Total bet = 192 units.
 * - Step 7: Double up all 6 corners (64 units each), and add 30 units to Zero. Total bet = 414 units.
 * If Step 7 results in a loss, the progression resets to Step 1 to act as a stop-loss.
 * * The Goal:
 * To steadily generate profit by covering a growing portion of the table and multiplying bet sizes 
 * to recoup earlier losses. The target is a steady session profit before the 7-level safety net is breached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.min;

    // 2. Initialize State
    if (state.level === undefined) {
        state.level = 0;
        state.peakBankroll = bankroll;
    }

    // Check if current bankroll is a new peak
    let isPeakProfit = bankroll > state.peakBankroll;

    // 3. Process previous spin to determine win/loss
    if (spinHistory.length > 0 && state.lastBets) {
        let won = false;
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        // Evaluate if the last spin was covered by any of our previous bets
        for (let b of state.lastBets) {
            if (b.type === 'corner') {
                const v = b.value;
                // A corner defined by the top-left number `v` in the first column covers `v`, `v+1`, `v+3`, `v+4`
                if ([v, v + 1, v + 3, v + 4].includes(lastSpin)) {
                    won = true;
                    break;
                }
            } else if (b.type === 'number') {
                if (b.value === lastSpin) {
                    won = true;
                    break;
                }
            }
        }

        // Adjust progression based on result
        if (won) {
            if (isPeakProfit) {
                state.level = 0;
            }
            // If won but NOT at peak profit, do nothing (state.level remains unchanged to rebet)
        } else {
            state.level++;
            // Reset progression if we lose the 7th level (index 6)
            if (state.level > 6) {
                state.level = 0; 
            }
        }
    }

    // Update peak bankroll for future comparisons
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 4. Define the betting sequence
    // Non-overlapping corners starting points in the first column
    const cornersList = [1, 7, 13, 19, 25, 31];
    
    // The multiplier applied to the base unit for each active corner at a given level
    const betMultipliers = [1, 2, 4, 8, 16, 32, 64];

    // Determine the active corners and the bet amount for the current level
    let activeCorners = cornersList.slice(0, Math.min(state.level + 1, 6));
    let amountPerCorner = betMultipliers[state.level] * unit;
    
    // Clamp corner bets to table limits
    amountPerCorner = Math.max(amountPerCorner, config.betLimits.min);
    amountPerCorner = Math.min(amountPerCorner, config.betLimits.max);

    // 5. Construct Bets
    let bets = [];
    
    for (let corner of activeCorners) {
        bets.push({ type: 'corner', value: corner, amount: amountPerCorner });
    }

    // Level 7 introduces the zero bet
    if (state.level === 6) {
        let zeroAmount = 30 * unit;
        
        // Clamp zero bet to table limits
        zeroAmount = Math.max(zeroAmount, config.betLimits.min);
        zeroAmount = Math.min(zeroAmount, config.betLimits.max);
        
        bets.push({ type: 'number', value: 0, amount: zeroAmount });
    }
    
    // Persist bets for the next spin's win/loss check
    state.lastBets = bets;
    
    return bets;
}