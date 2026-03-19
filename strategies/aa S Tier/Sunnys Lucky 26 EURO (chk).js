/**
 * Strategy: Sunny's Lucky 26 (European Wheel Adaptation)
 * Source: YouTube - The Roulette Master (https://www.youtube.com/watch?v=ugsPtv91ty8)
 *
 * THE LOGIC:
 * - This strategy focuses on covering the 1st and 2nd Columns + Zero.
 * - Coverage: ~67.5% of the board (on a Single Zero wheel).
 * - Base Betting Unit Ratio:
 * - 12 units on Column 1
 * - 12 units on Column 2
 * - 1 unit on Zero 
 * - Total Base Bet: 25 units.
 *
 * THE PROGRESSION (Recovery):
 * - Level 1: Base bets.
 * - On Loss (hitting Column 3):
 * - Double the bet amounts (Level * 2).
 * - Reset "Wins at Level" counter to 0.
 * - On Win (hitting Col 1, Col 2, or Zero):
 * - Increment "Wins at Level" counter.
 * - The Goal is to achieve **2 Wins** at the current level.
 * - If 2 wins are achieved: Reset to Level 1.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const COL_RATIO = 12;
    const ZERO_RATIO = 1; // Strict 1 for single zero European wheels

    const reqUnitForCol = config.betLimits.minOutside / COL_RATIO;
    const reqUnitForZero = config.betLimits.min / ZERO_RATIO;
    const baseUnit = Math.max(reqUnitForCol, reqUnitForZero, 1); 

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 1;
    if (state.winsAtLevel === undefined) state.winsAtLevel = 0;
    if (state.totalWins === undefined) state.totalWins = 0;
    if (state.totalLosses === undefined) state.totalLosses = 0;

    // --- 3. PROCESS PREVIOUS RESULT ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        let isWin = false;

        if (num === 0) { 
            isWin = true;
        } else {
            const remainder = num % 3;
            // Col 1: remainder 1
            // Col 2: remainder 2
            // Col 3: remainder 0 (LOSS)
            if (remainder === 1 || remainder === 2) {
                isWin = true;
            }
        }

        if (isWin) {
            state.totalWins++;
            state.winsAtLevel++;

            // CHECK RESET CONDITION: 2 Wins at current level
            if (state.winsAtLevel >= 2) {
                state.level = 1;
                state.winsAtLevel = 0; 
            }
        } else {
            // LOSS (Hit Col 3)
            state.totalLosses++;
            state.level = state.level * 2; 
            state.winsAtLevel = 0;         
        }
    }

    // --- 4. CALCULATE BET AMOUNTS ---
    let currentUnit = baseUnit * state.level;
    
    let betColAmount = currentUnit * COL_RATIO;
    let betZeroAmount = currentUnit * ZERO_RATIO;

    // --- 5. CLAMP TO LIMITS ---
    betColAmount = Math.min(betColAmount, config.betLimits.max);
    betZeroAmount = Math.min(betZeroAmount, config.betLimits.max);

    betColAmount = Math.max(betColAmount, config.betLimits.minOutside);
    betZeroAmount = Math.max(betZeroAmount, config.betLimits.min);

    const totalNeeded = (betColAmount * 2) + betZeroAmount;
    if (bankroll < totalNeeded) {
        return []; 
    }

    // --- 6. LOGGING (Periodic) ---
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        const logContent = `Spin: ${spinHistory.length} | Level: ${state.level} | Wins: ${state.totalWins} | Losses: ${state.totalLosses} | Bankroll: ${bankroll}\n`;
        utils.saveFile("sunny-lucky-26-eu-log.txt", logContent).catch(() => {}); 
    }

    // --- 7. RETURN BETS ---
    return [
        { type: 'column', value: 1, amount: betColAmount }, // 1st Column
        { type: 'column', value: 2, amount: betColAmount }, // 2nd Column
        { type: 'number', value: 0, amount: betZeroAmount } // Zero coverage
    ];
}