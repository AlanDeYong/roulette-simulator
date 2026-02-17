/**
 * STRATEGY: DYNAMIC HOT 10 SPLITS + ZERO (Refined 8-Level System)
 * * * THE LOGIC:
 * 1. Tracking: Waists first 20 spins to build data. Starts betting on Spin 21.
 * 2. Selection (Every Spin):
 * - Analyzes the last 20 spins.
 * - Identifies "Hot" (Hit > 0) and "Cold" (Hit = 0) numbers.
 * - Selects exactly 10 non-overlapping splits with the highest combined frequency.
 * - Prioritizes splits with NO cold numbers.
 * 3. Fixed Bet: Always places 1 unit on Zero.
 * 4. Progression (Preserved):
 * - Levels 1-6: Increase by 1 unit on loss.
 * - Levels 7-8: Double the bet (12u, 24u).
 * - Win (Level 3-8): "Rebet Phase" (Repeat bets minus winner for 1 spin), then reset.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. Initialize State ---
    if (!state.initialized) {
        state.level = 1;
        state.rebetPhase = false;
        state.excludeSplit = null; // Used to remove winning split during Rebet Phase
        state.previousSplits = []; // Stores the selected split values for Rebet logic
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
                // Low-level win: Reset immediately
                state.level = 1;
            }
        } else {
            // Loss: Increase Level
            state.level++;
            if (state.level > 8) state.level = 1; // Safety reset
            state.excludeSplit = null;
        }
    }

    // --- 4. Progression Calculation ---
    const minInside = config.betLimits.min;
    
    // Sequence: 1, 2, 3, 4, 5, 6, 12, 24 units
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
        activeSplits = state.previousSplits.filter(s => {
            if (state.excludeSplit && 
                s[0] === state.excludeSplit[0] && 
                s[1] === state.excludeSplit[1]) {
                return false;
            }
            return true;
        });
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

            // Score Logic:
            // High score for high frequency.
            // Massive penalty if a number is Cold (0 hits).
            
            let qualityScore = totalFreq * 10; 
            
            // Penalty: Avoid Cold numbers if possible
            if (f1 === 0 || f2 === 0) {
                qualityScore = -100 + totalFreq; // Very low score, but distinguishes between 1 hot vs 0 hot
            }

            candidates.push({ value: split, score: qualityScore });
        }

        // Sort by Score (Hottest/Safest first)
        candidates.sort((a, b) => b.score - a.score);

        // Select top 10 Non-Overlapping
        const coveredNumbers = new Set();
        activeSplits = [];
        const TARGET_SPLITS = 10;

        for (const cand of candidates) {
            if (activeSplits.length >= TARGET_SPLITS) break;

            const s = cand.value;
            // Check overlap
            if (!coveredNumbers.has(s[0]) && !coveredNumbers.has(s[1])) {
                activeSplits.push(s);
                coveredNumbers.add(s[0]);
                coveredNumbers.add(s[1]);
            }
        }
        
        // Save for rebet phase
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