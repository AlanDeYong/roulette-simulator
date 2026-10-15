/**
 * Dynamic Quattro Roulette Strategy
 * 
 * Source:
 * - Channel: Mastering The Wheel
 * - Video: "NEW Roulette System! Dynamic Quatro | EASY MONEY" (https://youtu.be/ThNenuruQFg)
 * 
 * The Full Logic in Detail:
 * -------------------------
 * 1. Dual Independent Systems:
 *    - The strategy runs two separate bet groups concurrently: Dozens and Columns.
 *    - Each group covers 2 out of 3 options (2 Dozens and 2 Columns, covering up to 24 numbers each).
 *    - The two systems track their own independent progression levels (a win on columns does not reset dozens, and vice versa).
 * 
 * 2. Bet Selection (Last to Hit):
 *    - Dozens: Selects the 2 most recent unique winning dozens from spin history (1st 12: 1-12, 2nd 12: 13-24, 3rd 12: 25-36). Zero is ignored for dozen selection.
 *    - Columns: Selects the 2 most recent unique winning columns from spin history (Col 1: 1,4,7...34, Col 2: 2,5,8...35, Col 3: 3,6,9...36). Zero is ignored for column selection.
 *    - If insufficient history exists to determine 2 unique dozens or columns, default active dozens/columns are selected.
 * 
 * 3. The Full Bet Progression:
 *    - Multiplier Progression (Triple Martingale / 3x Multiplier across 5 Levels):
 *      Level 1: 1 unit per position (2 units per group)
 *      Level 2: 3 units per position (6 units per group)
 *      Level 3: 9 units per position (18 units per group)
 *      Level 4: 27 units per position (54 units per group)
 *      Level 5: 81 units per position (162 units per group)
 *    - Win Condition: When the winning number lands in one of the 2 chosen positions for that group, the group resets back to Level 1 (1 unit).
 *    - Loss Condition: When the winning number misses both chosen positions (or on 0), that group advances to the next level (x3).
 *    - If Level 5 fails, the group stops betting or resets to protect remaining bankroll.
 * 
 * 4. The Goal:
 *    - Target Profit (Stop Win): +30 base units (approx. 5-10% of max risk).
 *    - Stop Loss: 484 base units (maximum cumulative drawdown required for full 5-level failure across both groups).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit for outside bets (Dozens & Columns)
    const baseUnit = config.betLimits.minOutside || 5;
    const progressionUnits = [1, 3, 9, 27, 81];
    const targetProfit = 30000 * baseUnit;
    const maxDrawdown = 484 * baseUnit;

    // 2. Initialize State
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.dozenLevel = 0;
        state.columnLevel = 0;
        state.lastDozenBets = [];
        state.lastColumnBets = [];
        state.stopped = false;
    }

    // Check Stop Win / Stop Loss conditions
    const currentProfit = bankroll - state.initialBankroll;
    if (state.stopped || currentProfit >= targetProfit || currentProfit <= -maxDrawdown) {
        state.stopped = true;
        return [];
    }

    // 3. Helper Functions for Dozen and Column Identification
    function getDozen(number) {
        if (number <= 0) return null;
        if (number <= 12) return 1;
        if (number <= 24) return 2;
        return 3;
    }

    function getColumn(number) {
        if (number <= 0) return null;
        const remainder = number % 3;
        if (remainder === 1) return 1;
        if (remainder === 2) return 2;
        return 3;
    }

    // 4. Update Progression Levels based on Last Spin Result
    if (spinHistory && spinHistory.length > 0 && state.lastDozenBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNum = lastSpin.winningNumber;
        
        const lastDozen = getDozen(lastWinningNum);
        const lastCol = getColumn(lastWinningNum);

        // Evaluate Dozens outcome
        if (lastDozen !== null && state.lastDozenBets.includes(lastDozen)) {
            state.dozenLevel = 0; // Win: Reset to Level 1
        } else {
            state.dozenLevel += 1; // Loss: Advance level
            if (state.dozenLevel >= progressionUnits.length) {
                state.dozenLevel = 0; // Stop / Reset after bust at Level 5
            }
        }

        // Evaluate Columns outcome
        if (lastCol !== null && state.lastColumnBets.includes(lastCol)) {
            state.columnLevel = 0; // Win: Reset to Level 1
        } else {
            state.columnLevel += 1; // Loss: Advance level
            if (state.columnLevel >= progressionUnits.length) {
                state.columnLevel = 0; // Stop / Reset after bust at Level 5
            }
        }
    }

    // 5. Determine Selection for Dozens (2 Last Unique to Hit)
    const recentDozens = [];
    if (spinHistory) {
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const d = getDozen(spinHistory[i].winningNumber);
            if (d !== null && !recentDozens.includes(d)) {
                recentDozens.push(d);
                if (recentDozens.length === 2) break;
            }
        }
    }
    // Fallback if not enough history
    const allDozens = [1, 2, 3];
    while (recentDozens.length < 2) {
        const missing = allDozens.find(d => !recentDozens.includes(d));
        if (missing) recentDozens.push(missing);
        else break;
    }

    // 6. Determine Selection for Columns (2 Last Unique to Hit)
    const recentColumns = [];
    if (spinHistory) {
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const c = getColumn(spinHistory[i].winningNumber);
            if (c !== null && !recentColumns.includes(c)) {
                recentColumns.push(c);
                if (recentColumns.length === 2) break;
            }
        }
    }
    // Fallback if not enough history
    const allColumns = [1, 2, 3];
    while (recentColumns.length < 2) {
        const missing = allColumns.find(c => !recentColumns.includes(c));
        if (missing) recentColumns.push(missing);
        else break;
    }

    // Save current positions to state for evaluation on the next spin
    state.lastDozenBets = [...recentDozens];
    state.lastColumnBets = [...recentColumns];

    // 7. Calculate Bet Amounts and Clamp to Table Limits
    function calculateAmount(multiplier) {
        let amt = baseUnit * multiplier;
        amt = Math.max(amt, config.betLimits.minOutside);
        amt = Math.min(amt, config.betLimits.max);
        return amt;
    }

    const dozenBetAmount = calculateAmount(progressionUnits[state.dozenLevel]);
    const columnBetAmount = calculateAmount(progressionUnits[state.columnLevel]);

    // 8. Construct Bets Array
    const bets = [];

    // Add 2 Dozens bets
    for (const d of recentDozens) {
        bets.push({
            type: 'dozen',
            value: d,
            amount: dozenBetAmount
        });
    }

    // Add 2 Columns bets
    for (const c of recentColumns) {
        bets.push({
            type: 'column',
            value: c,
            amount: columnBetAmount
        });
    }

    return bets;
}