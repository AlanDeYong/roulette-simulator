/**
 * Source: Modified "Bet With Mo" Strategy - Weighted Non-Overlapping Grid Progression
 * 
 * The Full Logic in details:
 * 1. Observation: Waits for 37 spins without betting to build a statistical baseline.
 * 2. Weighting: Calculates weights for all numbers based on the last 37 spins:
 *    - Frequency: +1 for each occurrence.
 *    - Recency: Up to +1 based on how recently it appeared.
 *    - Proximity: +0.5 * recency to the adjacent numbers on the actual Roulette Wheel.
 * 3. Selection: Always bets on Zero. Additional bets (Corners and Splits) are selected 
 *    dynamically based on the highest combined number weights. 
 * 4. Non-Overlapping: A strict rule ensures no new Split or Corner ever shares a number 
 *    with an existing active bet on the board.
 * 
 * The Full Bet Progression in details:
 * 1. Initial State: 1-unit bet on Zero + 1 highest-weighted Corner + 1 highest-weighted Split.
 * 2. On a Loss: 
 *    - Increase all bet sizes by 1 base unit.
 *    - Add 1 highest-weighted non-overlapping Corner.
 *    - Add 1 highest-weighted non-overlapping Split.
 * 3. On a Corner Hit (Sustaining Win):
 *    - Rebet exact same layout and amounts. No progression increment, no new bets added.
 * 4. On a Split Hit OR Zero Hit (Target Win):
 *    - Guarantees profit. Clear the board, recalculate weights, and reset the sequence 
 *      back to Initial State (Zero + 1 Corner + 1 Split).
 * 
 * The Goal:
 * To hit a high-paying target (Zero or a Split). Weighted placement targets statistical 
 * hot zones/clusters, while non-overlapping layout maximizes board coverage efficiently.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for 37 spins
    if (spinHistory.length < 37) {
        return [];
    }

    // 2. Initialize State and Data
    if (!state.initialized) {
        // Grid corners (top-left numbers)
        state.allCorners = [
            1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28, 29, 31, 32
        ];
        
        // Grid splits (excluding zero to prevent overlap with the permanent 0 bet)
        state.allSplits = [
            // Horizontal
            [1, 2], [2, 3], [4, 5], [5, 6], [7, 8], [8, 9], [10, 11], [11, 12],
            [13, 14], [14, 15], [16, 17], [17, 18], [19, 20], [20, 21], [22, 23],
            [23, 24], [25, 26], [26, 27], [28, 29], [29, 30], [31, 32], [32, 33],
            [34, 35], [35, 36],
            // Vertical
            [1, 4], [2, 5], [3, 6], [4, 7], [5, 8], [6, 9], [7, 10], [8, 11], [9, 12],
            [10, 13], [11, 14], [12, 15], [13, 16], [14, 17], [15, 18], [16, 19],
            [17, 20], [18, 21], [19, 22], [20, 23], [21, 24], [22, 25], [23, 26],
            [24, 27], [25, 28], [26, 29], [27, 30], [28, 31], [29, 32], [30, 33],
            [31, 34], [32, 35], [33, 36]
        ];

        // European wheel order for proximity weighting
        state.wheel = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

        // Helper: Calculate Weights
        state.calculateWeights = (history) => {
            let weights = {};
            for (let i = 0; i <= 36; i++) weights[i] = 0;
            
            // Analyze the last 37 spins
            const recentSpins = history.slice(-37);
            const len = recentSpins.length;

            recentSpins.forEach((spin, idx) => {
                const num = spin.winningNumber;
                const recency = (idx + 1) / len; // 0.0 to 1.0 (higher is more recent)

                // Frequency + Recency
                weights[num] += 1 + recency;

                // Wheel Proximity (neighbors)
                const wIdx = state.wheel.indexOf(num);
                const leftNeighbor = state.wheel[(wIdx - 1 + 37) % 37];
                const rightNeighbor = state.wheel[(wIdx + 1) % 37];

                weights[leftNeighbor] += 0.5 * recency;
                weights[rightNeighbor] += 0.5 * recency;
            });
            return weights;
        };

        // Helper: Get covered numbers from current layout
        state.getCoveredNumbers = () => {
            let covered = new Set();
            for (let b of state.currentBets) {
                if (b.type === 'number') covered.add(b.value);
                if (b.type === 'split') { covered.add(b.value[0]); covered.add(b.value[1]); }
                if (b.type === 'corner') {
                    let c = b.value;
                    covered.add(c); covered.add(c + 1); covered.add(c + 3); covered.add(c + 4);
                }
            }
            return covered;
        };

        // Helper: Find the highest weighted bet of a type that doesn't overlap
        state.getBestBet = (type, covered, weights) => {
            let bestBet = null;
            let maxWeight = -1;

            if (type === 'split') {
                for (let split of state.allSplits) {
                    if (!covered.has(split[0]) && !covered.has(split[1])) {
                        const w = weights[split[0]] + weights[split[1]];
                        if (w > maxWeight) {
                            maxWeight = w;
                            bestBet = split;
                        }
                    }
                }
            } else if (type === 'corner') {
                for (let c of state.allCorners) {
                    if (!covered.has(c) && !covered.has(c + 1) && !covered.has(c + 3) && !covered.has(c + 4)) {
                        const w = weights[c] + weights[c + 1] + weights[c + 3] + weights[c + 4];
                        if (w > maxWeight) {
                            maxWeight = w;
                            bestBet = c;
                        }
                    }
                }
            }
            return bestBet;
        };

        // Helper: Reset Sequence
        state.resetSequence = (history) => {
            const weights = state.calculateWeights(history);
            state.currentMultiplier = 1;
            
            // The Zero is always bet on
            state.currentBets = [
                { type: 'number', value: 0 }
            ];

            let covered = state.getCoveredNumbers();
            
            // Add Initial Corner
            let bestCorner = state.getBestBet('corner', covered, weights);
            if (bestCorner) {
                state.currentBets.push({ type: 'corner', value: bestCorner });
                // Update covered set before picking the split to prevent overlap
                covered.add(bestCorner); covered.add(bestCorner + 1); 
                covered.add(bestCorner + 3); covered.add(bestCorner + 4);
            }

            // Add Initial Split
            let bestSplit = state.getBestBet('split', covered, weights);
            if (bestSplit) {
                state.currentBets.push({ type: 'split', value: bestSplit });
            }
        };

        state.initialized = true;
    }

    // 3. Process the last spin (if we had bets active)
    if (!state.started) {
        state.resetSequence(spinHistory);
        state.started = true;
    } else {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        let splitHit = false;
        let cornerHit = false;
        let zeroHit = false;

        // Check hits against current layout
        for (let bet of state.currentBets) {
            if (bet.type === 'number' && bet.value === 0 && lastNum === 0) zeroHit = true;
            if (bet.type === 'split' && bet.value.includes(lastNum)) splitHit = true;
            if (bet.type === 'corner') {
                const c = bet.value;
                if ([c, c + 1, c + 3, c + 4].includes(lastNum)) cornerHit = true;
            }
        }

        // Apply hit logic
        if (splitHit || zeroHit) {
            // Target Achieved: Reset layout and multipliers
            state.resetSequence(spinHistory);
        } else if (cornerHit) {
            // Sustaining Win: Rebet exact layout/amounts. No changes.
        } else {
            // Loss: Increment multiplier and add weighted positions
            state.currentMultiplier++;
            const weights = state.calculateWeights(spinHistory);
            let covered = state.getCoveredNumbers();

            // Try to add the best Corner first
            let bestCorner = state.getBestBet('corner', covered, weights);
            if (bestCorner) {
                state.currentBets.push({ type: 'corner', value: bestCorner });
                // Update covered set before picking the split to prevent overlap
                covered.add(bestCorner); covered.add(bestCorner + 1); 
                covered.add(bestCorner + 3); covered.add(bestCorner + 4);
            }

            // Then try to add the best Split
            let bestSplit = state.getBestBet('split', covered, weights);
            if (bestSplit) {
                state.currentBets.push({ type: 'split', value: bestSplit });
            }
        }
    }

    // 4. Calculate amounts and build bet array
    const baseUnit = config.betLimits.min;
    let targetAmount = baseUnit * state.currentMultiplier;
    
    // Clamp to min/max limits
    targetAmount = Math.max(targetAmount, config.betLimits.min);
    targetAmount = Math.min(targetAmount, config.betLimits.max);

    let betsToPlace = [];
    for (let b of state.currentBets) {
        betsToPlace.push({
            type: b.type,
            value: b.value,
            amount: targetAmount
        });
    }

    return betsToPlace;
}