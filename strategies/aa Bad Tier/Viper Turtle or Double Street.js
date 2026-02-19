
/**
 * STRATEGY: Viper Turtle / Double Street System
 * * SOURCE:
 * Video: "I Ran It Again… Still 0 Losses!"
 * Channel: CEG Dealer School / Roulette Strategy
 * URL: https://www.youtube.com/watch?v=AEbYOsLhMig
 * * THE LOGIC:
 * 1. Coverage: This strategy covers 24 numbers using 4 "Double Street" (Line) bets.
 * - The selected lines cover numbers 1-24 (Lines starting at 1, 7, 13, 19).
 * - This provides ~64.8% coverage.
 * 2. Trigger (Virtual Filtering): 
 * - The system waits for "Virtual Misses" to improve entry timing.
 * - It monitors the wheel. If the ball lands on the un-bet numbers (25-36 or 0) X times in a row, it triggers the real bets.
 * - Default setting implemented here: Wait for 2 consecutive virtual losses before entering.
 * * THE PROGRESSION (Recovery):
 * - Status: Active after the trigger condition is met.
 * - Base Bet: 1 Unit on each of the 4 lines.
 * - On Win: Take profit immediately and return to "Virtual Waiting" mode (Hit and Run).
 * - On Loss: Increase the bet by 1 Unit per line on the next spin.
 * - Reset: Once a win occurs during the progression, reset everything and go back to waiting.
 * * THE GOAL:
 * - Micro-compounding small wins.
 * - Target: The strategy aims to secure the win, clear the progression, and exit the market back to safety.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & SETUP ---

    // Define the 4 Double Streets (Lines) we want to bet on.
    // Values represent the starting number of the 6-number line.
    // 1 (1-6), 7 (7-12), 13 (13-18), 19 (19-24).
    const targetLines = [1, 7, 13, 19];
    
    // Numbers covered by these lines (1 to 24)
    const coveredNumbers = Array.from({length: 24}, (_, i) => i + 1);

    // Settings
    const triggerThreshold = 2; // How many virtual losses in a row before betting?
    const baseUnit = config.betLimits.min; // Use table minimum for Inside bets

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.initialized = true;
        state.mode = 'VIRTUAL'; // Modes: 'VIRTUAL' or 'ACTIVE'
        state.virtualLossStreak = 0;
        state.currentUnit = 1;
        state.totalWins = 0;
        state.totalLosses = 0;
        state.logBuffer = []; // Store logs here to save periodically
    }

    // --- 3. PROCESS LAST SPIN (Update Logic) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Did the last number hit our target zone (1-24)?
        const isWin = coveredNumbers.includes(lastNum);

        // LOGIC BRANCH: Are we virtually tracking or actually betting?
        if (state.mode === 'VIRTUAL') {
            if (!isWin) {
                // It was a miss (25-36 or 0)
                state.virtualLossStreak++;
                state.logBuffer.push(`Spin ${spinHistory.length}: Virtual Miss #${state.virtualLossStreak} (Num: ${lastNum})`);
                
                // Check Trigger
                if (state.virtualLossStreak >= triggerThreshold) {
                    state.mode = 'ACTIVE';
                    state.currentUnit = 1; // Start with 1 unit
                    state.logBuffer.push(`>>> TRIGGER HIT: Switching to ACTIVE betting.`);
                }
            } else {
                // It was a virtual win, reset the streak
                state.virtualLossStreak = 0;
            }
        } 
        else if (state.mode === 'ACTIVE') {
            if (isWin) {
                // REAL WIN
                state.totalWins++;
                state.logBuffer.push(`Spin ${spinHistory.length}: WIN! Profit taken. Resetting to VIRTUAL.`);
                
                // Reset Strategy
                state.mode = 'VIRTUAL';
                state.virtualLossStreak = 0;
                state.currentUnit = 1;
            } else {
                // REAL LOSS
                state.totalLosses++;
                // Progression: Increase bet by 1 unit
                state.currentUnit++; 
                state.logBuffer.push(`Spin ${spinHistory.length}: LOSS. Increasing unit to ${state.currentUnit}.`);
            }
        }
    }

    // --- 4. PERIODIC LOGGING (Save File) ---
    // Save every 50 spins to avoid performance/network issues
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        const logContent = state.logBuffer.join('\n');
        // We use a timestamp in the filename to prevent overwriting if desired, 
        // or just append. Here we just overwrite/update a session log.
        utils.saveFile("viper_strategy_log.txt", logContent)
            .then(() => { /* Save successful */ })
            .catch(err => { console.error("Save failed", err); });
            
        // Optional: Clear buffer after save to keep memory low, 
        // or keep it if you want one massive file at the end. 
        // Let's clear it to simulate a stream.
        state.logBuffer = []; 
    }

    // --- 5. BET PLACEMENT ---

    // If we are in VIRTUAL mode, we place no bets.
    if (state.mode === 'VIRTUAL') {
        return [];
    }

    // If we are in ACTIVE mode, we place bets on the 4 lines.
    const bets = [];

    // Calculate Amount per Line
    let betAmount = baseUnit * state.currentUnit;

    // CLAMPING: Respect Table Limits
    // 1. Ensure >= Minimum
    betAmount = Math.max(betAmount, config.betLimits.min);
    
    // 2. Ensure <= Maximum
    // Note: config.betLimits.max is usually the max *per spot*.
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Create the bet objects
    for (const lineStart of targetLines) {
        bets.push({
            type: 'line', // Double Street
            value: lineStart,
            amount: betAmount
        });
    }

    return bets;

}