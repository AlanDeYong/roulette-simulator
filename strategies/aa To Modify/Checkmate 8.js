
/**
 * STRATEGY: Checkmate 8
 * * SOURCE:
 * URL: https://www.youtube.com/watch?v=Lyh5ojLu35I
 * Channel: The Roulette Master
 * * * THE LOGIC:
 * This is a coverage strategy that bets on 8 specific "Splits" (a bet placed on the line between two numbers).
 * To balance color coverage and survive long streaks of one color, the strategy selects:
 * - 4 Red Splits (Splits connecting two Red numbers)
 * - 4 Black Splits (Splits connecting two Black numbers)
 * This covers 16 numbers total (approx. 43% of the wheel).
 * * * THE PROGRESSION:
 * - Martingale: The strategy uses a negative progression (doubling) on the *total* bet after a loss.
 * - Base: 1 unit per split.
 * - On Loss: Double the unit per split (1 -> 2 -> 4 -> 8 -> 16 -> 32 -> 64).
 * - On Win: Reset immediately to the base unit (1).
 * - Max Levels: Typically capped at 7 levels (approx. 128 units total risk) or table max.
 * * * THE GOAL:
 * - Target Profit: Secure consistent small wins with high coverage.
 * - Stop Loss: Recommended cash out at $200-$250 profit (approx 20-25% of bankroll), or if the 7th progression level fails.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION ---

    // Define the 8 Specific Splits (Same-color pairs)
    // 4 Red Splits: [9,12], [16,19], [18,21], [27,30]
    // 4 Black Splits: [8,11], [10,13], [17,20], [26,29]
    const TARGET_SPLITS = [
        [9, 12], [16, 19], [18, 21], [27, 30], // Red
        [8, 11], [10, 13], [17, 20], [26, 29]  // Black
    ];

    // Progression Multipliers (Standard Martingale)
    // Level 0 = 1 unit, Level 1 = 2 units, etc.
    const MAX_LEVELS = 7; 

    // Determine Base Unit (Inside Bet Minimum)
    const BASE_UNIT = config.betLimits.min; 
    const MAX_BET_PER_SPOT = config.betLimits.max;

    // --- 2. STATE INITIALIZATION ---

    if (!state.initialized) {
        state.currentLevel = 0;       // Progression level (0 to MAX_LEVELS)
        state.totalWins = 0;
        state.totalLosses = 0;
        state.logBuffer = [];         // For periodic saving
        state.lastBetAmount = 0;      // To track previous risk
        state.initialized = true;
    }

    // --- 3. ANALYZE PREVIOUS RESULT ---

    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Determine if we won the last spin
        // We win if the winning number is contained in ANY of our target splits
        // Since we bet on all 8 splits every time, we just check if the number is in the set.
        const coveredNumbers = TARGET_SPLITS.flat(); // Flatten [[9,12],...] to [9,12,16...]
        const wonLast = coveredNumbers.includes(winningNum);

        if (wonLast) {
            // WIN: Reset Progression
            state.currentLevel = 0;
            state.totalWins++;
            state.logBuffer.push(`Spin ${spinHistory.length}: WIN (${winningNum}). Reset to Level 0.`);
        } else {
            // LOSS: Increase Progression
            // Only increase if we actually made a bet last time (handle first spin logic)
            if (state.lastBetAmount > 0) {
                state.currentLevel++;
                state.totalLosses++;
                
                // Check if we exceeded max levels (Stop Loss / Reset)
                if (state.currentLevel >= MAX_LEVELS) {
                    state.currentLevel = 0;
                    state.logBuffer.push(`Spin ${spinHistory.length}: LOSS (${winningNum}). Max Level Reached. Resetting.`);
                } else {
                    state.logBuffer.push(`Spin ${spinHistory.length}: LOSS (${winningNum}). Increasing to Level ${state.currentLevel}.`);
                }
            }
        }
    }

    // --- 4. CALCULATE BETS ---

    // Calculate multiplier: 2^level (1, 2, 4, 8...)
    const multiplier = Math.pow(2, state.currentLevel);
    
    // Calculate raw amount per split
    let amountPerSplit = BASE_UNIT * multiplier;

    // --- 5. CLAMP TO LIMITS ---

    // Ensure we don't breach table maximum for a single bet
    amountPerSplit = Math.min(amountPerSplit, MAX_BET_PER_SPOT);
    
    // Ensure we meet minimum (already handled by BASE_UNIT, but good safety)
    amountPerSplit = Math.max(amountPerSplit, config.betLimits.min);

    // Track total risk for next turn logic
    state.lastBetAmount = amountPerSplit * TARGET_SPLITS.length;

    // Generate Bet Objects
    const bets = TARGET_SPLITS.map(splitPair => {
        return {
            type: 'split',
            value: splitPair,
            amount: amountPerSplit
        };
    });

    // --- 6. UTILS & LOGGING ---

    // Save logs every 50 spins to avoid IO congestion
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        const logContent = state.logBuffer.join('\n');
        // We use a timestamp to prevent overwriting if multiple sessions run
        utils.saveFile(`checkmate8_log_${Date.now()}.txt`, logContent)
            .then(() => { state.logBuffer = []; }) // Clear buffer after save
            .catch(err => console.error("Strategy Save Error:", err));
    }

    return bets;

}