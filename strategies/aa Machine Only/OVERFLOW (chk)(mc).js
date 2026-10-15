/**
 * Strategy: Jackpot Overflow
 * Source: Bet With Mo - Jackpot Overflow Strategy (YouTube)
 * 
 * The Full Logic in details:
 * This strategy operates across 8 progression levels, starting at Level 1. 
 * A mix of splits, straights, and a corner are placed covering the middle and right 
 * columns, heavily weighting specific sections. As the sequence progresses, more 
 * inside bets and heavy outside dozen bets are added to offset losses.
 * - Total Loss (0 return): Progress to the next level (capped at Level 8).
 * - Partial Loss / Small win (Return > 0 but Bankroll < Peak): Rebet at the same level.
 * - Win causing new Peak Profit: Reset to Level 1.
 * 
 * The Full Bet Progression in details:
 * - Level 1: 1 unit on splits 2/3, 5/6, 8/9, 11/12, 26/27, 29/30, 32/33, 35/36. 
 *            2 units on splits 14/15, 23/24. 2 units on corner 17. (Total 14 units).
 * - Level 2: L1 bets + 1 unit on straights 2, 5, 8, 11, 26, 29, 32, 35. 
 *            2 units on straights 14, 23. 2 units on split 17/20. (Total 28 units).
 * - Level 3: L2 bets + 1 unit on straights 3, 6, 9, 12, 27, 30, 33, 36. 
 *            2 units on straights 15, 24. 2 units on split 18/21. (Total 42 units).
 * - Level 4: L3 bets + 9 units each on 1st and 3rd dozens. (Total 60 units).
 * - Level 5: L3 bets + 19 units each on 1st and 3rd dozens. (Total 80 units).
 * - Level 6: L3 bets + 29 units each on 1st and 3rd dozens. (Total 100 units).
 * - Level 7: L6 bets doubled (Inside bets x2, Dozens = 58 units each). (Total 200 units).
 * - Level 8: L7 bets + an extra 40 units each on 1st/3rd dozens (98 units total). (Total 280 units).
 * 
 * The Goal:
 * To accumulate profit through a well-covered inside layout while progressively relying 
 * on heavy outside dozen protection during bad streaks, resetting whenever a new peak 
 * bankroll is achieved.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;

    // 1. Initialization
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.level = 1;
    }

    // 2. Progression Logic (Calculated from previous spin's return)
    if (state.lastBankroll !== undefined) {
        const netWin = bankroll - state.lastBankroll;
        const returnAmt = netWin + (state.lastTotalBet || 0);

        if (bankroll >= state.peakBankroll) {
            // New session peak reached -> Reset
            state.peakBankroll = bankroll;
            state.level = 1;
        } else if (returnAmt < 0.01) { 
            // Total loss (Using < 0.01 to safely avoid float precision issues)
            state.level = Math.min(8, state.level + 1);
        } else {
            // Partial loss / Small win (Return > 0 but not yet at peak)
            // Strategy rule: Rebet (stay at current level)
        }
    }

    let bets = [];

    // 3. Define the base arrays for the progression
    const l1 = [
        { type: 'split', value: [2,3], amount: 1 },
        { type: 'split', value: [5,6], amount: 1 },
        { type: 'split', value: [8,9], amount: 1 },
        { type: 'split', value: [11,12], amount: 1 },
        { type: 'split', value: [26,27], amount: 1 },
        { type: 'split', value: [29,30], amount: 1 },
        { type: 'split', value: [32,33], amount: 1 },
        { type: 'split', value: [35,36], amount: 1 },
        { type: 'split', value: [14,15], amount: 2 },
        { type: 'split', value: [23,24], amount: 2 },
        { type: 'corner', value: 17, amount: 2 } // Top-left of 17, 18, 20, 21
    ];

    const l2 = [
        { type: 'number', value: 2, amount: 1 },
        { type: 'number', value: 5, amount: 1 },
        { type: 'number', value: 8, amount: 1 },
        { type: 'number', value: 11, amount: 1 },
        { type: 'number', value: 26, amount: 1 },
        { type: 'number', value: 29, amount: 1 },
        { type: 'number', value: 32, amount: 1 },
        { type: 'number', value: 35, amount: 1 },
        { type: 'number', value: 14, amount: 2 },
        { type: 'number', value: 23, amount: 2 },
        { type: 'split', value: [17,20], amount: 2 }
    ];

    const l3 = [
        { type: 'number', value: 3, amount: 1 },
        { type: 'number', value: 6, amount: 1 },
        { type: 'number', value: 9, amount: 1 },
        { type: 'number', value: 12, amount: 1 },
        { type: 'number', value: 27, amount: 1 },
        { type: 'number', value: 30, amount: 1 },
        { type: 'number', value: 33, amount: 1 },
        { type: 'number', value: 36, amount: 1 },
        { type: 'number', value: 15, amount: 2 },
        { type: 'number', value: 24, amount: 2 },
        { type: 'split', value: [18,21], amount: 2 }
    ];

    // 4. Compile inside bets based on current level
    let baseBets = [];
    if (state.level >= 1) baseBets.push(...l1);
    if (state.level >= 2) baseBets.push(...l2);
    if (state.level >= 3) baseBets.push(...l3);

    const insideMult = (state.level >= 7) ? 2 : 1;

    for (let b of baseBets) {
        bets.push({
            type: b.type,
            value: b.value,
            amount: b.amount * insideMult * unit
        });
    }

    // 5. Compile outside dozen bets based on current level
    let dozUnits = 0;
    if (state.level === 4) dozUnits = 9;
    else if (state.level === 5) dozUnits = 19;
    else if (state.level === 6) dozUnits = 29;
    else if (state.level === 7) dozUnits = 58;
    else if (state.level === 8) dozUnits = 98;

    if (dozUnits > 0) {
        bets.push({ type: 'dozen', value: 1, amount: dozUnits * unit });
        bets.push({ type: 'dozen', value: 3, amount: dozUnits * unit });
    }

    // 6. Respect Board Limits & Calculate Total Investment
    let totalBetPlaced = 0;
    for (let i = 0; i < bets.length; i++) {
        let isOutside = ['dozen', 'column', 'red', 'black', 'even', 'odd', 'low', 'high'].includes(bets[i].type);
        let limitMin = isOutside ? config.betLimits.minOutside : config.betLimits.min;
        
        bets[i].amount = Math.max(bets[i].amount, limitMin);
        bets[i].amount = Math.min(bets[i].amount, config.betLimits.max);
        
        totalBetPlaced += bets[i].amount;
    }

    // 7. Persist necessary states for the next spin's calculations
    state.lastTotalBet = totalBetPlaced;
    state.lastBankroll = bankroll;

    return bets;
}