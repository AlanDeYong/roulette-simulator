/**
 * STRATEGY: Casino Special (Bet With Mo)
 * * SOURCE:
 * - Video: "CASINO SPECIAL - NEW ROULETTE SYSTEM | WINNING STRATEGY"
 * - Channel: Bet With Mo
 * - URL: https://www.youtube.com/watch?v=AMDuleMRj4I
 * * LOGIC:
 * This is a high-coverage strategy that uses a combination of Double Streets (Lines), 
 * Corners, and Split bets to cover the majority of the board.
 * * 1. Base Structure:
 * - 4 Double Streets (Lines) covering the bulk of the board.
 * - Gaps are filled with Corner bets (Levels 2-3) or Split bets (Levels 4-7).
 * * 2. The Zones (Reconstructed from video logic):
 * - Lines cover: 1-6, 7-12, 19-24, 31-36.
 * - Gaps (Holes): 13-18 and 25-30.
 * - Corners/Splits target these Gaps.
 * * PROGRESSION (7 Levels):
 * - Trigger: Progression increases on any NET LOSS. Resets to Level 1 on any NET WIN.
 * * - Level 1: 4 Lines @ $4 each. (Total $16)
 * - Level 2: 4 Lines @ $6 each + 4 Corners (in gaps) @ $2 each. (Total $32)
 * - Level 3: 4 Lines @ $10 each + 4 Corners @ $2 each. (Total $48)
 * - Level 4: 4 Lines @ $12 each + 8 Splits (covering gaps) @ $2 each. (Total $64)
 * - Level 5: 4 Lines @ $14 each + 8 Splits @ $3 each. (Total $80)
 * - Level 6: Double the bets of Level 5. (Total $160)
 * - Level 7: Double the bets of Level 6. (Total $320)
 * * GOAL:
 * - Recover losses and generate small consistent profits using the "grind" of the lines 
 * or "jackpot" wins from the corners/splits.
 * - Stop Loss: If Level 7 loses, reset to Level 1 (Accept loss).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    
    // Define the specific bet placements
    // Lines: Covers 1-6, 7-12, 19-24, 31-36
    const lineBets = [1, 7, 19, 31];
    
    // Corners: Covers the gaps (13-18, 25-30)
    // 13 covers 13,14,16,17; 14 covers 14,15,17,18, etc.
    const cornerBets = [13, 14, 25, 26]; 
    
    // Splits: Aggressive coverage of gaps in higher levels
    // Vertical/Horizontal splits to cover 13-18 and 25-30 densely
    const splitBets = [
        [13, 16], [14, 17], [15, 18], [13, 14], // Covers 13-18 area
        [25, 28], [26, 29], [27, 30], [25, 26]  // Covers 25-30 area
    ];

    // Define the Betting Progression Schedule (Amounts are in base units)
    const progressionMap = {
        1: { line: 4,  corner: 0, split: 0 },
        2: { line: 6,  corner: 2, split: 0 },
        3: { line: 10, corner: 2, split: 0 },
        4: { line: 12, corner: 0, split: 2 },
        5: { line: 14, corner: 0, split: 3 },
        6: { line: 28, corner: 0, split: 6 }, // Doubled Level 5
        7: { line: 56, corner: 0, split: 12 } // Doubled Level 6
    };

    const MAX_LEVEL = 7;

    // --- 2. STATE MANAGEMENT ---

    if (state.currentLevel === undefined) state.currentLevel = 1;

    // Helper to calculate previous bet total to determine win/loss
    const calculateTotalBetForLevel = (lvl) => {
        const p = progressionMap[lvl];
        return (lineBets.length * p.line) + 
               (cornerBets.length * p.corner) + 
               (splitBets.length * p.split);
    };

    // Analyze last spin result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Did we win money on the last spin?
        // Note: We check if payout > totalBet to consider it a "Win" for reset purposes.
        const lastBetAmount = calculateTotalBetForLevel(state.currentLevel);
        const isNetWin = lastSpin.totalPayout > lastBetAmount;

        if (isNetWin) {
            // Reset on Win
            state.currentLevel = 1;
        } else {
            // Progress on Loss
            if (state.currentLevel < MAX_LEVEL) {
                state.currentLevel++;
            } else {
                // Stop Loss triggered after Level 7, reset to 1
                state.currentLevel = 1;
            }
        }
    }

    // --- 3. CONSTRUCT BETS ---

    const currentParams = progressionMap[state.currentLevel];
    const bets = [];

    // Helper to verify and push bets
    const addBet = (type, value, baseAmount) => {
        if (baseAmount <= 0) return;

        // CLAMPING: Respect Config Limits
        let finalAmount = baseAmount;
        
        // Ensure Min Limit (Inside bets)
        if (finalAmount < config.betLimits.min) finalAmount = config.betLimits.min;
        
        // Ensure Max Limit
        if (finalAmount > config.betLimits.max) finalAmount = config.betLimits.max;

        bets.push({
            type: type,
            value: value,
            amount: finalAmount
        });
    };

    // 1. Place Line Bets (Double Streets)
    lineBets.forEach(lineStart => {
        addBet('line', lineStart, currentParams.line);
    });

    // 2. Place Corner Bets (If active for this level)
    if (currentParams.corner > 0) {
        cornerBets.forEach(cornerStart => {
            addBet('corner', cornerStart, currentParams.corner);
        });
    }

    // 3. Place Split Bets (If active for this level)
    if (currentParams.split > 0) {
        splitBets.forEach(splitVal => {
            addBet('split', splitVal, currentParams.split);
        });
    }

    return bets;
}