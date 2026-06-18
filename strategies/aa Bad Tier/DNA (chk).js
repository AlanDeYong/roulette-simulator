/**
 * Roulette Strategy: The "DNA" Protocol (Corrected Dynamic Entry & Wait Progression)
 * Source: The Lucky Felt (https://youtu.be/jYxHIjPrGYE)
 * * The Full Logic & Bet Progression:
 * - Entry Trigger: Wait until the 1st or 3rd column wins.
 * - Level 1 (Starting bet): 6 non-overlapping split bets covering the opposite column of the entry trigger, 1 unit bet each.
 * - Level 2 (On loss): Rebet Level 1 + add 6 non-overlapping split bets covering the opposite column, 1 unit bet each.
 * - Level 3 (On loss): Rebet Levels 1 & 2 + add 5 non-overlapping corner bets. 
 * Placement depends on the most recent hit: If 3rd column hit most recently, use bottom corners (4, 10, 16, 22, 28). 
 * If 1st column hit most recently, use top corners (5, 11, 17, 23, 29). Bet 3 units each.
 * - Level 4 (On loss): Rebet previous + add 1 unit bet each to each corner.
 * - Level 5 (On next loss): Stop betting (sit out). 
 * - Resume Condition: If sitting out with bottom corners and 1st col hits OR sitting out with top corners and 3rd col hits -> 
 * Rebet current setup and add 1 unit to all corner bets.
 * - Win/Reset Condition: On win, reset to Entry Trigger phase if session's peak profit reached. Otherwise, rebet at current level.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.highWaterMark = bankroll;
        state.phase = 'WAITING_TO_START';
        state.level = 1;
        state.targetCol = null;
        state.lastHitCol = null;
        state.cornerType = null; // 'TOP' or 'BOTTOM'
        state.cornerUnits = 3;
        state.lastBankroll = bankroll;
        state.lastBetAmount = 0;
    }

    // Helper to identify column
    const getColumn = (num) => {
        if (num === 0 || num === '00') return 0;
        return num % 3 === 0 ? 3 : (num % 3);
    };

    // 2. Track the most recently hit target column (1 or 3)
    if (spinHistory.length > 0) {
        let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        let col = getColumn(lastNum);
        if (col === 1 || col === 3) {
            state.lastHitCol = col;
        }
    }

    // 3. Check for new high-water mark (Reset condition)
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
        state.phase = 'WAITING_TO_START';
        state.level = 1;
        state.cornerType = null;
        state.cornerUnits = 3;
    }

    // Setup safe increment value
    let increment = (config.incrementMode === 'fixed' && config.minIncrementalBet !== undefined) ? config.minIncrementalBet : 1;

    // 4. Determine Win/Loss from the previous bet to progress the ladder
    if (state.lastBetAmount > 0 && state.phase === 'PLAYING') {
        let isLoss = bankroll < state.lastBankroll;
        
        if (isLoss) {
            if (state.level === 1) {
                state.level = 2;
            } else if (state.level === 2) {
                state.level = 3;
            } else if (state.level === 3) {
                state.level = 4;
                state.cornerUnits += increment;
            } else if (state.level >= 4) {
                state.phase = 'SITTING_OUT';
            }
        }
    }

    // 5. Phase: Waiting to Start
    if (state.phase === 'WAITING_TO_START') {
        if (spinHistory.length > 0) {
            let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
            let col = getColumn(lastNum);
            
            if (col === 1) {
                state.targetCol = 3;
                state.phase = 'PLAYING';
                state.level = 1;
            } else if (col === 3) {
                state.targetCol = 1;
                state.phase = 'PLAYING';
                state.level = 1;
            }
        }
        
        if (state.phase === 'WAITING_TO_START') {
            state.lastBankroll = bankroll;
            state.lastBetAmount = 0;
            return []; 
        }
    }

    // 6. Phase: Sitting Out & Resume Logic
    if (state.phase === 'SITTING_OUT') {
        if (spinHistory.length > 0) {
            let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
            let col = getColumn(lastNum);

            // Resume and increment if specific opposite column hits based on corner type
            if (state.cornerType === 'BOTTOM' && col === 1) {
                state.phase = 'PLAYING';
                state.level = 4; // Resumes at level 4 so the next loss sends it back to SITTING_OUT
                state.cornerUnits += increment;
            } else if (state.cornerType === 'TOP' && col === 3) {
                state.phase = 'PLAYING';
                state.level = 4;
                state.cornerUnits += increment;
            }
        }

        if (state.phase === 'SITTING_OUT') {
            state.lastBankroll = bankroll;
            state.lastBetAmount = 0;
            return [];
        }
    }

    // 7. Phase: Playing - Construct Bets
    let unit = config.betLimits.min;
    let bets = [];
    
    const col1Splits = [[1, 4], [7, 10], [13, 16], [19, 22], [25, 28], [31, 34]];
    const col3Splits = [[3, 6], [9, 12], [15, 18], [21, 24], [27, 30], [33, 36]];

    // Level 1: Chosen Column Splits
    let primarySplits = state.targetCol === 1 ? col1Splits : col3Splits;
    if (state.level >= 1) {
        for (let s of primarySplits) {
            bets.push({ type: 'split', value: s, amount: unit });
        }
    }
    
    // Level 2+: Opposite Column Splits
    let oppositeSplits = state.targetCol === 1 ? col3Splits : col1Splits;
    if (state.level >= 2) {
        for (let s of oppositeSplits) {
            bets.push({ type: 'split', value: s, amount: unit });
        }
    }
    
    // Level 3+: Corners
    if (state.level >= 3) {
        let cornerAmount = state.cornerUnits * unit;
        cornerAmount = Math.max(cornerAmount, config.betLimits.min); 
        
        // Lock in the corner type. Col 3 on felt is Top Row. Col 1 on felt is Bottom Row.
        if (!state.cornerType) {
            state.cornerType = (state.lastHitCol === 3) ? 'BOTTOM' : 'TOP';
        }

        // Top corners physically sit between Col 2 and Col 3
        // Bottom corners physically sit between Col 1 and Col 2
        let cornerStarts = state.cornerType === 'TOP' ? [5, 11, 17, 23, 29] : [4, 10, 16, 22, 28];

        for (let start of cornerStarts) {
            bets.push({ type: 'corner', value: start, amount: cornerAmount });
        }
    }

    // 8. Clamp bets to limits and record state
    let totalBetAmount = 0;
    for (let b of bets) {
        // Safe check to strip any lingering bad amounts preventing NaN errors
        b.amount = b.amount ? Math.min(b.amount, config.betLimits.max) : unit;
        totalBetAmount += b.amount;
    }

    state.lastBankroll = bankroll;
    state.lastBetAmount = totalBetAmount;

    return bets;
}