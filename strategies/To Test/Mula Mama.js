
/**
 * STRATEGY: Mula Mama (by Chip / The Roulette Master)
 * * SOURCE:
 * - Video: "#1 GENIUS ROULETTE COMBO!" (https://www.youtube.com/watch?v=lDIBtcuS3G4)
 * - Channel: The Roulette Master
 * - Time: Strategy discussion begins around 15:54
 * * THE LOGIC:
 * 1. Placement: Places 9 Split bets (covering 18 numbers, approx 48% of the wheel).
 * 2. Coverage: The splits are chosen to distribute coverage evenly across the physical wheel sectors.
 * 3. The "Partial Win" Exception: The strategy specifically identifies the split involving Zero (0, 2) 
 * as a "Partial Win" or "No Reset" zone.
 * * THE PROGRESSION (Negative Martingale Variant):
 * 1. Base Bet: Starts at the table minimum for inside bets.
 * 2. On Loss: Double the bet amount on all 9 splits.
 * 3. On Standard Win (Any covered number EXCEPT 0 or 2): Reset to Base Bet.
 * 4. On Special Win (0 or 2): Do NOT reset. Maintain the current bet level for the next spin.
 * - The video states: "When we hit those wins... we do not reset, just continue on."
 * * THE GOAL:
 * - Grind short-term profit using a high bankroll ($2,000 recommended in video) to sustain 
 * the aggressive doubling during losing streaks.
 * - Stop Loss: Entire Bankroll (per video challenge) or simulator config limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & SETUP ---
    
    // Define the 9 Splits. 
    // Note: The video mentions a split covering 0/00/2. Since 'split' usually takes 2 numbers 
    // in standard simulators, we use [0, 2] as the "Special Split".
    // The other 8 are distributed to cover the board.
    const splits = [
        [0, 2],   // The "Special" Split (Partial Win)
        [5, 8], 
        [10, 11], 
        [13, 16], 
        [17, 20], 
        [23, 24], 
        [27, 30], 
        [33, 36],
        [14, 15]  // 9th split to reach 18 numbers
    ];

    // Numbers that trigger the "Don't Reset" rule
    const specialNumbers = [0, 2]; // 00 should be added here if the simulator supports it

    const minBet = config.betLimits.min;
    const maxBet = config.betLimits.max;

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.multiplier = 1;      // Current Martingale multiplier
        state.currentBet = minBet; // Actual currency amount
        state.logs = [];           // Buffer for logs
        state.totalWins = 0;
        state.totalLosses = 0;
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS SPIN ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Helper to check if a number is covered by our splits
        let isWin = false;
        for (const pair of splits) {
            if (pair.includes(lastNum)) {
                isWin = true;
                break;
            }
        }

        // Determine Progression
        if (isWin) {
            state.totalWins++;
            // Check for Special "No Reset" Win (0 or 2)
            if (specialNumbers.includes(lastNum)) {
                // Video Logic: "When we hit 0 or 2... we do not reset."
                // We stay at the current multiplier.
                state.logs.push(`Spin ${spinHistory.length}: Won on Special (0/2). Holding bet at $${state.currentBet}.`);
            } else {
                // Standard Win: Reset to base
                state.multiplier = 1;
                state.logs.push(`Spin ${spinHistory.length}: Standard Win. Resetting to base.`);
            }
        } else {
            state.totalLosses++;
            // Loss: Double the bet
            state.multiplier *= 2;
            state.logs.push(`Spin ${spinHistory.length}: Loss. Doubling multiplier to ${state.multiplier}x.`);
        }
    }

    // --- 4. CALCULATE BET AMOUNT ---
    
    // Calculate raw amount
    let rawAmount = minBet * state.multiplier;

    // Clamp to Limits
    // 1. Ensure it doesn't exceed table max
    // 2. Ensure it doesn't exceed bankroll / 9 (since we place 9 bets)
    //    (Optional safety check to prevent erroring out if low on funds)
    const maxAffordable = Math.floor(bankroll / 9);
    let finalAmount = Math.min(rawAmount, maxBet, maxAffordable);

    // If we hit the table limit, we cap it but log a warning (Martingale is broken)
    if (finalAmount < rawAmount) {
        state.logs.push(`WARNING: Progression capped by limit/bankroll. Wanted: ${rawAmount}, Placed: ${finalAmount}`);
    }

    // Stop betting if we can't afford the minimum on all 9 splits
    if (finalAmount < minBet) {
        state.logs.push("Bankroll too low to continue strategy.");
        return []; 
    }

    // Update state for next turn comparison
    state.currentBet = finalAmount;

    // --- 5. LOGGING (PERIODIC SAVE) ---
    // Save every 50 spins to avoid network congestion
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        const logContent = state.logs.join('\n');
        // Clear buffer after saving to save memory
        utils.saveFile(`mula_mama_log_${Date.now()}.txt`, logContent);
        state.logs = []; 
    }

    // --- 6. CONSTRUCT BETS ---
    
    // map the splits array to bet objects
    const bets = splits.map(pair => {
        return {
            type: 'split',
            value: pair,
            amount: finalAmount
        };
    });

    return bets;

}