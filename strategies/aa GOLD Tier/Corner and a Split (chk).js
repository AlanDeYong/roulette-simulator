/**
 * Source: "BEST NEW ROULETTE STRATEGY | BIG PROFIT | LOW ROLLER SYSTEM" by Bet With Mo (https://youtu.be/bnqyv647aOg)
 * 
 * The Full Logic in details:
 * This is an inside-bet progression strategy that aims to hit a Split bet to generate profit. 
 * The strategy builds a wider net on the board after every loss by adding new positions, while 
 * simultaneously increasing the bet amount on all active positions to recover previous losses.
 * 
 * The Full Bet Progression in details:
 * 1. Initial State: Start with a 1-unit bet on a single random Split.
 * 2. On a Loss: 
 *    - Add 1 new random Corner bet to the layout.
 *    - Add 1 new random Split bet to the layout.
 *    - Increase the bet size of ALL active positions on the layout by 1 base unit.
 * 3. On a Corner Hit:
 *    - If a Corner hits (but not a Split), the progression pauses. You simply rebet the exact 
 *      same layout with the exact same amounts. Do not increase the bet size, and do not add new bets.
 * 4. On a Split Hit (Win Condition):
 *    - A Split hit is the primary goal and guarantees a profit for the sequence. 
 *    - Once a Split hits, the entire progression resets. Clear all bets from the board and start 
 *      over with a 1-unit bet on a single random Split.
 * 
 * The Goal:
 * To catch a high-paying Split bet while using Corner bets to occasionally sustain the bankroll 
 * during long losing streaks. Profit is secured upon any Split hit, at which point the system resets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State and helper data
    if (!state.initialized) {
        state.allCorners = [
            1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23, 25, 26, 28, 29, 31, 32
        ];
        state.allSplits = [
            [0, 1], [0, 2], [0, 3],
            [1, 2], [2, 3], [4, 5], [5, 6], [7, 8], [8, 9], [10, 11], [11, 12],
            [13, 14], [14, 15], [16, 17], [17, 18], [19, 20], [20, 21], [22, 23],
            [23, 24], [25, 26], [26, 27], [28, 29], [29, 30], [31, 32], [32, 33],
            [34, 35], [35, 36],
            [1, 4], [2, 5], [3, 6], [4, 7], [5, 8], [6, 9], [7, 10], [8, 11], [9, 12],
            [10, 13], [11, 14], [12, 15], [13, 16], [14, 17], [15, 18], [16, 19],
            [17, 20], [18, 21], [19, 22], [20, 23], [21, 24], [22, 25], [23, 26],
            [24, 27], [25, 28], [26, 29], [27, 30], [28, 31], [29, 32], [30, 33],
            [31, 34], [32, 35], [33, 36]
        ];
        
        // Helper function to pick a random element from an array
        state.getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
        
        // Helper to reset the sequence
        state.resetSequence = () => {
            state.currentMultiplier = 1;
            state.currentBets = [
                { type: 'split', value: state.getRandom(state.allSplits) }
            ];
        };

        state.resetSequence();
        state.initialized = true;
    }

    // 2. Process Previous Spin Result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        let splitHit = false;
        let cornerHit = false;

        // Check if any of our bets won
        for (let bet of state.currentBets) {
            if (bet.type === 'split') {
                if (bet.value.includes(lastNum)) {
                    splitHit = true;
                }
            } else if (bet.type === 'corner') {
                const c = bet.value;
                const coveredNumbers = [c, c + 1, c + 3, c + 4];
                if (coveredNumbers.includes(lastNum)) {
                    cornerHit = true;
                }
            }
        }

        // Apply progression logic based on hit types
        if (splitHit) {
            // Target achieved: Reset sequence
            state.resetSequence();
        } else if (cornerHit) {
            // Sustaining hit: Rebet exact same amounts/positions. Do nothing to state.
        } else {
            // Loss: Increase multiplier and add new positions
            state.currentMultiplier++;
            state.currentBets.push({ type: 'split', value: state.getRandom(state.allSplits) });
            state.currentBets.push({ type: 'corner', value: state.getRandom(state.allCorners) });
        }
    }

    // 3. Build the final bet array
    const baseUnit = config.betLimits.min;
    let targetAmount = baseUnit * state.currentMultiplier;
    
    // Clamp bet amounts to limits
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