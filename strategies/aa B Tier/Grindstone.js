/**
 * STRATEGY: Grindstone Roulette
 * * SOURCE:
 * - Video: "SPECTACULAR SUNNY BONUS ROULETTE SYSTEM!" (Segment starts at 00:34:29)
 * - Channel: The Roulette Master
 * - URL: https://www.youtube.com/watch?v=VitacYtydtI&t=2069s
 * * THE LOGIC:
 * - This is a "Cover the Field" strategy based on excluding specific numbers.
 * - Setup: Identify the last 3 UNIQUE numbers that hit.
 * - The Bet: Place straight-up bets on every number on the board EXCEPT those 3 numbers (covering ~34 numbers).
 * - The Cycle (The "Grind"):
 * 1. Goal is 4 consecutive wins.
 * 2. Win 1: You win a small amount. Remove the winning number from the next bet (now excluding 4 numbers).
 * 3. Win 2: Remove that winner (now excluding 5 numbers).
 * 4. Win 3: Remove that winner (now excluding 6 numbers).
 * 5. Win 4: You hit the profit target.
 * - Reset: After 4 consecutive wins, reset the exclusions to the *current* last 3 unique numbers and reset bet size.
 * * THE PROGRESSION (Recovery):
 * - Martingale variation on the Unit size.
 * - If a Loss occurs (the ball lands on an excluded number):
 * 1. Double the bet unit (e.g., $1 -> $2 -> $4).
 * 2. Reset the "4-win count" to 0.
 * 3. Reset the exclusions to the *current* last 3 unique numbers (start the cycle over with higher stakes).
 * * THE GOAL:
 * - Secure 4 wins in a row to bank profit, then reset risk.
 * - Use the "Safe" high coverage (starting with 34 numbers covered) to minimize loss frequency.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & HELPERS ---
    const MIN_BET = config.betLimits.min || 1;
    const MAX_BET = config.betLimits.max || 500;
    
    // Helper: Find the last N unique numbers from history
    const getLastUniqueNumbers = (history, count) => {
        const unique = new Set();
        const result = [];
        // Iterate backwards through history
        for (let i = history.length - 1; i >= 0; i--) {
            const num = history[i].winningNumber;
            if (!unique.has(num)) {
                unique.add(num);
                result.push(num);
            }
            if (result.length === count) break;
        }
        return result;
    };

    // --- 2. INITIALIZE STATE ---
    if (!state.initialized) {
        state.multiplier = 1;       // 1 unit starts
        state.winStreak = 0;        // Track 0 to 4 wins
        state.excluded = [];        // Numbers we are NOT betting on
        state.active = false;       // Are we currently in a valid betting session?
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS SPIN RESULTS ---
    // We only process if we have history and we were active last spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Check if we had active bets previously to determine Win/Loss
        if (state.active && state.excluded.length > 0) {
            // If the winning number was in our excluded list, we LOST.
            // If it wasn't, we WON (because we bet on everything else).
            const isLoss = state.excluded.includes(lastNum);

            if (isLoss) {
                // --- LOSS LOGIC ---
                // 1. Double the unit (Martingale)
                state.multiplier *= 2;
                // 2. Reset streak
                state.winStreak = 0;
                // 3. Flag to reset exclusions below
                state.needsReset = true; 
            } else {
                // --- WIN LOGIC ---
                state.winStreak++;

                if (state.winStreak >= 4) {
                    // Target Reached (4 wins): Reset to base
                    state.multiplier = 1;
                    state.winStreak = 0;
                    state.needsReset = true;
                } else {
                    // Continue Streak: Remove the number that just won
                    // (We stop betting on it for the remainder of this 4-spin cycle)
                    state.excluded.push(lastNum);
                    state.needsReset = false;
                }
            }
        } else {
            // First run or restart
            state.needsReset = true;
        }
    } else {
        // No history, cannot determine last 3 unique numbers
        return []; 
    }

    // --- 4. CALCULATE EXCLUSIONS (IF NEEDED) ---
    // We reset exclusions:
    // 1. At start
    // 2. After a Loss
    // 3. After completing the 4-win cycle
    if (state.needsReset) {
        const lastThree = getLastUniqueNumbers(spinHistory, 3);
        
        // Use last 3 unique. If history is short (e.g., only 2 spins), use what we have.
        // If we don't have at least 1 number, we can't play "exclusion" logic properly yet.
        if (lastThree.length < 1) return []; // Wait for more spins

        state.excluded = lastThree;
        state.needsReset = false;
    }

    // --- 5. CONSTRUCT BETS ---
    const bets = [];
    
    // Calculate bet amount per number
    let betAmount = MIN_BET * state.multiplier;
    
    // Clamp to limits
    betAmount = Math.max(betAmount, MIN_BET);
    betAmount = Math.min(betAmount, MAX_BET);

    // Loop through all standard roulette numbers (0-36)
    // Note: This logic assumes a standard wheel (0-36). 
    for (let i = 0; i <= 36; i++) {
        // If the number is NOT in the excluded list, place a bet
        if (!state.excluded.includes(i)) {
            bets.push({
                type: 'number',
                value: i,
                amount: betAmount
            });
        }
    }

    // Mark active for next state check
    state.active = true;

    return bets;
}