/**
 * Roulette Strategy: Dynamic Hot/Cold Progression
 * * Source: https://www.youtube.com/watch?v=zoiGrfPGLdY&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=2&t=272s (Modified for Hot/Cold tracking)
 * * The Logic:
 * This strategy dynamically targets the most frequent ("hot") areas of the board.
 * - Observation Phase: Waits for the first 37 spins without betting to collect data.
 * - Selection: Calculates the frequency of all numbers in the last 37 spins. 
 * - The top 5 hottest numbers become the base straight bets (S1).
 * - The next 4 hottest numbers become the secondary straight bets (S2).
 * - It evaluates all valid splits (excluding those that overlap with S1/S2 to maintain spread) 
 * and selects the hottest 4 splits (Sp1) and next hottest 5 splits (Sp2).
 * * The Progression:
 * The bet unit progression follows an 8-step sequence based on consecutive losses:
 * - Level 0: 1 unit on base straights (S1), 1 unit on base splits (Sp1).
 * - Level 1 (Loss): Add secondary straights (S2) at 1u, add secondary splits (Sp2) at 1u. Base Sp1 becomes 2u.
 * - Level 2 (Loss): Increase ALL active bets by 1 unit.
 * - Level 3 (Loss): Increase ALL split bets by 1 unit.
 * - Level 4 (Loss): Increase ALL bets by 1 unit.
 * - Level 5 (Loss): Increase ALL split bets by 1 unit.
 * - Level 6 (Loss): Double all units.
 * - Level 7 (Loss): Double all units again.
 * - Upon a win: If the session high bankroll is NOT reached, rebet at the current level.
 * - Upon a reset (win reaching new session high OR loss exceeding level 7): Reset progression 
 * to Level 0 AND recalculate a brand new set of hot S1, S2, Sp1, Sp2 based on the *last 37 spins*.
 * * The Goal:
 * To capitalize on short-term statistical variance (hot clusters) while protecting the bankroll 
 * through a structured loss progression, continuously adapting to the table's current trends.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.level = 0;
        state.isBetting = false;
        state.sessionHigh = bankroll;
        state.lastBankroll = bankroll;
        state.initialized = true;

        // Progression lookup table for units: [S1, Sp1, S2, Sp2]
        state.unitsMap = [
            [1, 1, 0, 0],   // L0: Base
            [1, 2, 1, 1],   // L1: Loss 1 
            [2, 3, 2, 2],   // L2: Loss 2 
            [2, 4, 2, 3],   // L3: Loss 3 
            [3, 5, 3, 4],   // L4: Loss 4 
            [3, 6, 3, 5],   // L5: Loss 5 
            [6, 12, 6, 10], // L6: Loss 6 
            [12, 24, 12, 20]// L7: Loss 7 
        ];

        // Precompute all valid European roulette splits to evaluate hotness later
        state.validSplits = [];
        for (let i = 1; i <= 36; i++) {
            if (i % 3 !== 0) state.validSplits.push([i, i + 1]); // Horizontal splits
            if (i <= 33) state.validSplits.push([i, i + 3]);     // Vertical splits
        }
        state.validSplits.push([0, 1], [0, 2], [0, 3]); // Zero splits

        // Helper function to calculate hot numbers and splits from history
        state.calculateHotLayout = (history) => {
            const last37 = history.slice(-37).map(s => s.winningNumber);
            const counts = new Array(37).fill(0);
            last37.forEach(n => counts[n]++);

            // Sort numbers by frequency, using most recent appearance as a tie-breaker
            const nums = Array.from({length: 37}, (_, i) => i);
            nums.sort((a, b) => {
                if (counts[b] !== counts[a]) return counts[b] - counts[a];
                return last37.lastIndexOf(b) - last37.lastIndexOf(a);
            });

            const s1 = nums.slice(0, 5);
            const s2 = nums.slice(5, 9);
            const selectedStraights = new Set([...s1, ...s2]);

            // Score splits based on the combined frequency of their numbers
            const splitScores = state.validSplits.map(sp => {
                // Exclude splits that overlap with chosen straight numbers to ensure board spread
                if (selectedStraights.has(sp[0]) || selectedStraights.has(sp[1])) return null;
                return { sp, score: counts[sp[0]] + counts[sp[1]] };
            }).filter(x => x !== null);

            // Sort splits by score, tie-break by most recent appearance of either number in the split
            splitScores.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                const lastA = Math.max(last37.lastIndexOf(a.sp[0]), last37.lastIndexOf(a.sp[1]));
                const lastB = Math.max(last37.lastIndexOf(b.sp[0]), last37.lastIndexOf(b.sp[1]));
                return lastB - lastA;
            });

            return {
                s1: s1,
                s2: s2,
                sp1: splitScores.slice(0, 4).map(x => x.sp),
                sp2: splitScores.slice(4, 9).map(x => x.sp)
            };
        };
    }

    // 2. Observation Phase: Wait for 37 spins
    if (spinHistory.length < 37) {
        return []; // Do not bet, just collect data
    }

    // 3. Trigger initial betting phase
    if (spinHistory.length >= 37 && !state.isBetting) {
        state.isBetting = true;
        state.activeLayout = state.calculateHotLayout(spinHistory);
        state.sessionHigh = bankroll;
        state.lastBankroll = bankroll;
    }

    // 4. Evaluate previous spin outcome (only if we have been actively betting)
    let needsRecalc = false;
    
    // We only process win/loss progression if a bet was actually placed on the last spin
    // Since we wait 37 spins, the 38th spin is the first one where we evaluate a bet's outcome.
    if (state.isBetting && spinHistory.length > 37) {
        const isWin = bankroll > state.lastBankroll;

        if (isWin) {
            if (bankroll >= state.sessionHigh) {
                // Session high reached: Reset progression and recalculate hot zones
                state.level = 0;
                needsRecalc = true;
            } else {
                // In drawdown, rebet at current level
            }
        } else {
            // Loss: Progress sequence
            state.level++;
            
            // If we exceed our mapped progression, reset to protect bankroll and recalculate
            if (state.level >= state.unitsMap.length) {
                state.level = 0;
                needsRecalc = true;
            }
        }
    }

    // Perform Recalculation if triggered by reset
    if (needsRecalc) {
        state.activeLayout = state.calculateHotLayout(spinHistory);
    }

    // Update tracking metrics
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
    }
    state.lastBankroll = bankroll;

    // 5. Build Bets for current spin
    const baseUnit = config.betLimits.min; 
    const currentUnits = state.unitsMap[state.level];
    const layout = state.activeLayout;
    const bets = [];

    // Helper to format and clamp bets
    const placeBets = (targets, type, units) => {
        if (units === 0) return;

        let amount = units * baseUnit;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        targets.forEach(val => {
            bets.push({ type: type, value: val, amount: amount });
        });
    };

    // Construct the active payload dynamically
    placeBets(layout.s1, 'number', currentUnits[0]); // Base hot straight numbers
    placeBets(layout.sp1, 'split', currentUnits[1]); // Base hot splits
    placeBets(layout.s2, 'number', currentUnits[2]); // Secondary hot straight numbers
    placeBets(layout.sp2, 'split', currentUnits[3]); // Secondary hot splits

    return bets;
}