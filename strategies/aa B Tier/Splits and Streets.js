/**
 * STRATEGY: The Splits and Streets (Casino Matchmaker)
 * * SOURCE: 
 * YouTube: Casino Matchmaker - "The Splits and Streets Strategy – Simple Structure, Smart Results"
 * URL: https://www.youtube.com/watch?v=ctaTbg80L5M
 * * THE LOGIC:
 * This strategy operates in two phases to balance risk and recovery.
 * * 1. Phase 1 (Base): 
 * - Bets on 8 specific Splits.
 * - Coverage: 16 numbers (approx 43%).
 * - Goal: Grind small profits with low exposure.
 * * 2. Phase 2 (Recovery):
 * - Triggered by a loss in Phase 1.
 * - Bets on the same 8 Splits + the 8 Streets containing them.
 * - Ratio: 1 unit on Split, 3 units on Street.
 * - Coverage: 24 numbers (approx 64%).
 * - Win Types:
 * a. Jackpot (Split + Street hit): High profit.
 * b. Small Win (Street only hit): Mitigation or small profit.
 * * THE PROGRESSION:
 * - In Phase 1: Flat betting.
 * - In Phase 2:
 * - Loss: Increase recovery level by 1 unit.
 * - Jackpot Win: Decrease recovery level by 1 (or reset to Phase 1 if level is low).
 * - Small Win: Requires 2 consecutive small wins to decrease level.
 * * THE GOAL:
 * - Steady accumulation of small wins.
 * - Aggressive recovery of losses using the "Double Coverage" (Jackpot) zones.
 * - Recommended Stop Loss: 20-30% of bankroll.
 * - Recommended Take Profit: Reset strategy after +20% session gain.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    
    // We define 8 "Pairs" of Splits and their associated Streets.
    // To minimize overlaps and maximize board coverage (1-24), we use:
    // Pair: [Split Array, Street Start Number]
    // Note: Numbers 1-24 are covered. 16 Jackpot numbers, 8 Small Win numbers.
    const BET_PAIRS = [
        { split: [1, 2],   street: 1 },  // Jackpot: 1,2 | Small: 3
        { split: [4, 5],   street: 4 },  // Jackpot: 4,5 | Small: 6
        { split: [7, 8],   street: 7 },  // Jackpot: 7,8 | Small: 9
        { split: [10, 11], street: 10 }, // Jackpot: 10,11 | Small: 12
        { split: [13, 14], street: 13 }, // Jackpot: 13,14 | Small: 15
        { split: [16, 17], street: 16 }, // Jackpot: 16,17 | Small: 18
        { split: [19, 20], street: 19 }, // Jackpot: 19,20 | Small: 21
        { split: [22, 23], street: 22 }  // Jackpot: 22,23 | Small: 24
    ];

    // Helper to identify Jackpot numbers for logic checks
    const JACKPOT_NUMBERS = [1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23];
    // Helper to identify Small Win numbers (the 3rd number in the streets)
    const SMALL_WIN_NUMBERS = [3, 6, 9, 12, 15, 18, 21, 24];

    const MIN_CHIP = config.betLimits.min; 
    const MAX_BET = config.betLimits.max;

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.phase = 'base';       // 'base' or 'recovery'
        state.recoveryLevel = 1;    // Multiplier for recovery bets
        state.smallWinCounter = 0;  // Tracks consecutive small wins
        state.totalLastBet = 0;     // To calculate net result
        state.logData = "Spin, Phase, Level, Result, Balance\n"; // Header for logs
        state.initialized = true;
    }

    // --- 3. RESULT ANALYSIS (Process Previous Spin) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        
        // Determine Win Type
        const isJackpot = JACKPOT_NUMBERS.includes(winningNum);
        const isSmallWin = SMALL_WIN_NUMBERS.includes(winningNum);
        const isLoss = !isJackpot && !isSmallWin;

        // PROGRESSION LOGIC
        if (state.phase === 'base') {
            if (isLoss) {
                // Switch to Recovery Mode
                state.phase = 'recovery';
                state.recoveryLevel = 1; 
                state.smallWinCounter = 0;
            }
            // If Win: Stay in Base, do nothing.
        } 
        else if (state.phase === 'recovery') {
            if (isLoss) {
                // Increase aggression
                state.recoveryLevel++;
                state.smallWinCounter = 0; // Reset counter on loss
            } 
            else if (isJackpot) {
                // Big Win: Reduce level immediately
                if (state.recoveryLevel > 1) {
                    state.recoveryLevel--;
                } else {
                    // If we are at level 1 and hit a jackpot, we are likely profitable enough to reset
                    state.phase = 'base';
                }
                state.smallWinCounter = 0;
            } 
            else if (isSmallWin) {
                // Small Win: Need 2 in a row to reduce level
                state.smallWinCounter++;
                if (state.smallWinCounter >= 2) {
                    if (state.recoveryLevel > 1) {
                        state.recoveryLevel--;
                    } else {
                        state.phase = 'base';
                    }
                    state.smallWinCounter = 0; // Reset after action
                }
            }
        }
        
        // Logging Data (Buffer)
        state.logData += `${spinHistory.length}, ${state.phase}, ${state.recoveryLevel}, ${winningNum}, ${bankroll}\n`;
    }

    // --- 4. LOGGING TO FILE (Network Throttled) ---
    // Only save every 50 spins to prevent simulator crash
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        utils.saveFile("splits_streets_log.csv", state.logData);
    }

    // --- 5. BET CALCULATION ---
    let bets = [];
    let currentTotalBet = 0;

    // Safety Clamp: Don't let recovery level go too high (Optional safety)
    // If level gets too high, the bets might exceed table limits anyway.
    const safeLevel = Math.max(1, state.recoveryLevel);

    if (state.phase === 'base') {
        // PHASE 1: Just the Splits (8 units total)
        for (let pair of BET_PAIRS) {
            let amount = MIN_CHIP; // 1 unit
            
            // Respect Limits
            amount = Math.min(amount, MAX_BET);
            
            bets.push({ type: 'split', value: pair.split, amount: amount });
            currentTotalBet += amount;
        }
    } 
    else {
        // PHASE 2: Splits + Streets (Recovery)
        // Video Ratio: Split = 1 unit, Street = 3 units.
        // Multiplied by the progression level.
        
        const splitBase = MIN_CHIP * safeLevel;
        const streetBase = (MIN_CHIP * 3) * safeLevel;

        for (let pair of BET_PAIRS) {
            // 1. The Split Bet
            let splitAmt = Math.min(splitBase, MAX_BET);
            bets.push({ type: 'split', value: pair.split, amount: splitAmt });
            currentTotalBet += splitAmt;

            // 2. The Street Bet
            let streetAmt = Math.min(streetBase, MAX_BET);
            bets.push({ type: 'street', value: pair.street, amount: streetAmt });
            currentTotalBet += streetAmt;
        }
    }

    // Update state for next analysis
    state.totalLastBet = currentTotalBet;

    // --- 6. RETURN BETS ---
    // Stop betting if bankroll is critically low (can't cover minimum bet)
    if (bankroll < currentTotalBet) {
        return []; // Stop strategy
    }

    return bets;
}