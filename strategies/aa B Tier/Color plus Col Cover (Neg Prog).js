/**
 * STRATEGY: Color + Column Cover (Negative Progression)
 *
 * SOURCE:
 * Video: "Best Roulette Strategy 2024? | CEG Dealer School"
 * URL: https://www.youtube.com/watch?v=d7i7jR5IzNg
 * Channel: CEG Dealer School
 *
 * THE LOGIC:
 * This strategy aims to cover ~70% of the board (26 numbers) by combining an Even Money bet
 * (Color) with a 2:1 bet (Column) that contains the most *opposing* colors.
 * - Bet A: Black (Pays 1:1) - Covers 18 numbers.
 * - Bet B: Column 3 (Pays 2:1) - Covers 12 numbers (8 of which are Red).
 * - Overlap: 4 Black numbers are in Column 3.
 *
 * THE PROGRESSION (The "Ratchet"):
 * This uses a linear negative progression (adding units, not doubling).
 * 1. Base Unit Ratio: 3:2 (e.g., $15 on Color, $10 on Column).
 * 2. On Loss: Increase both bets by adding 1 base unit set (e.g., next bet is $30/$20).
 * 3. On Win: Maintain current bet level (do not decrease immediately).
 * 4. Reset: ONLY reset to the starting base unit when the Bankroll reaches a new "Session High".
 *
 * THE GOAL:
 * Grind out small profits by surviving variance through high coverage, utilizing the
 * progression to recover losses without the exponential risk of a Martingale.
 */
function bet(spinHistory, bankroll, config, state) {
  // --- 1. CONFIGURATION & SETUP ---
  // Use config.betLimits.minOutside as the base unit anchor
  const minOutside = config.betLimits.minOutside || 5;
  const maxBet = config.betLimits.max || 1000;

  // Define the 3:2 Ratio from the video (1.5 units on Color, 1 unit on Column)
  // We use minOutside as the base unit for the smaller Column bet.
  const columnBaseUnit = minOutside;
  const colorBaseUnit = minOutside * 1.5;

  // --- 2. STATE INITIALIZATION ---
  if (!state.initialized) {
    state.multiplier = 1;          // Starts at 1x
    state.maxBankroll = bankroll;  // "High Water Mark" for resetting
    state.lastBankroll = bankroll; // For calculating P/L of previous spin
    state.initialized = true;
  }

  // --- 3. PROGRESSION LOGIC ---
  // Only process logic if a spin has actually occurred
  if (spinHistory.length > 0) {
    const currentBankroll = bankroll;
    const previousBankroll = state.lastBankroll;
    const netProfit = currentBankroll - previousBankroll;

    // Trigger A: New Session High (Reset)
    if (currentBankroll > state.maxBankroll) {
      state.maxBankroll = currentBankroll;
      state.multiplier = 1; // Reset to base unit
    } 
    // Trigger B: Loss (Increase)
    else if (netProfit < 0) {
      state.multiplier += 1; // Add 1 unit (Linear progression)
    }
    // Trigger C: Win but no new High (Maintain)
    else {
      // Do not change multiplier. 
      // We hold the bet size to recover previous drawdown.
    }
    
    // Update lastBankroll for the next spin's comparison
    state.lastBankroll = currentBankroll;
  }

  // --- 4. CALCULATE BET AMOUNTS ---
  // Calculate raw amounts based on current multiplier
  let rawColorAmt = colorBaseUnit * state.multiplier;
  let rawColumnAmt = columnBaseUnit * state.multiplier;

  // --- 5. CLAMP TO LIMITS ---
  // Ensure we respect the table Limits
  const colorAmt = Math.min(Math.max(rawColorAmt, minOutside), maxBet);
  const columnAmt = Math.min(Math.max(rawColumnAmt, minOutside), maxBet);

  // --- 6. RETURN BETS ---
  // Black + Column 3 (Standard CEG setup to catch Red numbers in Col 3)
  return [
    { 
      type: 'black', 
      amount: parseFloat(colorAmt.toFixed(2)) // Ensure precision
    },
    { 
      type: 'column', 
      value: 3, 
      amount: parseFloat(columnAmt.toFixed(2)) 
    }
  ];
}