/**
 * Roulette Strategy: Top Notch 2.0 (Corrected Bet Amounts & Progressions)
 * * Source:
 * - Channel: Bet With Mo
 * - URL: https://youtu.be/xdmEWOPUcI0?si=uIivn1XYEDDfeFry
 * * The Full Logic:
 * - This strategy places specific inside bets (Splits and Straight Ups) while heavily hedging 
 * with outside column bets on the 1st and 3rd columns.
 * - On every loss, the strategy expands its coverage by adding *new* numbers and splits to the board
 * along with increasing the column wagers, tracking across 6 progressive levels.
 * - A round is evaluated as a "Win", "Loss", or "Push" depending on whether the net payout is positive,
 * negative, or exactly even ($0 net profit/loss).
 * * The Full Bet Progression:
 * - Level 1 (Initial Setup):
 * - Splits: 1/4 (1 unit), 3/6 (1 unit)
 * - Straight Up: 5 (1 unit)
 * - Columns: 1st Column (3 units), 3rd Column (3 units)
 * - Level 2 (On Loss):
 * - Retain Level 1 layout and ADD: Splits 7/10 (1 unit), 9/12 (1 unit), Straight Up 11 (1 unit), 
 * and 3 units each to 1st and 3rd columns.
 * - Total active: 4 splits (1 unit each), 2 numbers (1 unit each), Columns (6 units each).
 * - Level 3 (On Loss):
 * - Retain Level 2 layout and ADD: Splits 13/16 (1 unit), 15/18 (1 unit), Straight Up 17 (1 unit), 
 * and 3 units each to columns. THEN DOUBLE all accumulated bets.
 * - Total active: 6 splits (2 units each), 3 numbers (2 units each), Columns (18 units each).
 * - Level 4 (On Loss):
 * - Retain Level 3 layout and ADD: Splits 19/22 (2 units), 21/24 (2 units), Straight Up 24 (2 units), 
 * and 6 units each to columns.
 * - Total active: 8 splits (2 units each), 4 numbers (2 units each), Columns (24 units each).
 * - Level 5 (On Loss):
 * - Double all bets from the Level 4 layout.
 * - Total active: 8 splits (4 units each), 4 numbers (4 units each), Columns (48 units each).
 * - Level 6 (On Loss):
 * - Double all bets from the Level 5 layout.
 * - Total active: 8 splits (8 units each), 4 numbers (8 units each), Columns (96 units each).
 * * Level Transitions:
 * - On Loss: Advance up 1 level (clamped at Level 6).
 * - On Push: Rebet the exact same layout and level.
 * - On Win: If the current bankroll is below the session peak bankroll, go back down 1 level. 
 * If the session peak bankroll is reached or exceeded, reset completely to Level 1.
 * * The Goal:
 * - Protect the bankroll using high board coverage and reclaim drawdowns through compounding multiplier levels.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Properties
    if (!state.currentLevel) {
        state.currentLevel = 1;
    }
    if (!state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Evaluate Last Round Outcome
    if (spinHistory && spinHistory.length > 0 && state.lastTotalWager && state.lastBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWager = state.lastTotalWager;
        let totalPayout = 0;

        const firstColNums = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
        const thirdColNums = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];

        state.lastBets.forEach(b => {
            if (b.type === 'number' && b.value === lastSpin.winningNumber) {
                totalPayout += b.amount * 36;
            } else if (b.type === 'split' && b.value.includes(lastSpin.winningNumber)) {
                totalPayout += b.amount * 18;
            } else if (b.type === 'column') {
                if (b.value === 1 && firstColNums.includes(lastSpin.winningNumber)) {
                    totalPayout += b.amount * 3;
                } else if (b.value === 3 && thirdColNums.includes(lastSpin.winningNumber)) {
                    totalPayout += b.amount * 3;
                }
            }
        });

        // Determine level adjustment based on outcome
        if (totalPayout > lastWager) {
            // Win condition
            if (bankroll >= state.peakBankroll) {
                state.currentLevel = 1; // Full reset when peak is reached/exceeded
            } else {
                state.currentLevel = Math.max(1, state.currentLevel - 1); // Drop 1 level
            }
        } else if (totalPayout < lastWager) {
            // Loss condition
            state.currentLevel = Math.min(6, state.currentLevel + 1); // Go up 1 level
        }
        // Push condition (totalPayout === lastWager) keeps the currentLevel unchanged
    }

    // Update the session peak bankroll
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 3. Determine Base Unit conforming to table limits
    const baseUnit = Math.max(config.betLimits.min, Math.ceil(config.betLimits.minOutside / 3));
    const bets = [];

    // 4. Build Bets Array per Level Specification
    if (state.currentLevel === 1) {
        bets.push({ type: 'split', value: [1, 4], amount: baseUnit });
        bets.push({ type: 'split', value: [3, 6], amount: baseUnit });
        bets.push({ type: 'number', value: 5, amount: baseUnit });
        bets.push({ type: 'column', value: 1, amount: baseUnit * 3 });
        bets.push({ type: 'column', value: 3, amount: baseUnit * 3 });
    } else if (state.currentLevel === 2) {
        bets.push({ type: 'split', value: [1, 4], amount: baseUnit });
        bets.push({ type: 'split', value: [3, 6], amount: baseUnit });
        bets.push({ type: 'split', value: [7, 10], amount: baseUnit });
        bets.push({ type: 'split', value: [9, 12], amount: baseUnit });
        bets.push({ type: 'number', value: 5, amount: baseUnit });
        bets.push({ type: 'number', value: 11, amount: baseUnit });
        bets.push({ type: 'column', value: 1, amount: baseUnit * 6 });
        bets.push({ type: 'column', value: 3, amount: baseUnit * 6 });
    } else if (state.currentLevel === 3) {
        const splits = [[1, 4], [3, 6], [7, 10], [9, 12], [13, 16], [15, 18]];
        const nums = [5, 11, 17];
        splits.forEach(val => bets.push({ type: 'split', value: val, amount: baseUnit * 2 }));
        nums.forEach(val => bets.push({ type: 'number', value: val, amount: baseUnit * 2 }));
        bets.push({ type: 'column', value: 1, amount: baseUnit * 18 });
        bets.push({ type: 'column', value: 3, amount: baseUnit * 18 });
    } else if (state.currentLevel === 4) {
        const splits = [[1, 4], [3, 6], [7, 10], [9, 12], [13, 16], [15, 18], [19, 22], [21, 24]];
        const nums = [5, 11, 17, 24];
        splits.forEach(val => bets.push({ type: 'split', value: val, amount: baseUnit * 2 }));
        nums.forEach(val => bets.push({ type: 'number', value: val, amount: baseUnit * 2 }));
        bets.push({ type: 'column', value: 1, amount: baseUnit * 24 });
        bets.push({ type: 'column', value: 3, amount: baseUnit * 24 });
    } else if (state.currentLevel === 5) {
        const splits = [[1, 4], [3, 6], [7, 10], [9, 12], [13, 16], [15, 18], [19, 22], [21, 24]];
        const nums = [5, 11, 17, 24];
        splits.forEach(val => bets.push({ type: 'split', value: val, amount: baseUnit * 4 }));
        nums.forEach(val => bets.push({ type: 'number', value: val, amount: baseUnit * 4 }));
        bets.push({ type: 'column', value: 1, amount: baseUnit * 48 });
        bets.push({ type: 'column', value: 3, amount: baseUnit * 48 });
    } else if (state.currentLevel === 6) {
        const splits = [[1, 4], [3, 6], [7, 10], [9, 12], [13, 16], [15, 18], [19, 22], [21, 24]];
        const nums = [5, 11, 17, 24];
        splits.forEach(val => bets.push({ type: 'split', value: val, amount: baseUnit * 8 }));
        nums.forEach(val => bets.push({ type: 'number', value: val, amount: baseUnit * 8 }));
        bets.push({ type: 'column', value: 1, amount: baseUnit * 96 });
        bets.push({ type: 'column', value: 3, amount: baseUnit * 96 });
    }

    // 5. Clamp to Absolute Table Maximum Limits & Track Total Wager
    let currentWagerTotal = 0;
    bets.forEach(b => {
        b.amount = Math.min(config.betLimits.max, b.amount);
        currentWagerTotal += b.amount;
    });

    // Save metadata for the next round's evaluation
    state.lastBets = bets;
    state.lastTotalWager = currentWagerTotal;

    return bets;
}