/**
 * STRATEGY: Profit Columns (10 Level System)
 * SOURCE: Bet With Mo - https://www.youtube.com/watch?v=mn5TxdMEdY8
 *
 * THE LOGIC:
 * 1. Trigger: Identify the "Coldest" Column. This is defined as the column that has NOT
 * hit within the last 2 spins.
 * 2. Bet Structure (Per Spin):
 * - 1 Unit of specific coverage on the Chosen Column (Outside Bet).
 * - 2 Straight-up bets (Inside Bets) on specific numbers within that same column.
 * (This creates a "Jackpot" potential if the specific numbers hit).
 *
 * THE PROGRESSION (10 Levels):
 * - The strategy uses a tiered progression to recover losses.
 * - On Loss: Move up one level (increasing bet amounts).
 * - On Win (Column or Jackpot): Reset immediately to Level 1.
 * - Max Level: 10. If Level 10 loses, it resets to 1 (Stop-loss mechanism).
 *
 * PROGRESSION MULTIPLIERS (Estimated based on video):
 * L1: x1, L2: x2, L3: x4, L4: x8, L5: x12, L6: x18, L7: x26, L8: x38, L9: x56, L10: x80
 *
 * NOTE:
 * - Column bets use `config.betLimits.minOutside` as the base unit.
 * - Straight-up bets use `config.betLimits.min` as the base unit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPER FUNCTIONS ---

    // Progression Multipliers (Approximated 10-level recovery curve)
    const LEVEL_MULTIPLIERS = [1, 2, 4, 8, 12, 18, 26, 38, 56, 80];

    // Helper: Determine which column a number belongs to (1, 2, or 3). Returns 0 for Green.
    const getColumn = (num) => {
        if (num === 0 || num === '00') return 0;
        if (num % 3 === 1) return 1; // 1, 4, 7...
        if (num % 3 === 2) return 2; // 2, 5, 8...
        return 3; // 3, 6, 9...
    };

    // Helper: Get numbers belonging to a specific column
    const getNumbersInColumn = (colIndex) => {
        const nums = [];
        for (let i = 1; i <= 36; i++) {
            if (getColumn(i) === colIndex) nums.push(i);
        }
        return nums;
    };

    // --- 2. INITIALIZE STATE ---
    if (state.level === undefined) state.level = 0; // Start at Level 1 (Index 0)
    if (state.targetColumn === undefined) state.targetColumn = null;

    // --- 3. PROCESS PREVIOUS SPIN (Update Progression) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastCol = getColumn(lastSpin.winningNumber);

        // Did we have an active bet?
        if (state.targetColumn !== null) {
            // Win Condition: The winning number falls into our target column
            // (Since we bet on the Column AND numbers inside it, any hit on that column is a win/recovery)
            if (lastCol === state.targetColumn) {
                // Reset on Win
                state.level = 0;
            } else {
                // Loss: Increase Progression
                state.level++;
                // Cap at Level 10 (Index 9), then reset if that fails
                if (state.level >= LEVEL_MULTIPLIERS.length) {
                    state.level = 0;
                }
            }
        }
    }

    // --- 4. DETERMINE TARGET COLUMN ---
    // Logic: Find column not hit in last 2 spins.
    // Need at least 2 spins to determine "coldest". If < 2, pick random or wait.
    if (spinHistory.length < 2) {
        // Default to Column 2 if not enough history, or skip. Let's default to Col 2 to start action.
        state.targetColumn = 2;
    } else {
        const last1 = getColumn(spinHistory[spinHistory.length - 1].winningNumber);
        const last2 = getColumn(spinHistory[spinHistory.length - 2].winningNumber);

        const recentCols = [last1, last2];
        const allCols = [1, 2, 3];

        // Find columns that are NOT in the recent history
        const missingCols = allCols.filter(c => !recentCols.includes(c));

        if (missingCols.length === 1) {
            state.targetColumn = missingCols[0];
        } else if (missingCols.length > 1) {
            // If multiple missing (e.g. last 2 spins were both Col 1), pick random one from missing
            state.targetColumn = missingCols[Math.floor(Math.random() * missingCols.length)];
        } else {
            // If all columns hit in last 2 spins (e.g. 1 then 2), the "missing" is the one not last?
            // Strictly following "not hit in last 2", if sequence is [1, 2], Col 3 is missing.
            // If sequence is [1, 2, 3] (looking at last 2 implies [2, 3]), then 1 is missing.
            // This `else` technically shouldn't be reached often given logic above, but fallback to Col 2.
            state.targetColumn = 2;
        }
    }

    // --- 5. CALCULATE BET AMOUNTS ---
    const multiplier = LEVEL_MULTIPLIERS[state.level];

    // Calculate Column Bet (Outside Limit)
    let colBetAmount = config.betLimits.minOutside * multiplier; // Usually base $5 * multiplier
    // To match video ratio better (4:1), we might want to boost this, but we must respect minOutside.
    // Ensure we don't breach Max limit
    colBetAmount = Math.min(colBetAmount, config.betLimits.max);

    // Calculate Straight Up Bets (Inside Limit)
    let straightUpAmount = config.betLimits.min * multiplier;
    // Ensure min/max compliance
    straightUpAmount = Math.max(straightUpAmount, config.betLimits.min);
    straightUpAmount = Math.min(straightUpAmount, config.betLimits.max);

    // --- 6. SELECT STRAIGHT UP NUMBERS ---
    // Video strategy: Place 2 straight bets "in the center" or specifically in the column.
    // We will pick 2 distinct random numbers from the target column to keep it dynamic.
    const validNumbers = getNumbersInColumn(state.targetColumn);
    
    // Shuffle and pick 2
    const shuffled = validNumbers.sort(() => 0.5 - Math.random());
    const jackpotNum1 = shuffled[0];
    const jackpotNum2 = shuffled[1];

    // --- 7. CONSTRUCT BETS ---
    const bets = [];

    // 1. The Column Bet
    bets.push({
        type: 'column',
        value: state.targetColumn,
        amount: colBetAmount
    });

    // 2. The Jackpot Straight-up Bets
    bets.push({
        type: 'number',
        value: jackpotNum1,
        amount: straightUpAmount
    });
    bets.push({
        type: 'number',
        value: jackpotNum2,
        amount: straightUpAmount
    });

    return bets;
}