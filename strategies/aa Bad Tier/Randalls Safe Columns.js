<<<<<<< HEAD
/**
 * STRATEGY: Safe Columns (Created by Randall)
 * * SOURCE: 
 * YouTube: "SAFEST NEW ROULETTE SYSTEM SHARED BY THE ROULETTE MASTER..."
 * Channel: The Roulette Master
 * URL: https://www.youtube.com/watch?v=RqbfI8gWOd4
 * * THE LOGIC:
 * 1. Base Bet: Place equal bets on Column 2 and Column 3.
 * - This covers approx 64% of the board.
 * 2. Coverage (The "Safe" part):
 * - On a loss (hitting Column 1 or Zero), the strategy adds "Hedge" bets.
 * - It places 6 specific Corner bets that cover all numbers in Column 1.
 * - Corner Bets: 1-5, 7-11, 13-17, 19-23, 25-29, 31-35.
 * * THE PROGRESSION (Negative Progression):
 * 1. Level 0 (Start/Reset): 
 * - 1 unit on Col 2, 1 unit on Col 3.
 * 2. On Loss (Level Up):
 * - Increase Column bets by 1 unit each.
 * - Increase Corner bets by 1 unit each.
 * 3. On Win (Profit):
 * - If the spin results in a net profit effectively clearing the session loss, Reset to Level 0.
 * - Note: Hitting a 'Corner' (Col 1) usually results in a smaller loss or break-even depending on the level, 
 * not a full win. We only reset on a true Column 2 or 3 hit.
 * * THE GOAL:
 * - Grind out small profits using the high coverage of Col 2 & 3.
 * - Use the corners to mitigate losses on Col 1 streaks.
 * - Stop Loss: Recommended to stop if bankroll drops by 20-30%.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPER FUNCTIONS ---
    
    // Define base units based on config limits
    const UNIT_COL = config.betLimits.minOutside || 5;
    const UNIT_CORNER = config.betLimits.min || 1;
    
    // The 6 specific corners covering Column 1 (identified by top-left number)
    // 1 covers 1,2,4,5 (Hits 1,4)
    // 7 covers 7,8,10,11 (Hits 7,10) ... etc
    const CORNER_KEYS = [1, 7, 13, 19, 25, 31];

    // Helper to clamp bet amounts to table limits
    const clamp = (amount, isOutside) => {
        const min = isOutside ? config.betLimits.minOutside : config.betLimits.min;
        const max = config.betLimits.max;
        return Math.min(Math.max(amount, min), max);
    };

    // Helper to determine which column a number belongs to (1, 2, or 3)
    const getColumn = (number) => {
        if (number === 0 || number === '00') return 0;
        return ((number - 1) % 3) + 1;
    };

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 0;
    if (state.currentBets === undefined) state.currentBets = [];

    // --- 3. PROCESS PREVIOUS SPIN (Update State) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastCol = getColumn(lastNum);

        // Calculate functionality of the last spin based on where we bet
        let wonMainBet = (lastCol === 2 || lastCol === 3);
        
        // Logic:
        // If we hit Col 2 or 3, we win the main bet. This is the goal. RESET.
        // If we hit Col 1 or 0, we failed the main bet.
        // Even if we hit a Corner (Col 1), it is usually a mitigation (partial loss/recovery), not a profit target.
        // Therefore, strict rule: Reset ONLY on Col 2 or 3 hit. Everything else increases progression.
        
        if (wonMainBet) {
            state.level = 0; // Reset on clear win
        } else {
            state.level++;   // Increase progression on Col 1 or Zero
        }
    }

    // --- 4. CALCULATE BETS FOR CURRENT LEVEL ---
    
    // Calculate units based on level
    // Col Progression: Base 1 unit + 1 unit per level
    const colMultiplier = 1 + state.level;
    
    // Corner Progression: 0 units at Level 0, 1 unit per level starting at Level 1
    const cornerMultiplier = state.level; 

    const bets = [];

    // A. Place Column Bets (Always active)
    const colAmount = clamp(UNIT_COL * colMultiplier, true);
    
    bets.push({ type: 'column', value: 2, amount: colAmount });
    bets.push({ type: 'column', value: 3, amount: colAmount });

    // B. Place Corner Bets (Only active if level > 0)
    if (cornerMultiplier > 0) {
        const cornerAmount = clamp(UNIT_CORNER * cornerMultiplier, false);
        
        CORNER_KEYS.forEach(cornerVal => {
            bets.push({ type: 'corner', value: cornerVal, amount: cornerAmount });
        });
    }

    // Update state for next turn analysis
    state.currentBets = bets;

    return bets;
=======
/**
 * STRATEGY: Safe Columns (Created by Randall)
 * * SOURCE: 
 * YouTube: "SAFEST NEW ROULETTE SYSTEM SHARED BY THE ROULETTE MASTER..."
 * Channel: The Roulette Master
 * URL: https://www.youtube.com/watch?v=RqbfI8gWOd4
 * * THE LOGIC:
 * 1. Base Bet: Place equal bets on Column 2 and Column 3.
 * - This covers approx 64% of the board.
 * 2. Coverage (The "Safe" part):
 * - On a loss (hitting Column 1 or Zero), the strategy adds "Hedge" bets.
 * - It places 6 specific Corner bets that cover all numbers in Column 1.
 * - Corner Bets: 1-5, 7-11, 13-17, 19-23, 25-29, 31-35.
 * * THE PROGRESSION (Negative Progression):
 * 1. Level 0 (Start/Reset): 
 * - 1 unit on Col 2, 1 unit on Col 3.
 * 2. On Loss (Level Up):
 * - Increase Column bets by 1 unit each.
 * - Increase Corner bets by 1 unit each.
 * 3. On Win (Profit):
 * - If the spin results in a net profit effectively clearing the session loss, Reset to Level 0.
 * - Note: Hitting a 'Corner' (Col 1) usually results in a smaller loss or break-even depending on the level, 
 * not a full win. We only reset on a true Column 2 or 3 hit.
 * * THE GOAL:
 * - Grind out small profits using the high coverage of Col 2 & 3.
 * - Use the corners to mitigate losses on Col 1 streaks.
 * - Stop Loss: Recommended to stop if bankroll drops by 20-30%.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPER FUNCTIONS ---
    
    // Define base units based on config limits
    const UNIT_COL = config.betLimits.minOutside || 5;
    const UNIT_CORNER = config.betLimits.min || 1;
    
    // The 6 specific corners covering Column 1 (identified by top-left number)
    // 1 covers 1,2,4,5 (Hits 1,4)
    // 7 covers 7,8,10,11 (Hits 7,10) ... etc
    const CORNER_KEYS = [1, 7, 13, 19, 25, 31];

    // Helper to clamp bet amounts to table limits
    const clamp = (amount, isOutside) => {
        const min = isOutside ? config.betLimits.minOutside : config.betLimits.min;
        const max = config.betLimits.max;
        return Math.min(Math.max(amount, min), max);
    };

    // Helper to determine which column a number belongs to (1, 2, or 3)
    const getColumn = (number) => {
        if (number === 0 || number === '00') return 0;
        return ((number - 1) % 3) + 1;
    };

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 0;
    if (state.currentBets === undefined) state.currentBets = [];

    // --- 3. PROCESS PREVIOUS SPIN (Update State) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastCol = getColumn(lastNum);

        // Calculate functionality of the last spin based on where we bet
        let wonMainBet = (lastCol === 2 || lastCol === 3);
        
        // Logic:
        // If we hit Col 2 or 3, we win the main bet. This is the goal. RESET.
        // If we hit Col 1 or 0, we failed the main bet.
        // Even if we hit a Corner (Col 1), it is usually a mitigation (partial loss/recovery), not a profit target.
        // Therefore, strict rule: Reset ONLY on Col 2 or 3 hit. Everything else increases progression.
        
        if (wonMainBet) {
            state.level = 0; // Reset on clear win
        } else {
            state.level++;   // Increase progression on Col 1 or Zero
        }
    }

    // --- 4. CALCULATE BETS FOR CURRENT LEVEL ---
    
    // Calculate units based on level
    // Col Progression: Base 1 unit + 1 unit per level
    const colMultiplier = 1 + state.level;
    
    // Corner Progression: 0 units at Level 0, 1 unit per level starting at Level 1
    const cornerMultiplier = state.level; 

    const bets = [];

    // A. Place Column Bets (Always active)
    const colAmount = clamp(UNIT_COL * colMultiplier, true);
    
    bets.push({ type: 'column', value: 2, amount: colAmount });
    bets.push({ type: 'column', value: 3, amount: colAmount });

    // B. Place Corner Bets (Only active if level > 0)
    if (cornerMultiplier > 0) {
        const cornerAmount = clamp(UNIT_CORNER * cornerMultiplier, false);
        
        CORNER_KEYS.forEach(cornerVal => {
            bets.push({ type: 'corner', value: cornerVal, amount: cornerAmount });
        });
    }

    // Update state for next turn analysis
    state.currentBets = bets;

    return bets;
>>>>>>> origin/main
}