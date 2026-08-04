/**
 * Golden Egg Roulette Strategy (Corrected)
 * 
 * Source:
 * - Video: "GOLDEN - ROULETTE STRATEGY TUTORIAL | HUGE WIN CHANCE | HIGH COVERAGE TOP SYSTEM"
 * - Channel: Bet With Mo (https://www.youtube.com/watch?v=9Xc1HdupWU4)
 * 
 * The Full Logic in Detail:
 * - The "Golden Egg" is a high-coverage inside-bet system focusing on middle board numbers with surrounding split 
 *   and straight-up bets.
 * - Triggers: Bets are placed on every spin starting from Level 1.
 * 
 * The Full Bet Progression in Detail:
 * - Level 1 ($18 total at $1 unit): 18 base splits covering core numbers.
 * - Level 2 ($22 total at $1 unit): Rebet, adds 4 side splits (10/11, 11/12, 25/26, 26/27).
 * - Level 3 ($26 total at $1 unit): Rebet, adds 4 more side splits (13/14, 14/15, 22/23, 23/24).
 * - Level 4 ($60 total at $1 unit): Rebet, adds 4 more side splits (16/17, 17/18, 19/20, 20/21). Doubles all bets (30 splits @ 2 units).
 * - Level 5 ($64 total at $1 unit): Rebet, adds straight-up bets to 4 numbers (8, 11, 26, 29 at 1 unit each).
 * - Level 6 ($68 total at $1 unit): Rebet, adds straight-up bets to 4 more numbers (14, 17, 20, 23 at 1 unit each).
 * - Level 7 ($76 total at $1 unit): Rebet, increases all straight-up bets by 1 unit each (30 splits @ 2 units, 8 straight-ups @ 2 units).
 * - Level 8 ($152 total at $1 unit): Rebet, doubles up all bets (30 splits @ 4 units, 8 straight-ups @ 4 units).
 * 
 * Progression Rules:
 * - On Loss: Advance to the next level (Level 1 -> Level 2 -> ... -> Level 8).
 * - On Win: 
 *   - If session's peak profit is reached (or exceeded), reset to Level 1.
 *   - If not reached, drop back to the minimum level where a maximum hit will reach the session's peak profit.
 * 
 * Goal:
 * - Continuously reach new session peak profits and reset.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit size for inside bets
    const unit = config.betLimits ? Math.max(1, config.betLimits.min) : 1;
    const minLimit = config.betLimits ? config.betLimits.min : 1;
    const maxLimit = config.betLimits ? config.betLimits.max : 500;

    // 2. Initialize State
    if (!state.level) {
        state.level = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // Update peak bankroll tracking
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // Helper to generate the exact layout array for a given level
    const getBetsForLevel = (targetLevel) => {
        // Base 18 Splits (Level 1)
        const splits = [
            [9, 12], [12, 15], [15, 18], [18, 21], [21, 24], [24, 27], [27, 30], // Top row
            [7, 10], [10, 13], [13, 16], [16, 19], [19, 22], [22, 25], [25, 28], // Bottom row
            [7, 8], [8, 9], [28, 29], [29, 30]                                   // Vertical side
        ];
        
        const straights = [];
        let splitMult = 1;
        let straightMult = 0;

        if (targetLevel >= 2) splits.push([10, 11], [11, 12], [25, 26], [26, 27]);
        if (targetLevel >= 3) splits.push([13, 14], [14, 15], [22, 23], [23, 24]);
        if (targetLevel >= 4) {
            splits.push([16, 17], [17, 18], [19, 20], [20, 21]);
            splitMult = 2; // Double all split bets
        }
        if (targetLevel >= 5) {
            straights.push(8, 11, 26, 29);
            straightMult = 1;
        }
        if (targetLevel >= 6) {
            straights.push(14, 17, 20, 23);
        }
        if (targetLevel >= 7) {
            straightMult = 2; // Increase all straight-up bets by 1 unit
        }
        if (targetLevel === 8) {
            splitMult = 4;    // Double up all bets
            straightMult = 4;
        }

        const generatedBets = [];
        // Construct Splits
        for (const splitVal of splits) {
            let amt = Math.max(minLimit, Math.min(maxLimit, unit * splitMult));
            generatedBets.push({ type: 'split', value: splitVal, amount: amt });
        }
        // Construct Straights
        if (straightMult > 0) {
            for (const num of straights) {
                let amt = Math.max(minLimit, Math.min(maxLimit, unit * straightMult));
                generatedBets.push({ type: 'number', value: num, amount: amt });
            }
        }
        return generatedBets;
    };

    // Helper to calculate the maximum potential net profit a level can generate
    const getMaxPotentialProfit = (levelBets) => {
        let totalCost = 0;
        const payouts = new Array(37).fill(0);

        for (const b of levelBets) {
            totalCost += b.amount;
            if (b.type === 'split') {
                payouts[b.value[0]] += b.amount * 18; // Payout is 17:1 + initial stake
                payouts[b.value[1]] += b.amount * 18;
            } else if (b.type === 'number') {
                payouts[b.value] += b.amount * 36;    // Payout is 35:1 + initial stake
            }
        }

        let maxReturn = 0;
        for (const p of payouts) {
            if (p > maxReturn) maxReturn = p;
        }
        
        return maxReturn - totalCost; // Net profit
    };

    // 3. Process past spin result to update progression level
    if (spinHistory && spinHistory.length > 0) {
        const spinProfit = bankroll - state.lastBankroll;

        if (spinProfit > 0) {
            // WIN CONDITION
            if (bankroll >= state.peakBankroll) {
                // Session peak reached or exceeded
                state.level = 1;
            } else {
                // Win, but haven't reached session peak. Find the lowest level that can bridge the deficit.
                const deficit = state.peakBankroll - bankroll;
                let targetLevel = state.level;
                
                for (let l = 1; l <= state.level; l++) {
                    const levelBets = getBetsForLevel(l);
                    const maxProfit = getMaxPotentialProfit(levelBets);
                    
                    if (maxProfit >= deficit) {
                        targetLevel = l;
                        break;
                    }
                }
                state.level = targetLevel;
            }
        } else {
            // LOSS CONDITION
            if (state.level < 8) {
                state.level += 1;
            } else {
                state.level = 1; // Reset after Max Level 8 loss
            }
        }
    }
    
    state.lastBankroll = bankroll;

    // 4. Return the generated layout for the current active level
    const finalBets = getBetsForLevel(state.level);
    return finalBets.length > 0 ? finalBets : null;
}