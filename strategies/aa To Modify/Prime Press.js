<<<<<<< HEAD
/**
 * STRATEGY: Prime Press Roulette System (with Jackpot Street)
 * * SOURCE:
 * - Video: "WON $1000 IN 15 MINUTES!! #best #roulette #strategy"
 * - Channel: The Roulette Master
 * - URL: https://www.youtube.com/watch?v=Gw3yuGMjE3w
 * * THE LOGIC:
 * This strategy covers 4 specific sectors of the board, aiming to cover roughly 17 numbers (~46% coverage).
 * It relies on a "Press" mechanic to capitalize on streaks and a strict "Reset" on the "Jackpot" street.
 * * THE BETS (4 Positions):
 * 1. Basket (First Four): 0, 1, 2, 3
 * 2. Double Street (Line): 10, 11, 12, 13, 14, 15
 * 3. Double Street (Line): 22, 23, 24, 25, 26, 27
 * 4. Street (The "Jackpot" Street): 34, 35, 36
 * * THE PROGRESSION:
 * 1. Start with 1 Unit on each position.
 * 2. ON LOSS: 
 * - Increase unit size by 1 (e.g., 1 -> 2 -> 3).
 * - If the loss occurred during a "Press" (bet was doubled), revert to the pre-press unit size + 1.
 * 3. ON WIN (Standard):
 * - If hitting Basket or Double Streets: "Press" the bet (Double the unit size) for the next spin.
 * 4. ON WIN (Jackpot):
 * - If hitting Street 34-36: IMMEDIATE RESET to 1 Unit base bet.
 * * THE GOAL:
 * - The video suggests a "Hit and Run" approach.
 * - Ideally, stop after a significant "Jackpot" win or reaching a session profit target (e.g., +20% of bankroll).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    // The video uses $10 units. We will use config.betLimits.min as the 1 Unit base.
    // If min is 1, a unit is 1. If min is 10, a unit is 10.
    const BASE_CHIP = Math.max(config.betLimits.min, 1); 

    // Define Winning Numbers for Logic Checks
    const WIN_NUMBERS_JACKPOT = [34, 35, 36];
    const WIN_NUMBERS_REGULAR = [
        0, 1, 2, 3,                 // Basket
        10, 11, 12, 13, 14, 15,     // Line 1
        22, 23, 24, 25, 26, 27      // Line 2
    ];

    // --- 2. STATE INITIALIZATION ---
    if (state.currentUnit === undefined) state.currentUnit = 1;
    if (state.isPressed === undefined) state.isPressed = false;
    if (state.prePressUnit === undefined) state.prePressUnit = 1;

    // --- 3. PROCESS LAST SPIN (Update Progression) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        const hitJackpot = WIN_NUMBERS_JACKPOT.includes(lastNum);
        const hitRegular = WIN_NUMBERS_REGULAR.includes(lastNum);

        if (hitJackpot) {
            // SCENARIO: JACKPOT WIN
            // Rule: Always reset to base after hitting the Jackpot street
            state.currentUnit = 1;
            state.isPressed = false;
            state.prePressUnit = 1;
        } 
        else if (hitRegular) {
            // SCENARIO: REGULAR WIN
            // Rule: Press the bet (Double it)
            // Store current unit before doubling in case we lose next
            if (!state.isPressed) {
                state.prePressUnit = state.currentUnit;
            }
            state.currentUnit = state.currentUnit * 2;
            state.isPressed = true;
        } 
        else {
            // SCENARIO: LOSS
            if (state.isPressed) {
                // Rule: If we lost on a pressed bet, go back to where we were before press + 1
                state.currentUnit = state.prePressUnit + 1;
                state.isPressed = false;
            } else {
                // Rule: Standard loss, just add 1 unit
                state.currentUnit += 1;
            }
        }
    }

    // --- 4. CALCULATE BET AMOUNT ---
    let amount = state.currentUnit * BASE_CHIP;

    // Clamp to Limits
    // Must be at least min (already handled by BASE_CHIP mostly, but safe to check)
    amount = Math.max(amount, config.betLimits.min);
    // Must be at most max
    amount = Math.min(amount, config.betLimits.max);

    // --- 5. CONSTRUCT BETS ---
    // Strategy requires 4 positions
    const bets = [
        // 1. Basket (0, 1, 2, 3)
        // Note: Check simulator documentation. Often 'basket' val 0 covers 0-3. 
        // If simulator uses 'first_four', adjust type. Standard is 'basket'.
        { type: 'basket', value: 0, amount: amount },

        // 2. Double Street (Line) 10-15
        { type: 'line', value: 10, amount: amount },

        // 3. Double Street (Line) 22-27
        { type: 'line', value: 22, amount: amount },

        // 4. Street (Jackpot) 34-36
        { type: 'street', value: 34, amount: amount }
    ];

    return bets;
=======
/**
 * STRATEGY: Prime Press Roulette System (with Jackpot Street)
 * * SOURCE:
 * - Video: "WON $1000 IN 15 MINUTES!! #best #roulette #strategy"
 * - Channel: The Roulette Master
 * - URL: https://www.youtube.com/watch?v=Gw3yuGMjE3w
 * * THE LOGIC:
 * This strategy covers 4 specific sectors of the board, aiming to cover roughly 17 numbers (~46% coverage).
 * It relies on a "Press" mechanic to capitalize on streaks and a strict "Reset" on the "Jackpot" street.
 * * THE BETS (4 Positions):
 * 1. Basket (First Four): 0, 1, 2, 3
 * 2. Double Street (Line): 10, 11, 12, 13, 14, 15
 * 3. Double Street (Line): 22, 23, 24, 25, 26, 27
 * 4. Street (The "Jackpot" Street): 34, 35, 36
 * * THE PROGRESSION:
 * 1. Start with 1 Unit on each position.
 * 2. ON LOSS: 
 * - Increase unit size by 1 (e.g., 1 -> 2 -> 3).
 * - If the loss occurred during a "Press" (bet was doubled), revert to the pre-press unit size + 1.
 * 3. ON WIN (Standard):
 * - If hitting Basket or Double Streets: "Press" the bet (Double the unit size) for the next spin.
 * 4. ON WIN (Jackpot):
 * - If hitting Street 34-36: IMMEDIATE RESET to 1 Unit base bet.
 * * THE GOAL:
 * - The video suggests a "Hit and Run" approach.
 * - Ideally, stop after a significant "Jackpot" win or reaching a session profit target (e.g., +20% of bankroll).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    // The video uses $10 units. We will use config.betLimits.min as the 1 Unit base.
    // If min is 1, a unit is 1. If min is 10, a unit is 10.
    const BASE_CHIP = Math.max(config.betLimits.min, 1); 

    // Define Winning Numbers for Logic Checks
    const WIN_NUMBERS_JACKPOT = [34, 35, 36];
    const WIN_NUMBERS_REGULAR = [
        0, 1, 2, 3,                 // Basket
        10, 11, 12, 13, 14, 15,     // Line 1
        22, 23, 24, 25, 26, 27      // Line 2
    ];

    // --- 2. STATE INITIALIZATION ---
    if (state.currentUnit === undefined) state.currentUnit = 1;
    if (state.isPressed === undefined) state.isPressed = false;
    if (state.prePressUnit === undefined) state.prePressUnit = 1;

    // --- 3. PROCESS LAST SPIN (Update Progression) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        const hitJackpot = WIN_NUMBERS_JACKPOT.includes(lastNum);
        const hitRegular = WIN_NUMBERS_REGULAR.includes(lastNum);

        if (hitJackpot) {
            // SCENARIO: JACKPOT WIN
            // Rule: Always reset to base after hitting the Jackpot street
            state.currentUnit = 1;
            state.isPressed = false;
            state.prePressUnit = 1;
        } 
        else if (hitRegular) {
            // SCENARIO: REGULAR WIN
            // Rule: Press the bet (Double it)
            // Store current unit before doubling in case we lose next
            if (!state.isPressed) {
                state.prePressUnit = state.currentUnit;
            }
            state.currentUnit = state.currentUnit * 2;
            state.isPressed = true;
        } 
        else {
            // SCENARIO: LOSS
            if (state.isPressed) {
                // Rule: If we lost on a pressed bet, go back to where we were before press + 1
                state.currentUnit = state.prePressUnit + 1;
                state.isPressed = false;
            } else {
                // Rule: Standard loss, just add 1 unit
                state.currentUnit += 1;
            }
        }
    }

    // --- 4. CALCULATE BET AMOUNT ---
    let amount = state.currentUnit * BASE_CHIP;

    // Clamp to Limits
    // Must be at least min (already handled by BASE_CHIP mostly, but safe to check)
    amount = Math.max(amount, config.betLimits.min);
    // Must be at most max
    amount = Math.min(amount, config.betLimits.max);

    // --- 5. CONSTRUCT BETS ---
    // Strategy requires 4 positions
    const bets = [
        // 1. Basket (0, 1, 2, 3)
        // Note: Check simulator documentation. Often 'basket' val 0 covers 0-3. 
        // If simulator uses 'first_four', adjust type. Standard is 'basket'.
        { type: 'basket', value: 0, amount: amount },

        // 2. Double Street (Line) 10-15
        { type: 'line', value: 10, amount: amount },

        // 3. Double Street (Line) 22-27
        { type: 'line', value: 22, amount: amount },

        // 4. Street (Jackpot) 34-36
        { type: 'street', value: 34, amount: amount }
    ];

    return bets;
>>>>>>> origin/main
}