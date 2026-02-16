/**
 * BODIE'S TWO-LEVEL ROULETTE STRATEGY
 * * Source: "WORLD'S BEST ROULETTE SYSTEM!" by The Roulette Master
 * URL: https://www.youtube.com/watch?v=QzBjxZjrO1g
 * * --- STRATEGY LOGIC ---
 * * 1. THE TRIGGER:
 * - Wait for a number in the 2nd Dozen (13-24).
 * - If Trigger is 13-18 (Low side of 2nd Doz): Target High (19-36) + 1st Dozen.
 * - If Trigger is 19-24 (High side of 2nd Doz): Target Low (1-18) + 3rd Dozen.
 * * 2. BETTING STRUCTURE (Standard Mode):
 * - Ratio is 3:2 (e.g., $30 on Even Chance, $20 on Dozen).
 * - In Standard Mode, the Dozen and Even Chance do NOT overlap.
 * (e.g., Bet 1-18 and Dozen 3). 
 * - Win Condition: You hit the Even Chance or the Dozen (small profit).
 * * 3. RECOVERY MODE (Triggered on Loss):
 * - If a total loss occurs (e.g., hitting the 2nd Dozen again or Zero):
 * 1. Move the Dozen bet to the *other* side to create an OVERLAP.
 * (e.g., If betting 1-18, move Dozen bet to 1st Dozen. Now 1-12 pays double).
 * 2. Increase bet size by adding one base unit to each position.
 * (e.g., $30/$20 becomes $60/$40).
 * * 4. RESET CONDITION:
 * - Reset to waiting for a trigger if we hit a "Double Win" (The Overlap) during recovery.
 * - Reset if we are actively betting and hit the triggering 2nd Dozen (Stop Loss/Reset logic).
 * * 5. BET SIZING NOTE:
 * - To maintain the video's $30/$20 ratio on a $5 table, we treat the 
 * 'minOutside' as 1/4th of the Dozen bet. 
 * - Base Bets calculated as: Dozen = 4 * minOutside, Even = 6 * minOutside.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- CONFIGURATION & HELPER FUNCTIONS ---
    
    // We establish a base unit relative to the table minimum to maintain the 3:2 ratio
    // If minOutside is 5: Dozen Base = 20, Even Base = 30.
    const UNIT_SCALE = config.betLimits.minOutside || 5;
    const BASE_DOZEN_MULT = 4;
    const BASE_EVEN_MULT = 6;

    const getDozen = (num) => {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    };

    // Helper to clamp bets within table limits
    const clampBet = (amount) => {
        return Math.max(
            config.betLimits.minOutside, 
            Math.min(amount, config.betLimits.max)
        );
    };

    // --- STATE INITIALIZATION ---
    if (!state.initialized) {
        state.stage = 'WAITING'; // 'WAITING', 'BETTING'
        state.progressionLevel = 1;
        state.recoveryMode = false; // False = No Overlap, True = Overlap
        state.targetEven = null; // 'low' or 'high'
        state.targetDozen = null; // 1 or 3
        state.initialized = true;
    }

    // --- HISTORY PROCESSING ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDozen = getDozen(lastNum);

        // LOGIC FOR ACTIVE BETTING SESSION
        if (state.stage === 'BETTING') {
            
            // Calculate hypothetical payout to determine if we won/lost/overlapped
            let wonEven = false;
            let wonDozen = false;

            if (state.targetEven === 'low' && lastNum >= 1 && lastNum <= 18) wonEven = true;
            if (state.targetEven === 'high' && lastNum >= 19 && lastNum <= 36) wonEven = true;
            if (getDozen(lastNum) === state.targetDozen) wonDozen = true;

            // 1. CHECK FOR DOUBLE WIN (OVERLAP HIT) OR SESSION PROFIT
            // In the video, hitting the overlap (Double Win) is the signal to reset.
            if (wonEven && wonDozen) {
                // We hit the "Sweet Spot" (e.g. hitting 3 while betting 1-18 and 1st Dozen)
                state.stage = 'WAITING';
                state.progressionLevel = 1;
                state.recoveryMode = false;
                return []; // End turn, wait for next trigger
            }
            
            // 2. CHECK FOR TOTAL LOSS -> TRIGGER RECOVERY
            else if (!wonEven && !wonDozen) {
                state.progressionLevel++;
                
                // If we weren't in recovery mode (Overlap) yet, switch to it now.
                // Video Logic: "Move it to first 12... so we can hit both."
                if (!state.recoveryMode) {
                    state.recoveryMode = true;
                    // Flip the Dozen to create overlap with the Even Chance
                    if (state.targetEven === 'low') state.targetDozen = 1; // Overlap on 1-12
                    else state.targetDozen = 3; // Overlap on 25-36
                }
            }
            
            // 3. CHECK FOR PARTIAL WIN (One hit, one miss)
            // Strategy usually stays flat or continues.
            // If we hit a partial win in recovery mode, we usually stay until we hit the double or bust.
            else {
               // No state change, just rebet same amount.
            }
        }
    }

    // --- TRIGGER LOGIC (If Waiting) ---
    if (state.stage === 'WAITING' && spinHistory.length > 0) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        
        // Trigger: A number in the 2nd Dozen (13-24)
        if (lastNum >= 13 && lastNum <= 24) {
            state.stage = 'BETTING';
            state.progressionLevel = 1;
            state.recoveryMode = false; // Start with standard (Separated) placement

            if (lastNum >= 13 && lastNum <= 18) {
                // Trigger: Low side of 2nd Doz -> Bet HIGH + Dozen 1
                state.targetEven = 'high';
                state.targetDozen = 1;
            } else {
                // Trigger: High side of 2nd Doz -> Bet LOW + Dozen 3
                state.targetEven = 'low';
                state.targetDozen = 3;
            }
        }
    }

    // --- BET CONSTRUCTION ---
    if (state.stage === 'BETTING') {
        const bets = [];

        // Calculate amounts based on progression level
        // Level 1: $30 / $20
        // Level 2: $60 / $40
        // Formula: Base * Progression
        const amountEven = clampBet((BASE_EVEN_MULT * UNIT_SCALE) * state.progressionLevel);
        const amountDozen = clampBet((BASE_DOZEN_MULT * UNIT_SCALE) * state.progressionLevel);

        // 1. Even Money Bet
        bets.push({
            type: state.targetEven, // 'low' or 'high'
            amount: amountEven
        });

        // 2. Dozen Bet
        bets.push({
            type: 'dozen',
            value: state.targetDozen,
            amount: amountDozen
        });

        return bets;
    }

    // If waiting for trigger
    return [];
}