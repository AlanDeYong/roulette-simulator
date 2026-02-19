
/**
 * Strategy: Best Ever Nine Street System (submitted by John)
 * Source: YouTube - The Roulette Master (https://www.youtube.com/watch?v=qhuHJOhKxf4)
 * * THE LOGIC:
 * 1. Coverage: Bet on 9 distinct Streets (covering 27 numbers) + 1 Unit on Zero (0).
 * Total coverage: 28 numbers.
 * 2. Modes: The strategy oscillates between "Attack Mode" (Building profit) and "Recovery Mode" (Recouping losses).
 * * THE PROGRESSION:
 * * -- MODE A: ATTACK (Base Level) --
 * - Start with 1 Unit on each position (9 Streets + Zero).
 * - TRIGGER: Win.
 * - Action: Increase bet size by 1 Unit (1 -> 2 -> 3...).
 * - GOAL: Achieve 5 consecutive wins.
 * - RESET: If 5 wins reached, reset to 1 Unit.
 * - TRIGGER: Loss.
 * - Action: Switch to Mode B (Recovery). Double the current Unit immediately.
 * * -- MODE B: RECOVERY --
 * - TRIGGER: You entered this mode due to a loss.
 * - BET SIZE: Double the previous unit (e.g., if lost at 1, bet 2. If lost at 2, bet 4).
 * - GOAL: Achieve 3 wins at this level to clear the loss.
 * - On Win: Decrement 'wins needed' counter. If counter reaches 0, Reset to Mode A (Unit 1).
 * - On Loss: You are in a deeper hole. Double the Unit again (e.g., 2 -> 4). 
 * Reset 'wins needed' counter back to 3 (requires 3 high-value wins to recover the new deep hole).
 * * THE GOAL:
 * - Generate consistent daily profit.
 * - Ideally, hit the 5-win streak in Attack Mode, then reset.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const STREET_COUNT = 9;
    const ATTACK_WIN_TARGET = 5;
    const RECOVERY_WIN_TARGET = 3;

    // Standard Roulette Streets (Rows of 3 numbers: 1-3, 4-6, etc.)
    const ALL_STREET_STARTS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    // --- 2. INITIALIZATION ---
    if (!state.initialized) {
        state.mode = 'ATTACK';      // 'ATTACK' or 'RECOVERY'
        state.baseUnit = config.betLimits.min; // Align with table min
        state.currentUnit = state.baseUnit;
        
        // Tracking Progress
        state.streakCounter = 0;    // Counts wins in Attack mode (Target 5)
        state.recoveryWinsNeeded = 0; // Counts remaining wins needed in Recovery (Target 3)
        
        // Select 9 Random Streets to stick with (or rotate, but static is standard for this strat)
        state.selectedStreets = pickRandomStreets(STREET_COUNT);
        
        state.logData = "";
        state.initialized = true;
        state.totalProfit = 0;
        state.startBankroll = bankroll;
    }

    // Helper: Pick N unique random streets
    function pickRandomStreets(n) {
        const shuffled = [...ALL_STREET_STARTS].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, n);
    }

    // Helper: Check if a number is covered by our streets or Zero
    function isWin(number, streets) {
        if (number === 0) return true; // We always bet on Zero
        for (let s of streets) {
            if (number >= s && number <= s + 2) return true;
        }
        return false;
    }

    // --- 3. PROCESS LAST SPIN ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const won = isWin(lastNum, state.selectedStreets);

        // Update Logs
        state.logData += `Spin ${spinHistory.length}: ${lastNum} (${won ? 'WIN' : 'LOSS'}). Mode: ${state.mode}. Unit: ${state.currentUnit}. `;

        if (state.mode === 'ATTACK') {
            if (won) {
                state.streakCounter++;
                state.logData += `Streak: ${state.streakCounter}/${ATTACK_WIN_TARGET}.\n`;

                if (state.streakCounter >= ATTACK_WIN_TARGET) {
                    state.logData += `>>> TARGET HIT (5 Wins). Resetting to Base.\n`;
                    state.currentUnit = state.baseUnit;
                    state.streakCounter = 0;
                    // Optional: Reshuffle streets on reset for variety
                    state.selectedStreets = pickRandomStreets(STREET_COUNT);
                } else {
                    // Progression: Increase by 1 unit
                    state.currentUnit += state.baseUnit;
                }
            } else {
                // LOSS in Attack Mode -> Switch to Recovery
                state.mode = 'RECOVERY';
                state.currentUnit *= 2; // Double the bet
                state.recoveryWinsNeeded = RECOVERY_WIN_TARGET; // Need 3 wins to recover
                state.logData += `>>> ENTERING RECOVERY. Doubling Unit to ${state.currentUnit}. Need ${RECOVERY_WIN_TARGET} wins.\n`;
            }
        } else { // MODE: RECOVERY
            if (won) {
                state.recoveryWinsNeeded--;
                state.logData += `Recovery Win. Need ${state.recoveryWinsNeeded} more.\n`;

                if (state.recoveryWinsNeeded <= 0) {
                    state.logData += `>>> RECOVERY COMPLETE. Resetting to Attack Mode.\n`;
                    state.mode = 'ATTACK';
                    state.currentUnit = state.baseUnit;
                    state.streakCounter = 0;
                }
            } else {
                // LOSS in Recovery -> Deepen the hole
                state.currentUnit *= 2; // Double again
                state.recoveryWinsNeeded = RECOVERY_WIN_TARGET; // Reset requirement to 3 wins at this new high level
                state.logData += `>>> RECOVERY LOSS. Doubling Unit to ${state.currentUnit}. Resetting goal to 3 wins.\n`;
            }
        }
    }

    // --- 4. BET LIMITS & SAFETY ---
    // Clamp bets to config limits
    let betAmount = state.currentUnit;
    
    // Ensure min
    betAmount = Math.max(betAmount, config.betLimits.min); // Streets
    
    // Ensure max (Per position)
    if (betAmount > config.betLimits.max) {
        state.logData += `WARN: Max bet reached (${config.betLimits.max}). Capping bet.\n`;
        betAmount = config.betLimits.max;
    }

    // Check Total Bankroll Requirement
    // 9 Streets + 1 Zero = 10 positions
    const totalBetCost = betAmount * 10;

    if (bankroll < totalBetCost) {
        state.logData += `CRITICAL: Insufficient funds (${bankroll} < ${totalBetCost}). Stop.\n`;
        utils.saveFile("9_street_stop.txt", state.logData);
        return []; // Stop betting
    }

    // --- 5. LOGGING ---
    if (spinHistory.length % 50 === 0) {
        utils.saveFile("9_street_log.txt", state.logData);
        state.logData = ""; // Clear buffer
    }

    // --- 6. CONSTRUCT BETS ---
    const bets = [];

    // 1. Street Bets
    state.selectedStreets.forEach(streetStart => {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: betAmount
        });
    });

    // 2. Zero Bet (Insurance/Jackpot)
    // Note: Some configs use 'basket' for 0, but 'number' is standard for specific numbers.
    // We try 'number' 0. If your casino requires 'basket' for 0, change type to 'basket'.
    bets.push({
        type: 'number', // Straight up on 0
        value: 0,
        amount: betAmount
    });

    return bets;

}