/**
 * Strategy: The Roulette Master's "3D Modified" System
 * * Source: 
 * YouTube: The Roulette Master
 * Video: "MY NEW #1 FAVORITE ROULETTE SYSTEM!" (https://www.youtube.com/watch?v=2prGLx7TyRo)
 * * The Logic:
 * This is a hedging strategy that covers a specific section of the board using two bets:
 * 1. An Even Money Bet (Low 1-18 or High 19-36).
 * 2. A Dozen Bet that is contained within that Even Money bet (1st Dozen for Low, 3rd Dozen for High).
 * * Outcomes (assuming Low + 1st Dozen):
 * - Hit 1-12: Win both bets (Big Profit).
 * - Hit 13-18: Win Low, Lose Dozen (Break Even / Push).
 * - Hit 19-36 or 0: Lose both bets (Loss).
 * * The Progression (Modified Martingale):
 * - Start with 1 Base Unit on each bet.
 * - On a Break Even (Push): Do NOT change the bet size. Repeat the bet.
 * - On a Loss: 
 * - Standard Rule: Increase bet by adding 1 Base Unit (Arithmetic progression: 1u, 2u, 3u...).
 * - The Trigger: If 3 Consecutive LOSSES occur, DOUBLE the current bet size instead of adding 1 unit.
 * - On a Win:
 * - If the bankroll is greater than the starting bankroll (Session Profit), RESET to 1 Base Unit.
 * - Otherwise, maintain the current bet size (or potentially reduce, but the video implies staying aggressive to recover).
 * *Implementation Note*: To ensure safety, this code keeps the current bet after a win unless we hit a new profit high, then resets.
 * * The Goal:
 * Recover from deep drawdowns using the "Add 1 Unit" safety net, only doubling when necessary to clear the hole, 
 * and resetting immediately upon reaching a new session high in bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & SETUP ---
    
    // Define the base unit size (respecting minimum outside bet limits)
    const BASE_UNIT = config.betLimits.minOutside;
    
    // Initialize State on the very first spin
    if (!state.initialized) {
        state.currentUnit = BASE_UNIT;
        state.consecutiveLosses = 0;
        state.side = 'low'; // Default to Low + 1st Dozen. Can be 'high' for High + 3rd Dozen.
        state.startingBankroll = bankroll;
        state.initialized = true;
    }

    // --- 2. ANALYZE PREVIOUS SPIN (If applicable) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const number = lastSpin.winningNumber;

        // Determine outcome based on our strategy logic
        let outcome = 'loss'; // Default

        // LOGIC FOR LOW + 1st DOZEN
        if (state.side === 'low') {
            if (number >= 1 && number <= 12) {
                outcome = 'win'; // Hit Dozen (2:1) AND Low (1:1)
            } else if (number >= 13 && number <= 18) {
                outcome = 'push'; // Hit Low (Win), Miss Dozen (Lose) -> Break Even
            } else {
                outcome = 'loss'; // Missed Low (so missed Dozen too)
            }
        } 
        // LOGIC FOR HIGH + 3rd DOZEN
        else {
            if (number >= 25 && number <= 36) {
                outcome = 'win';
            } else if (number >= 19 && number <= 24) {
                outcome = 'push';
            } else {
                outcome = 'loss';
            }
        }

        // --- 3. PROGRESSION LOGIC ---
        
        if (outcome === 'push') {
            // Video: "Break evens don't count... act like they're not there."
            // Action: Maintain current bets, do not change counters.
        } 
        else if (outcome === 'win') {
            // Reset consecutive loss counter on a win
            state.consecutiveLosses = 0;

            // Check if we have reached a profit relative to the start of the session
            if (bankroll > state.startingBankroll) {
                // Reset to base unit
                state.currentUnit = BASE_UNIT;
                
                // Optional: Switch sides on a session reset to mix it up (implied in video "feeling")
                // state.side = state.side === 'low' ? 'high' : 'low'; 
            } else {
                // If we won but are still in a hole, maintain the aggressive bet to recover faster
                // (Or strictly follow video: He often keeps betting until fully recovered)
            }
        } 
        else if (outcome === 'loss') {
            state.consecutiveLosses++;

            // CHECK THE TRIGGER: 3 Consecutive Losses
            if (state.consecutiveLosses >= 3) {
                // Video: "Once you have three in a row, double the bet."
                state.currentUnit = state.currentUnit * 2;
                
                // Important: Video implies we don't double *again* until another 3 losses.
                // Reset the counter so we count a fresh set of 3 losses before next double.
                state.consecutiveLosses = 0; 
            } else {
                // Standard Progression: Add 1 Unit
                // Video: "Just go up a unit... don't double."
                state.currentUnit += BASE_UNIT;
            }
        }
    }

    // --- 4. CLAMP BETS TO TABLE LIMITS ---
    // Ensure we don't bet less than min or more than max
    let betAmount = state.currentUnit;
    
    // Safety check against infinity or NaN
    if (!betAmount || betAmount < 0) betAmount = BASE_UNIT;

    // Apply limits
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Update state with clamped value for consistency next turn
    state.currentUnit = betAmount;

    // --- 5. CONSTRUCT BETS ---
    const bets = [];

    if (state.side === 'low') {
        // Bet 1: 1-18 (Low)
        bets.push({ type: 'low', amount: betAmount });
        // Bet 2: 1st Dozen (1-12)
        bets.push({ type: 'dozen', value: 1, amount: betAmount });
    } else {
        // Bet 1: 19-36 (High)
        bets.push({ type: 'high', amount: betAmount });
        // Bet 2: 3rd Dozen (25-36)
        bets.push({ type: 'dozen', value: 3, amount: betAmount });
    }

    return bets;
}