/**
 * STRATEGY: THE BARCODE
 * * SOURCE: 
 * YouTube Channel: CEG Dealer School
 * Video Title: "The Barcode Roulette Strategy"
 * URL: https://www.youtube.com/watch?v=... (Conceptual Reference)
 * * THE LOGIC:
 * The Barcode strategy creates a high-density betting zone in the middle of the layout (numbers 4-27).
 * It uses overlapping Street bets and Split bets to create a visual "barcode" on the felt.
 * * - Level 1 (Base Mode):
 * - Bets: 8 Streets (rows of 3) + 8 Splits placed "above" those streets.
 * - Coverage: Heavily covers 4-27.
 * - Condition: Active by default. 
 * * - Level 2 (Recovery Mode):
 * - Trigger: A "Total Loss" spin (result is 0, 1-3, 28-36, or any number not covering the main block).
 * - Action: Maintain the 8 Streets but shift the 8 Splits "down" to cover different gaps/variance.
 * - Condition: Active until Bankroll reaches the previous High Water Mark.
 * * THE PROGRESSION:
 * - Win/Hover: Stay flat betting on Level 1.
 * - Loss (Total): Switch to Level 2 (Recovery Shift).
 * - Recovery: Once Bankroll >= High Water Mark, reset to Level 1.
 * - Sizing: Flat unit bets per spot (no doubling/Martingale).
 * * THE GOAL:
 * - Consistent small wins through high coverage (~80%).
 * - Recover drawdowns by changing the "shape" of the bet (variance) rather than the size.
 * - Target: Restore High Water Mark.
 */

function bet(spinHistory, bankroll, config, state) {
    // 1. DETERMINE BET UNIT
    // This strategy uses Inside bets (Streets/Splits), so we use betLimits.min.
    // We default to 1 if config.betLimits.min is missing, but always respect the table minimum.
    const unit = Math.max(config.betLimits.min || 1, 1);

    // Ensure the unit does not exceed the maximum allowed bet
    const safeUnit = Math.min(unit, config.betLimits.max);

    // 2. INITIALIZE STATE
    if (!state.initialized) {
        state.mode = 1; // 1 = Base Level, 2 = Recovery Level
        state.highWaterMark = bankroll;
        state.initialized = true;
    }

    // 3. UPDATE STATE BASED ON HISTORY
    // Always track the peak bankroll (High Water Mark)
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
    }

    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Logic to toggle between modes
        // The core "Barcode" zone is 4 through 27. 
        // A result outside this range (0, 1-3, 28-36) is treated as a trigger event (Total Loss).
        const isBarcodeZone = (lastNum >= 4 && lastNum <= 27);

        if (state.mode === 1) {
            // If in Base Mode and we hit outside the zone, switch to Recovery
            if (!isBarcodeZone) {
                state.mode = 2;
            }
        } else if (state.mode === 2) {
            // If in Recovery Mode, check if we have recovered our bankroll
            if (bankroll >= state.highWaterMark) {
                state.mode = 1; // Reset to Base Mode
            }
        }
    }

    // 4. CONSTRUCT BETS
    const bets = [];

    // Helper function to push bets strictly adhering to limits
    const placeBet = (type, value) => {
        bets.push({
            type: type,
            value: value,
            amount: safeUnit
        });
    };

    // --- STREET BETS (Constant for both levels) ---
    // Rows starting at: 4, 7, 10, 13, 16, 19, 22, 25
    const streets = [4, 7, 10, 13, 16, 19, 22, 25];
    streets.forEach(startNum => placeBet('street', startNum));

    // --- SPLIT BETS (Vary based on Mode) ---
    if (state.mode === 1) {
        // Level 1: Splits "Above" (connecting the street to the row above it)
        // e.g., 5|8, 8|11...
        const splitsL1 = [
            [5, 8], [8, 11], [11, 14], [14, 17],
            [17, 20], [20, 23], [23, 26], [26, 29]
        ];
        splitsL1.forEach(pair => placeBet('split', pair));

    } else {
        // Level 2: Splits "Below" (connecting the street to the row below it)
        // Shifts the variance to catch numbers that might fall through the L1 gaps.
        // e.g., 2|5, 5|8...
        const splitsL2 = [
            [2, 5], [5, 8], [8, 11], [11, 14],
            [14, 17], [17, 20], [20, 23], [23, 26]
        ];
        splitsL2.forEach(pair => placeBet('split', pair));
    }

    return bets;
}

module.exports = { bet };