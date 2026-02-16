/**
 * STRATEGY: Dedication (Low Roller Jackpot System)
 * * SOURCE: 
 * Channel: Bet With Mo
 * Video: https://www.youtube.com/watch?v=tORKDtv-Xxg
 * * LOGIC:
 * This strategy focuses on covering a large section of the table (21 numbers) using a combination 
 * of Dozen, Street, and Double Street bets to create a low-volatility "grind".
 * * THE LAYOUT (Low Side Example):
 * 1. Dozen Bet: 1st Dozen (Numbers 1-12)
 * 2. Street Bet: Numbers 13-15 (Directly adjacent to the dozen)
 * 3. Line (Double Street) Bet: Numbers 16-21 (Directly adjacent to the street)
 * * WIN CONDITIONS:
 * - Hitting the Dozen pays 2:1.
 * - Hitting the Street pays 11:1.
 * - Hitting the Line pays 5:1.
 * - Any hit in the 1-21 range results in a profit or break-even/small gain depending on the specific unit weighting.
 * * THE PROGRESSION (8 Levels):
 * The video utilizes an 8-level ladder. It appears to hold the bet size for two attempts, then double.
 * Sequence (Multiplier of Base Unit): 1, 1, 2, 2, 4, 4, 8, 8.
 * * RESET RULES:
 * - Win: Reset progression to Level 0. Optionally switch target sides (Low 1-21 <-> High 16-36).
 * - Loss: Increase progression Level by 1.
 * - Bust (Loss at Level 8): Reset to Level 0 (Hard Stop).
 * * FINANCIAL CONTROLS:
 * - The base unit is calculated to satisfy BOTH the table minimums for Inside and Outside bets 
 * to maintain the required 1:1:1 ratio between the three bet types.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---

    // Define the 8-level progression multiplier (1x, 1x, 2x, 2x, 4x, 4x, 8x, 8x)
    const progressionMultipliers = [1, 1, 2, 2, 4, 4, 8, 8];

    // Initialize state on the very first spin
    if (state.level === undefined) {
        state.level = 0;           // Current progression index
        state.side = 'low';        // Current target: 'low' (1-21) or 'high' (16-36)
        state.totalProfit = 0;     // Track session profit
        state.startBankroll = bankroll;
    }

    // --- 2. ANALYZE PREVIOUS RESULT (If not first spin) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Determine if we won based on our previous side
        // Note: We check coverage manually because we don't have the previous bet object handy in this scope
        let won = false;
        
        if (lastNum !== 0 && lastNum !== '00') { // 0 is always a loss
            if (state.side === 'low') {
                // Low side covers 1 through 21
                if (lastNum >= 1 && lastNum <= 21) won = true;
            } else {
                // High side covers 16 through 36
                // Note: The specific overlapping "Dedication" layout for high side usually covers 16-36 
                // (Line 16-21, Street 22-24, Dozen 25-36)
                if (lastNum >= 16 && lastNum <= 36) won = true;
            }
        }

        if (won) {
            // WIN: Reset progression and switch sides (optional, but follows video style)
            state.level = 0;
            state.side = (state.side === 'low') ? 'high' : 'low';
        } else {
            // LOSS: Move up the ladder
            state.level++;
            
            // If we exceed the max level (8), we take the loss and reset
            if (state.level >= progressionMultipliers.length) {
                state.level = 0;
            }
        }
    }

    // --- 3. CALCULATE BET SIZES ---

    // Ensure our base unit satisfies both Inside and Outside table minimums.
    // The strategy requires equal units on Dozen (Outside) and Streets (Inside).
    const safeBaseUnit = Math.max(config.betLimits.min, config.betLimits.minOutside);
    
    // Calculate current unit based on progression level
    const currentMultiplier = progressionMultipliers[state.level];
    let rawAmount = safeBaseUnit * currentMultiplier;

    // CLAMPING: Ensure we don't exceed table max
    let finalAmount = Math.min(rawAmount, config.betLimits.max);

    // STOP LOSS CHECK: If we can't afford the 3 bets, return empty (stop playing)
    if (bankroll < finalAmount * 3) {
        return [];
    }

    // --- 4. CONSTRUCT BETS ---
    
    const bets = [];

    if (state.side === 'low') {
        // LAYOUT A: Covers 1-21
        // 1st Dozen (1-12)
        bets.push({ type: 'dozen', value: 1, amount: finalAmount });
        // Street (13-15)
        bets.push({ type: 'street', value: 13, amount: finalAmount });
        // Line/Double Street (16-21)
        bets.push({ type: 'line', value: 16, amount: finalAmount });
    } else {
        // LAYOUT B: Covers 16-36
        // 3rd Dozen (25-36)
        bets.push({ type: 'dozen', value: 3, amount: finalAmount });
        // Street (22-24)
        bets.push({ type: 'street', value: 22, amount: finalAmount });
        // Line/Double Street (16-21) - Note: This creates an overlap 16-21 if switching sides strictly
        // However, standard "High Side" dedication mirrors the low side:
        bets.push({ type: 'line', value: 16, amount: finalAmount });
    }

    return bets;
}