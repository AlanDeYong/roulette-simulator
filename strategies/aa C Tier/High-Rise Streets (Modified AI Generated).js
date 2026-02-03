/**
 * Strategy: High-Rise Streets (Modified / AI Generated)
 * Source: https://www.youtube.com/watch?v=mFbd_UAfb50 (CEG Dealer School)
 *
 * THE LOGIC:
 * This strategy relies on increasing table coverage (adding "Streets") rather than just
 * increasing bet amounts on a single spot. It assumes that by covering more of the board
 * after a loss, you increase the hit frequency to recover.
 *
 * THE PROGRESSION (7 Levels):
 * The strategy uses a 7-step progression. On a loss, it moves up a level.
 * Level 1: 1 Street  (Total 1 Unit)
 * Level 2: 2 Streets (Total 2 Units)
 * Level 3: 3 Streets (Total 3 Units)
 * Level 4: 4 Streets (Total 4 Units)
 * Level 5: 5 Streets (Total 5 Units)
 * Level 6: 6 Streets (Total 6 Units)
 * Level 7: 6 Streets @ 2 Units each (Total 12 Units)
 *
 * MODIFIED RECOVERY RULE (The "Hold" Logic):
 * - Loss: Move to the next level in the progression.
 * - Win: Check current Bankroll vs Session High.
 * - If Bankroll >= Session High: Reset to Level 1 (Take profit).
 * - If Bankroll < Session High: HOLD current level (Repeat same bet) to claw back losses.
 *
 * THE GOAL:
 * Target 25% profit of the starting bankroll (approx +$45 on a $190 bankroll).
 * Stop Loss: Implicitly defined by busting the 7-level progression.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const TARGET_PROFIT_PERCENT = 0.25; // 25% Gain
    const MAX_LEVEL = 7;
    
    // Define the progression structure: Number of streets to bet, and units per street
    const PROGRESSION = [
        { streets: 1, multiplier: 1 }, // Level 1
        { streets: 2, multiplier: 1 }, // Level 2
        { streets: 3, multiplier: 1 }, // Level 3
        { streets: 4, multiplier: 1 }, // Level 4
        { streets: 5, multiplier: 1 }, // Level 5
        { streets: 6, multiplier: 1 }, // Level 6
        { streets: 6, multiplier: 2 }  // Level 7 (Aggressive)
    ];

    // Determine Base Unit (Use Table Min for Inside Bets)
    const baseUnit = config.betLimits.min;

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) {
        state.level = 0;              // Start at index 0 (Level 1)
        state.sessionHigh = bankroll; // Track peak bankroll
        state.startBankroll = bankroll;
        state.lastBankroll = bankroll;
        state.currentStreets = [];    // Store current chosen streets to repeat them if holding
        state.totalBetAmount = 0;     // Store last total bet for win verification
    }

    // --- 3. PROFIT GOAL CHECK ---
    const totalProfit = bankroll - state.startBankroll;
    const targetProfit = state.startBankroll * TARGET_PROFIT_PERCENT;

    if (totalProfit >= targetProfit) {
        // Goal achieved, stop betting
        return [];
    }

    // --- 4. GAME LOGIC (WIN/LOSS/HOLD) ---
    // Only process logic if we have a history (not the first spin)
    if (spinHistory.length > 0) {
        const lastWinAmount = bankroll - state.lastBankroll; // Net change
        // A "Win" in roulette is defined by getting back more than 0, 
        // but technically we only care if our bankroll increased compared to the bet cost.
        // However, for this strategy, "Win" simply means the number hit one of our streets.
        // Since we track bankroll, if (bankroll > lastBankroll), we made a profit on that spin.
        // If (bankroll < lastBankroll), we lost the spin (or net loss).
        
        // Did we win the last spin? (Bankroll went up)
        const wonLastSpin = bankroll > state.lastBankroll;

        // Update Session High
        if (bankroll > state.sessionHigh) {
            state.sessionHigh = bankroll;
        }

        if (wonLastSpin) {
            if (bankroll >= state.sessionHigh) {
                // RESET Condition: We won and reached a new high (or recovered fully)
                state.level = 0;
                state.currentStreets = []; // Clear stored streets to pick new random ones
            } else {
                // HOLD Condition: We won, but are still in a drawdown.
                // Stay at current level. Keep state.currentStreets the same.
                // No changes to state.level
            }
        } else {
            // LOSS Condition: Progression Up
            state.level++;
            state.currentStreets = []; // Pick new streets for the new level
            
            // Check for Bust / Reset
            if (state.level >= MAX_LEVEL) {
                state.level = 0; // Reset to start if we bust the progression
            }
        }
    }

    // Update lastBankroll for the next spin comparison
    state.lastBankroll = bankroll;

    // --- 5. BET CONSTRUCTION ---
    
    // Get parameters for current level
    const progStep = PROGRESSION[state.level];
    const numStreets = progStep.streets;
    const unitMult = progStep.multiplier;

    // If we don't have active streets (Reset or Level Up), generate them
    if (!state.currentStreets || state.currentStreets.length !== numStreets) {
        state.currentStreets = getUniqueRandomStreets(numStreets);
    }

    // Calculate Bet Amount Per Street
    let betAmount = baseUnit * unitMult;

    // CLAMP TO LIMITS
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Build Bet Array
    const bets = state.currentStreets.map(streetVal => {
        return {
            type: 'street',
            value: streetVal,
            amount: betAmount
        };
    });

    return bets;
}

// --- HELPER FUNCTIONS ---

/**
 * Returns an array of 'count' unique street starting numbers.
 * Valid Street Starts: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
 */
function getUniqueRandomStreets(count) {
    const availableStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    
    // Shuffle array (Fisher-Yates)
    for (let i = availableStreets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableStreets[i], availableStreets[j]] = [availableStreets[j], availableStreets[i]];
    }

    // Return the first 'count' elements
    return availableStreets.slice(0, count);
}