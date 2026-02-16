/**
 * STRATEGY: Daily Prosper Roulette
 * SOURCE: The Roulette Master - "DAILY PROSPER ROULETTE!"
 * VIDEO URL: https://www.youtube.com/watch?v=TNaA70ce4uQ
 *
 * --- STRATEGY LOGIC ---
 * The strategy balances "High Coverage" (Base Mode) with "Jackpot Potential" (Recovery Mode).
 * * 1. CONFIGURATION:
 * - Uses a 1.5 to 1 ratio for Color vs Column bets (e.g., $15 Color, $10 Column).
 * * 2. BASE MODE (The Grinder):
 * - Trigger: Start of session or after a full reset.
 * - Bet: Main Color + The Column with the LEAST amount of that color (The "Anti-Column").
 * - Logic: Covers 26 numbers (18 Color + 8 unique from Column).
 * - Example: Bet Black ($15) + Column 3 ($10). (Column 3 is Red dominant).
 * * 3. RECOVERY MODE (The Hunter):
 * - Trigger: Any Net Loss while in Base Mode.
 * - Bet: Main Color + The Column with the MOST amount of that color (The "Pro-Column").
 * - Logic: Reduces coverage to 22 numbers but creates "Jackpot" numbers (overlap of Color + Column).
 * - Example: Bet Black + Column 2. (Column 2 is Black dominant).
 * * 4. PROGRESSION (Martingale-esque):
 * - On Loss: Switch to (or stay in) Recovery Mode and Double the bet amounts.
 * - On Win (in Recovery): If the win recovers previous losses (or hits session profit), RESET to Base Mode and base units. 
 * Otherwise, repeat the current bet level to try and hit the "Jackpot" again.
 * * 5. COLUMNS REFERENCE:
 * - Col 1: Balanced (6 Red, 6 Black) - rarely used in this strategy.
 * - Col 2: Black Heavy (8 Black, 4 Red).
 * - Col 3: Red Heavy (8 Red, 4 Black).
 * * 6. STOP LOSS/PROFIT:
 * - Implicit: Resets to base unit upon reaching a new high water mark.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_OUTSIDE = config.betLimits.minOutside || 5;
    
    // We strictly adhere to the video's ratio: 1 unit on Column, 1.5 units on Color.
    // If table min is $5, Base Unit is $10 (Column) and $15 (Color).
    // We define a "Unit" as MIN_OUTSIDE * 2 to ensure we have room for the 1.5 ratio.
    const UNIT_SIZE = MIN_OUTSIDE * 2; 

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.progressionLevel = 0;   // 0 = Base bet, 1+ = Doubling
        state.mode = 'BASE';          // 'BASE' or 'RECOVERY'
        state.targetColor = 'black';  // Start with Black (per video default)
        state.startingBankroll = bankroll;
        state.highWaterMark = bankroll;
        state.lastBetAmount = 0;
        state.initialized = true;
        // Log start
        // console.log("Daily Prosper Initialized. Target: " + state.targetColor);
    }

    // --- 3. PROCESS PREVIOUS SPIN ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.totalPayout || 0; // Assuming simulator provides this, else 0
        const lastNet = lastWinAmount - state.lastBetAmount;

        // Update High Water Mark
        if (bankroll > state.highWaterMark) {
            state.highWaterMark = bankroll;
        }

        // --- LOGIC FLOW ---
        
        // Condition A: We reached a new profit high or recovered to start
        // The video suggests resetting if "bets get high" or we hit a jackpot that puts us up.
        // We reset if we are profitable relative to the session start OR the local high water mark.
        const isInProfit = bankroll >= state.highWaterMark;

        if (isInProfit) {
            // WIN / RESET SCENARIO
            state.progressionLevel = 0;
            state.mode = 'BASE';
            
            // Optional: Toggle color on full reset to mimic video variation (Black -> Red -> Black)
            // state.targetColor = state.targetColor === 'black' ? 'red' : 'black';
        } else if (lastNet > 0 && state.mode === 'RECOVERY') {
            // PARTIAL WIN SCENARIO (Recovery Mode)
            // We won, but haven't fully recovered the bankroll.
            // Video Logic: "If we hit... we rebet and spin." 
            // We stay at current level to try and hit the 'Jackpot' again unless we are in deep profit.
            // No changes to level.
        } else {
            // LOSS SCENARIO
            // If we lost (net negative), we escalate.
            if (state.mode === 'BASE') {
                // First loss triggers switch to Recovery
                state.mode = 'RECOVERY';
                state.progressionLevel = 1; // Double immediately upon switching
            } else {
                // Already in recovery, just double
                state.progressionLevel++;
            }
        }
    }

    // --- 4. DETERMINE BET PARAMETERS ---

    // Calculate Multiplier based on progression (Powers of 2: 1, 2, 4, 8...)
    const multiplier = Math.pow(2, state.progressionLevel);

    // Calculate Amounts
    let colBetAmount = UNIT_SIZE * multiplier;       // e.g., $10 * 1 = $10
    let colorBetAmount = (UNIT_SIZE * 1.5) * multiplier; // e.g., $10 * 1.5 = $15

    // --- 5. CLAMP TO LIMITS ---
    // Ensure we don't exceed table maximums
    if (colBetAmount > config.betLimits.max) colBetAmount = config.betLimits.max;
    if (colorBetAmount > config.betLimits.max) colorBetAmount = config.betLimits.max;

    // Safety Stop: If we can't afford the bet, stop betting (return empty)
    const totalNeeded = colBetAmount + colorBetAmount;
    if (totalNeeded > bankroll) {
        // console.log("Bankroll insufficient for progression. Stopping.");
        return [];
    }

    // --- 6. SELECT BETS BASED ON MODE ---
    const bets = [];

    // Helper: Column Definitions
    // Col 2: 2, 5, 8... (Black Heavy)
    // Col 3: 3, 6, 9... (Red Heavy)
    
    let targetColumnVal = 0;

    if (state.targetColor === 'black') {
        if (state.mode === 'BASE') {
            // Base: Black + Col 3 (Red Heavy) -> Max Coverage (26 nums)
            targetColumnVal = 3;
        } else {
            // Recovery: Black + Col 2 (Black Heavy) -> Jackpot Hunting (22 nums)
            targetColumnVal = 2;
        }
    } else {
        // Red Strategy
        if (state.mode === 'BASE') {
            // Base: Red + Col 2 (Black Heavy) -> Max Coverage
            targetColumnVal = 2;
        } else {
            // Recovery: Red + Col 3 (Red Heavy) -> Jackpot Hunting
            targetColumnVal = 3;
        }
    }

    // Push Color Bet
    bets.push({
        type: state.targetColor, // 'red' or 'black'
        amount: colorBetAmount
    });

    // Push Column Bet
    bets.push({
        type: 'column',
        value: targetColumnVal,
        amount: colBetAmount
    });

    // Save bet amount for next spin logic
    state.lastBetAmount = totalNeeded;

    return bets;
}