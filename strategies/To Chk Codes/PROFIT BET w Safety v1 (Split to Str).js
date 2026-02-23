/**
 * STRATEGY: 8 HOT SPLITS + COLDEST DOUBLE STREET + ZERO
 * * Source: Custom / User Provided
 * * The Logic: 
 * - Tracking Phase: Observes the first 20 spins without betting.
 * - Selection: Selects the 8 non-overlapping splits with the highest hit frequency.
 * - Selection: Selects the 1 double street (line bet) with the lowest hit frequency.
 * - Bet Profile: 1 Unit on Zero, 1 Unit on Cold Double Street, 1 Unit each on 8 Hot Splits.
 * * The Progression:
 * - Levels 1-6: Increase base bet by 1 unit after a loss (1u, 2u, 3u, 4u, 5u, 6u).
 * - Levels 7-8: Accelerate bet size (12u, 24u).
 * - Rebet Phase: ANY win triggers a Rebet phase at the same level.
 * * The Goal:
 * - Target Profit: Dynamic Trailing Peak. 
 * - Resets to base (Level 1) when recovering from a drawdown 
 * and a win brings the bankroll to within 2% of the highest recorded session peak.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    try {
        // --- 1. Initialize State ---
        if (!state.initialized) {
            state.level = 1;
            state.rebetPhase = false;
            state.excludeSplit = null; 
            state.previousSplits = []; 
            state.previousDS = null; // Store Double Street for Rebet
            state.initialBankroll = bankroll; 
            state.peakBankroll = bankroll; 
            state.initialized = true;
        }

        // --- 2. Tracking Phase (First 20 Spins) ---
        if (spinHistory.length < 20) {
            return [];
        }

        // --- 3. Process Previous Result ---
        if (spinHistory.length > 20) {
            const lastResult = spinHistory[spinHistory.length - 1];
            const lastWinNum = lastResult.winningNumber;
            let wonLastSpin = false;
            let winningSplitValue = null;

            if (state.lastBets) {
                for (const b of state.lastBets) {
                    if (b.type === 'number' && b.value === lastWinNum) {
                        wonLastSpin = true;
                    }
                    if (b.type === 'split' && b.value.includes(lastWinNum)) {
                        wonLastSpin = true;
                        winningSplitValue = b.value;
                    }
                    if (b.type === 'double_street' && b.value.includes(lastWinNum)) {
                        wonLastSpin = true;
                    }
                }
            }

            // --- DYNAMIC TRAILING PEAK LOGIC ---
            if (state.peakBankroll === undefined) state.peakBankroll = state.initialBankroll;
            if (state.initialBankroll === undefined) state.initialBankroll = bankroll;
            
            if (bankroll > state.peakBankroll) {
                state.peakBankroll = bankroll;
            }

            const margin = state.initialBankroll * 0.02;
            const resetTarget = state.peakBankroll - margin;

            let justFinishedRebet = false;

            if (state.rebetPhase) {
                state.rebetPhase = false;
                justFinishedRebet = true; 
            } 

            // --- GOAL OVERRIDE (Recovery Reset) ---
            if (state.level > 1 && bankroll >= resetTarget && (wonLastSpin || justFinishedRebet)) {
                // Target met! Reset everything to base.
                state.level = 1;
                state.rebetPhase = false;
                state.excludeSplit = null;
                state.previousSplits = [];
                state.previousDS = null;
            } else {
                // Target not met, or we are actively winning at Level 1.
                if (wonLastSpin) {
                    // ANY win triggers/maintains Rebet Phase
                    state.rebetPhase = true;
                    state.excludeSplit = winningSplitValue; 
                } else {
                    // Loss: Increase Level
                    state.level++;
                    if (state.level > 8) state.level = 1; 
                    state.rebetPhase = false;
                    state.excludeSplit = null;
                }
            }
        }

        // --- 4. Progression Calculation ---
        const minInside = config.betLimits.min;
        let multiplier = state.level;
        if (state.level === 7) multiplier = 12;
        if (state.level === 8) multiplier = 24;

        let chipAmount = minInside * multiplier;
        chipAmount = Math.max(chipAmount, config.betLimits.min);
        chipAmount = Math.min(chipAmount, config.betLimits.max);

        // --- 5. Determine Active Bets ---
        let activeSplits = [];
        let activeDS = null;
        const TARGET_SPLITS = 8;
        
        const window = spinHistory.slice(-20);
        const counts = {};
        for (let i = 0; i <= 36; i++) counts[i] = 0;
        window.forEach(spin => { if (spin.winningNumber !== undefined) counts[spin.winningNumber]++; });

        if (state.rebetPhase) {
            if (!state.previousSplits) state.previousSplits = [];
            
            // Retain previous double street
            activeDS = state.previousDS;

            // Retain previous splits, filtering out the one that just won
            activeSplits = state.previousSplits.filter(s => {
                if (state.excludeSplit && s[0] === state.excludeSplit[0] && s[1] === state.excludeSplit[1]) {
                    return false;
                }
                return true;
            });
            
            // Pull new splits to hit the 8 count if one was removed
            if (activeSplits.length < TARGET_SPLITS) {
                 const allSplits = getAllSplits();
                 const currentSet = new Set(activeSplits.map(s => s.toString()));
                 if (state.excludeSplit) currentSet.add(state.excludeSplit.toString());

                 const coveredNumbers = new Set();
                 activeSplits.forEach(s => {
                     coveredNumbers.add(s[0]);
                     coveredNumbers.add(s[1]);
                 });

                 while (activeSplits.length < TARGET_SPLITS) {
                     let bestNewSplit = null;
                     let bestScore = -Infinity;

                     for (const split of allSplits) {
                         if (currentSet.has(split.toString())) continue;
                         if (coveredNumbers.has(split[0]) || coveredNumbers.has(split[1])) continue;
                         
                         const n1 = split[0];
                         const n2 = split[1];
                         const totalFreq = counts[n1] + counts[n2];
                         let score = totalFreq * 10;
                         if (counts[n1] === 0 || counts[n2] === 0) score = -100 + totalFreq;
                         
                         if (score > bestScore) {
                             bestScore = score;
                             bestNewSplit = split;
                         }
                     }
                     
                     if (bestNewSplit) {
                         activeSplits.push(bestNewSplit);
                         currentSet.add(bestNewSplit.toString());
                         coveredNumbers.add(bestNewSplit[0]);
                         coveredNumbers.add(bestNewSplit[1]);
                     } else {
                         break; // Failsafe
                     }
                 }
            }
            
        } else {
            // --- Standard Calculation (After a Loss) ---

            // A. Find Coldest Double Street
            const allDS = getDoubleStreets();
            let lowestDSScore = Infinity;
            
            for (const ds of allDS) {
                let currentDSHitCount = 0;
                ds.forEach(n => { currentDSHitCount += counts[n]; });
                
                if (currentDSHitCount < lowestDSScore) {
                    lowestDSScore = currentDSHitCount;
                    activeDS = ds;
                }
            }

            // B. Find Hottest 8 Splits
            const allSplits = getAllSplits();
            let candidates = [];

            for (const split of allSplits) {
                const n1 = split[0];
                const n2 = split[1];
                const f1 = counts[n1];
                const f2 = counts[n2];
                const totalFreq = f1 + f2;

                let qualityScore = totalFreq * 10; 
                if (f1 === 0 || f2 === 0) {
                    qualityScore = -100 + totalFreq; 
                }

                candidates.push({ value: split, score: qualityScore });
            }

            candidates.sort((a, b) => b.score - a.score);

            const coveredNumbers = new Set();
            activeSplits = [];

            for (const cand of candidates) {
                if (activeSplits.length >= TARGET_SPLITS) break;

                const s = cand.value;
                if (!coveredNumbers.has(s[0]) && !coveredNumbers.has(s[1])) {
                    activeSplits.push(s);
                    coveredNumbers.add(s[0]);
                    coveredNumbers.add(s[1]);
                }
            }
        }
        
        state.previousSplits = activeSplits;
        state.previousDS = activeDS;

        // --- 6. Construct Final Bets ---
        const bets = [];

        // Add Zero
        if (bankroll >= chipAmount) {
            bets.push({ type: 'number', value: 0, amount: chipAmount });
        }

        // Add Coldest Double Street
        if (activeDS && bankroll >= chipAmount) {
             bets.push({ type: 'double_street', value: activeDS, amount: chipAmount });
        }

        // Add Hottest 8 Splits
        for (const val of activeSplits) {
            if (bankroll >= chipAmount) {
                bets.push({ type: 'split', value: val, amount: chipAmount });
            }
        }

        state.lastBets = bets;
        return bets;
    } catch (e) {
        if (utils && utils.log) utils.log("ERROR IN STRATEGY: " + e.message);
        console.error("CRITICAL STRATEGY ERROR:", e);
        return [];
    }
}

// --- Helpers ---
function getAllSplits() {
    const splits = [];
    for (let row = 1; row <= 34; row += 3) {
        splits.push([row, row + 1]);     
        splits.push([row + 1, row + 2]); 
    }
    for (let n = 1; n <= 33; n++) {
        splits.push([n, n + 3]);
    }
    return splits;
}

function getDoubleStreets() {
    const lines = [];
    // Generates 11 valid double streets (6-line bets): [1..6], [4..9], etc.
    for (let row = 1; row <= 31; row += 3) {
        lines.push([row, row + 1, row + 2, row + 3, row + 4, row + 5]);
    }
    return lines;
}