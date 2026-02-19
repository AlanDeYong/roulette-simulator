
/**
 * STRATEGY: Diamond Mine Roulette System
 * * SOURCE: 
 * Channel: Bet With Mo
 * Video: https://www.youtube.com/watch?v=Nd2sXarokls
 * * THE LOGIC:
 * This strategy focuses on "Diamond" clusters of numbers combined with Dozen and Column coverage.
 * It attempts to cover a high frequency of numbers with overlapping bets to create "Double" or "Triple" coverage zones.
 * * - Left Side Setup (Dozen 1 Focus):
 * 1. 2nd Column ($2 units)
 * 2. 1st Dozen ($1 unit)
 * 3. Inside "Diamond" covering 2, 4, 5, 8:
 * - Split 2/5 ($1)
 * - Split 5/8 ($1)
 * - Straight 4 ($1)
 * - (Optional/Variation) Straight 6
 * * - Right Side Setup (Dozen 3 Focus - "Switching Sides"):
 * 1. 2nd Column ($2 units)
 * 2. 3rd Dozen ($1 unit)
 * 3. Inside "Diamond" covering 26, 28, 29, 32:
 * - Split 26/29
 * - Split 29/32
 * - Straight 28
 * * THE PROGRESSION:
 * - Positive/Negative Hybrid.
 * - On Loss: Increase the "Level" (multiplying the base bets).
 * - On Win: The video suggests "dropping back down" after a significant win. 
 * - In this implementation:
 * - Loss: Level + 1
 * - Win: Level - 1 (Gradual regression to protect bankroll)
 * - Big Win (> 5x bet): Reset to Level 1.
 * * THE GOAL:
 * - The video targets $20 profit increments. 
 * - Once a profit target is hit, the strategy "Switches Sides" (Left to Right) to "confuse the algorithm."
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPER VARIABLES ---
    const MIN_INSIDE = config.betLimits.min;
    const MIN_OUTSIDE = config.betLimits.minOutside;
    const MAX_BET = config.betLimits.max;

    // Define the bets for "Left Side" (Centered on Number 5)
    // Total Base Units: 6 (2 Col + 1 Doz + 1 Split + 1 Split + 1 Straight)
    const LEFT_SETUP = [
        { type: 'column', value: 2, weight: 2 }, // Weight is multiplier of base unit
        { type: 'dozen', value: 1, weight: 1 },
        { type: 'split', value: [2, 5], weight: 1 },
        { type: 'split', value: [5, 8], weight: 1 },
        { type: 'number', value: 4, weight: 1 }
    ];

    // Define the bets for "Right Side" (Centered on Number 29)
    const RIGHT_SETUP = [
        { type: 'column', value: 2, weight: 2 },
        { type: 'dozen', value: 3, weight: 1 },
        { type: 'split', value: [26, 29], weight: 1 },
        { type: 'split', value: [29, 32], weight: 1 },
        { type: 'number', value: 28, weight: 1 }
    ];

    // --- 2. INITIALIZE STATE ---
    if (!state.initialized) {
        state.initialized = true;
        state.currentLevel = 1;
        state.side = 'left'; // 'left' or 'right'
        state.sessionStartBankroll = bankroll;
        state.profitGoal = 20; // Target increment
        state.currentProfitTarget = 20;
        state.logBuffer = [];
        state.lastTotalBet = 0;
    }

    // Helper to log data
    const log = (msg) => {
        state.logBuffer.push(`[Spin ${spinHistory.length}] ${msg}`);
    };

    // --- 3. ANALYZE PREVIOUS SPIN (Logic & Progression) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastProfit = bankroll - state.lastBankroll; // Net change
        const totalProfit = bankroll - state.sessionStartBankroll;

        // A. Check Profit Goals (Switch Sides Logic)
        if (totalProfit >= state.currentProfitTarget) {
            log(`Profit goal hit ($${totalProfit}). Switching sides.`);
            state.side = state.side === 'left' ? 'right' : 'left';
            state.currentProfitTarget += state.profitGoal; // Raise bar
            state.currentLevel = 1; // Reset progression on goal hit
        }
        // B. Progression Logic
        else if (lastProfit > 0) {
            // Win
            if (lastProfit > state.lastTotalBet * 2) {
                // "Big Win" -> Reset to base
                log(`Big Win ($${lastProfit}). Resetting level.`);
                state.currentLevel = 1;
            } else {
                // Small Win -> Regress level slightly or hold
                state.currentLevel = Math.max(1, state.currentLevel - 1);
                log(`Win. Dropping to Level ${state.currentLevel}`);
            }
        } else {
            // Loss -> Increase Level
            state.currentLevel++;
            // Safety cap (Level 7 is usually max in video before doubling gets crazy)
            if (state.currentLevel > 8) state.currentLevel = 1; 
            log(`Loss. Increasing to Level ${state.currentLevel}`);
        }
    }

    // Save current bankroll for next comparison
    state.lastBankroll = bankroll;

    // --- 4. CONSTRUCT BETS ---
    const activeSetup = state.side === 'left' ? LEFT_SETUP : RIGHT_SETUP;
    const bets = [];
    let currentTotalBet = 0;

    // Determine Base Unit Size
    // We need to ensure that even the smallest weight (1) meets the table minimum
    // But we also need the Outside bets (Dozen/Column) to meet MinOutside.
    // Usually MinInside is lower. Let's calculate a safe base unit.
    let baseUnit = MIN_INSIDE * state.currentLevel;

    // Check if this base unit satisfies the Outside Min for the Dozen (weight 1)
    if (baseUnit < MIN_OUTSIDE) {
        // If our calculated unit is too small for the Dozen bet, we must increase it
        // However, this might make the inside bets larger than necessary, but we must respect limits.
        // Optimization: We can decouple them, but for "System" purity, we scale the whole unit.
        // If strict adherence to "minOutside" is required for the Dozen (weight 1):
        if (baseUnit < MIN_OUTSIDE) baseUnit = MIN_OUTSIDE;
    }

    for (const setup of activeSetup) {
        let amount = baseUnit * setup.weight;

        // Special check for Column/Dozen to ensure they hit minOutside
        if ((setup.type === 'column' || setup.type === 'dozen') && amount < MIN_OUTSIDE) {
            amount = MIN_OUTSIDE;
        }

        // Clamp to Maximum
        amount = Math.min(amount, MAX_BET);

        bets.push({
            type: setup.type,
            value: setup.value,
            amount: amount
        });
        currentTotalBet += amount;
    }

    state.lastTotalBet = currentTotalBet;

    // --- 5. LOGGING & OUTPUT ---
    // Save logs periodically
    if (spinHistory.length % 50 === 0 && utils && utils.saveFile) {
        utils.saveFile("diamond_mine_log.txt", state.logBuffer.join('\n'))
            .catch(err => console.error("Log save failed", err));
        state.logBuffer = []; // Clear buffer
    }

    // Stop if bankroll is critically low
    if (bankroll < currentTotalBet) {
        log("Bankroll too low to continue progression. Stopping.");
        return [];
    }

    return bets;

}