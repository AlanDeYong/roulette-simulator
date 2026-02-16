/**
 * Strategy: Leon's Las Vegas Blueprint
 * Source: The Roulette Master (YouTube) - https://www.youtube.com/watch?v=XUT_tinlwWY
 * * THE LOGIC:
 * 1. Base Setup: This strategy primarily attacks the 2nd and 3rd Dozens using Street bets (rows of 3 numbers), 
 * plus a hedge bet on Zero.
 * 2. The Streets: We cover the 8 streets contained within Dozens 2 & 3 (Starts: 13, 16, 19, 22, 25, 28, 31, 34).
 * 3. Win Condition (The "Disappearing" Act): 
 * - If a street hits, we WIN.
 * - CRUCIAL: That specific street is REMOVED from the next bet (we stop betting on it).
 * - We check "Session Profit" (Current Bankroll vs Bankroll when we started this sequence).
 * - If in Profit: RESET all streets and reset base unit.
 * - If NOT in Profit: Continue with remaining streets at the current unit size.
 * 4. Loss Condition:
 * - Occurs if the ball lands in Dozen 1 (1-12) OR on a street we previously removed.
 * - Action: DOUBLE the betting unit (Martingale progression) on the REMAINING streets.
 * 5. Zero Hedge: A constant bet on Zero is maintained to mitigate losses, usually matched to the base unit.
 * * GOAL:
 * - Achieve a "Session Profit" to reset the board and minimize exposure to long progressions.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const DOZEN_2_3_STREETS = [13, 16, 19, 22, 25, 28, 31, 34];
    
    // Determine the base unit based on table minimums for Inside bets
    const BASE_UNIT = config.betLimits.min; 

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.activeStreets = [...DOZEN_2_3_STREETS]; // Start with all 8 streets
        state.unitMultiplier = 1;                     // Start at 1 unit
        state.sessionStartBankroll = bankroll;        // Snapshot bankroll to track session profit
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS SPIN (Logic) ---
    const lastSpin = spinHistory[spinHistory.length - 1];

    if (lastSpin) {
        const winningNum = lastSpin.winningNumber;
        
        // Helper: Check if a number falls within a specific street start
        const isNumberInStreet = (num, streetStart) => num >= streetStart && num <= streetStart + 2;

        // Did we hit an ACTIVE street?
        const hitStreetIndex = state.activeStreets.findIndex(streetStart => 
            isNumberInStreet(winningNum, streetStart)
        );

        if (winningNum === 0) {
            // HIT ZERO:
            // The video treats 0 as a hedge. Usually, this is a "push" or small win/loss.
            // We do not remove streets, we do not double. We just re-bet same amount.
            // No state change required.
        } 
        else if (hitStreetIndex !== -1) {
            // WIN (Hit an active street):
            // 1. Remove the street that hit
            state.activeStreets.splice(hitStreetIndex, 1);

            // 2. Check Session Profit
            const currentProfit = bankroll - state.sessionStartBankroll;

            if (currentProfit > 0) {
                // We are in profit! RESET everything.
                state.activeStreets = [...DOZEN_2_3_STREETS];
                state.unitMultiplier = 1;
                state.sessionStartBankroll = bankroll; // Reset profit tracker
            } else {
                // Not in profit yet? Keep going with remaining streets.
                // Multiplier stays the same (we don't revert to 1 until profit).
                
                // Edge Case: If we ran out of streets but aren't in profit (rare, but possible)
                if (state.activeStreets.length === 0) {
                     state.activeStreets = [...DOZEN_2_3_STREETS];
                     state.unitMultiplier = 1; // Force reset to avoid betting nothing
                }
            }
        } 
        else {
            // LOSS (Hit Dozen 1 OR hit a previously removed street):
            // Progression: Double the bet unit (Martingale)
            state.unitMultiplier *= 2;
        }
    }

    // --- 4. CALCULATE BET AMOUNTS (With Limits) ---
    
    // Calculate the raw amount per street
    let rawAmount = BASE_UNIT * state.unitMultiplier;

    // CLAMP: Ensure we don't breach table limits
    // Note: Since 'street' is an inside bet, we use limits.min and limits.max
    let actualAmount = Math.max(rawAmount, config.betLimits.min);
    actualAmount = Math.min(actualAmount, config.betLimits.max);

    // --- 5. CONSTRUCT BETS ---
    const bets = [];

    // Place bets on all currently active streets
    state.activeStreets.forEach(streetStart => {
        // Double check we have enough bankroll for this specific chip
        // (Simulator usually handles total check, but good for logic)
        bets.push({
            type: 'street',
            value: streetStart,
            amount: actualAmount
        });
    });

    // Place Hedge Bet on Zero
    // Usually kept at 1 unit or scaled slightly. The video suggests keeping it small.
    // We will scale it with the unit to ensure it actually hedges effectively, 
    // but clamp it strictly.
    let zeroAmount = Math.max(BASE_UNIT * state.unitMultiplier, config.betLimits.min);
    zeroAmount = Math.min(zeroAmount, config.betLimits.max);

    bets.push({
        type: 'number',
        value: 0,
        amount: zeroAmount
    });

    return bets;
}