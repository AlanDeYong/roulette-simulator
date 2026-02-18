/**
 * STRATEGY: DYNAMIC HOT 10 SPLITS + ZERO (Refined 8-Level System)
 * * Source: Custom / User Provided
 * * The Logic: 
 * - Tracking Phase: Observes the first 20 spins without betting to build a frequency map.
 * - Selection: Analyzes the trailing 20 spins. Selects 10 non-overlapping splits with the 
 *   highest combined hit frequency. Heavily penalizes and avoids splits containing "Cold" (0 hit) numbers.
 * - Bet Execution: Places equal units on the 10 chosen splits and the number Zero.
 * * The Progression:
 * - Levels 1-6: Increase base bet by 1 unit after a loss (1u, 2u, 3u, 4u, 5u, 6u).
 * - Levels 7-8: Accelerate bet size (12u, 24u). Caps at Level 8 if losing streak continues.
 * - Rebet Phase: If a win occurs at Level 3 or higher, the strategy enters a 1-spin "Rebet Phase" 
 *   using the exact same splits (excluding the one that just won, replacing it with the next best).
 * * The Goal:
 * - Target Profit: +2% of the initial session bankroll. 
 * - The progression level ONLY resets to base (Level 1) when this 2% profit target is met.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    try {
        // --- 1. Initialize State ---
        if (!state.initialized) {
            state.level = 1;
            state.rebetPhase = false;
            state.excludeSplit = null; // Used to remove winning split during Rebet Phase
            state.previousSplits = []; // Stores the selected split values for Rebet logic
            state.initialBankroll = bankroll; // Store initial bankroll for % profit calc
            state.initialized = true;
        }

        // --- 2. Tracking Phase (First 20 Spins) ---
        // We need 20 past results to calculate Hot/Cold.
        if (spinHistory.length < 20) {
            return [];
        }

        // --- 3. Process Previous Result (From Spin 21 onwards) ---
        if (spinHistory.length > 20) {
            const lastResult = spinHistory[spinHistory.length - 1];
            const lastWinNum = lastResult.winningNumber;
            let wonLastSpin = false;
            let winningSplitValue = null;

            // Check if our last bets hit
            if (state.lastBets) {
                for (const b of state.lastBets) {
                    // Check Zero
                    if (b.type === 'number' && b.value === lastWinNum) {
                        wonLastSpin = true;
                    }
                    // Check Splits
                    if (b.type === 'split' && b.value.includes(lastWinNum)) {
                        wonLastSpin = true;
                        winningSplitValue = b.value;
                    }
                }
            }

            // Logic Transitions
            if (state.rebetPhase) {
                // One-time rebet finished. Reset.
                state.level = 1;
                state.rebetPhase = false;
                state.excludeSplit = null;
                state.previousSplits = [];
            } else if (wonLastSpin) {
                if (state.level >= 3) {
                    // High-level win: Enter rebet phase
                    state.rebetPhase = true;
                    state.excludeSplit = winningSplitValue; // Can be null if Zero won
                } else {
                    // Low-level win: Reset logic
                    // New Rule: Only reset if the win is within 2% of session profit
                    
                    if (state.initialBankroll === undefined) state.initialBankroll = bankroll;
                    
                    const currentSessionProfit = bankroll - state.initialBankroll;
                    const profitPercentage = (currentSessionProfit / state.initialBankroll) * 100;

                    if (profitPercentage >= 2) {
                        state.level = 1; // Reset to base
                    } else {
                        // Maintain level
                    }
                }
            } else {
                // Loss: Increase Level
                state.level++;
                if (state.level > 8) state.level = 1; // Safety reset / Loop
                state.excludeSplit = null;
            }
        }

        // --- 4. Progression Calculation ---
        const minInside = config.betLimits.min;
        
        let multiplier = state.level;
        if (state.level === 7) multiplier = 12;
        if (state.level === 8) multiplier = 24;

        let chipAmount = minInside * multiplier;
        
        // Clamp to table limits
        chipAmount = Math.max(chipAmount, config.betLimits.min);
        chipAmount = Math.min(chipAmount, config.betLimits.max);

        // --- 5. Determine Active Splits ---
        let activeSplits = [];

        if (state.rebetPhase) {
            // In Rebet Phase, strictly use the PREVIOUS set of splits
            // Exclude the specific split that just won (if any)
            if (!state.previousSplits) state.previousSplits = [];
            
            activeSplits = state.previousSplits.filter(s => {
                if (state.excludeSplit && 
                    s[0] === state.excludeSplit[0] && 
                    s[1] === state.excludeSplit[1]) {
                    return false;
                }
                return true;
            });
            
            if (activeSplits.length < 10) {
                 const window = spinHistory.slice(-20);
                 const counts = {};
                 for (let i = 0; i <= 36; i++) counts[i] = 0;
                 window.forEach(spin => { if (spin.winningNumber !== undefined) counts[spin.winningNumber]++; });
                 
                 const allSplits = getAllSplits();
                 const currentSet = new Set(activeSplits.map(s => s.toString()));
                 
                 if (state.excludeSplit) currentSet.add(state.excludeSplit.toString());

                 let bestNewSplit = null;
                 let bestScore = -Infinity;

                 for (const split of allSplits) {
                     if (currentSet.has(split.toString())) continue;
                     
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
                 }
            }
            
        } else {
            // --- Dynamic Hot/Cold Calculation (Last 20 Spins) ---
            const window = spinHistory.slice(-20);
            const counts = {};
            for (let i = 0; i <= 36; i++) counts[i] = 0;
            
            window.forEach(spin => {
                if (spin.winningNumber !== undefined) counts[spin.winningNumber]++;
            });

            // Generate all valid board splits
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
            const TARGET_SPLITS = 10;

            for (const cand of candidates) {
                if (activeSplits.length >= TARGET_SPLITS) break;

                const s = cand.value;
                if (!coveredNumbers.has(s[0]) && !coveredNumbers.has(s[1])) {
                    activeSplits.push(s);
                    coveredNumbers.add(s[0]);
                    coveredNumbers.add(s[1]);
                }
            }
            
            state.previousSplits = activeSplits;
        }

        // --- 6. Construct Final Bets ---
        const bets = [];

        // Always 1 unit on Zero (scaled by progression)
        if (bankroll >= chipAmount) {
            bets.push({ type: 'number', value: 0, amount: chipAmount });
        }

        // Add Split Bets
        for (const val of activeSplits) {
            if (bankroll >= chipAmount) {
                bets.push({
                    type: 'split',
                    value: val,
                    amount: chipAmount
                });
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

// --- Helper: Generate all standard roulette splits ---
function getAllSplits() {
    const splits = [];
    
    // 1. Horizontal Splits (e.g., 1|2, 2|3)
    for (let row = 1; row <= 34; row += 3) {
        splits.push([row, row + 1]);     // 1|2, 4|5...
        splits.push([row + 1, row + 2]); // 2|3, 5|6...
    }

    // 2. Vertical Splits (e.g., 1|4, 2|5)
    for (let n = 1; n <= 33; n++) {
        splits.push([n, n + 3]);
    }

    // Note: We generally exclude Zero splits from the "Splits" pool 
    // because we are betting on Zero straight up separately.
    
    return splits;
}
