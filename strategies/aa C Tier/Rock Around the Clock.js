/**
 * Strategy: Rock Around the Clock (Lewis Wilberger)
 * Source: The Roulette Master (YouTube) - https://www.youtube.com/watch?v=wu2XAJi1Kxs
 *
 * THE LOGIC:
 * 1. Cycle through the 6 main Outside sectors in a specific order:
 * - Dozen 1 -> Dozen 2 -> Dozen 3 -> Column 1 -> Column 2 -> Column 3 -> (Loop back to Dozen 1)
 * 2. Stay on a specific sector for a maximum of 5 attempts.
 * 3. Triggers to move to the next sector:
 * - A WIN occurs on the current sector.
 * - OR the maximum of 5 attempts is reached (regardless of win/loss).
 *
 * THE PROGRESSION (Linear Aggressive):
 * - Start with a base bet (e.g., $3 or table minimum).
 * - Increase the bet size by a fixed 'step' amount (e.g., $2) after EVERY spin,
 * regardless of whether it was a win or a loss.
 * - This creates a linear progression ($3, $5, $7, $9, $11, $13...) designed to recover
 * losses and accumulate profit quickly once a streak hits.
 *
 * THE GOAL / RESET:
 * - Define a "Profit Target" (e.g., +$100).
 * - Once the current bankroll exceeds the (Session Start + Accumulated Targets),
 * RESET the bet amount back to the base unit.
 * - The position in the cycle (Sector) continues; it does not necessarily reset to Dozen 1.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. Configuration & Constants ---
    const BASE_UNIT = config.betLimits.minOutside; // Usually 5, video uses 3. We adhere to limits.
    const STEP_UNIT = 2; // Amount to increase bet by every spin
    const PROFIT_TARGET = 100; // Reset progression after gaining this much profit

    // Sector Definitions (The "Clock" Cycle)
    // Types: 'dozen' (val 1-3) or 'column' (val 1-3)
    const SECTORS = [
        { type: 'dozen', value: 1, name: '1st Dozen' },
        { type: 'dozen', value: 2, name: '2nd Dozen' },
        { type: 'dozen', value: 3, name: '3rd Dozen' },
        { type: 'column', value: 1, name: '1st Column' },
        { type: 'column', value: 2, name: '2nd Column' },
        { type: 'column', value: 3, name: '3rd Column' }
    ];

    // --- 2. State Initialization ---
    if (!state.initialized) {
        state.currentSectorIndex = 0; // Start at Dozen 1
        state.attemptsOnSector = 0;   // Track attempts (max 5)
        state.currentBetAmount = BASE_UNIT;
        state.sessionStartBankroll = bankroll;
        state.currentTargetBankroll = bankroll + PROFIT_TARGET;
        state.initialized = true;
    }

    // --- 3. Process Last Spin (if applicable) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastBetObj = state.lastBet; // Retrieve what we bet last time

        // Determine if we won the last specific bet
        let wonLastBet = false;
        if (lastBetObj) {
            // Helper to check win condition based on sector type
            const num = lastSpin.winningNumber;
            // Zero/Double Zero check (always loss for dozens/cols)
            if (num !== 0 && num !== 37 && num !== '00') {
                if (lastBetObj.type === 'dozen') {
                    if (lastBetObj.value === 1 && num >= 1 && num <= 12) wonLastBet = true;
                    if (lastBetObj.value === 2 && num >= 13 && num <= 24) wonLastBet = true;
                    if (lastBetObj.value === 3 && num >= 25 && num <= 36) wonLastBet = true;
                } else if (lastBetObj.type === 'column') {
                    if (lastBetObj.value === 1 && num % 3 === 1) wonLastBet = true;
                    if (lastBetObj.value === 2 && num % 3 === 2) wonLastBet = true;
                    if (lastBetObj.value === 3 && num % 3 === 0) wonLastBet = true;
                }
            }
        }

        // Logic A: Check Profit Target for Reset
        // If we hit the target, reset bet size, calculate next target
        if (bankroll >= state.currentTargetBankroll) {
            // console.log(`Target Hit! Bankroll: ${bankroll}. Resetting progression.`);
            state.currentBetAmount = BASE_UNIT;
            // Set next target (e.g. if we hit 2100, next target is 2200)
            state.currentTargetBankroll = bankroll + PROFIT_TARGET;
            // Note: In the video, he resets bet size but continues the cycle.
        } else {
            // If target not hit, INCREASE bet linear progression (Win or Loss)
            // Video logic: "Go up $2 on each spin"
            state.currentBetAmount += STEP_UNIT;
        }

        // Logic B: Move Sector Trigger
        // Move if we WON -OR- if we hit 5 attempts
        state.attemptsOnSector++;

        if (wonLastBet || state.attemptsOnSector >= 5) {
            // Move to next sector
            state.currentSectorIndex++;
            if (state.currentSectorIndex >= SECTORS.length) {
                state.currentSectorIndex = 0; // Loop back to start
            }
            state.attemptsOnSector = 0; // Reset attempts for new sector
        }
    }

    // --- 4. Validation & Clamping ---
    // Ensure bet is within config limits
    let finalAmount = state.currentBetAmount;
    finalAmount = Math.max(finalAmount, config.betLimits.minOutside);
    finalAmount = Math.min(finalAmount, config.betLimits.max);
    
    // Check if we can afford the bet
    if (finalAmount > bankroll) {
        finalAmount = bankroll; // All-in fallback
        // If bankroll is 0, simulation handles it, but we return empty to be safe
        if (finalAmount <= 0) return []; 
    }

    // --- 5. Construct Bet Object ---
    const targetSector = SECTORS[state.currentSectorIndex];
    
    // Store for next turn reference
    state.lastBet = targetSector; 

    return [{
        type: targetSector.type,
        value: targetSector.value,
        amount: finalAmount
    }];
}