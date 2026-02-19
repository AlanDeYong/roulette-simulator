
/**
 * Strategy: 4 Double Street Pong
 * * Source: 
 * Video: "AMAZING NEW 4 DOUBLE STREET PONG ROULETTE!"
 * Channel: The Roulette Master
 * URL: https://www.youtube.com/watch?v=N9XcqZtyFwc&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=4
 * * The Logic:
 * - Covers 24 numbers using 4 "Double Street" (Line) bets.
 * - A Double Street covers 6 consecutive numbers (e.g., 1-6, 7-12).
 * - There are 6 possible Double Street positions on the board.
 * - We bet on 4 of them simultaneously.
 * * The Progression & Triggers:
 * 1. LOSS:
 * - Increase the bet size by 1 unit on all 4 positions.
 * - Keep the positions the same.
 * 2. WIN (But NOT in Cycle Profit):
 * - "Pong" (Shift) all bets one position to the right (cyclic).
 * - Maintain the current bet size (do not reset, do not increase).
 * - This changes the coverage area while recovering.
 * 3. WIN (Reached New Cycle Profit):
 * - Reset bet size to the base unit.
 * - Reset positions to the starting default.
 * - Update the "Cycle Start Bankroll" to the current bankroll to lock in profit.
 * * The Goal:
 * - Grind out small profits by covering ~65% of the board.
 * - Use the shift mechanic to avoid getting stuck on "cold" sectors during recovery.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const DOUBLE_STREET_VALUES = [1, 7, 13, 19, 25, 31]; // The 6 possible line bets
    const UNIT = config.betLimits.min; // Use 'min' for Line bets (Inside/Line)
    
    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.betAmount = UNIT;
        // Indices of the 6 Double Streets we are currently betting on. 
        // Default: First 4 (1, 7, 13, 19)
        state.currentIndices = [0, 1, 2, 3]; 
        state.cycleStartBankroll = bankroll;
        state.totalWins = 0;
        state.totalLosses = 0;
        state.initialized = true;
        // Log initialization
        state.logs = [`INIT: Bankroll ${bankroll}, Unit ${UNIT}`];
    }

    // --- 3. PROCESS PREVIOUS SPIN (If any) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastBetCost = state.lastTotalBet || 0;
        
        // We can't rely solely on bankroll diff if external factors exist, 
        // but typically: Won = (Current - (Prev - Cost)) > Cost? 
        // Simpler: Did bankroll go up relative to before the payout?
        // Let's rely on standard comparison:
        const prevBankroll = state.lastBankroll || bankroll;
        const wonSpin = bankroll > prevBankroll;

        if (wonSpin) {
            state.totalWins++;
            
            // CHECK: Are we in a "New Session Profit" (Cycle Profit)?
            if (bankroll > state.cycleStartBankroll) {
                // --- WIN & PROFIT: RESET ---
                state.logs.push(`WIN (Profit): Resetting. Bankroll ${bankroll} > Start ${state.cycleStartBankroll}`);
                state.betAmount = UNIT;
                state.currentIndices = [0, 1, 2, 3]; // Reset positions
                state.cycleStartBankroll = bankroll; // Lock in new high
            } else {
                // --- WIN (Recovery): PONG/SHIFT ---
                state.logs.push(`WIN (Recovery): Shifting. Bankroll ${bankroll} <= Start ${state.cycleStartBankroll}`);
                // Shift all indices by 1, wrapping around 6
                state.currentIndices = state.currentIndices.map(i => (i + 1) % 6);
                // Bet amount stays the same
            }
        } else {
            // --- LOSS: INCREASE ---
            state.totalLosses++;
            state.logs.push(`LOSS: Increasing bet. Bankroll ${bankroll}`);
            state.betAmount += UNIT;
        }
    }

    // --- 4. CLAMP BET LIMITS ---
    // Ensure we don't exceed table max or go below min
    state.betAmount = Math.max(state.betAmount, config.betLimits.min);
    state.betAmount = Math.min(state.betAmount, config.betLimits.max);

    // --- 5. GENERATE BETS ---
    const bets = state.currentIndices.map(index => {
        return {
            type: 'line', // Double Street
            value: DOUBLE_STREET_VALUES[index],
            amount: state.betAmount
        };
    });

    // --- 6. UPDATE STATE FOR NEXT TURN ---
    state.lastBankroll = bankroll;
    state.lastTotalBet = bets.reduce((sum, b) => sum + b.amount, 0);

    // --- 7. LOGGING (PERIODIC SAVE) ---
    // Save logs to file every 50 spins to avoid IO congestion
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        const logContent = state.logs.join('\n');
        // Clear logs after saving to prevent huge memory usage, or keep appending if preferred.
        // Here we'll clear to keep the object light, assuming the file is appended or unique.
        // Since utils.saveFile usually overwrites, we should probably keep a running log 
        // or formatting it as a status report. 
        // Let's save a status report.
        const statusReport = `
=== STRATEGY STATUS (Spin ${spinHistory.length}) ===
Bankroll: ${bankroll}
Cycle Start: ${state.cycleStartBankroll}
Current Bet Unit: ${state.betAmount}
Current Positions: ${state.currentIndices.map(i => DOUBLE_STREET_VALUES[i])}
Wins: ${state.totalWins}
Losses: ${state.totalLosses}
Recent Logs:
${state.logs.slice(-20).join('\n')}
        `;
        
        utils.saveFile(`pong_strategy_log_${Date.now()}.txt`, statusReport)
            .catch(err => console.error("Save failed", err));
            
        // Keep logs array from growing infinitely
        if (state.logs.length > 200) state.logs = state.logs.slice(-50);
    }

    // Stop if bankroll is too low to cover the 4 bets
    if (bankroll < state.lastTotalBet) {
        state.logs.push("BANKRUPT: Not enough funds for next bet.");
        return []; // Stop betting
    }

    return bets;

}