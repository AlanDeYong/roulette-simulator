/**
 * Strategy: Play for Hours
 * Source: The Roulette Master TV (https://www.youtube.com/watch?v=eSSQKxJUifo)
 *
 * THE LOGIC:
 * This system is designed for longevity ("Play for Hours") by covering 4 specific attributes 
 * that overlap to create "super numbers" (like 25 and 27) while minimizing the impact of losses.
 * * The Default Setup (Red Side):
 * 1. Red (Outside)
 * 2. Odd (Outside)
 * 3. High (19-36) (Outside)
 * 4. 3rd Dozen (25-36) (Multiplier)
 * * Note: One can also play the "Black Side" (Black, Even, Low, 1st Dozen), but this function 
 * defaults to the Red Side as primarily demonstrated in the video.
 *
 * THE PROGRESSION:
 * - Base Unit: Starts at 1 unit on each of the 4 bets.
 * - Negative Progression (On Loss): If the previous spin resulted in a NET LOSS (partial or total), 
 * increase all bets by 1 unit.
 * - Neutral (Break Even/Partial Win): If the previous spin was a break-even or a small win that 
 * did not reach a new bankroll high, maintain the current bet size.
 * - Reset (Session Profit): If the current bankroll exceeds the "High Water Mark" (highest recorded 
 * bankroll for the session), reset all bets to 1 unit.
 *
 * THE GOAL:
 * - Reach a new "Session High" in bankroll to trigger a reset.
 * - Survive long streaks using a slow linear progression (+1 unit) rather than aggressive doubling.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION ---
    // The strategy uses the "Outside Min" as the base unit size ($5 in the video).
    const baseUnit = config.betLimits.minOutside;

    // --- 2. STATE INITIALIZATION ---
    if (state.highWaterMark === undefined) {
        state.highWaterMark = bankroll; // Track the highest bankroll achieved
    }
    if (state.lastBankroll === undefined) {
        state.lastBankroll = bankroll;  // Track bankroll from previous spin to detect W/L
    }
    if (state.unitLevel === undefined) {
        state.unitLevel = 1;            // Current number of units per bet
    }

    // --- 3. PROGRESSION LOGIC ---
    // We only adjust logic if we have a history (not the first spin)
    if (spinHistory.length > 0) {
        const currentBankroll = bankroll;
        const lastBankroll = state.lastBankroll;
        
        // Condition A: New Session High (Reset Trigger)
        if (currentBankroll > state.highWaterMark) {
            state.unitLevel = 1;
            state.highWaterMark = currentBankroll;
        } 
        // Condition B: Net Loss (Increase Trigger)
        // Video [00:23:34]: "If we get any loss at all whether it's full or partial we go up a unit."
        else if (currentBankroll < lastBankroll) {
            state.unitLevel += 1;
        }
        // Condition C: Break Even or Partial Win that isn't a Session High (Maintain Trigger)
        // Video [00:26:54]: "Partial win... stay at [current bet]."
        else {
            // Keep state.unitLevel the same
        }
    }

    // Update the lastBankroll for the NEXT spin's comparison
    state.lastBankroll = bankroll;

    // --- 4. BET CALCULATION & LIMITS ---
    // Calculate the amount for this spin based on current unit level
    let rawAmount = baseUnit * state.unitLevel;

    // Clamp the bet amount to the table limits
    // Ensure we don't bet less than minOutside (though baseUnit handles this)
    let finalAmount = Math.max(rawAmount, config.betLimits.minOutside);
    // Ensure we don't exceed the table max
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // --- 5. BET PLACEMENT ---
    // The strategy places 4 equal bets. 
    // Default Setup: Red, Odd, High (19-36), 3rd Dozen.
    
    const bets = [
        { type: 'red', amount: finalAmount },
        { type: 'odd', amount: finalAmount },
        { type: 'high', amount: finalAmount },
        { type: 'dozen', value: 3, amount: finalAmount } // 3rd Dozen (25-36)
    ];

    return bets;
}