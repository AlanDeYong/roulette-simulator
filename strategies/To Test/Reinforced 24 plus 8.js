/**
 * STRATEGY: Reinforced 24 + 8 System
 *
 * SOURCE:
 * Video: "This Roulette System Profits 86% of the Time… But There's a Catch"
 * Channel: Ninja Gamblers
 * URL: https://www.youtube.com/watch?v=O82XIw_FSQQ
 *
 * THE LOGIC:
 * This is an improvement on the standard 24+8. The goal is to profit on *every* win,
 * not just break even on the Dozens.
 * - Coverage: ~86% of the wheel (24 Dozen numbers + 8 Straight numbers).
 * - Base Bet Structure (30 Units Total):
 * 1. Dozen 1: 11 Units (Pays 2:1 + stake = 33. Net +3 units).
 * 2. Dozen 2: 11 Units (Pays 2:1 + stake = 33. Net +3 units).
 * 3. 8 Specific Numbers in Dozen 3: 1 Unit each (Pays 35:1 + stake = 36. Net +6 units).
 *
 * THE PROGRESSION (Recovery):
 * - Normal Mode: Bet 1 base multiplier.
 * - Loss Mode: If a loss occurs (hitting the 4 uncovered numbers), enter Recovery.
 * - Recovery Action: Double the bets (Multiplier = 2).
 * - Exit Condition: Continue betting at 2x until the cumulative loss is fully recovered
 * and the ledger returns to positive. Then reset to Normal Mode (1x).
 *
 * THE GOAL:
 * Generate consistent small profits (3 or 6 units) with high frequency (86%),
 * accepting a higher risk of a full loss (14%) compared to the standard version.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    // The specific numbers to cover in the 3rd Dozen (Uncovered Dozen)
    // These are arbitrarily chosen to spread coverage in Dozen 3 (25-36)
    const COVER_NUMBERS = [25, 26, 28, 29, 31, 32, 34, 35];

    // Define Base Unit Sizes (Relative to 1 unit)
    const UNITS_DOZEN = 11;
    const UNITS_STRAIGHT = 1;
    const TOTAL_UNITS_PER_SPIN = (UNITS_DOZEN * 2) + (UNITS_STRAIGHT * COVER_NUMBERS.length); // 30

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.recoveryLedger = 0; // Tracks how much we are down during a loss streak
        state.multiplier = 1;     // 1 = Base, 2 = Recovery (Doubled)
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS SPIN (Update Ledger) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastMultiplier = state.multiplier; // What we bet *last* time
        
        // Calculate costs and winnings based on the fixed strategy structure
        const totalBetAmount = TOTAL_UNITS_PER_SPIN * lastMultiplier;
        let totalWinnings = 0;

        // Did we hit Dozen 1 (1-12)?
        if (lastNum >= 1 && lastNum <= 12) {
            // Payout: (Bet * 2) + Bet = Bet * 3. 
            // We bet 11 units. Return is 33 units.
            totalWinnings = (UNITS_DOZEN * lastMultiplier) * 3;
        } 
        // Did we hit Dozen 2 (13-24)?
        else if (lastNum >= 13 && lastNum <= 24) {
            totalWinnings = (UNITS_DOZEN * lastMultiplier) * 3;
        } 
        // Did we hit a straight number?
        else if (COVER_NUMBERS.includes(lastNum)) {
            // Payout: (Bet * 35) + Bet = Bet * 36.
            totalWinnings = (UNITS_STRAIGHT * lastMultiplier) * 36;
        }
        // Else: We hit 0 or an uncovered number in Dozen 3. Winnings = 0.

        const netProfit = totalWinnings - totalBetAmount;

        // Update Recovery Logic
        if (state.recoveryLedger < 0) {
            // We are currently trying to recover
            state.recoveryLedger += netProfit;

            // Check if we have fully recovered
            if (state.recoveryLedger >= 0) {
                state.recoveryLedger = 0;
                state.multiplier = 1; // Reset to base
            } else {
                state.multiplier = 2; // Stay in double mode
            }
        } else {
            // We were in normal mode
            if (netProfit < 0) {
                // We just lost. Start recovery tracking.
                state.recoveryLedger = netProfit; 
                state.multiplier = 2; // Switch to double mode immediately
            } else {
                // We won in normal mode. Keep going.
                state.multiplier = 1;
            }
        }
    }

    // --- 4. DETERMINE CHIP VALUE ---
    // We need to establish what "1 Unit" is in currency.
    // Constraint: The straight up bets must be at least config.betLimits.min
    let baseChipValue = config.betLimits.min; 

    // Apply the strategy multiplier (Normal vs Recovery)
    let activeChipValue = baseChipValue * state.multiplier;

    // --- 5. CONSTRUCT BETS ---
    const bets = [];

    // Helper to add bet with clamping
    const addBet = (type, value, units) => {
        let amount = units * activeChipValue;
        
        // Clamp to Max Limit
        if (amount > config.betLimits.max) {
            amount = config.betLimits.max;
        }
        
        // Only place bet if it meets minimum requirements
        // (Note: We derived baseChipValue from min, so this should always pass, 
        // but we check minOutside for Dozens just in case).
        if (type === 'dozen' && amount < config.betLimits.minOutside) {
            // If the calculated 11 units is somehow less than minOutside, skip or adjust.
            // In standard configs (min 1, minOutside 5), 11 > 5, so we are safe.
            return; 
        }

        bets.push({ type, value, amount });
    };

    // Bet 1: Dozen 1 (11 Units)
    addBet('dozen', 1, UNITS_DOZEN);

    // Bet 2: Dozen 2 (11 Units)
    addBet('dozen', 2, UNITS_DOZEN);

    // Bet 3: Straight Ups (1 Unit each)
    COVER_NUMBERS.forEach(num => {
        addBet('number', num, UNITS_STRAIGHT);
    });

    return bets;
}