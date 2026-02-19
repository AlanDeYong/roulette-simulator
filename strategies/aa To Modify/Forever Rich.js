
/**
 * Strategy: Forever Rich Roulette System
 * Source: YouTube Channel "The Roulette Master"
 * Video URL: https://www.youtube.com/watch?v=QmbXJvLzvsY
 * * THE LOGIC:
 * The strategy relies on overlapping bets to cover a significant portion of the board while creating 
 * "Jackpot" numbers (where all three bets hit simultaneously).
 * * The Setup (Base Units):
 * 1. Column 2 (1 unit)
 * 2. Low 1-18 (2 units)
 * 3. Black (2 units)
 * * Jackpots: Numbers 2, 8, 11, 17 (Black, Low, and in Col 2).
 * * THE PROGRESSION (Arithmetic Ladder):
 * - On Net Loss: Increase all bets by their initial starting unit (Level 1 -> Level 2 -> Level 3).
 * Example: If starting bets are $5/$10/$10, next is $10/$20/$20.
 * - On Partial Win (Net Win but not session profit): Stay at the current level.
 * - On Session Profit: Reset back to Level 1.
 * * THE GOAL:
 * To survive losing streaks using the overlapping coverage and reset to base stakes 
 * immediately upon achieving a new high water mark in the bankroll (Session Profit).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    
    // Define the Betting Unit Ratios based on the strategy
    // Col 2 = 1 part, Low = 2 parts, Black = 2 parts
    const UNIT_RATIO_COL = 1;
    const UNIT_RATIO_OUTSIDE = 2;

    // Determine the monetary value of 1 Unit based on table limits
    // The strategy suggests $5 base for Col and $10 for Outside.
    // We scale this based on the simulator's minOutside config.
    // If minOutside is 5, baseUnit is 5.
    const baseUnit = config.betLimits.minOutside; 

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 1;                    // Current progression level
        state.sessionHigh = bankroll;       // Track high-water mark for resets
        state.previousBankroll = bankroll;  // To calculate last spin profit
        state.initialized = true;
    }

    // --- 3. PROGRESSION LOGIC ---
    // We only process logic if there is history (not the first spin)
    if (spinHistory.length > 0) {
        const lastSpinProfit = bankroll - state.previousBankroll;

        // Check 1: Did we reach a new session high? (Reset Trigger)
        if (bankroll > state.sessionHigh) {
            // "Reset back to base level because we're in nice session profit"
            state.level = 1;
            state.sessionHigh = bankroll; // Update the target to the new high
        } 
        // Check 2: Did we lose money on the last spin? (Progression Trigger)
        else if (lastSpinProfit < 0) {
            // "When you lose, go up by one unit"
            state.level += 1;
        }
        // Check 3: Partial win but not a session high?
        else {
            // "We're just up five... stay at this bet."
            // Maintain current level
        }
    }

    // Update tracking for next spin
    state.previousBankroll = bankroll;

    // --- 4. CALCULATE BET AMOUNTS ---
    // Formula: (Base Unit * Ratio) * Level
    let amountCol = (baseUnit * UNIT_RATIO_COL) * state.level;
    let amountOutside = (baseUnit * UNIT_RATIO_OUTSIDE) * state.level;

    // --- 5. CLAMP TO LIMITS (CRUCIAL) ---
    // Ensure bets do not exceed the table maximum
    amountCol = Math.min(amountCol, config.betLimits.max);
    amountOutside = Math.min(amountOutside, config.betLimits.max);

    // Ensure bets meet the minimums (Safety check, though logic above should cover it)
    amountCol = Math.max(amountCol, config.betLimits.minOutside);
    amountOutside = Math.max(amountOutside, config.betLimits.minOutside);

    // --- 6. DEFINE BETS ---
    // The Strategy: Col 2 ($5), Low ($10), Black ($10)
    const bets = [
        { type: 'column', value: 2, amount: amountCol },
        { type: 'low', amount: amountOutside },
        { type: 'black', amount: amountOutside }
    ];

    return bets;

}