/**
 * "No Boss" Roulette Strategy
 * 
 * LOGIC:
 * 1. Trigger: Wait for the same Dozen (1st, 2nd, or 3rd) to hit 3 times in a row.
 *    - Example: 1st Dozen hits on spin 1, 2, and 3. Trigger is set to "1st Dozen".
 * 2. Bet: Place bets on the OTHER two Dozens (e.g., if trigger is 1st, bet on 2nd and 3rd).
 * 
 * PROGRESSION (2-Step Martingale-like Recovery):
 * - Level 1: Bet 1 Unit per Dozen.
 *   - If Win: Profit achieved, reset to Waiting for new trigger.
 *   - If Loss (Trigger Dozen hits again or Zero): Move to Level 2.
 * - Level 2: Bet 2.5 Units (or configured multiplier) per Dozen to recover Level 1 loss + profit.
 *   - If Win: Profit achieved, reset to Waiting.
 *   - If Loss: Accept loss (Stop Loss), reset to Waiting.
 * 
 * GOAL:
 * - Capitalize on the probability that a single Dozen rarely hits 4 or 5 times in a row.
 * - Conservative recovery (only 2 levels) prevents deep drawdowns.
 */

function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & LIMITS ---
    // Base unit matches the table minimum for Outside bets
    const UNIT = config.betLimits.minOutside; 
    
    // Multipliers for the progression
    const LEVEL_1_MULT = 1;   // e.g. $5
    const LEVEL_2_MULT = 2.5; // e.g. $12.5 (rounded down usually, or up)

    // --- Helper: Identify Dozen (0=Zero/Loss, 1=1st, 2=2nd, 3=3rd) --- 
    const getDozen = (spin) => { 
        const num = (typeof spin === 'object' && spin !== null) ? spin.winningNumber : spin; 
        if (num === '00' || num === 0 || num === 37) return 0; 
        if (num >= 1 && num <= 12) return 1; 
        if (num >= 13 && num <= 24) return 2; 
        if (num >= 25 && num <= 36) return 3; 
        return 0; 
    };

    // --- Helper: Place Bets with Clamping ---
    const placeBets = (excludeDozen, multiplier) => {
        const bets = [];
        let rawAmount = Math.floor(UNIT * multiplier); // Calculate raw amount
        
        // CLAMP TO LIMITS
        let amount = Math.max(rawAmount, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);

        // Bet on the two dozens that are NOT the trigger
        if (excludeDozen !== 1) bets.push({ type: 'dozen', value: 1, amount: amount });
        if (excludeDozen !== 2) bets.push({ type: 'dozen', value: 2, amount: amount });
        if (excludeDozen !== 3) bets.push({ type: 'dozen', value: 3, amount: amount });
        
        return bets;
    };

    // --- 2. INITIALIZE STATE ---
    if (!state.phase) {
        state.phase = 'WAITING'; // Options: 'WAITING', 'LEVEL_1', 'LEVEL_2'
        state.triggerDozen = 0;  // The dozen repeating 3 times
    }

    // --- 3. PROCESS LAST SPIN RESULT ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastDozen = getDozen(lastSpin);

        if (state.phase === 'LEVEL_1') {
            // We bet AGAINST state.triggerDozen.
            // If result matches triggerDozen (or is 0), we LOST.
            if (lastDozen === state.triggerDozen || lastDozen === 0) {
                state.phase = 'LEVEL_2'; // Progression: Go to recovery level
            } else {
                state.phase = 'WAITING'; // Win: Reset
                state.triggerDozen = 0;
            }
        } else if (state.phase === 'LEVEL_2') {
            // Win or Loss at Level 2, we reset to Waiting (Stop Loss hit or Profit taken)
            state.phase = 'WAITING';
            state.triggerDozen = 0;
        }
    }

    // --- 4. CHECK FOR NEW TRIGGER (If Waiting) ---
    // Only look for a new trigger if we are not currently in a betting sequence
    if (state.phase === 'WAITING' && spinHistory.length >= 3) {
        // Look at the last 3 outcomes
        const h = spinHistory.slice(-3).map(getDozen);
        // [d1, d2, d3] -> d1 is oldest of the 3
        
        // If all 3 are the same non-zero dozen
        if (h[0] !== 0 && h[0] === h[1] && h[1] === h[2]) {
            state.phase = 'LEVEL_1';
            state.triggerDozen = h[0];
        }
    }

    // --- 5. EXECUTE STRATEGY ---
    if (state.phase === 'LEVEL_1') {
        return placeBets(state.triggerDozen, LEVEL_1_MULT);
    } else if (state.phase === 'LEVEL_2') {
        return placeBets(state.triggerDozen, LEVEL_2_MULT);
    }

    // No bets if WAITING
    return [];
}