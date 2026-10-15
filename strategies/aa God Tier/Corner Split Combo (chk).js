/**
 * Roulette Strategy: Corner Split Combo Strategy (Push-Aware)
 * 
 * Logic:
 * - This strategy targets 9 specific board positions (3 corners, 6 splits).
 * - Pattern 1 (Cols 1 & 2): Corners [1, 13, 25], Splits [[7, 10], [8, 11], [19, 22], [20, 23], [31, 34], [32, 35]]
 * - Pattern 2 (Cols 2 & 3): Corners [2, 14, 26], Splits [[8, 11], [9, 12], [20, 23], [21, 24], [32, 35], [33, 36]]
 * 
 * Progression:
 * - Starting: 1 unit per bet.
 * - Loss 1-5: Increase each bet by 2 units per loss.
 * - Loss > 5: Increase each bet by 4 units per loss.
 * - Win (Net Profit > 0): Reset progression (losses = 0, bet = 1 unit) and switch column pattern.
 * - Push (Net Profit = 0): Maintain current progression state and pattern.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.losses === undefined) {
        state.losses = 0;
        state.patternIndex = 0; // 0 = Cols 1&2, 1 = Cols 2&3
        state.lastBetAmount = config.betLimits.min;
    }

    // 2. Define Pattern Sets
    const patterns = [
        // Pattern 1: Columns 1 & 2
        {
            corners: [1, 13, 25],
            splits: [[7, 10], [8, 11], [19, 22], [20, 23], [31, 34], [32, 35]]
        },
        // Pattern 2: Columns 2 & 3
        {
            corners: [2, 14, 26],
            splits: [[8, 11], [9, 12], [20, 23], [21, 24], [32, 35], [33, 36]]
        }
    ];

    // 3. Process Last Spin Result (Calculate Net Profit)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        const activePattern = patterns[state.patternIndex];
        
        let payout = 0;
        const totalBetAmount = 9 * state.lastBetAmount;

        // Calculate Payout
        // Corners: 8:1 payout (9 units returned for every 1 unit bet)
        for (let c of activePattern.corners) {
            if (lastNumber === c || lastNumber === c + 1 || lastNumber === c + 3 || lastNumber === c + 4) {
                payout += (state.lastBetAmount * 9);
            }
        }
        // Splits: 17:1 payout (18 units returned for every 1 unit bet)
        for (let s of activePattern.splits) {
            if (lastNumber === s[0] || lastNumber === s[1]) {
                payout += (state.lastBetAmount * 18);
            }
        }

        const netProfit = payout - totalBetAmount;

        if (netProfit > 0) {
            // WIN: Reset progression and switch pattern
            state.losses = 0;
            state.patternIndex = state.patternIndex === 0 ? 1 : 0;
        } else if (netProfit === 0) {
            // PUSH: Do nothing (keep state.losses and state.patternIndex)
        } else {
            // LOSS: Increment loss counter
            state.losses += 1;
        }
    }

    // 4. Calculate Bet Amount
    let unitMultiplier = 1;
    if (state.losses <= 5) {
        unitMultiplier = 1 + (state.losses * 2);
    } else {
        unitMultiplier = 11 + ((state.losses - 5) * 4);
    }

    const baseUnit = config.betLimits.min;
    let amount = unitMultiplier * baseUnit;

    // 5. Clamp to Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);
    
    // Store for next profit calculation
    state.lastBetAmount = amount;

    // 6. Return Bets
    const targetPattern = patterns[state.patternIndex];
    const bets = [];

    for (let c of targetPattern.corners) {
        bets.push({ type: 'corner', value: c, amount: amount });
    }
    for (let s of targetPattern.splits) {
        bets.push({ type: 'split', value: s, amount: amount });
    }

    return bets;
}