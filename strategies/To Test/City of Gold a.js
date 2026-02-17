<<<<<<< HEAD
/**
 * STRATEGY: City of Gold
 * SOURCE: "AMAZING NEW ROULETTE SYSTEM CONSISTENTLY WINS MONEY" by The Roulette Master
 * URL: https://www.youtube.com/watch?v=LTVcZvPSKD0
 * * THE LOGIC:
 * 1. Coverage: Bet on 2 out of 3 Dozens (approx. 66% win rate).
 * 2. Progression System (The Safety Ladder):
 * - Instead of a harsh Martingale (doubling every loss), this uses a "stepped" ladder.
 * - Each high-risk bet level is played TWICE before moving up.
 * - Level 0: 1 Unit.
 * - Level 1 (Steps 1 & 2): 3 Units (Double + 1 Unit).
 * - Level 2 (Steps 3 & 4): 7 Units (Double previous + 1 Unit).
 * - Level 3 (Steps 5 & 6): 15 Units...
 * 3. Movement:
 * - Loss: Move UP the ladder one step (Index + 1).
 * - Win: Move DOWN the ladder one step (Index - 1).
 * - If you win at Level 0, you stay at Level 0 (Pure Profit).
 * * THE GOAL:
 * - Grind out consistent small profits while using the "double step" buffer to absorb 
 * losing streaks without blowing the bankroll immediately.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    
    // Define the base unit size (table minimum for Outside bets)
    const baseUnit = config.betLimits.minOutside;

    // Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.ladderIndex = 0;          // Current position on the progression ladder
        state.activeDozens = [1, 2];    // Default to Dozens 1 and 2
        state.totalProfit = 0;
        state.logBuffer = "";           // Buffer for logs
    }

    // --- 2. PROCESS LAST SPIN (Update Ladder) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Determine Winning Dozen (1, 2, or 3.  0 is failure)
        let winningDozen = 0;
        if (lastNum >= 1 && lastNum <= 12) winningDozen = 1;
        else if (lastNum >= 13 && lastNum <= 24) winningDozen = 2;
        else if (lastNum >= 25 && lastNum <= 36) winningDozen = 3;

        // Check Win/Loss
        const won = state.activeDozens.includes(winningDozen);

        if (won) {
            // Win: Move DOWN the ladder (Minimum index is 0)
            state.ladderIndex = Math.max(0, state.ladderIndex - 1);
        } else {
            // Loss: Move UP the ladder
            state.ladderIndex++;
            
            // Optional: Rotate Dozens on loss to avoid sticking to a "cold" sector
            // If we were on [1,2], move to [2,3], etc.
            if (state.activeDozens[0] === 1 && state.activeDozens[1] === 2) state.activeDozens = [2, 3];
            else if (state.activeDozens[0] === 2 && state.activeDozens[1] === 3) state.activeDozens = [1, 3];
            else state.activeDozens = [1, 2];
        }
    }

    // --- 3. CALCULATE BET AMOUNT (The Ladder Logic) ---
    
    let betAmount = baseUnit;

    if (state.ladderIndex > 0) {
        // Calculate the "Tier" based on index.
        // Index 1, 2 = Tier 1 (3 units)
        // Index 3, 4 = Tier 2 (7 units)
        // Index 5, 6 = Tier 3 (15 units)
        // Formula: Tier = ceil(index / 2)
        const tier = Math.ceil(state.ladderIndex / 2);
        
        // Formula for value: (2^(Tier+1) - 1) * unit
        // Example Tier 1: (4 - 1) = 3 units
        // Example Tier 2: (8 - 1) = 7 units
        const multiplier = Math.pow(2, tier + 1) - 1;
        betAmount = baseUnit * multiplier;
    }

    // --- 4. SAFETY CHECKS (Limits & Bankroll) ---

    // Clamp to Config Limits
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Stop if bankroll cannot cover the 2 bets
    const totalCost = betAmount * 2;
    if (bankroll < totalCost) {
        // Not enough money to continue strictly
        // We return empty array to stop betting (or you could bet 'all in', but safest is stop)
        return [];
    }

    // --- 5. LOGGING (Periodic Save) ---
    
    // Log logic: Save every 50 spins
    if (spinHistory.length % 50 === 0 && spinHistory.length > 0) {
        const entry = `Spin: ${spinHistory.length} | Bankroll: ${bankroll} | Step: ${state.ladderIndex} | BetAmt: ${betAmount}\n`;
        state.logBuffer += entry;
        
        utils.saveFile("city-of-gold-log.txt", state.logBuffer)
            .catch(err => console.error("Save failed", err));
            
        // Clear buffer after save to prevent memory bloat (optional, depending on preference)
        state.logBuffer = ""; 
    }

    // --- 6. CONSTRUCT BETS ---

    // Return the two dozen bets
    return state.activeDozens.map(dozenValue => ({
        type: 'dozen',
        value: dozenValue,
        amount: betAmount
    }));
=======
/**
 * STRATEGY: City of Gold
 * SOURCE: "AMAZING NEW ROULETTE SYSTEM CONSISTENTLY WINS MONEY" by The Roulette Master
 * URL: https://www.youtube.com/watch?v=LTVcZvPSKD0
 * * THE LOGIC:
 * 1. Coverage: Bet on 2 out of 3 Dozens (approx. 66% win rate).
 * 2. Progression System (The Safety Ladder):
 * - Instead of a harsh Martingale (doubling every loss), this uses a "stepped" ladder.
 * - Each high-risk bet level is played TWICE before moving up.
 * - Level 0: 1 Unit.
 * - Level 1 (Steps 1 & 2): 3 Units (Double + 1 Unit).
 * - Level 2 (Steps 3 & 4): 7 Units (Double previous + 1 Unit).
 * - Level 3 (Steps 5 & 6): 15 Units...
 * 3. Movement:
 * - Loss: Move UP the ladder one step (Index + 1).
 * - Win: Move DOWN the ladder one step (Index - 1).
 * - If you win at Level 0, you stay at Level 0 (Pure Profit).
 * * THE GOAL:
 * - Grind out consistent small profits while using the "double step" buffer to absorb 
 * losing streaks without blowing the bankroll immediately.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    
    // Define the base unit size (table minimum for Outside bets)
    const baseUnit = config.betLimits.minOutside;

    // Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.ladderIndex = 0;          // Current position on the progression ladder
        state.activeDozens = [1, 2];    // Default to Dozens 1 and 2
        state.totalProfit = 0;
        state.logBuffer = "";           // Buffer for logs
    }

    // --- 2. PROCESS LAST SPIN (Update Ladder) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Determine Winning Dozen (1, 2, or 3.  0 is failure)
        let winningDozen = 0;
        if (lastNum >= 1 && lastNum <= 12) winningDozen = 1;
        else if (lastNum >= 13 && lastNum <= 24) winningDozen = 2;
        else if (lastNum >= 25 && lastNum <= 36) winningDozen = 3;

        // Check Win/Loss
        const won = state.activeDozens.includes(winningDozen);

        if (won) {
            // Win: Move DOWN the ladder (Minimum index is 0)
            state.ladderIndex = Math.max(0, state.ladderIndex - 1);
        } else {
            // Loss: Move UP the ladder
            state.ladderIndex++;
            
            // Optional: Rotate Dozens on loss to avoid sticking to a "cold" sector
            // If we were on [1,2], move to [2,3], etc.
            if (state.activeDozens[0] === 1 && state.activeDozens[1] === 2) state.activeDozens = [2, 3];
            else if (state.activeDozens[0] === 2 && state.activeDozens[1] === 3) state.activeDozens = [1, 3];
            else state.activeDozens = [1, 2];
        }
    }

    // --- 3. CALCULATE BET AMOUNT (The Ladder Logic) ---
    
    let betAmount = baseUnit;

    if (state.ladderIndex > 0) {
        // Calculate the "Tier" based on index.
        // Index 1, 2 = Tier 1 (3 units)
        // Index 3, 4 = Tier 2 (7 units)
        // Index 5, 6 = Tier 3 (15 units)
        // Formula: Tier = ceil(index / 2)
        const tier = Math.ceil(state.ladderIndex / 2);
        
        // Formula for value: (2^(Tier+1) - 1) * unit
        // Example Tier 1: (4 - 1) = 3 units
        // Example Tier 2: (8 - 1) = 7 units
        const multiplier = Math.pow(2, tier + 1) - 1;
        betAmount = baseUnit * multiplier;
    }

    // --- 4. SAFETY CHECKS (Limits & Bankroll) ---

    // Clamp to Config Limits
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Stop if bankroll cannot cover the 2 bets
    const totalCost = betAmount * 2;
    if (bankroll < totalCost) {
        // Not enough money to continue strictly
        // We return empty array to stop betting (or you could bet 'all in', but safest is stop)
        return [];
    }

    // --- 5. LOGGING (Periodic Save) ---
    
    // Log logic: Save every 50 spins
    if (spinHistory.length % 50 === 0 && spinHistory.length > 0) {
        const entry = `Spin: ${spinHistory.length} | Bankroll: ${bankroll} | Step: ${state.ladderIndex} | BetAmt: ${betAmount}\n`;
        state.logBuffer += entry;
        
        utils.saveFile("city-of-gold-log.txt", state.logBuffer)
            .catch(err => console.error("Save failed", err));
            
        // Clear buffer after save to prevent memory bloat (optional, depending on preference)
        state.logBuffer = ""; 
    }

    // --- 6. CONSTRUCT BETS ---

    // Return the two dozen bets
    return state.activeDozens.map(dozenValue => ({
        type: 'dozen',
        value: dozenValue,
        amount: betAmount
    }));
>>>>>>> origin/main
}