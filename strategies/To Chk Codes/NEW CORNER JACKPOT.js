/**
 * Strategy: Dynamic Hot/Cold Accumulative Progression
 *
 * Source: User Provided
 *
 * The Logic:
 * - Phase 1 (Observation): The script waits for 37 spins to gather data and calculates number frequencies.
 * - Phase 2 (Grouping): It dynamically generates 5 Groups based on the rolling 37-spin data.
 * - Each group gets 1 Corner (weighted by hot numbers, non-overlapping, strictly confined within dozens).
 * - Each group gets 2 Straight Up numbers (1 of the Hottest, 1 of the Coldest).
 * - Phase 3 (Execution): Accumulative progression with STRICT RESET.
 * - A "Win" on an active **STRAIGHT UP** number resets the progression and recalculates new Hot/Cold groups.
 * - A hit on a Corner pays out but DOES NOT reset the progression.
 *
 * The Progression:
 * - Level 1: 1 unit base on Group 1 & Group 2 (Initial placement)
 * - Level 2 (No Str Hit): Keep L1 + add 1 unit on Group 3
 * - Level 3 (No Str Hit): Keep L1, L2 + add 1 unit on Group 4
 * - Level 4 (No Str Hit): Double up all existing bets (G1-G4).
 * - Level 5 (No Str Hit): Keep L4 + add 2 units on Group 5
 * - Level 6 (No Str Hit): Double up all existing bets.
 * - Level 7 (No Str Hit): Double up all existing bets again.
 * - Level 8 (No Str Hit): Stop loss reached. Reset to Level 1, recalculate new Hot/Cold groups.
 *
 * The Goal:
 * Exploit rolling Hot/Cold data to generate sniper clusters, accumulating coverage 
 * on misses, and resetting only when a primary target is hit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Observation Phase
    if (spinHistory.length < 37) {
        return []; // Do not bet, wait for 37 spins of data
    }

    // 2. Dynamic Group Generation (Runs on spin 37, or after a Reset)
    if (!state.groups) {
        const recentSpins = spinHistory.slice(-37).map(s => s.winningNumber);
        const freqs = {};
        for (let i = 0; i <= 36; i++) freqs[i] = 0;
        recentSpins.forEach(n => freqs[n]++);

        // A. Find valid corners (no dozen crossing) and score them by heat
        const validAnchors = [1,2,4,5,7,8, 13,14,16,17,19,20, 25,26,28,29,31,32];
        let scoredCorners = validAnchors.map(c => {
            const nums = [c, c + 1, c + 3, c + 4];
            const score = nums.reduce((sum, n) => sum + freqs[n], 0);
            return { anchor: c, nums: nums, score: score };
        });
        
        // Sort corners by highest frequency sum
        scoredCorners.sort((a, b) => b.score - a.score);

        // Select 5 non-overlapping corners
        const selectedCorners = [];
        const coveredNums = new Set();
        for (let c of scoredCorners) {
            if (selectedCorners.length === 5) break;
            let overlap = false;
            for (let n of c.nums) {
                if (coveredNums.has(n)) overlap = true;
            }
            if (!overlap) {
                selectedCorners.push(c);
                c.nums.forEach(n => coveredNums.add(n));
            }
        }

        // B. Find 5 Hottest and 5 Coldest Straight Up numbers
        let sortedNums = Object.keys(freqs).map(Number).sort((a, b) => freqs[b] - freqs[a]);
        let hotNums = sortedNums.slice(0, 5);
        let coldNums = sortedNums.slice(-5).reverse(); // Prioritize the absolute coldest (0 freq)

        // C. Construct the 5 Progression Groups
        state.groups = {};
        const keys = ['G1', 'G2', 'G3', 'G4', 'G5'];
        for(let i = 0; i < 5; i++) {
            state.groups[keys[i]] = {
                corners: [selectedCorners[i].anchor],
                straights: [hotNums[i], coldNums[i]]
            };
        }
        
        state.level = 1; // Start progression
    }

    // 3. Progression Multiplier Matrix
    const progression = {
        1: { G1: 1, G2: 1, G3: 0, G4: 0, G5: 0 }, // Initial 2 groups
        2: { G1: 1, G2: 1, G3: 1, G4: 0, G5: 0 },
        3: { G1: 1, G2: 1, G3: 1, G4: 1, G5: 0 },
        4: { G1: 2, G2: 2, G3: 2, G4: 2, G5: 0 },
        5: { G1: 2, G2: 2, G3: 2, G4: 2, G5: 2 }, // G5 introduced at 2 units
        6: { G1: 4, G2: 4, G3: 4, G4: 4, G5: 4 },
        7: { G1: 8, G2: 8, G3: 8, G4: 8, G5: 8 }
    };

    // 4. Process Previous Spin (Strict Win Detection)
    // We only check if state.level was already initialized (meaning we placed bets last spin)
    if (state.level && spinHistory.length > 37) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        const prevMults = progression[state.level];
        let won = false;

        // Check if last number was an active STRAIGHT UP
        if (prevMults) {
            for (const [groupKey, mult] of Object.entries(prevMults)) {
                if (mult === 0) continue; 
                const g = state.groups[groupKey];
                
                // Strict Reset: Only on Straight Up hits
                if (g.straights.includes(lastNum)) {
                    won = true;
                    break;
                }
            }
        }

        // Update Level & Group State
        if (won) {
            state.groups = null; // Force recalculation of Hot/Cold for next cycle
        } else {
            state.level++;   
            if (state.level > 7) {
                state.groups = null; // Stop-loss reached. Force recalculation.
            }
        }
    }

    // 5. Construct Bets for Current Level
    // If groups were nullified by a win/stop-loss above, return empty array for 1 spin to recalculate
    if (!state.groups) {
        return []; 
    }

    const currentMults = progression[state.level];
    const bets = [];
    const baseUnit = config.betLimits.min;

    for (const [groupKey, mult] of Object.entries(currentMults)) {
        if (mult === 0) continue;

        const g = state.groups[groupKey];
        let amount = baseUnit * mult;
        
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        // Add dynamically mapped Corner
        g.corners.forEach(cornerVal => {
            bets.push({ type: 'corner', value: cornerVal, amount: amount });
        });

        // Add dynamically mapped Straights (1 Hot, 1 Cold)
        g.straights.forEach(straightVal => {
            bets.push({ type: 'number', value: straightVal, amount: amount });
        });
    }

    return bets;
}