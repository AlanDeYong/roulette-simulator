
/**
 * STRATEGY: The Money Maker System
 * * SOURCE: 
 * URL: https://www.youtube.com/watch?v=yPEOX_hAqww
 * Channel: The Roulette Master
 * * THE LOGIC:
 * This system combines Split bets and Straight Up "Jackpot" bets to cover roughly 20 numbers.
 * - 6 Split Bets: 1/4, 9/12, 13/16, 21/24, 25/28, 33/36.
 * - 7 Straight Up Bets: Selected to cover gaps (e.g., 0, 2, 7, 17, 20, 26, 29).
 * * THE PROGRESSION (3-Stage Ladder):
 * 1. Level 1 (Base): 1 Unit on Splits, 1 Unit on Straight Ups.
 * 2. Level 2 (After 1 Loss): Increase SPLITS by 1 Unit. Straight Ups stay at 1 Unit.
 * 3. Level 3+ (After 2nd Consecutive Loss): Increase ALL bets (Splits and Straight ups) by 1 Unit.
 * - Continue increasing all bets by 1 unit on every subsequent loss.
 * * RESET CONDITION:
 * - On a WIN: Check if current bankroll >= High Water Mark (Highest Session Bankroll).
 * - If yes: Reset to Level 1.
 * - If no (still recovering): Repeat the same bet (do not regress, do not progress).
 * * THE GOAL:
 * - Reach a new High Water Mark and reset to base units to protect profits.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_CHIP = config.betLimits.min; // Use 'min' for Inside bets
    const MAX_BET = config.betLimits.max;
    
    // The fixed Split pairs defined in the strategy
    const SPLIT_BETS = [
        [1, 4], [9, 12], [13, 16], 
        [21, 24], [25, 28], [33, 36]
    ];

    // The fixed Straight Up numbers (Jackpot numbers) to fill gaps
    // Video suggestions tailored for good spread: 0, 2, 7, 17, 20, 26, 29
    const STRAIGHT_BETS = [0, 2, 7, 17, 20, 26, 29];

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 1;                // Progression Level
        state.highWaterMark = bankroll; // Track highest bankroll to know when to reset
        state.previousBankroll = bankroll;
        state.totalBetAmount = 0;
        state.spinCount = 0;
        state.initialized = true;
    }

    // --- 3. WIN/LOSS ANALYSIS & PROGRESSION LOGIC ---
    // We only analyze if there is history (not the first spin)
    if (spinHistory.length > 0) {
        const lastWinAmount = bankroll - (state.previousBankroll - state.totalBetAmount);
        const isWin = lastWinAmount > 0;

        // Update High Water Mark if we reached a new peak
        if (bankroll > state.highWaterMark) {
            state.highWaterMark = bankroll;
        }

        if (isWin) {
            // WIN LOGIC
            // If we are at or above our high water mark, RESET.
            // Otherwise, we REBET (hold level) to try and recover the drawdown.
            if (bankroll >= state.highWaterMark) {
                state.level = 1;
            } else {
                // Optional: The video suggests you can reset if "close enough", 
                // but for strict logic, we hold level on a recovery win.
                // state.level remains unchanged.
            }
        } else {
            // LOSS LOGIC
            // Level 1 -> Level 2
            // Level 2 -> Level 3
            // Level 3+ -> Level + 1
            state.level++;
        }
    }

    // --- 4. CALCULATE UNITS BASED ON LEVEL ---
    let splitUnits = 1;
    let straightUnits = 1;

    if (state.level === 1) {
        splitUnits = 1;
        straightUnits = 1;
    } else if (state.level === 2) {
        // First loss: Only Splits increase
        splitUnits = 2;
        straightUnits = 1;
    } else {
        // Level 3+: All bets increase relative to previous state
        // Level 3: Splits=3, Straight=2
        // Level 4: Splits=4, Straight=3
        splitUnits = state.level;
        straightUnits = state.level - 1;
    }

    // --- 5. GENERATE BETS ---
    const bets = [];
    let currentTotalBet = 0;

    // Helper to clamp bet amounts
    const getSafeAmount = (units) => {
        let amt = units * MIN_CHIP;
        if (amt > MAX_BET) amt = MAX_BET;
        if (amt < MIN_CHIP) amt = MIN_CHIP;
        return amt;
    };

    const splitAmt = getSafeAmount(splitUnits);
    const straightAmt = getSafeAmount(straightUnits);

    // Create Split Bets
    SPLIT_BETS.forEach(pair => {
        bets.push({
            type: 'split',
            value: pair,
            amount: splitAmt
        });
        currentTotalBet += splitAmt;
    });

    // Create Straight Up Bets
    STRAIGHT_BETS.forEach(num => {
        bets.push({
            type: 'number',
            value: num,
            amount: straightAmt
        });
        currentTotalBet += straightAmt;
    });

    // --- 6. STATE UPDATES & UTILS ---
    state.previousBankroll = bankroll;
    state.totalBetAmount = currentTotalBet;
    state.spinCount++;

    // Logging disabled to prevent file bloat
    
    return bets;

}