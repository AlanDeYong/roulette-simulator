/**
 * Diamond Roulette Strategy
 * Source: https://youtu.be/ubJ_itjIJPA (Gamblers University)
 * 
 * The Full Logic in details:
 * - The strategy places a combination of vertical split and straight-up bets that form "diamond" shapes on the layout.
 * - There are 4 distinct groups of diamond bets that get activated as the progression level increases.
 * - Group 1: Splits 7/10, 9/12. Straights 8, 11. (Covers numbers 7-12)
 * - Group 2: Splits 25/28, 27/30. Straights 26, 29. (Covers numbers 25-30)
 * - Group 3: Splits 16/19, 18/21. Straights 17, 20. (Covers numbers 16-21)
 * - Group 4: Splits 1/4, 3/6. Straights 2, 5. (Covers numbers 1-6)
 * - A session high bankroll is strictly tracked to determine when to reset.
 * 
 * The Full Bet Progression in details:
 * - Level 1: Bet Group 1 (1 base unit per position)
 * - Level 2: Bet Groups 1 and 2 (1 base unit per position)
 * - Level 3: Bet Groups 1, 2, and 3 (1 base unit per position)
 * - Level 4: Bet Groups 1, 2, 3, and 4 (1 base unit per position)
 * - Level 5+: Bet All Groups. Increase the bet unit multiplier by 1 for each level above 4. 
 *   (e.g., Level 5 = 2 units, Level 6 = 3 units, Level 7 = 4 units).
 * - Progression Rules:
 *   - If the last spin is a Loss: Increase level by 1.
 *   - If the last spin is a Win: 
 *     - If current bankroll >= sessionHigh, reset to Level 1.
 *     - Otherwise, stay at the current level to grind back up to the session high.
 * 
 * The Goal:
 * - Target profit is typically 10% of the buy-in (e.g., $80 on an $800 buy-in). Stop-loss is bankroll depletion. 
 * - The algorithm will run continuously, trying to achieve and set new session highs indefinitely.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define the Diamond Groups
    const groups = [
        { splits: [[7, 10], [9, 12]], straights: [8, 11], numbers: [7, 8, 9, 10, 11, 12] },
        { splits: [[25, 28], [27, 30]], straights: [26, 29], numbers: [25, 26, 27, 28, 29, 30] },
        { splits: [[16, 19], [18, 21]], straights: [17, 20], numbers: [16, 17, 18, 19, 20, 21] },
        { splits: [[1, 4], [3, 6]], straights: [2, 5], numbers: [1, 2, 3, 4, 5, 6] }
    ];

    // 2. Initialize State
    if (!state.level) {
        state.level = 1;
        state.sessionHigh = bankroll;
        state.coveredNumbers = [];
    }

    // 3. Process Previous Spin Result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const wonLastSpin = state.coveredNumbers.includes(lastSpin.winningNumber);

        if (wonLastSpin) {
            // Update session high if we've reached a new peak
            if (bankroll > state.sessionHigh) {
                state.sessionHigh = bankroll;
            }
            
            // Check for reset condition
            if (bankroll >= state.sessionHigh) {
                state.level = 1;
            }
            // Else, stay at current level to grind back to session high
        } else {
            // Lost the spin, progress to next level
            state.level++;
        }
    } else {
        // Double check session high on the very first fresh spin
        state.sessionHigh = bankroll;
    }

    // 4. Determine Active Groups and Multiplier
    const activeGroupCount = Math.min(state.level, 4);
    const unitMultiplier = state.level <= 4 ? 1 : (state.level - 3);

    // 5. Calculate Base Unit and Clamped Amount
    const baseUnit = config.betLimits.min; 
    let amount = baseUnit * unitMultiplier;
    
    // Clamp to table limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 6. Construct Bets and Track Covered Numbers
    let bets = [];
    state.coveredNumbers = [];

    for (let i = 0; i < activeGroupCount; i++) {
        const group = groups[i];
        
        // Add splits
        group.splits.forEach(split => {
            bets.push({ type: 'split', value: split, amount: amount });
        });
        
        // Add straights
        group.straights.forEach(straight => {
            bets.push({ type: 'number', value: straight, amount: amount });
        });

        // Track covered numbers for the next spin's win/loss evaluation
        state.coveredNumbers.push(...group.numbers);
    }

    return bets;
}