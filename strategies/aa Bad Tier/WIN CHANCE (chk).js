/**
 * Roulette Strategy: Win Chance
 * Source: https://youtu.be/vBUgWdehPaU (YouTube Channel: Bet With Mo)
 * 
 * Logic & Conditions:
 * - Covers a large portion of the roulette board (11 straight-up numbers and 5 split bets, covering over 2/3 of the board).
 * - Progression advances one level on a loss, and steps down or resets on a win based on session peak profit.
 * - Win condition / Peak Profit: If current profit reaches or exceeds session's peak profit, reset to Level 1. If a win occurs below peak profit, step down levels to the lowest level required to recover peak profit.
 * 
 * Bet Progression:
 * - Level 1 (Total 7 units): Straight bets on 0, 1, 4, 9, 12; splits on 2/5, 8/11.
 * - Level 2 (Total 22 units): Adds straight bets on 13, 16, split on 14/17, adds 1 unit to 0, then doubles all bets.
 * - Level 3 (Total 29 units): Adds 2 units each on 21, 24, split 20/23, and 1 unit to 0.
 * - Level 4 (Total 72 units): Adds 2 units each on 25, 28, split 26/29, adds 1 unit to 0, then doubles all bets.
 * - Level 5 (Total 152 units): Increases all bets by 5 units each.
 * - Level 6 (Total 232 units): Increases all bets by another 5 units each.
 * - Level 7 (Total 312 units): Increases all bets by another 5 units each.
 * 
 * Goal:
 * - Target incremental session profit goals and reset upon reaching session peak profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minUnit = config.betLimits.min;
    const maxLimit = config.betLimits.max;

    // Initialize state on first run
    if (state.level === undefined) {
        state.level = 1;
        state.initialBankroll = bankroll;
        state.peakProfit = 0;
        state.lastBankroll = bankroll;
    }

    // Process previous spin result if spinHistory has items
    if (spinHistory && spinHistory.length > 0) {
        const prevBankroll = state.lastBankroll !== undefined ? state.lastBankroll : bankroll;
        const profitChange = bankroll - prevBankroll;
        
        const currentProfit = bankroll - state.initialBankroll;
        state.peakProfit = Math.max(state.peakProfit, currentProfit);

        if (profitChange > 0) {
            // Win
            if (currentProfit >= state.peakProfit) {
                state.level = 1;
            } else {
                state.level = Math.max(1, state.level - 1);
            }
        } else if (profitChange < 0) {
            // Loss
            state.level = Math.min(7, state.level + 1);
        }
    }

    state.lastBankroll = bankroll;

    let straightUnits = { 0: 1, 1: 1, 4: 1, 9: 1, 12: 1, 13: 0, 16: 0, 21: 0, 24: 0, 25: 0, 28: 0 };
    let splitUnits = { "2,5": 1, "8,11": 1, "14,17": 0, "20,23": 0, "26,29": 0 };
    let multiplier = 1;
    let additive = 0;

    if (state.level === 1) {
        straightUnits = { 0: 1, 1: 1, 4: 1, 9: 1, 12: 1, 13: 0, 16: 0, 21: 0, 24: 0, 25: 0, 28: 0 };
        splitUnits = { "2,5": 1, "8,11": 1, "14,17": 0, "20,23": 0, "26,29": 0 };
        multiplier = 1;
    } else if (state.level === 2) {
        straightUnits = { 0: 2, 1: 1, 4: 1, 9: 1, 12: 1, 13: 1, 16: 1, 21: 0, 24: 0, 25: 0, 28: 0 };
        splitUnits = { "2,5": 1, "8,11": 1, "14,17": 1, "20,23": 0, "26,29": 0 };
        multiplier = 2;
    } else if (state.level === 3) {
        straightUnits = { 0: 5, 1: 2, 4: 2, 9: 2, 12: 2, 13: 2, 16: 2, 21: 2, 24: 2, 25: 0, 28: 0 };
        splitUnits = { "2,5": 2, "8,11": 2, "14,17": 2, "20,23": 2, "26,29": 0 };
        multiplier = 1;
    } else if (state.level === 4) {
        straightUnits = { 0: 6, 1: 2, 4: 2, 9: 2, 12: 2, 13: 2, 16: 2, 21: 2, 24: 2, 25: 2, 28: 2 };
        splitUnits = { "2,5": 2, "8,11": 2, "14,17": 2, "20,23": 2, "26,29": 2 };
        multiplier = 2;
    } else if (state.level === 5) {
        straightUnits = { 0: 6, 1: 2, 4: 2, 9: 2, 12: 2, 13: 2, 16: 2, 21: 2, 24: 2, 25: 2, 28: 2 };
        splitUnits = { "2,5": 2, "8,11": 2, "14,17": 2, "20,23": 2, "26,29": 2 };
        multiplier = 2;
        additive = 5;
    } else if (state.level === 6) {
        straightUnits = { 0: 6, 1: 2, 4: 2, 9: 2, 12: 2, 13: 2, 16: 2, 21: 2, 24: 2, 25: 2, 28: 2 };
        splitUnits = { "2,5": 2, "8,11": 2, "14,17": 2, "20,23": 2, "26,29": 2 };
        multiplier = 2;
        additive = 10;
    } else if (state.level === 7) {
        straightUnits = { 0: 6, 1: 2, 4: 2, 9: 2, 12: 2, 13: 2, 16: 2, 21: 2, 24: 2, 25: 2, 28: 2 };
        splitUnits = { "2,5": 2, "8,11": 2, "14,17": 2, "20,23": 2, "26,29": 2 };
        multiplier = 2;
        additive = 15;
    }

    let bets = [];

    for (let numStr in straightUnits) {
        let base = straightUnits[numStr];
        if (base > 0) {
            let unitsVal = (base * multiplier) + additive;
            let amount = unitsVal * minUnit;
            amount = Math.max(minUnit, Math.min(amount, maxLimit));
            bets.push({ type: 'number', value: parseInt(numStr), amount: amount });
        }
    }

    for (let splitKey in splitUnits) {
        let base = splitUnits[splitKey];
        if (base > 0) {
            let unitsVal = (base * multiplier) + additive;
            let amount = unitsVal * minUnit;
            amount = Math.max(minUnit, Math.min(amount, maxLimit));
            let parts = splitKey.split(',').map(Number);
            bets.push({ type: 'split', value: parts, amount: amount });
        }
    }

    return bets;
}