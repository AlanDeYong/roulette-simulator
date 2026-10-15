/**
 * Roulette Strategy: Elite Play
 * Source: https://youtu.be/Vck8OjvShbE (Bet With Mo)
 * * Strategy Logic:
 * This is an 8-level progression strategy that covers specific sections of the European board 
 * using straight up and split bets. It aims to grind out profits while using split bets at higher 
 * levels to act as "pushes" (where the payout perfectly equals the total bet size, resulting in no net loss).
 * * Bet Progression:
 * - Level 1: 1 unit on straights 1, 2, 3; splits 4/7, 5/8, 6/9. (Total: 6 units)
 * - Level 2: Rebet Level 1, add 1 unit on straights 10, 11, 12; splits 13/16, 14/17, 15/18. (Total: 12 units)
 * - Level 3: Add straights 19, 20, 21; splits 22/25, 23/26, 24/27. Double all bets to 2 units. (Total: 36 units)
 * - Level 4: Increase all bets to 3 units. (Total: 54 units)
 * - Level 5: Increase all bets to 5 units. (Total: 90 units)
 * - Level 6: Increase all bets to 10 units (double Level 5). (Total: 180 units)
 * - Level 7: Increase all bets to 15 units. (Total: 270 units)
 * - Level 8: Keep previous bets at 15 units. Add 30 units to 0 and double street (line) 28-33. (Total: 330 units)
 * * Win/Loss/Push Conditions:
 * - On Loss (Net Balance < 0): Move up 1 level (maximum level 8).
 * - On Push (Net Balance == 0): Rebet the exact same level (happens when a split bet hits at level 3+).
 * - On Win (Net Balance > 0): 
 * - If new bankroll >= session peak profit, reset to Level 1.
 * - Else, step down 1 level.
 * * Goal:
 * Capitalize on straight up hits for high profit bursts, use splits for free spins (pushes), 
 * and secure continuous peak profit resets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.level = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
        state.initialized = true;
    } else if (spinHistory.length > 0) {
        // 2. Determine exact net outcome of the previous spin
        const netResult = bankroll - state.lastBankroll;
        
        // Track highest bankroll to determine resets
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
        }

        // Apply progression logic
        if (netResult > 0) {
            // Win
            if (bankroll >= state.peakBankroll) {
                state.level = 1; // Reset at session peak
            } else {
                state.level = Math.max(1, state.level - 1); // Step down 1 level
            }
        } else if (netResult < 0) {
            // Loss
            state.level = Math.min(8, state.level + 1); // Step up 1 level
        }
        // If netResult === 0 (Push), state.level remains the same
    }

    // Update last bankroll for the NEXT spin's net calculation
    state.lastBankroll = bankroll;

    // 3. Define the Bet Groups
    const group1 = [
        { type: 'number', value: 1 }, { type: 'number', value: 2 }, { type: 'number', value: 3 },
        { type: 'split', value: [4, 7] }, { type: 'split', value: [5, 8] }, { type: 'split', value: [6, 9] }
    ];
    
    const group2 = [
        { type: 'number', value: 10 }, { type: 'number', value: 11 }, { type: 'number', value: 12 },
        { type: 'split', value: [13, 16] }, { type: 'split', value: [14, 17] }, { type: 'split', value: [15, 18] }
    ];
    
    const group3 = [
        { type: 'number', value: 19 }, { type: 'number', value: 20 }, { type: 'number', value: 21 },
        { type: 'split', value: [22, 25] }, { type: 'split', value: [23, 26] }, { type: 'split', value: [24, 27] }
    ];
    
    const group4 = [
        { type: 'number', value: 0 },
        { type: 'line', value: 28 } // Line bet starting at 28 covers 28, 29, 30, 31, 32, 33
    ];

    // 4. Define Level Matrix
    const levels = {
        1: { activeGroups: [group1], units: 1 },
        2: { activeGroups: [group1, group2], units: 1 },
        3: { activeGroups: [group1, group2, group3], units: 2 },
        4: { activeGroups: [group1, group2, group3], units: 3 },
        5: { activeGroups: [group1, group2, group3], units: 5 },
        6: { activeGroups: [group1, group2, group3], units: 10 },
        7: { activeGroups: [group1, group2, group3], units: 15 },
        8: { activeGroups: [group1, group2, group3], units: 15, extraGroup: group4, extraUnits: 30 }
    };

    const currentConfig = levels[state.level];
    const unit = config.betLimits.min; // Base unit mapped to inside bet minimum
    let bets = [];

    // Helper to safely clamp amounts and push to bets array
    const addBets = (group, unitsMultiplier) => {
        let amount = unitsMultiplier * unit;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        group.forEach(b => {
            bets.push({ type: b.type, value: b.value, amount: amount });
        });
    };

    // 5. Construct Bets
    currentConfig.activeGroups.forEach(group => {
        addBets(group, currentConfig.units);
    });

    if (currentConfig.extraGroup) {
        addBets(currentConfig.extraGroup, currentConfig.extraUnits);
    }

    return bets;
}