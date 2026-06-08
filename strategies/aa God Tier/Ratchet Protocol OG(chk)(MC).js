/**
 * Strategy: Ratchet Protocol
 * Source: https://youtu.be/qBsc36JOAiQ (The Lucky Felt)
 * * * Logic & Betting Progression:
 * Level 1: Place 1 unit on two adjacent columns (e.g., 1 & 2). 
 * - Win: Rebet. 
 * - Loss (to Zero): Spin without betting until a column hits. Bet 2 units on that column.
 * - Loss (Non-Zero): Immediately bet 2 units on the column that just won.
 * - Win 2u (if bet was Col 2): Wait until Col 1 or 3 hits, then reset L1 targeting Col 2 and the hit column.
 * - Win 2u (if bet was Col 1 or 3): Immediately reset L1 targeting Col 2 and the winning column.
 * - Loss 2u (to Zero): Wait until Col 1 or 3 hits to determine which side of the board to target, then move to Level 2.
 * - Loss 2u (if bet was Col 2): Wait until Col 1 or 3 hits, then move to Level 2 targeting Col 2 and the hit column.
 * - Loss 2u (if bet was Col 1/3): Move to Level 2 targeting the other 2 columns.
 * * Level 2, 3, 4 (Inner Grids): Targets the 2 active columns.
 * - Step 1: Place grid bets (6 corners / 12 splits / 24 numbers).
 * - Win: Remove winning bet, increase remainder by 1u. Move to Step 2.
 * - Win Step 2: Drop down one Level entirely (or reset to L1 if at L2).
 * - Loss (at any step): Spin without betting until target column hits -> Rebet the frozen bets.
 * - Rebet Win (Step 1): Remove winning bet, increase remainder by 1u. Move to Step 2.
 * - Rebet Win (Step 2): Restart the current Level from Step 1 (reinstate all grid bets at 1u).
 * - Rebet Loss: Move UP one level entirely.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialization
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.sub = 'init';
        state.targetCols = [1, 2]; // Start with Columns 1 & 2
        state.activeBets = [];
        state.frozenBets = [];     // Used to store bets during virtual spins
        state.outUnit = config.betLimits.minOutside;
        state.inUnit = config.betLimits.min;
        
        // Define increment based on config mode
        state.incAmt = config.incrementMode === 'base' ? config.betLimits.min : (config.minIncrementalBet || 1);
    }

    // --- Helper Functions ---
    const checkWin = (num, bets) => {
        if (num === 0) return false;
        let col = num % 3 === 0 ? 3 : num % 3;
        for (let b of bets) {
            if (b.type === 'column' && b.value === col) return true;
            if (b.type === 'number' && b.value === num) return true;
            if (b.type === 'split' && b.value.includes(num)) return true;
            if (b.type === 'corner') {
                if ([b.value, b.value + 1, b.value + 3, b.value + 4].includes(num)) return true;
            }
        }
        return false;
    };

    const removeWinAndInc = (num, bets, inc) => {
        let losers = [];
        let removedWin = false;
        for (let b of bets) {
            let isWin = false;
            if (b.type === 'number' && b.value === num) isWin = true;
            if (b.type === 'split' && b.value.includes(num)) isWin = true;
            if (b.type === 'corner' && [b.value, b.value + 1, b.value + 3, b.value + 4].includes(num)) isWin = true;
            
            if (isWin && !removedWin) {
                removedWin = true; // Remove the winner
            } else {
                losers.push({ ...b, amount: b.amount + inc }); // Keep and increment the rest
            }
        }
        return losers;
    };

    const flipCols = (cols) => cols.includes(1) ? [2, 3] : [1, 2];

    const moveLevelUp = () => {
        if (state.level === 4) {
            state.level = 1;
            state.targetCols = [1, 2]; // Complete reset
            state.sub = 'init';
        } else {
            state.level++;
            state.targetCols = flipCols(state.targetCols);
            state.sub = 'init';
        }
    };

    const moveLevelDown = () => {
        if (state.level === 2) {
            state.level = 1;
        } else {
            state.level--;
        }
        state.targetCols = flipCols(state.targetCols);
        state.sub = 'init';
    };

    // 2. Process the previous spin result
    if (spinHistory.length > 0) {
        let lastSpin = spinHistory[spinHistory.length - 1];
        let num = lastSpin.winningNumber;
        let hitCol = num === 0 ? 0 : (num % 3 === 0 ? 3 : num % 3);
        let isWin = checkWin(num, state.activeBets);

        if (state.level === 1) {
            if (state.sub === 'eval_init') {
                if (!isWin) {
                    if (num === 0) {
                        state.sub = 'wait_col_zero';
                        state.activeBets = [];
                    } else {
                        state.sub = 'eval_2u';
                        state.l1_2u_col = hitCol;
                        state.activeBets = [{ type: 'column', value: hitCol, amount: state.outUnit * 2 }];
                    }
                }
            }
            else if (state.sub === 'wait_col_zero') {
                if (hitCol > 0) {
                    state.sub = 'eval_2u';
                    state.l1_2u_col = hitCol;
                    state.activeBets = [{ type: 'column', value: hitCol, amount: state.outUnit * 2 }];
                }
            }
            else if (state.sub === 'eval_2u') {
                if (hitCol === state.l1_2u_col) {
                    if (state.l1_2u_col === 2) {
                        state.sub = 'wait_1_or_3_win2u';
                        state.activeBets = [];
                    } else {
                        state.targetCols = [2, hitCol];
                        state.level = 1;
                        state.sub = 'init';
                    }
                } else {
                    if (hitCol === 0) {
                        state.sub = 'wait_1_or_3_loss2u';
                        state.activeBets = [];
                    } else if (state.l1_2u_col === 2) {
                        state.sub = 'wait_1_or_3_loss2u';
                        state.activeBets = [];
                    } else {
                        state.targetCols = state.l1_2u_col === 1 ? [2, 3] : [1, 2];
                        state.level = 2;
                        state.sub = 'init';
                    }
                }
            }
            else if (state.sub === 'wait_1_or_3_win2u') {
                if (hitCol === 1 || hitCol === 3) {
                    state.targetCols = [2, hitCol]; 
                    state.level = 1;
                    state.sub = 'init';
                }
            }
            else if (state.sub === 'wait_1_or_3_loss2u') {
                if (hitCol === 1 || hitCol === 3) {
                    state.targetCols = [2, hitCol];
                    state.level = 2;
                    state.sub = 'init';
                }
            }
        } 
        else { // Levels 2, 3, 4 
            if (state.sub === 'eval_grid') {
                if (isWin) {
                    if (state.loopStep === 1) {
                        state.activeBets = removeWinAndInc(num, state.activeBets, state.incAmt);
                        state.loopStep = 2;
                    } else {
                        moveLevelDown();
                    }
                } else {
                    state.sub = 'wait_target_grid';
                    state.frozenBets = [...state.activeBets]; 
                    state.activeBets = []; // Virtual spin
                }
            }
            else if (state.sub === 'wait_target_grid') {
                if (state.targetCols.includes(hitCol)) {
                    state.sub = 'eval_rebet_grid';
                    state.activeBets = [...state.frozenBets]; // Restore bets
                }
            }
            else if (state.sub === 'eval_rebet_grid') {
                if (isWin) {
                    if (state.loopStep === 1) {
                        // Rebet of the 1st step (e.g., 6 corners) won -> proceed to Step 2
                        state.activeBets = removeWinAndInc(num, state.activeBets, state.incAmt);
                        state.loopStep = 2;
                        state.sub = 'eval_grid';
                    } else {
                        // Rebet of the 2nd step (e.g., 5 corners) won -> restart current level
                        state.sub = 'init'; 
                    }
                } else {
                    moveLevelUp();
                }
            }
        }
    }

    // 3. Generate New Bets based on current transition state
    if (state.sub === 'init') {
        if (state.level === 1) {
            state.activeBets = [
                { type: 'column', value: state.targetCols[0], amount: state.outUnit },
                { type: 'column', value: state.targetCols[1], amount: state.outUnit }
            ];
            state.sub = 'eval_init';
        } 
        else {
            state.loopStep = 1;
            state.sub = 'eval_grid';
            
            if (state.level === 2) {
                let starts = state.targetCols.includes(1) ? [1, 7, 13, 19, 25, 31] : [2, 8, 14, 20, 26, 32];
                state.activeBets = starts.map(v => ({ type: 'corner', value: v, amount: state.inUnit }));
            } 
            else if (state.level === 3) {
                let start = state.targetCols.includes(1) ? 1 : 2;
                let splits = [];
                for(let i=0; i<12; i++) {
                    splits.push([start + i*3, start + 1 + i*3]);
                }
                state.activeBets = splits.map(v => ({ type: 'split', value: v, amount: state.inUnit }));
            } 
            else if (state.level === 4) {
                let nums = [];
                for (let i = 1; i <= 36; i++) {
                    let col = i % 3 === 0 ? 3 : i % 3;
                    if (state.targetCols.includes(col)) nums.push(i);
                }
                state.activeBets = nums.map(v => ({ type: 'number', value: v, amount: state.inUnit }));
            }
        }
    }

    // 4. Return Bets (Clamped to limits)
    if (state.activeBets.length === 0) return []; // Virtual spin mode

    return state.activeBets.map(b => {
        let minLimit = b.type === 'column' ? state.outUnit : state.inUnit;
        let safeAmt = Math.max(minLimit, Math.min(b.amount, config.betLimits.max));
        return { ...b, amount: safeAmt };
    });
}