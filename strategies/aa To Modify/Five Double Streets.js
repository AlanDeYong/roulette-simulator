
/**
 * Strategy: Five Double Streets (High Coverage)
 * * Source: https://www.youtube.com/watch?v=5T15naHRh3U (Channel: CEG Dealer School)
 * * The Logic:
 * - Coverage: Bets on 5 out of 6 "Double Streets" (Lines).
 * - Numbers Covered: 1 through 30 (Lines starting 1, 7, 13, 19, 25).
 * - Win Probability: ~81% (30/37 numbers).
 * - Trigger: Bets are placed on every spin unless a stop-loss/limit is reached.
 * * The Progression:
 * - Base Level: Flat bet 1 unit on each of the 5 lines.
 * - On Loss: TRIPLE the bet amount (e.g., 1u -> 3u).
 * - Recovery Rule: When at a higher bet level, you need 2 WINS to recover the loss and profit.
 * - Win 1/2: Stay at high level.
 * - Win 2/2: Reset to Base Level.
 * - Loss at high level: Triple again (if limits allow) or Reset (Stop Loss).
 * * The Goal:
 * - Target: Consistent small profits (video suggests $200 session goal on $2k bankroll).
 * - Stop Loss: If the required progression bet exceeds the 'max' table limit, the strategy resets to base units to preserve remaining bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Setup
    // Use the minimum limit for 'Inside' bets as our base unit.
    const baseUnit = config.betLimits.min; 
    const maxLimit = config.betLimits.max;

    // Define the 5 lines we will cover (Start numbers: 1, 7, 13, 19, 25)
    // This covers numbers 1-30.
    const linesToCover = [1, 7, 13, 19, 25];

    // 2. Initialize State (Runs once)
    if (!state.initialized) {
        state.currentUnit = baseUnit;
        state.winsNeeded = 0;       // Counter for recovery wins
        state.spinCount = 0;
        state.logs = [];            // Buffer for file logging
        state.initialized = true;
    }

    // 3. Process Last Spin (if applicable)
    if (spinHistory.length > 0) {
        state.spinCount++;
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Winning condition: Number is between 1 and 30
        // (Since we cover lines 1-6, 7-12, 13-18, 19-24, 25-30)
        const isWin = (lastNum >= 1 && lastNum <= 30);

        if (isWin) {
            if (state.winsNeeded > 0) {
                // We are in recovery mode
                state.winsNeeded--;
                
                if (state.winsNeeded === 0) {
                    // Recovery complete, reset to base
                    state.currentUnit = baseUnit;
                    state.logs.push(`Spin ${state.spinCount}: Recovery complete. Resetting to base.`);
                }
            } else {
                // Standard win at base level, maintain base
                state.currentUnit = baseUnit;
            }
        } else {
            // Loss (0 or 31-36 hit)
            // Progression: Triple the bet
            const nextUnit = state.currentUnit * 3;

            // Safety Check: Only increase if we stay within table limits
            if (nextUnit <= maxLimit) {
                state.currentUnit = nextUnit;
                state.winsNeeded = 2; // We need 2 wins at this new level to recover
                state.logs.push(`Spin ${state.spinCount}: Loss. Tripling unit to ${state.currentUnit}. Wins needed: 2`);
            } else {
                // STOP LOSS Triggered: limits prevent progression
                state.currentUnit = baseUnit;
                state.winsNeeded = 0;
                state.logs.push(`Spin ${state.spinCount}: Max limit hit. Hard reset to base.`);
            }
        }
    }

    // 4. Periodic Logging (Every 50 spins)
    if (state.spinCount > 0 && state.spinCount % 50 === 0) {
        // We do not await this promise to avoid blocking execution
        if (state.logs.length > 0) {
            utils.saveFile(`five_streets_log_${Date.now()}.txt`, state.logs.join('\n'))
                .catch(err => console.error("Save file failed:", err));
            state.logs = []; // Clear buffer after save
        }
    }

    // 5. Construct Bets
    // Ensure the bet amount respects global limits
    const safeAmount = Math.max(config.betLimits.min, Math.min(state.currentUnit, maxLimit));

    const bets = linesToCover.map(startNum => ({
        type: 'line',
        value: startNum,
        amount: safeAmount
    }));

    return bets;

}