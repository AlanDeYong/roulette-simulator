/**
 * Back to Back Wins - Roulette Strategy
 * Source: https://youtu.be/Dba_jOmeD3s (YouTube Channel: Bet With Mo)
 * * Logic & Conditions:
 * The strategy relies on expanding coverage (straight and split bets) and increasing
 * multipliers after losses to recover and reach a new session peak profit. 
 * - On a win: If the bankroll reaches or exceeds the session's peak profit, the progression 
 * resets to Level 1. If it does not reach the peak profit, the current level is re-bet.
 * - On a loss: The progression advances to the next level.
 * * Full Bet Progression (Total Bet Sizes: 8 - 24 - 40 - 100 - 140 - 280 - 390):
 * - Level 1: 1 unit straight on [3,6,7,10] and 1 unit split on [1/4, 2/5, 8/11, 9/12].
 * - Level 2: Add [15,18] straights and [13/16, 14/17] splits. All bets become 2 units.
 * - Level 3: Add [19,22] straights and [20/23, 21/24] splits. Straights stay at 2 units; splits become 3 units.
 * - Level 4: Add [27,30] straights and [25/28, 26/29] splits. All bets double (Straights: 4u, Splits: 6u).
 * - Level 5: Increase all base bets by 2 units (Straights: 6u, Splits: 8u).
 * - Level 6: Double all base bets (Straights: 12u, Splits: 16u).
 * - Level 7: Increase straights by 5u, splits by an additional 1u from the previous formula 
 * (Straights: 17u, Splits: 22u).
 * * Goal:
 * Safely hit high-coverage jackpots to continually breach the session's peak profit and reset.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize state variables on the first spin
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.level = 1;
    }

    // 2. Determine Win/Loss based on bankroll variance since the last bet
    if (state.lastBankroll !== undefined) {
        const netProfit = bankroll - state.lastBankroll;
        
        if (netProfit > 0) {
            // WIN: Reset if we reached or exceeded the peak session profit
            if (bankroll >= state.peakBankroll) {
                state.level = 1;
            }
            // If win but NOT at peak, level remains the same (rebet)
        } else {
            // LOSS: Advance progression
            state.level++;
            // Safeguard: Reset if progression exceeds Level 7
            if (state.level > 7) {
                state.level = 1;
            }
        }
    }

    // 3. Update peak bankroll
    state.peakBankroll = Math.max(state.peakBankroll, bankroll);
    
    // Track bankroll before placing new bets for next spin's math
    state.lastBankroll = bankroll;

    // 4. Configure Bets based on current level
    const unit = config.betLimits.min;
    
    let straights = [];
    let splits = [];
    let straightMultiplier = 1;
    let splitMultiplier = 1;

    // Build the coverage groups progressively
    if (state.level >= 1) {
        straights.push(3, 6, 7, 10);
        splits.push([1, 4], [2, 5], [8, 11], [9, 12]);
        straightMultiplier = 1;
        splitMultiplier = 1;
    }
    if (state.level >= 2) {
        straights.push(15, 18);
        splits.push([13, 16], [14, 17]);
        straightMultiplier = 2;
        splitMultiplier = 2;
    }
    if (state.level >= 3) {
        straights.push(19, 22);
        splits.push([20, 23], [21, 24]);
        straightMultiplier = 2;
        splitMultiplier = 3;
    }
    if (state.level >= 4) {
        straights.push(27, 30);
        splits.push([25, 28], [26, 29]);
        straightMultiplier = 4;
        splitMultiplier = 6;
    }
    if (state.level >= 5) {
        straightMultiplier = 6;
        splitMultiplier = 8;
    }
    if (state.level >= 6) {
        straightMultiplier = 12;
        splitMultiplier = 16;
    }
    if (state.level >= 7) {
        straightMultiplier = 17;
        splitMultiplier = 22;
    }

    // 5. Construct Bet Array and clamp to limits
    const bets = [];

    // Place Straight Bets
    for (const num of straights) {
        let amt = unit * straightMultiplier;
        amt = Math.max(amt, config.betLimits.min);
        amt = Math.min(amt, config.betLimits.max);
        bets.push({ type: 'number', value: num, amount: amt });
    }

    // Place Split Bets
    for (const sp of splits) {
        let amt = unit * splitMultiplier;
        amt = Math.max(amt, config.betLimits.min);
        amt = Math.min(amt, config.betLimits.max);
        bets.push({ type: 'split', value: sp, amount: amt });
    }

    return bets;
}