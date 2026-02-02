/**
 * STRATEGY: High-Rise Streets (AI-Optimized Roulette Strategy)
 * * SOURCE: 
 * URL: https://www.youtube.com/watch?v=HlwrXu4i-og
 * Channel: CEG Dealer School (Strategy by AI)
 * * THE LOGIC:
 * This strategy focuses on increasing board coverage (win probability) rather than just 
 * aggressively increasing the bet amount. It uses a ladder progression that adds 
 * more "Streets" to the board as losses occur to recover easier.
 * * THE PROGRESSION (D'Alembert Ladder):
 * The strategy uses defined levels. 
 * - ON LOSS: Move UP one level (Increase coverage/risk).
 * - ON WIN: Move DOWN one level (Decrease coverage/risk).
 * - ON NEW PROFIT HIGH: Reset immediately to Level 1.
 * * LEVELS (Based on Unit Size, e.g., $1):
 * Level 1: 3 Streets (Cover 9 #'s) @ 1 Unit/ea. Total: 3 Units.
 * Level 2: 4 Streets (Cover 12 #'s) @ 1 Unit/ea. Total: 4 Units.
 * Level 3: 4 Streets (Cover 12 #'s) @ 2 Units/ea. Total: 8 Units.
 * Level 4: 5 Streets (Cover 15 #'s) @ 2 Units/ea. Total: 10 Units.
 * Level 5: 6 Streets (Cover 18 #'s) @ 2 Units/ea. Total: 12 Units.
 * Level 6: 7 Streets (Cover 21 #'s) @ 3 Units/ea. Total: 21 Units.
 * (Safety Cap: If Level 6 loses, it stays at Level 6 until a win or bust).
 * * THE GOAL:
 * Generate a consistent profit by hitting a "New Session High" in bankroll, 
 * at which point the risk resets to minimum.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    
    // Define the valid starting numbers for all 12 streets on the board
    const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    
    // Use the config minimum for Inside bets as our "1 Unit"
    const BASE_UNIT = config.betLimits.min; 

    // Define the progression ladder
    // count: Number of streets to bet
    // mul: Multiplier of the BASE_UNIT for each street
    const LADDER = [
        { count: 3, mul: 1 }, // Level 0 (Start)
        { count: 4, mul: 1 }, // Level 1
        { count: 4, mul: 2 }, // Level 2
        { count: 5, mul: 2 }, // Level 3
        { count: 6, mul: 2 }, // Level 4
        { count: 7, mul: 3 }  // Level 5 (Max aggressive)
    ];

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.currentLevel = 0;         // Start at bottom of ladder
        state.highWaterMark = bankroll; // Track highest bankroll to trigger resets
        state.lastBets = [];            // Store previous bets to determine win/loss
        state.logBuffer = "High-Rise Strategy Started.\n";
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS SPIN (Logic) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinNum = lastSpin.winningNumber;
        
        // Determine if we won the last round
        let wonLastRound = false;
        
        // We look at state.lastBets to see if we covered the winning number
        // A street covers: val, val+1, val+2
        if (state.lastBets && state.lastBets.length > 0) {
            for (let b of state.lastBets) {
                if (b.type === 'street') {
                    if (lastWinNum >= b.value && lastWinNum <= b.value + 2) {
                        wonLastRound = true;
                        break;
                    }
                }
            }
        }

        // Logic: Update Progression Level
        if (wonLastRound) {
            // Check for new High Water Mark (Net Profit High)
            if (bankroll > state.highWaterMark) {
                state.highWaterMark = bankroll;
                state.currentLevel = 0; // RESET on new profit high
                state.logBuffer += `[WIN] New High: ${bankroll}. Reset to Lvl 1.\n`;
            } else {
                // Standard Win: Step down ladder
                state.currentLevel = Math.max(0, state.currentLevel - 1);
                state.logBuffer += `[WIN] Step down to Lvl ${state.currentLevel + 1}.\n`;
            }
        } else {
            // Loss: Step up ladder
            state.currentLevel = Math.min(LADDER.length - 1, state.currentLevel + 1);
            state.logBuffer += `[LOSS] Step up to Lvl ${state.currentLevel + 1}.\n`;
        }
    }

    // --- 4. DETERMINE BET SIZE & COVERAGE ---
    
    // Get parameters for current level
    const levelParams = LADDER[state.currentLevel];
    
    // Calculate bet amount per street respecting limits
    let betPerStreet = BASE_UNIT * levelParams.mul;
    
    // CLAMP: Ensure bet is within config limits
    betPerStreet = Math.max(betPerStreet, config.betLimits.min);
    betPerStreet = Math.min(betPerStreet, config.betLimits.max);

    // --- 5. SELECT STREETS ---
    
    // Helper to shuffle array and pick N items (Fisher-Yates shuffle)
    // We randomize street selection to avoid pattern bias
    const shuffledStreets = [...ALL_STREETS];
    for (let i = shuffledStreets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledStreets[i], shuffledStreets[j]] = [shuffledStreets[j], shuffledStreets[i]];
    }
    
    // Select the first N streets based on level count
    const selectedStreets = shuffledStreets.slice(0, levelParams.count);

    // --- 6. CONSTRUCT BET OBJECTS ---
    const bets = selectedStreets.map(streetStartVal => {
        return {
            type: 'street',
            value: streetStartVal,
            amount: betPerStreet
        };
    });

    // Save bets to state for next spin analysis
    state.lastBets = bets;

    // --- 7. UTILS: LOGGING & PERSISTENCE ---
    
    // Periodically save logs to file (every 50 spins)
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        state.logBuffer += `--- Autosave at Spin ${spinHistory.length} ---\n`;
        // Fire and forget (don't await) to prevent blocking
        utils.saveFile("high-rise-log.txt", state.logBuffer)
            .catch(err => console.error("Log save failed", err));
        
        // Clear buffer to manage memory, keep last line for continuity if needed
        state.logBuffer = ""; 
    }

    return bets;
}