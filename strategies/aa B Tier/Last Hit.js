<<<<<<< HEAD
/**
 * STRATEGY: Last Hit (System 2)
 * * SOURCE:
 * - Video: https://www.youtube.com/watch?v=Z8qbVsscTTw (System 2)
 * - Channel: Roulette Master
 * * THE LOGIC:
 * - This is a "Counter-Trend" strategy based on the gambler's fallacy that a result is less likely to repeat immediately.
 * - Trigger: Identifies the Dozen (1st, 2nd, or 3rd) that won in the previous spin.
 * - Condition: Requires at least one past spin to identify the "Last Hit".
 * - The Bet: Place bets on the OTHER two Dozens (e.g., if Dozen 1 hit, bet on Dozen 2 and Dozen 3).
 * * THE PROGRESSION (Aggressive Recovery):
 * - On Win: Decrease bet size by 1 unit (to a minimum of 1).
 * - On Loss: Increase bet size by 2 units. 
 * (Note: This +2 ramp-up is very aggressive and was the cause of the bankroll depletion in the source video).
 * * THE GOAL:
 * - Quick accumulation of small wins (covering ~64% of the board).
 * - WARNING: This strategy failed in the source video due to a streak of repeating dozens.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    
    // Define the base betting unit based on table limits for Outside bets
    const baseUnit = config.betLimits.minOutside; 

    // Initialize state if this is the first spin
    if (!state.initialized) {
        state.currentUnit = 1;          // Start with 1 base unit
        state.lastTargetDozen = null;   // The dozen we just avoided
        state.spinCount = 0;            // For periodic logging
        state.initialized = true;
    }

    // Helper to determine which Dozen a number belongs to (returns 1, 2, 3, or null for 0)
    const getDozen = (num) => {
        if (num === 0 || num === '00') return null;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    };

    // --- 2. ANALYZE PREVIOUS SPIN & UPDATE PROGRESSION ---

    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDozenResult = getDozen(lastNum);

        // Did we have a bet active?
        if (state.lastBetActive) {
            // We win if the result was NOT the dozen we avoided (and not Zero)
            // We bet on 2 Dozens. If the result is one of them, we win.
            // Simplified: We lost if the result matches the 'lastTargetDozen' OR is Zero.
            
            let isWin = false;
            
            // If result is 0, it's always a loss for Dozen bets
            if (lastDozenResult !== null) {
                // If the result is NOT the target we avoided, we hit one of our 2 bets.
                if (lastDozenResult !== state.lastTargetDozen) {
                    isWin = true;
                }
            }

            // Apply Progression Rules
            if (isWin) {
                // Win: Decrease by 1 unit (Min 1)
                state.currentUnit = Math.max(1, state.currentUnit - 1);
            } else {
                // Loss: Increase by 2 units (Aggressive)
                state.currentUnit += 2;
            }
        }
    }

    // --- 3. DETERMINE NEXT TARGET ---

    // We need to find the "Last Hit" dozen to avoid.
    // If the last number was 0, we look back to the spin before that, 
    // or keep the previous target. Here we look for the most recent non-zero dozen.
    
    let targetDozenToAvoid = null;
    
    // Reverse loop to find the last valid Dozen
    for (let i = spinHistory.length - 1; i >= 0; i--) {
        const d = getDozen(spinHistory[i].winningNumber);
        if (d !== null) {
            targetDozenToAvoid = d;
            break;
        }
    }

    // If we haven't seen a Dozen yet (start of game or only Zeros), we cannot bet.
    if (targetDozenToAvoid === null) {
        state.lastBetActive = false;
        return []; // Skip bet
    }

    // --- 4. CALCULATE BET AMOUNTS ---

    // Calculate raw amount
    let rawAmount = state.currentUnit * baseUnit;

    // CLAMP TO LIMITS (Crucial Requirement)
    // 1. Ensure >= Table Minimum
    let finalAmount = Math.max(rawAmount, config.betLimits.minOutside);
    // 2. Ensure <= Table Maximum
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // --- 5. CONSTRUCT BETS ---

    // Identify the two dozens to bet on (All dozens [1,2,3] minus the Target)
    const dozensToBet = [1, 2, 3].filter(d => d !== targetDozenToAvoid);
    
    const bets = dozensToBet.map(d => ({
        type: 'dozen',
        value: d,
        amount: finalAmount
    }));

    // Update state for next spin analysis
    state.lastTargetDozen = targetDozenToAvoid;
    state.lastBetActive = true;

    // --- 6. LOGGING (Periodically) ---
    
    state.spinCount++;
    if (state.spinCount % 50 === 0) { // Save every 50 spins
        const logData = `Spin: ${state.spinCount} | Avoided: Dozen ${targetDozenToAvoid} | Unit: ${state.currentUnit} | Bet: ${finalAmount}\n`;
        
        utils.saveFile("last-hit-strategy-log.txt", logData)
            .then(() => {}) // Silent success
            .catch(err => console.error("Log save failed:", err));
    }

    return bets;
=======
/**
 * STRATEGY: Last Hit (System 2)
 * * SOURCE:
 * - Video: https://www.youtube.com/watch?v=Z8qbVsscTTw (System 2)
 * - Channel: Roulette Master
 * * THE LOGIC:
 * - This is a "Counter-Trend" strategy based on the gambler's fallacy that a result is less likely to repeat immediately.
 * - Trigger: Identifies the Dozen (1st, 2nd, or 3rd) that won in the previous spin.
 * - Condition: Requires at least one past spin to identify the "Last Hit".
 * - The Bet: Place bets on the OTHER two Dozens (e.g., if Dozen 1 hit, bet on Dozen 2 and Dozen 3).
 * * THE PROGRESSION (Aggressive Recovery):
 * - On Win: Decrease bet size by 1 unit (to a minimum of 1).
 * - On Loss: Increase bet size by 2 units. 
 * (Note: This +2 ramp-up is very aggressive and was the cause of the bankroll depletion in the source video).
 * * THE GOAL:
 * - Quick accumulation of small wins (covering ~64% of the board).
 * - WARNING: This strategy failed in the source video due to a streak of repeating dozens.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    
    // Define the base betting unit based on table limits for Outside bets
    const baseUnit = config.betLimits.minOutside; 

    // Initialize state if this is the first spin
    if (!state.initialized) {
        state.currentUnit = 1;          // Start with 1 base unit
        state.lastTargetDozen = null;   // The dozen we just avoided
        state.spinCount = 0;            // For periodic logging
        state.initialized = true;
    }

    // Helper to determine which Dozen a number belongs to (returns 1, 2, 3, or null for 0)
    const getDozen = (num) => {
        if (num === 0 || num === '00') return null;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    };

    // --- 2. ANALYZE PREVIOUS SPIN & UPDATE PROGRESSION ---

    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDozenResult = getDozen(lastNum);

        // Did we have a bet active?
        if (state.lastBetActive) {
            // We win if the result was NOT the dozen we avoided (and not Zero)
            // We bet on 2 Dozens. If the result is one of them, we win.
            // Simplified: We lost if the result matches the 'lastTargetDozen' OR is Zero.
            
            let isWin = false;
            
            // If result is 0, it's always a loss for Dozen bets
            if (lastDozenResult !== null) {
                // If the result is NOT the target we avoided, we hit one of our 2 bets.
                if (lastDozenResult !== state.lastTargetDozen) {
                    isWin = true;
                }
            }

            // Apply Progression Rules
            if (isWin) {
                // Win: Decrease by 1 unit (Min 1)
                state.currentUnit = Math.max(1, state.currentUnit - 1);
            } else {
                // Loss: Increase by 2 units (Aggressive)
                state.currentUnit += 2;
            }
        }
    }

    // --- 3. DETERMINE NEXT TARGET ---

    // We need to find the "Last Hit" dozen to avoid.
    // If the last number was 0, we look back to the spin before that, 
    // or keep the previous target. Here we look for the most recent non-zero dozen.
    
    let targetDozenToAvoid = null;
    
    // Reverse loop to find the last valid Dozen
    for (let i = spinHistory.length - 1; i >= 0; i--) {
        const d = getDozen(spinHistory[i].winningNumber);
        if (d !== null) {
            targetDozenToAvoid = d;
            break;
        }
    }

    // If we haven't seen a Dozen yet (start of game or only Zeros), we cannot bet.
    if (targetDozenToAvoid === null) {
        state.lastBetActive = false;
        return []; // Skip bet
    }

    // --- 4. CALCULATE BET AMOUNTS ---

    // Calculate raw amount
    let rawAmount = state.currentUnit * baseUnit;

    // CLAMP TO LIMITS (Crucial Requirement)
    // 1. Ensure >= Table Minimum
    let finalAmount = Math.max(rawAmount, config.betLimits.minOutside);
    // 2. Ensure <= Table Maximum
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // --- 5. CONSTRUCT BETS ---

    // Identify the two dozens to bet on (All dozens [1,2,3] minus the Target)
    const dozensToBet = [1, 2, 3].filter(d => d !== targetDozenToAvoid);
    
    const bets = dozensToBet.map(d => ({
        type: 'dozen',
        value: d,
        amount: finalAmount
    }));

    // Update state for next spin analysis
    state.lastTargetDozen = targetDozenToAvoid;
    state.lastBetActive = true;

    // --- 6. LOGGING (Periodically) ---
    
    state.spinCount++;
    if (state.spinCount % 50 === 0) { // Save every 50 spins
        const logData = `Spin: ${state.spinCount} | Avoided: Dozen ${targetDozenToAvoid} | Unit: ${state.currentUnit} | Bet: ${finalAmount}\n`;
        
        utils.saveFile("last-hit-strategy-log.txt", logData)
            .then(() => {}) // Silent success
            .catch(err => console.error("Log save failed:", err));
    }

    return bets;
>>>>>>> origin/main
}