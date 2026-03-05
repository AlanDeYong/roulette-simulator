/**
 * Strategy: Fast & Dirty (Short-Term Negative Progression)
 * Source: CEG Dealer School (https://www.youtube.com/watch?v=XoRhbg7jQ78)
 * * The Logic: 
 * This is a highly aggressive, short-duration strategy designed to extract a quick 
 * profit before variance depletes the bankroll. It uses specific physical board 
 * coverage (non-touching corners and double streets/lines) to hedge the layout.
 * * The Progression:
 * A 4-step negative progression.
 * - Step 1: 2 non-touching corners (1 unit each).
 * - Step 2 (If Step 1 loses): 2 corners (1 unit each) + 1 Double Street/Line (2 units).
 * - Step 3 (If Step 2 loses): 3 corners (2 units each) + 1 Double Street/Line (3 units).
 * - Step 4 (If Step 3 loses): Severe recovery. $90 (18 units) on Dozen 1, $60 (12 units) on Dozen 2.
 * * If Step 1-3 wins: Reset to Step 1.
 * * If Step 4 hits: Must win 3 times to clear the deficit, then reset to Step 1.
 * * If Step 4 misses: The designated session bankroll (45 units / $225) is destroyed. Reset.
 * * The Goal:
 * Win 9 units (equivalent to $45 on a $5 base unit). Once the target profit is reached, 
 * the strategy immediately halts to protect capital. Stop-loss is inherent to the 4-step bust.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish Base Units and Limits
    const unit = config.betLimits.min; 
    const minOutside = config.betLimits.minOutside;
    const max = config.betLimits.max;
    
    // Financial Target: 9 units profit (representing $45 on a $5 base table)
    const targetProfit = 900 * unit; 

    // 2. Initialize Persistent State
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.previousBankroll = bankroll;
        state.step = 1;
        state.step4Hits = 0;
        state.initialized = true;
    }

    // 3. Goal Evaluation (Stop if target profit hit)
    if (bankroll >= state.initialBankroll + targetProfit) {
        return []; // Target reached, halt all betting
    }

    // 4. Evaluate Previous Spin to Drive Progression
    if (spinHistory.length > 0) {
        const netProfitLastSpin = bankroll - state.previousBankroll;
        const wonLastSpin = netProfitLastSpin > 0;

        if (wonLastSpin) {
            if (state.step === 4) {
                state.step4Hits++;
                // Step 4 requires 3 consecutive hits to clear the negative progression deficit
                if (state.step4Hits >= 3) {
                    state.step = 1;
                    state.step4Hits = 0;
                }
            } else {
                // Winning on Step 1, 2, or 3 resets the progression
                state.step = 1;
                state.step4Hits = 0;
            }
        } else {
            // Lost last spin
            if (state.step === 4) {
                // Bankroll is effectively destroyed here based on the $225 risk limit. 
                // Resetting to Step 1 in case of auto-reload.
                state.step = 1;
                state.step4Hits = 0;
            } else {
                // Move to next negative progression step
                state.step++;
            }
        }
    }

    // Update previous bankroll for the next spin's evaluation
    state.previousBankroll = bankroll;

    // 5. Construct Bets Based on Current Step
    let bets = [];

    // Helper function to safely clamp bet sizes
    const getClampedBet = (multiplier, isOutside = false) => {
        let amount = unit * multiplier;
        const floor = isOutside ? minOutside : unit;
        return Math.min(Math.max(amount, floor), max);
    };

    switch (state.step) {
        case 1:
            // Step 1: Two non-touching corners (e.g., Corner 1 and Corner 32)
            bets.push({ type: 'corner', value: 1, amount: getClampedBet(1) });
            bets.push({ type: 'corner', value: 32, amount: getClampedBet(1) });
            break;

        case 2:
            // Step 2: Two corners + One double street (line)
            bets.push({ type: 'corner', value: 1, amount: getClampedBet(1) });
            bets.push({ type: 'corner', value: 32, amount: getClampedBet(1) });
            bets.push({ type: 'line', value: 13, amount: getClampedBet(2) }); // Covers 13-18
            break;

        case 3:
            // Step 3: Three corners + One double street (line)
            bets.push({ type: 'corner', value: 1, amount: getClampedBet(2) });
            bets.push({ type: 'corner', value: 17, amount: getClampedBet(2) });
            bets.push({ type: 'corner', value: 32, amount: getClampedBet(2) });
            bets.push({ type: 'line', value: 13, amount: getClampedBet(3) }); // Covers 13-18
            break;

        case 4:
            // Step 4: The "$90 and $60" recovery. Translated to 18 units on Dozen 1, 12 units on Dozen 2.
            bets.push({ type: 'dozen', value: 1, amount: getClampedBet(18, true) });
            bets.push({ type: 'dozen', value: 2, amount: getClampedBet(12, true) });
            break;

        default:
            state.step = 1; // Fallback
            break;
    }

    return bets;
}