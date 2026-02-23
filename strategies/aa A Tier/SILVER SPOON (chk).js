/**
 * Source: Bet With Mo - https://www.youtube.com/watch?v=cORLB1tb9_I
 * * The Logic: The "Silver Spoon" strategy is a high-coverage system that initially targets 
 * the 1st and 2nd dozens along with the 25-27 street. As losses occur, it expands 
 * coverage by adding specific split bets in the 3rd dozen area to cover more numbers.
 * * The Progression: The strategy advances through up to 7 levels strictly following a loss. 
 * On a win, the progression stays at the current level unless the profit goal is reached.
 * - Level 1: 4 units on 1st/2nd Dozens, 1 unit on street 25.
 * - Level 2 (Loss): +4 units on Dozens, +1 unit on street 25. Add 1 unit to Split Group A.
 * - Level 3 (Loss): +4 units on Dozens, +1 unit on street 25. Add 1 unit to Split Group B.
 * - Level 4 (Loss): +4 units on Dozens, +1 unit on street 25. +1 unit to Split Group A.
 * - Level 5 (Loss): +4 units on Dozens, +1 unit on street 25. +1 unit to Split Group B.
 * - Level 6 (Loss): Rebet and double up from Level 5.
 * - Level 7 (Loss): Rebet and double up from Level 6.
 * *If a loss occurs at Level 7, the progression resets to Level 1 as a stop-loss.*
 * * The Goal: Achieve a profit of 20 units ($20 at a $1 base) above the last established 
 * peak bankroll. Once this target is hit, update the peak bankroll reference and reset 
 * the progression back to Level 1.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish Base Units
    const unit = config.betLimits.min; 
    const targetProfitUnits = 20; // $20 target scaled by base unit if necessary
    
    // 2. Initialize State
    if (!state.level) {
        state.level = 1;
        state.referenceBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // 3. Evaluate Previous Spin (Win/Loss/Goal Hit)
    if (spinHistory.length > 0) {
        const currentProfit = bankroll - state.referenceBankroll;
        
        // Check if Profit Goal Reached
        if (currentProfit >= targetProfitUnits * unit) {
            state.level = 1;
            state.referenceBankroll = bankroll; 
        } else {
            // Check Win/Loss to advance progression
            const wonLastSpin = bankroll > state.lastBankroll;
            if (!wonLastSpin && bankroll < state.lastBankroll) {
                state.level++;
                // Stop-loss reset if we lose at Level 7
                if (state.level > 7) {
                    state.level = 1;
                }
            }
        }
    }

    // Update lastBankroll for the next spin's calculation
    state.lastBankroll = bankroll;

    // 4. Define Level Multipliers
    let d1M = 0, d2M = 0, st25M = 0, spAM = 0, spBM = 0;

    switch (state.level) {
        case 1:
            d1M = 4; d2M = 4; st25M = 1; spAM = 0; spBM = 0;
            break;
        case 2:
            d1M = 8; d2M = 8; st25M = 2; spAM = 1; spBM = 0;
            break;
        case 3:
            d1M = 12; d2M = 12; st25M = 3; spAM = 1; spBM = 1;
            break;
        case 4:
            d1M = 16; d2M = 16; st25M = 4; spAM = 2; spBM = 1;
            break;
        case 5:
            d1M = 20; d2M = 20; st25M = 5; spAM = 2; spBM = 2;
            break;
        case 6:
            d1M = 40; d2M = 40; st25M = 10; spAM = 4; spBM = 4;
            break;
        case 7:
            d1M = 80; d2M = 80; st25M = 20; spAM = 8; spBM = 8;
            break;
    }

    // 5. Build the Bets Array
    const bets = [];

    // Helper function to clamp bets within table limits
    const getClampedAmount = (multiplier, isOutside) => {
        let amount = multiplier * unit;
        const minAllowed = isOutside ? config.betLimits.minOutside : config.betLimits.min;
        amount = Math.max(amount, minAllowed);
        amount = Math.min(amount, config.betLimits.max);
        return amount;
    };

    // Dozens (Outside Bets)
    bets.push({ type: 'dozen', value: 1, amount: getClampedAmount(d1M, true) });
    bets.push({ type: 'dozen', value: 2, amount: getClampedAmount(d2M, true) });

    // Street 25-27 (Inside Bet - starts at 25)
    bets.push({ type: 'street', value: 25, amount: getClampedAmount(st25M, false) });

    // Split Group A
    if (spAM > 0) {
        const splitsA = [
            [1, 2], [4, 5], [7, 8], [10, 11], [13, 14], 
            [16, 17], [19, 20], [22, 23], [25, 26]
        ];
        const amtA = getClampedAmount(spAM, false);
        splitsA.forEach(split => {
            bets.push({ type: 'split', value: split, amount: amtA });
        });
    }

    // Split Group B
    if (spBM > 0) {
        const splitsB = [
            [2, 3], [5, 6], [8, 9], [11, 12], [14, 15], 
            [17, 18], [20, 21], [23, 24], [26, 27]
        ];
        const amtB = getClampedAmount(spBM, false);
        splitsB.forEach(split => {
            bets.push({ type: 'split', value: split, amount: amtB });
        });
    }

    // 6. Return Bet Array
    return bets;
}