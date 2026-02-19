
/**
 * Strategy: Expand the Splits (Low Roller / Small Bankroll)
 * * Source: "ROULETTE SYSTEM FOR LOW ROLLERS SMALL BANKROLL STRATEGY" by Bet With Mo
 * URL: https://www.youtube.com/watch?v=D5LKvJKVa9w
 * * The Logic:
 * This strategy divides the board into 3 "Sets" of splits, each corresponding to a Dozen.
 * It progressively "expands" coverage to include more Dozens after losses.
 * - Set 1: 3 Splits in the 1st Dozen (e.g., 1|2, 4|5, 10|11)
 * - Set 2: 3 Splits in the 2nd Dozen (e.g., 13|14, 16|17, 22|23)
 * - Set 3: 3 Splits in the 3rd Dozen (e.g., 25|26, 28|29, 31|32)
 * * The Progression:
 * 1. Stage 1: Bet Set 1 (3 units total).
 * - Win: Repeat Stage 1.
 * - Loss: Move to Stage 2.
 * 2. Stage 2: Bet Set 1 + Set 2 (6 units total).
 * - Win: Reset to Stage 1.
 * - Loss: Move to Stage 3.
 * 3. Stage 3 (Double Up): Bet Set 1 + Set 2 + Set 3 (Full coverage).
 * - IMPORTANT: Unit size doubles (2 units per split).
 * - Win: Reset to Stage 1.
 * - Loss: Enter "Recovery Mode" (Stage 4).
 * * Recovery Mode (The "Two Wins" Rule):
 * Once in Stage 4+, a single win is not enough. You need 2 wins at the current level to reset.
 * 4. Stage 4: Bet All Sets @ 2 units. Need 2 wins.
 * - Loss: Move to Stage 5.
 * 5. Stage 5: Bet All Sets @ 4 units. Need 2 wins.
 * - Loss: Move to Stage 6 (8 units), etc.
 * * The Goal:
 * Gradual profit accumulation with high coverage (approx 50%) in later stages.
 * Stops if bankroll is depleted or max limits reached.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & HELPERS ---
    const MIN_BET = config.betLimits.min; // Use 'min' for Inside bets (Splits)
    
    // Define the specific splits for each "Set" (Dozen)
    // These approximate the video's coverage (3 splits per dozen = 6 numbers = 50% coverage)
    const SETS = {
        1: [[1, 2], [4, 5], [10, 11]],   // 1st Dozen
        2: [[13, 14], [16, 17], [22, 23]], // 2nd Dozen
        3: [[25, 26], [28, 29], [31, 32]]  // 3rd Dozen
    };

    // Helper to check if a number was covered by our specific splits
    const isWin = (number, activeSets) => {
        if (number === 0 || number === '00') return false;
        for (let setName of activeSets) {
            const splits = SETS[setName];
            for (let split of splits) {
                if (split.includes(number)) return true;
            }
        }
        return false;
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.stage) {
        state.stage = 1;              // Current progression stage
        state.recoveryWins = 0;       // Counter for wins in Recovery Mode
        state.activeSets = [1];       // Which sets were active last spin
        state.lastBetAmount = 0;      // For tracking limits
    }

    // --- 3. PROCESS PREVIOUS SPIN ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const wonLast = isWin(lastNum, state.activeSets);

        if (state.stage === 1) {
            // Stage 1: Win stays, Loss advances
            if (wonLast) {
                // Keep Stage 1
            } else {
                state.stage = 2;
            }
        } else if (state.stage === 2) {
            // Stage 2: Win resets, Loss advances
            if (wonLast) {
                state.stage = 1;
            } else {
                state.stage = 3;
            }
        } else if (state.stage === 3) {
            // Stage 3 (First Double): Win resets, Loss starts Recovery
            if (wonLast) {
                state.stage = 1;
            } else {
                state.stage = 4; // Enter Recovery
                state.recoveryWins = 0;
            }
        } else {
            // Stage 4+ (Recovery Mode): Need 2 Wins
            if (wonLast) {
                state.recoveryWins++;
                if (state.recoveryWins >= 2) {
                    // Achieved 2 wins, Reset Strategy
                    state.stage = 1;
                    state.recoveryWins = 0;
                } else {
                    // Stay in current stage, need 1 more win
                    // state.stage remains same
                }
            } else {
                // Loss in recovery: Increase stage (Double bet), Reset win counter
                state.stage++;
                state.recoveryWins = 0;
            }
        }
    }

    // --- 4. CALCULATE BETS FOR CURRENT STAGE ---
    
    // Determine Unit Size
    // Stages 1-2: 1 Unit
    // Stage 3: 2 Units
    // Stage 4: 2 Units
    // Stage 5: 4 Units, Stage 6: 8 Units... (Powers of 2)
    let unitMultiplier;
    if (state.stage <= 2) {
        unitMultiplier = 1;
    } else {
        // Stage 3 starts the doubling (2^1), Stage 4 is same as 3 (2^1), Stage 5 is (2^2)
        const power = Math.max(1, state.stage - 3); 
        unitMultiplier = Math.pow(2, power);
    }

    let chipValue = MIN_BET * unitMultiplier;
    
    // Clamp to Limits
    chipValue = Math.max(chipValue, config.betLimits.min);
    chipValue = Math.min(chipValue, config.betLimits.max);

    // Determine Active Sets based on Stage
    let activeSets = [];
    if (state.stage === 1) {
        activeSets = [1];
    } else if (state.stage === 2) {
        activeSets = [1, 2];
    } else {
        // Stage 3 and all Recovery Stages use ALL sets
        activeSets = [1, 2, 3];
    }

    // Update state for next spin analysis
    state.activeSets = activeSets;

    // --- 5. GENERATE BET OBJECTS ---
    const bets = [];
    
    activeSets.forEach(setIndex => {
        const splits = SETS[setIndex];
        splits.forEach(splitPair => {
            bets.push({
                type: 'split',
                value: splitPair,
                amount: chipValue
            });
        });
    });

    return bets;

}