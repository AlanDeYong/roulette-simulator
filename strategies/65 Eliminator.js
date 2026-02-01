/**
 * Strategy: The 65 Eliminator (by Todd Hoover)
 * Source: YouTube - The Roulette Master (https://www.youtube.com/watch?v=qhuHJOhKxf4)
 *
 * THE LOGIC:
 * 1. Start by selecting 6 Streets (covering 18 numbers).
 * 2. Place a base unit bet on each of the 6 Streets.
 *
 * THE PROGRESSION:
 * - ON WIN:
 * a) Remove the specific Street that just won (reduce coverage).
 * b) Keep the bet amount the same on the remaining Streets.
 * c) Continue spinning until you lose or decide to reset.
 * - ON LOSS:
 * a) Increase the bet on ALL currently active Streets by 1 unit.
 * b) Do NOT double/Martingale. Just add +1 unit to the current bet level.
 * - RESET:
 * a) After a successful run (profit target hit) or if desired, reset to the initial 6 Streets at base unit.
 * b) In this implementation, we reset if we run out of streets (all removed) or hit a profit goal per session.
 *
 * THE GOAL:
 * - Quick daily profit (e.g., +$200) then stop or reset.
 * - This script resets automatically after clearing a "session" (winning heavily) to allow continuous play.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPERS ---
    const TARGET_PROFIT_PER_SESSION = 200; // Reset after making this much profit in a 'session'
    const TOTAL_STREETS_TO_PICK = 6;

    // Helper: Generate all 12 valid streets (start numbers: 1, 4, 7... 34)
    const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    // Helper: Check if a number is in a specific street
    // A street starts at 's' and covers s, s+1, s+2
    const isHit = (number, streetStart) => number >= streetStart && number <= streetStart + 2;

    // --- 2. INITIALIZE STATE ---
    if (!state.initialized) {
        state.baseUnit = config.betLimits.min; // Use table min for inside bets
        state.currentUnit = state.baseUnit;    // Current bet amount per street
        state.activeStreets = [];              // Array of street start numbers
        state.sessionStartBankroll = bankroll; // To track session profit
        state.logData = "";
        state.initialized = true;
        
        // Pick initial streets
        state.activeStreets = pickRandomStreets(TOTAL_STREETS_TO_PICK);
    }

    // Helper to pick N random unique streets
    function pickRandomStreets(count) {
        // Shuffle a copy of ALL_STREETS
        const shuffled = [...ALL_STREETS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // --- 3. PROCESS LAST SPIN ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Determine if we won or lost based on our active streets
        let wonStreet = null;

        // Check if the winning number hit any of our active streets
        for (const streetStart of state.activeStreets) {
            if (isHit(lastNum, streetStart)) {
                wonStreet = streetStart;
                break;
            }
        }

        if (wonStreet !== null) {
            // === WIN LOGIC ===
            // Remove the winning street from the active list ("Eliminator")
            state.activeStreets = state.activeStreets.filter(s => s !== wonStreet);
            
            // Bet amount stays the same (unless we reset)
            
            // Log
            state.logData += `WIN on ${lastNum}. Removed Street ${wonStreet}. Active: ${state.activeStreets.length}\n`;

            // Check if we cleared all streets or hit profit target
            const currentSessionProfit = bankroll - state.sessionStartBankroll;
            if (state.activeStreets.length === 0 || currentSessionProfit >= TARGET_PROFIT_PER_SESSION) {
                state.logData += `Session Goal Met (Profit: ${currentSessionProfit} or Cleared Board). RESETTING.\n`;
                state.activeStreets = pickRandomStreets(TOTAL_STREETS_TO_PICK);
                state.currentUnit = state.baseUnit;
                state.sessionStartBankroll = bankroll;
            }

        } else {
            // === LOSS LOGIC ===
            // Increase bet by 1 unit on ALL active streets
            state.currentUnit += state.baseUnit;
            state.logData += `LOSS on ${lastNum}. Increased unit to ${state.currentUnit}\n`;
        }
    }

    // --- 4. SAFETY & LIMITS ---
    // Clamp the bet amount to table limits
    let finalAmount = state.currentUnit;
    
    // Ensure min
    finalAmount = Math.max(finalAmount, config.betLimits.min);
    
    // Ensure max. Note: config.betLimits.max is usually per bet position.
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // Stop if bankroll is too low to place all bets
    const totalNeeded = finalAmount * state.activeStreets.length;
    if (bankroll < totalNeeded) {
        state.logData += `Bankroll too low (${bankroll}) for required bets (${totalNeeded}). Stopping.\n`;
        return []; 
    }

    // --- 5. LOGGING ---
    // Save logs every 50 spins
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        utils.saveFile("65_eliminator_log.txt", state.logData);
        state.logData = ""; // Clear buffer after save
    }

    // --- 6. PLACE BETS ---
    // Map active streets to bet objects
    // Type 'street' expects the start number as 'value'
    const bets = state.activeStreets.map(streetStart => {
        return {
            type: 'street',
            value: streetStart,
            amount: finalAmount
        };
    });

    return bets;
}