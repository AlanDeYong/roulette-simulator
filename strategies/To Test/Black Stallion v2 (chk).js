/**
 * Black Stallion Roulette Strategy
 * * Source: 
 * YouTube: THEROULETTEMASTERTV
 * Video: "GENIUS NEW IDEA CHANGES THE ROULETTE WORLD!" (https://www.youtube.com/watch?v=7NidT13QFrc)
 * Timestamp: Strategy starts approx 18:28
 * * The Logic:
 * This strategy aims for high table coverage (approx 80%) to minimize "Full Losses".
 * It exploits the fact that automated roulette machines (and standard wheels) have uneven 
 * distributions of Red/Black within the columns.
 * * The Setup (Base Unit Ratios):
 * 1. Column 1: 5 Units (Covers Red & Black)
 * 2. Column 2: 5 Units (Covers Red & Black)
 * 3. Color Black: 4 Units (Covers Black in Col 3 and reinforces Black in Col 1 & 2)
 * 4. Number 0: 1 Unit (Insurance/Jackpot)
 * * Outcomes:
 * - Black Numbers: Win (Profit varies depending on column).
 * - Red in Col 1 or 2: Break-even or small partial loss (Column win offsets Color loss).
 * - Zero: Win (35:1 payout covers the other losing bets).
 * - The "Killer" (Full Loss): Red numbers in Column 3 (3, 9, 12, 18, 21, 27, 30, 36).
 * * The Progression (Positive/Recovery):
 * - On a "Full Loss" (Red + Col 3): Increase the bet level by 1 (+1 base unit to all bets).
 * This is NOT a Martingale (doubling). It is an arithmetic progression (1x, 2x, 3x...).
 * - On a Partial Loss / Break-Even: Hold the current bet level. Do not increase.
 * - On a Win/Session Profit: Reset to level 1.
 * * The Goal:
 * Accumulate small steady wins and use the coverage to wash out "free play" or grind profit 
 * while avoiding the specific 8 numbers that cause a full loss.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    // The video uses $25/$25/$20/$5. This reduces to a ratio of 5:5:4:1.
    // We calculate a base unit size that respects the table minimums.
    
    // Determine the value of "1 Unit" based on the highest minimum requirement
    // Zero bet (1 unit) must be >= min (inside)
    // Column bets (5 units) must be >= minOutside
    const baseUnitCalc = Math.max(
        config.betLimits.min, 
        Math.ceil(config.betLimits.minOutside / 5) // Ensure 5 units meets outside min
    );
    
    const UNIT_SIZE = baseUnitCalc;

    // --- 2. STATE INITIALIZATION ---
    if (!state.level) state.level = 1;
    if (!state.sessionStartBankroll) state.sessionStartBankroll = bankroll;

    // --- 3. ANALYZE PREVIOUS SPIN ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const number = lastSpin.winningNumber;
        const color = lastSpin.winningColor; // 'red', 'black', 'green' (or 'zero')

        // Helper: Identify Column (1, 2, or 3)
        // Col 1: 1, 4, 7... (n % 3 === 1)
        // Col 2: 2, 5, 8... (n % 3 === 2)
        // Col 3: 3, 6, 9... (n % 3 === 0) - Except 0
        let column = 0;
        if (number > 0) {
            if (number % 3 === 1) column = 1;
            else if (number % 3 === 2) column = 2;
            else column = 3;
        }

        // Determine outcome type
        const isFullLoss = (color === 'red' && column === 3);
        const isProfit = bankroll > state.sessionStartBankroll;

        // PROGRESSION LOGIC
        if (isProfit) {
            // Reset on session profit (Video suggests resetting when back in profit)
            state.level = 1;
            state.sessionStartBankroll = bankroll; // Reset profit tracker
        } else if (isFullLoss) {
            // Only increase on the specific "Killer" numbers (Red in Col 3)
            state.level += 1;
        } else {
            // Partial loss, break-even, or non-session-profit win:
            // Hold the level (do nothing)
        }
    }

    // --- 4. BET CALCULATION ---
    // Ratios: Col1 (5), Col2 (5), Black (4), Zero (1)
    const currentMult = state.level;

    // Raw Amounts
    let wagerCol1 = 5 * UNIT_SIZE * currentMult;
    let wagerCol2 = 5 * UNIT_SIZE * currentMult;
    let wagerBlack = 4 * UNIT_SIZE * currentMult;
    let wagerZero = 1 * UNIT_SIZE * currentMult;

    // --- 5. CLAMP TO LIMITS ---
    // We must ensure we don't exceed max or go below min (though unit calc handles min usually)
    
    // Clamp Inside Bet (Zero)
    wagerZero = Math.max(wagerZero, config.betLimits.min);
    wagerZero = Math.min(wagerZero, config.betLimits.max);

    // Clamp Outside Bets (Cols, Black)
    wagerCol1 = Math.max(wagerCol1, config.betLimits.minOutside);
    wagerCol1 = Math.min(wagerCol1, config.betLimits.max);
    
    wagerCol2 = Math.max(wagerCol2, config.betLimits.minOutside);
    wagerCol2 = Math.min(wagerCol2, config.betLimits.max);

    wagerBlack = Math.max(wagerBlack, config.betLimits.minOutside);
    wagerBlack = Math.min(wagerBlack, config.betLimits.max);

    // Safety: If bankroll is too low to place all bets, stop betting to avoid partial strategy
    const totalNeeded = wagerCol1 + wagerCol2 + wagerBlack + wagerZero;
    if (bankroll < totalNeeded) {
        // Not enough funds for the full strategy
        return []; 
    }

    // --- 6. CONSTRUCT BETS ---
    const bets = [
        { type: 'column', value: 1, amount: wagerCol1 },
        { type: 'column', value: 2, amount: wagerCol2 },
        { type: 'black', amount: wagerBlack },
        { type: 'number', value: 0, amount: wagerZero }
    ];

    return bets;
}