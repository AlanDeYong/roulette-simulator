/**
 * STRATEGY: The Santos Special (Modified D'Alembert on Dozens)
 * * SOURCE: 
 * Video: https://www.youtube.com/watch?v=qCzbUgpQmjM
 * Channel: CEG Dealer School
 * * THE LOGIC:
 * 1. Coverage: Bets on Dozen 1 (1-12) and Dozen 2 (13-24).
 * 2. Hedge: A "Line" (Double Street) bet on 25-30 to mitigate losses if the ball lands in the low end of Dozen 3.
 * 3. This covers 30 out of 37 numbers (approx 81% coverage).
 * * THE PROGRESSION (Independent 2-Up, 1-Down):
 * Each Dozen is tracked independently using a specific ladder system:
 * - Start: 1 Unit.
 * - On Loss: Increase bet by 2 units (Levels: 1 -> 3 -> 5...).
 * - On Win: Decrease bet by 1 unit (Levels: 5 -> 4 -> 3...).
 * - The Hedge (Line bet) remains flat at the table minimum to minimize bankroll drag.
 * * THE GOAL:
 * - Target: Accumulate small, consistent wins until reaching ~20% profit.
 * - Stop Loss: Dependent on bankroll, but the strategy aims to keep drawdowns low (approx $100-$150 buffer recommended).
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & UNIT SETUP ---
    // The main bets (Dozens) use the Outside Minimum.
    // The hedge bet (Line/Double Street) uses the Inside Minimum to save money.
    const unitMain = config.betLimits.minOutside; 
    const unitHedge = config.betLimits.min; 

    // --- 2. STATE INITIALIZATION ---
    // We need to track the "level" (number of units) for both Dozens independently.
    if (!state.levels) {
        state.levels = {
            dozen1: 1, // Start at 1 unit
            dozen2: 1  // Start at 1 unit
        };
    }

    // --- 3. PROCESS PREVIOUS SPIN (Update Progression) ---
    // Only update levels if there is history.
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Note: The logic handles Zero automatically (it counts as a loss for both Dozens).

        // --- DOZEN 1 LOGIC (1-12) ---
        // Win condition: Number is 1-12
        if (num >= 1 && num <= 12) {
            // WIN: Go down 1 level (Minimum level is 1)
            state.levels.dozen1 = Math.max(1, state.levels.dozen1 - 1);
        } else {
            // LOSS: Go up 2 levels
            state.levels.dozen1 += 2;
        }

        // --- DOZEN 2 LOGIC (13-24) ---
        // Win condition: Number is 13-24
        if (num >= 13 && num <= 24) {
            // WIN: Go down 1 level (Minimum level is 1)
            state.levels.dozen2 = Math.max(1, state.levels.dozen2 - 1);
        } else {
            // LOSS: Go up 2 levels
            state.levels.dozen2 += 2;
        }
    }

    // --- 4. CALCULATE BET AMOUNTS ---
    let amountD1 = state.levels.dozen1 * unitMain;
    let amountD2 = state.levels.dozen2 * unitMain;
    
    // The hedge is a flat bet on the 25-30 line. 
    // We keep this at the minimum inside bet to act as a "parachute" rather than a profit driver.
    let amountHedge = unitHedge;

    // --- 5. CLAMP TO LIMITS (CRITICAL) ---
    // Ensure we never bet below the minimum or above the maximum table limit.
    amountD1 = Math.max(config.betLimits.minOutside, Math.min(amountD1, config.betLimits.max));
    amountD2 = Math.max(config.betLimits.minOutside, Math.min(amountD2, config.betLimits.max));
    amountHedge = Math.max(config.betLimits.min, Math.min(amountHedge, config.betLimits.max));

    // --- 6. CONSTRUCT BET ARRAY ---
    const bets = [];

    // Bet on Dozen 1 (1st 12)
    bets.push({
        type: 'dozen',
        value: 1,
        amount: amountD1
    });

    // Bet on Dozen 2 (2nd 12)
    bets.push({
        type: 'dozen',
        value: 2,
        amount: amountD2
    });

    // Hedge Bet: Double Street (Line) covering 25, 26, 27, 28, 29, 30.
    // In roulette API standards, a 'line' value is usually the starting number of the 6-number block.
    bets.push({
        type: 'line',
        value: 25, 
        amount: amountHedge
    });

    return bets;
}