/**
 * Strategy: Hit Spot 2.0 (Left/Right Sides with Progression)
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const TARGET_INCREMENT = 20;

    // --- HELPER: LEVEL DEFINITIONS ---
    const LEVEL_RULES = {
        'A': {
            1: { addStr: [2,3,5,6], addSplit: '1/4', addUnits: 1 },
            2: { addStr: [7,8,10,11], addSplit: '9/12', addUnits: 1 },
            3: { addStr: [14,15,17,18], addSplit: '13/16', addUnits: 1, doubleAll: true },
            4: { addStr: [19,20,22,23], addSplit: '21/24', addUnits: 2 },
            5: { addStr: [26,27,29,30], addSplit: '25/28', addUnits: 2 }
        },
        'B': {
            1: { addStr: [32,33,35,36], addSplit: '31/34', addUnits: 1 },
            2: { addStr: [25,26,28,29], addSplit: '27/30', addUnits: 1 },
            3: { addStr: [20,21,23,24], addSplit: '19/22', addUnits: 1, doubleAll: true },
            4: { addStr: [13,14,16,17], addSplit: '15/18', addUnits: 2 },
            5: { addStr: [8,9,11,12], addSplit: '7/10', addUnits: 2 },
            6: { doubleAll: true },
            7: { doubleAll: true },
            8: { doubleAll: true }
        }
    };

    const MAX_LEVEL = { 'A': 5, 'B': 8 };

    // --- HELPER: APPLY LEVEL ---
    const applyLevelRules = (level, side, stateObj) => {
        const rules = LEVEL_RULES[side][level];
        if (!rules) return;

        // 1. Add new straight bets FIRST
        if (rules.addStr) {
            rules.addStr.forEach(num => {
                stateObj.activeBets.push({ type: 'number', value: num, units: rules.addUnits });
            });
        }

        // 2. Add new split bet FIRST
        if (rules.addSplit) {
            stateObj.activeBets.push({ type: 'split', value: rules.addSplit, units: rules.addUnits });
        }

        // 3. THEN double all bets (including the newly added ones) if required
        if (rules.doubleAll) {
            stateObj.activeBets.forEach(bet => {
                bet.units *= 2;
            });
        }
    };

    // --- STATE INITIALIZATION ---
    if (!state.initialized) {
        state.side = 'A'; // Start from Left Side
        state.level = 1;
        state.peakBankroll = bankroll;
        
        // Bulletproof tracking variables
        state.previousBankroll = bankroll; 
        state.activeBets = [];
        
        applyLevelRules(state.level, state.side, state);
        state.initialized = true;
    }

    // --- PROCESS LAST SPIN RESULT ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Net Change check using true bankroll difference
        let netChange = bankroll - state.previousBankroll;
        
        // Safely extract winning number fallback
        let winNumVal = lastSpin.number !== undefined ? lastSpin.number : lastSpin.winningNumber;

        if (netChange > 0) {
            // === WIN ===
            // Check if Target is Hit
            if (bankroll >= state.peakBankroll + TARGET_INCREMENT) {
                // Reset and switch sides
                state.peakBankroll = bankroll; // Establish new peak
                state.side = state.side === 'A' ? 'B' : 'A'; // Switch sides
                state.level = 1; // Reset progression
                state.activeBets = [];
                applyLevelRules(state.level, state.side, state);
            } else {
                // Target not reached yet
                // Rebet: from level 5 onwards, remove winning straight number
                if (state.level >= 5 && winNumVal !== undefined) {
                    state.activeBets = state.activeBets.filter(bet => {
                        // Keep if it's a split OR if it's a straight bet that didn't just hit
                        return bet.type !== 'number' || bet.value !== winNumVal;
                    });
                }
            }
        } else if (netChange < 0) {
            // === LOSS ===
            // Progress level if not at max
            if (state.level < MAX_LEVEL[state.side]) {
                state.level++;
                applyLevelRules(state.level, state.side, state);
            }
        }
    }

    // Update tracking bankroll BEFORE placing new bets
    state.previousBankroll = bankroll;

    // --- CALCULATE BETS ---
    const baseUnit = config.betLimits ? config.betLimits.min : 1; 
    let finalBets = [];
    let totalNeeded = 0;

    state.activeBets.forEach(betDef => {
        let amount = baseUnit * betDef.units;
        
        // Apply limits safely
        if (config.betLimits) {
            amount = Math.max(amount, config.betLimits.min);
            amount = Math.min(amount, config.betLimits.max);
        }

        finalBets.push({
            type: betDef.type,
            value: betDef.value,
            amount: amount
        });
        
        totalNeeded += amount;
    });

    // --- BANKROLL SAFETY CHECK ---
    if (totalNeeded > bankroll) {
        // Not enough bankroll, stop betting to prevent negative balance errors
        return [];
    }

    return finalBets;
}