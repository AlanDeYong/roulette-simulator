/**
 * Strategy: The "Holy Grail" + JS21 Safety Protocol
 * * Source: YouTube - THEROULETTEMASTERTV
 * Video: "MY NEW ROULETTE HOLY GRAIL!" (https://www.youtube.com/watch?v=uCSuRgjdeEA)
 * * THE LOGIC:
 * - Cover roughly 64% of the board by betting on Dozen 1 and Dozen 2 simultaneously.
 * - The strategy relies on maintaining the current bet size during winning streaks and 
 * using a "Step" progression + "Sit Out" safety mechanism during losses.
 * * THE PROGRESSION:
 * 1. Base Bet: 1 Unit on Dozen 1, 1 Unit on Dozen 2.
 * 2. On Win: 
 * - Maintain the current bet size.
 * - CHECK PROFIT GOAL: If the Total Session Profit >= Current Target (increments of 10 units),
 * RESET bets back to the Base Unit (1 unit).
 * 3. On Loss (Dozen 3 or Zero hits):
 * - Increase the bet size by 1 Unit per dozen (e.g., 1->2->3).
 * - ACTIVATE "SITTING OUT" (JS21 Rule).
 * * THE SITTING OUT RULE (JS21):
 * - Immediately after a loss, stop placing bets.
 * - Observe the spins (ghost betting).
 * - Only resume betting when a "safe" number appears (Dozen 1 or Dozen 2).
 * - This prevents betting into a cluster of Dozen 3s or Zeros.
 * * THE GOAL:
 * - Accumulate profit in steps (e.g., reach +$100, reset, reach +$200, reset).
 * - Survive variance by sitting out bad streaks.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    
    // Define the Base Unit based on table minimums
    const baseUnit = config.betLimits.minOutside;

    if (!state.initialized) {
        state.initialized = true;
        state.unitsPerBet = 1;          // Start with 1 unit per dozen
        state.sittingOut = false;       // Track if we are in "JS21" safety mode
        state.startingBankroll = bankroll;
        
        // The strategy resets bets every time we gain X units of profit. 
        // Video suggests 10 units (e.g., $100 profit on $10 bets).
        state.profitStep = baseUnit * 10; 
        state.nextProfitTarget = state.profitStep;
    }

    // Helper to determine which dozen a number falls into
    // Returns: 1, 2, 3, or 0 (for 0/00)
    const getDozen = (number) => {
        if (number >= 1 && number <= 12) return 1;
        if (number >= 13 && number <= 24) return 2;
        if (number >= 25 && number <= 36) return 3;
        return 0;
    };

    // --- 2. PROCESS LAST SPIN (If applicable) ---

    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastDozen = getDozen(lastSpin.winningNumber);
        
        // A "Win" for this strategy is Dozen 1 or Dozen 2.
        // A "Loss" is Dozen 3 or Zero.
        const resultIsFavorable = (lastDozen === 1 || lastDozen === 2);
        
        const currentProfit = bankroll - state.startingBankroll;

        if (state.sittingOut) {
            // LOGIC: We are currently sitting out.
            // We only return to the table if the last result was "Safe" (Dozen 1 or 2).
            if (resultIsFavorable) {
                state.sittingOut = false; 
                // Note: We resume at the INCREASED unit level set when we started sitting out.
            } else {
                // It was Dozen 3 or Zero again. Good thing we sat out. Keep waiting.
                state.sittingOut = true;
            }
        } else {
            // LOGIC: We placed a bet on the last spin.
            if (resultIsFavorable) {
                // WIN
                // Check if we hit a profit milestone to trigger a Reset
                if (currentProfit >= state.nextProfitTarget) {
                    state.unitsPerBet = 1; // Reset to base
                    
                    // Move the goalpost. 
                    // Example: If target was 100 and we are at 105, next target is 200.
                    // We loop this just in case a big win skipped multiple targets.
                    while (currentProfit >= state.nextProfitTarget) {
                        state.nextProfitTarget += state.profitStep;
                    }
                } else {
                    // Did not hit goal yet? Maintain same bet size.
                    // state.unitsPerBet remains unchanged.
                }
            } else {
                // LOSS (Hit Dozen 3 or Zero)
                // 1. Increase progression by 1 unit
                state.unitsPerBet += 1;
                
                // 2. Activate Safety: Sit out next spin(s)
                state.sittingOut = true;
            }
        }
    }

    // --- 3. EXECUTE STRATEGY ---

    // If we are sitting out, place no bets
    if (state.sittingOut) {
        return [];
    }

    // Calculate Bet Amount
    let betAmount = baseUnit * state.unitsPerBet;

    // --- 4. CLAMP TO LIMITS ---
    // Ensure we don't bet less than min (logic handles this, but safety first)
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    // Ensure we don't exceed table max
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Safety check: Do we have enough money? 
    // We need to place 2 bets.
    if (bankroll < betAmount * 2) {
        // Not enough for full strategy. Bet whatever is left split by 2, or stop.
        // For simulation stability, if we can't afford the calculated bet, we stop.
        return [];
    }

    // --- 5. PLACE BETS ---
    // Bet on Dozen 1 and Dozen 2
    return [
        { type: 'dozen', value: 1, amount: betAmount },
        { type: 'dozen', value: 2, amount: betAmount }
    ];
}