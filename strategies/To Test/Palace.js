/**
 * STRATEGY: The Palace Roulette System (by Tony Z)
 * * SOURCE:
 * Video: "(A MUST TRY) THE SUPER SAFE PALACE ROULETTE SYSTEM!"
 * Channel: The Roulette Master
 * URL: https://youtu.be/Ic2RJXN3TPw
 * * THE LOGIC:
 * This is a "coverage" strategy that builds a "Palace" around the center of the board.
 * It uses 8 units total to cover a significant portion of the wheel.
 * * THE BETS (8 Units Total Base):
 * 1. Line (Double Street): 10-15 (covers 10,11,12,13,14,15)
 * 2. Line (Double Street): 19-24 (covers 19,20,21,22,23,24)
 * 3. Street: 4-6
 * 4. Street: 28-30
 * 5. Split: 14-17
 * 6. Split: 17-20 (Creates a "Jackpot" overlap on 17)
 * 7. Corner: 11-12-14-15 (Connects the top line to the splits)
 * 8. Corner: 20-21-23-24 (Connects the bottom line to the splits)
 * * THE PROGRESSION (Conservative Ladder):
 * 1. Base Level: 1 unit per bet.
 * 2. On Win: Maintain current bet level.
 * 3. Reset Condition: If Bankroll >= Session High (Session Profit), reset to Base Level.
 * 4. Loss Condition: The strategy only increases bets after TWO consecutive losing spins.
 * - If 2 losses occur back-to-back, double the unit size (1 -> 2 -> 4 -> 8).
 * * THE GOAL:
 * Reach a new "Session Profit" (High Water Mark) and reset.
 * The video demonstrates a stop-win around +$133 relative to starting bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & SETUP ---
    // Define the base unit size based on table minimums
    const baseUnit = config.betLimits.min; 

    // Initialize State if this is the first spin
    if (state.highWaterMark === undefined) {
        state.highWaterMark = bankroll; // Track the highest bankroll achieved (Session Profit)
        state.multiplier = 1;           // Current bet multiplier (1x, 2x, 4x...)
        state.lossCounter = 0;          // Track consecutive losses
        state.lastBankroll = bankroll;  // To calculate profit/loss of previous spin
        state.logData = "";             // String buffer for logs
        state.totalSpins = 0;
    }

    // --- 2. ANALYZE PREVIOUS SPIN (If applicable) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastProfit = bankroll - state.lastBankroll;
        state.totalSpins++;

        // Log the result
        const logEntry = `Spin ${state.totalSpins}: ${lastSpin.winningNumber} (${lastSpin.winningColor}) | Profit: ${lastProfit} | Bankroll: ${bankroll} | Target: ${state.highWaterMark}\n`;
        state.logData += logEntry;

        if (lastProfit > 0) {
            // WIN LOGIC
            // Check if we reached a new session high
            if (bankroll >= state.highWaterMark) {
                state.highWaterMark = bankroll;
                state.multiplier = 1; // RESET to base
                state.lossCounter = 0;
            } else {
                // We won, but haven't recovered fully. 
                // Maintain current bet level, do not reset yet.
                // Reset loss counter because the streak of losses is broken
                state.lossCounter = 0;
            }
        } else {
            // LOSS LOGIC
            state.lossCounter++;
            
            // Progression Rule: Increase only after 2 consecutive losses
            if (state.lossCounter >= 2) {
                state.multiplier *= 2;
                state.lossCounter = 0; // Reset counter after increasing
            }
        }
    }

    // Update state for next comparison
    state.lastBankroll = bankroll;

    // --- 3. SAVE LOGS PERIODICALLY ---
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        utils.saveFile("palace_strategy_log.txt", state.logData)
            .then(() => console.log("Log saved."))
            .catch(err => console.error("Log save failed:", err));
        state.logData = ""; // Clear buffer after save
    }

    // --- 4. CONSTRUCT BETS ---
    // Calculate unit size respecting limits
    let currentUnit = baseUnit * state.multiplier;
    
    // Clamp unit to limits
    currentUnit = Math.max(currentUnit, config.betLimits.min);
    currentUnit = Math.min(currentUnit, config.betLimits.max);

    // Stop if bankroll is too low to place full spread
    if (bankroll < currentUnit * 8) {
        // Optional: Panic mode or stop betting. Here we return empty to stop.
        return []; 
    }

    // Define the 8 Bets of the Palace System
    const bets = [
        // 1. Double Street (Line) 10-15
        { type: 'line', value: 10, amount: currentUnit },
        
        // 2. Double Street (Line) 19-24
        { type: 'line', value: 19, amount: currentUnit },
        
        // 3. Street 4-6
        { type: 'street', value: 4, amount: currentUnit },
        
        // 4. Street 28-30
        { type: 'street', value: 28, amount: currentUnit },
        
        // 5. Split 14-17
        { type: 'split', value: [14, 17], amount: currentUnit },
        
        // 6. Split 17-20 (Overlaps 17)
        { type: 'split', value: [17, 20], amount: currentUnit },
        
        // 7. Corner 11-15 (11,12,14,15) - Top Connector
        // Note: Corner 'value' usually denotes the top-left number
        { type: 'corner', value: 11, amount: currentUnit },
        
        // 8. Corner 20-24 (20,21,23,24) - Bottom Connector
        { type: 'corner', value: 20, amount: currentUnit }
    ];

    return bets;
}