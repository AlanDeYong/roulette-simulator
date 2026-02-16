/**
 * STRATEGY: Tony's "Living" Column Switcher
 * * SOURCE: 
 * URL: https://www.youtube.com/watch?v=VkgJYxM-Jbk
 * Channel: CEG Dealer School
 * * LOGIC:
 * This strategy exploits the "First and Third" column exclusion principle.
 * - ALWAYS bet on two columns simultaneously.
 * - CRITICAL RULE: Never bet Column 1 and Column 3 together. 
 * - Valid Pairs: [Column 1 & Column 2] OR [Column 2 & Column 3].
 * - Column 2 is always covered (Safe Middle).
 * - Trigger: 
 * - If you WIN: Repeat the exact same bet.
 * - If you LOSE (Ball hits the uncovered column): Switch the pair to cover the column 
 * that just won. (e.g., If betting [2,3] and Col 1 hits, switch to [1,2]).
 * - If Zero hits: Treat as a loss, increase progression, but maintain current column selection.
 * * PROGRESSION (Triple Martingale):
 * - On Win: Reset to base unit (1 unit).
 * - On Loss: Triple the previous bet amount (1 -> 3 -> 9 -> 27...).
 * * GOAL:
 * - Generate consistent small profits ($60-$75/hr equivalent).
 * - Stop Loss: Recommended at ~30 units or if max bet limit is reached.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & HELPERS ---
    
    // Determine the base betting unit (using Outside Min as per rules)
    const baseUnit = config.betLimits.minOutside;
    
    // Helper: Get Column for a number (1, 2, or 3). Returns 0 for 0/00.
    const getColumn = (num) => {
        if (num === 0 || num === '00') return 0;
        return ((num - 1) % 3) + 1;
    };

    // --- 2. STATE INITIALIZATION ---
    
    if (!state.initialized) {
        state.progression = 1;            // Multiplier for the base unit
        state.activeColumns = [2, 3];     // Default start: Middle & Last column
        state.initialized = true;
    }

    // --- 3. PROCESS LAST SPIN (If available) ---
    
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber; // Should be a number (0-36)
        const lastCol = getColumn(lastNum);

        // Did we win? 
        // We win if the result is in one of our active columns.
        const won = state.activeColumns.includes(lastCol);

        if (won) {
            // WIN: Reset progression, Keep same columns
            state.progression = 1;
        } else {
            // LOSS: Triple the bet
            state.progression *= 3;

            // SWITCH LOGIC:
            // If we lost to a specific column (1 or 3), we must switch to cover it.
            // Note: We never lose on Col 2 (it's always covered). 
            // We only lose on Col 1 (if betting 2&3), Col 3 (if betting 1&2), or 0.
            
            if (lastCol === 1) {
                state.activeColumns = [1, 2]; // Ball went Low, cover Low & Mid
            } else if (lastCol === 3) {
                state.activeColumns = [2, 3]; // Ball went High, cover Mid & High
            }
            // If result was 0, we keep the activeColumns the same but keep the increased progression.
        }
    }

    // --- 4. CALCULATE BET AMOUNTS ---

    let betAmount = baseUnit * state.progression;

    // --- 5. RESPECT LIMITS (CLAMPING) ---
    
    // Ensure bet is at least the table minimum
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    
    // Ensure bet does not exceed table maximum
    // Note: We must check this carefully. If the progression exceeds the max,
    // we cap it at max. (In real play, this is where the system fails).
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Safety check: If bankroll is too low for two bets, return null or stop
    if (bankroll < betAmount * 2) {
        console.warn("Bankroll insufficient for strategy progression.");
        return []; 
    }

    // --- 6. PLACE BETS ---
    
    // We always bet on the two active columns defined in state
    return [
        { type: 'column', value: state.activeColumns[0], amount: betAmount },
        { type: 'column', value: state.activeColumns[1], amount: betAmount }
    ];
}