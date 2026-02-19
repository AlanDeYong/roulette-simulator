
/**
 * Strategy: Dragon Skin (Profit Goal Variant)
 * Source: YouTube - "Bet With Mo" (Customized by User)
 * * * * * The Logic:
 * Cumulative "crawling" strategy with a "Take Profit" hold.
 * - Starts with 1 Double Street.
 * - On Loss: Adds next Street (Max 4 active).
 * * * * * Profit & Reset Logic (User Update):
 * - Define a "Cycle Profit Target" (e.g., 50 units).
 * - On Win:
 * - If (CurrentProfit >= Target): RESET to Level 1, Switch Side, Start New Cycle.
 * - If (CurrentProfit < Target): REBET same Level (Hold position to chase target).
 * - On Loss: Increase Level (Progression).
 * * * * * Patterns (Asymmetric):
 * 1. UP (Start 1-6): Middle Straights, Outer Splits.
 * 2. DOWN (Start 31-36): Outer Straights, Inner Splits.
 * * * * * The Progression Ladder:
 * - L1: S:1, L:2  (1 St)
 * - L2: S:1, L:2  (2 St)
 * - L3: S:1, L:6  (3 St)
 * - L4: S:1, L:6  (4 St)
 * - L5: S:2, L:14 (4 St)
 * - L6: S:4, L:26 (4 St)
 * - L7: S:8, L:52 (4 St)
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION ---
    const baseUnit = config.betLimits.min || 1;
    
    // PROFIT TARGET (Configurable)
    // If config.sessionTarget is not set, default to 50 units.
    const PROFIT_TARGET = (config.sessionTarget || 50) * baseUnit;

    // Progression Map
    const getUnitSizes = (lvl) => {
        switch(lvl) {
            case 1: return { S: 1, L: 2 };
            case 2: return { S: 1, L: 2 };
            case 3: return { S: 1, L: 6 };
            case 4: return { S: 1, L: 6 };
            case 5: return { S: 2, L: 14 }; 
            case 6: return { S: 4, L: 26 }; 
            case 7: return { S: 8, L: 52 }; 
            default: return { S: 1, L: 2 };
        }
    };

    // --- HELPER: Generate Pattern ---
    const getStreetPattern = (startNum, direction) => {
        let straights = [], splits = [];
        if (direction === 0) { // UP
            straights = [startNum + 2, startNum + 3];
            splits = [[startNum, startNum + 1], [startNum + 4, startNum + 5]];
        } else { // DOWN
            straights = [startNum, startNum + 5];
            splits = [[startNum + 1, startNum + 2], [startNum + 3, startNum + 4]];
        }
        return {
            line: startNum,
            straights: straights,
            splits: splits,
            coveredNumbers: [startNum, startNum + 1, startNum + 2, startNum + 3, startNum + 4, startNum + 5]
        };
    };

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 1;
    if (state.currentSide === undefined) state.currentSide = 0; 
    
    // Cycle Tracking
    if (state.cycleStartBankroll === undefined) state.cycleStartBankroll = bankroll;

    // --- 3. CHECK PREVIOUS RESULT ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // 3a. Verify Hit/Miss
        let allCoveredNumbers = [];
        let activeStreets = state.level > 4 ? 4 : state.level;

        for (let i = 0; i < activeStreets; i++) {
            let sNum = (state.currentSide === 0) ? 1 + (i * 6) : 31 - (i * 6);
            if (sNum >= 1 && sNum <= 31) {
                allCoveredNumbers = allCoveredNumbers.concat(getStreetPattern(sNum, state.currentSide).coveredNumbers);
            }
        }

        const isHit = allCoveredNumbers.includes(lastSpin.winningNumber);
        
        // 3b. Calculate Cycle Profit
        const cycleProfit = bankroll - state.cycleStartBankroll;
        const targetReached = cycleProfit >= PROFIT_TARGET;

        if (isHit) {
            // WIN Logic
            if (targetReached) {
                // RESET: Target met, lock profit, new cycle
                state.level = 1;
                state.currentSide = state.currentSide === 0 ? 1 : 0; // Switch Side
                state.cycleStartBankroll = bankroll; // Reset Cycle Baseline
            } else {
                // HOLD: Win but target not met -> Stay at Same Level
                // (No change to state.level, No change to side)
            }
        } else {
            // LOSS Logic
            state.level++;
            // Stop Loss Hard Reset
            if (state.level > 7) {
                state.level = 1;
                // Optional: Reset cycle on hard crash to avoid chasing a deep hole
                state.cycleStartBankroll = bankroll; 
            }
        }
    }

    // --- 4. CONSTRUCT BETS ---
    const bets = [];
    const units = getUnitSizes(state.level);
    let streetsToBet = state.level > 4 ? 4 : state.level;

    for (let i = 0; i < streetsToBet; i++) {
        let streetStart = (state.currentSide === 0) ? 1 + (i * 6) : 31 - (i * 6);
        if (streetStart < 1 || streetStart > 31) continue;

        const pattern = getStreetPattern(streetStart, state.currentSide);

        const pushBet = (type, value, unitCount) => {
            let amount = unitCount * baseUnit;
            amount = Math.max(amount, config.betLimits.min);
            amount = Math.min(amount, config.betLimits.max);
            if (amount <= bankroll) bets.push({ type, value, amount });
        };

        pushBet('line', pattern.line, units.L);
        pattern.straights.forEach(num => pushBet('number', num, units.S));
        pattern.splits.forEach(pair => pushBet('split', pair, units.S));
    }

    return bets;

}