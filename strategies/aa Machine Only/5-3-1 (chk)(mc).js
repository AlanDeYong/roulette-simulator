/**
 * 5-3-1 Roulette Strategy (Revised)
 * 
 * Logic:
 * A progressive betting system covering specific corners and double streets.
 * 
 * Progression:
 * - Level 0 (Base): 1 unit on [2, 5, 8, 11, 14]
 * - On Total Loss:
 *   - L1: Add [20, 23, 26, 29, 32] (1u)
 *   - L2: Add [4, 7, 10] (1u)
 *   - L3: Add [22, 25, 28] (1u)
 *   - L4: Add Line [7] (2u)
 *   - L5: Add Line [25] (2u)
 *   - L6: Corners +2u, Lines +4u
 *   - L7+: Corners +1u, Lines +2u
 * - Small Loss (Partial hit): Rebet (No progression)
 * - Win: If current profit >= session peak profit, Reset. Else, Rebet.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 0;
        state.maxProfit = 0;
        state.previousBankroll = bankroll;
        state.previousTotalBet = 0;
    }

    const currentProfit = bankroll - config.startingBankroll;
    
    // 2. Identify Previous Spin Outcome using Bankroll Math
    let totalLoss = false;
    let anyHit = false;

    if (spinHistory.length > 0) {
        const roundProfit = bankroll - state.previousBankroll;
        
        // If the bankroll dropped by the exact amount of the total bet, it was a total loss
        if (roundProfit === -state.previousTotalBet) {
            totalLoss = true;
        } else {
            // Any other outcome means at least one bet hit (small loss or net win)
            anyHit = true;
        }
    }

    // 3. Handle Progression/Reset
    if (anyHit) {
        if (currentProfit >= state.maxProfit) {
            state.maxProfit = currentProfit;
            state.level = 0; // Reset
        }
    } else if (totalLoss) {
        state.level++;
    }

    // 4. Calculate Bets based on Level
    let cornerMap = {}; 
    let lineMap = {}; 

    [2, 5, 8, 11, 14].forEach(c => cornerMap[c] = 1);

    if (state.level >= 1) [20, 23, 26, 29, 32].forEach(c => cornerMap[c] = 1);
    if (state.level >= 2) [4, 7, 10].forEach(c => cornerMap[c] = 1);
    if (state.level >= 3) [22, 25, 28].forEach(c => cornerMap[c] = 1);
    if (state.level >= 4) lineMap[7] = 2;
    if (state.level >= 5) lineMap[25] = 2;

    if (state.level === 6) {
        Object.keys(cornerMap).forEach(k => cornerMap[k] += 2);
        Object.keys(lineMap).forEach(k => lineMap[k] += 4);
    } else if (state.level > 6) {
        let diff = state.level - 6;
        Object.keys(cornerMap).forEach(k => cornerMap[k] = 3 + diff);
        Object.keys(lineMap).forEach(k => lineMap[k] = 6 + (diff * 2));
    }

    // 5. Construct Bet Array
    let bets = [];
    
    for (const [val, amt] of Object.entries(cornerMap)) {
        bets.push({ type: 'corner', value: parseInt(val), amount: Math.min(amt, config.betLimits.max) });
    }
    for (const [val, amt] of Object.entries(lineMap)) {
        bets.push({ type: 'line', value: parseInt(val), amount: Math.min(amt, config.betLimits.max) });
    }

    // 6. Save current state for the next spin's math
    state.previousBankroll = bankroll;
    state.previousTotalBet = bets.reduce((sum, b) => sum + b.amount, 0);

    return bets;
}