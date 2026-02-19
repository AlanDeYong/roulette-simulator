
/**
 * Strategy: Red Dragon Roulette System
 * Source: The Roulette Master (YouTube) - Strategy by Big Rick
 * Video URL: https://www.youtube.com/watch?v=xz3svGDojZo (Starts at 31:19)
 *
 * THE LOGIC:
 * This strategy focuses on a specific "Safety Ladder" progression played on Even Money bets (Red/Black).
 * The video specifically uses RED ("Red Dragon"), but the core mechanics apply to any color.
 * We will bet on RED by default.
 *
 * THE PROGRESSION:
 * The progression is a custom ladder that starts aggressive (Martingale-like) to capture early recovery,
 * then slows down significantly to protect the bankroll ("Safety Brake").
 *
 * Ladder Multipliers (based on video's $10 base units):
 * [1, 3, 7, 11, 17, 23, 31, 40, 50, 60...]
 *
 * Rules:
 * 1. Start at Index 0 (1 unit).
 * 2. ON LOSS: Move UP the ladder (Index + 1). Disable "Recovery Mode".
 * 3. ON WIN: Move DOWN the ladder (Index - 1). Enable "Recovery Mode".
 * 4. RECOVERY MODE (The "One Win to Reset" Rule):
 * - If you moved down the ladder on the previous spin (because you won), you are in Recovery Mode.
 * - If you WIN again immediately while in Recovery Mode, you FULLY RESET to Index 0.
 * - If you LOSE while in Recovery Mode, you resume normal climbing (Index + 1) and exit Recovery Mode.
 *
 * THE GOAL:
 * To use the "Safety Brake" in the progression to survive long losing streaks while capitalizing
 * on short winning streaks (2 wins) to clear significant accumulated losses.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. CONFIGURATION
    const betLimitMin = config.betLimits.minOutside;
    const betLimitMax = config.betLimits.max;
    const betColor = 'red'; // Strategy default

    // The Progression Ladder (Multipliers of the base unit)
    // Based on video sequence: 10, 30, 70, 110, 170, 230, 310, 400, 500, 600
    // Converted to units: 1, 3, 7, 11, 17, 23, 31, 40, 50, 60
    const LADDER = [1, 3, 7, 11, 17, 23, 31, 40, 50, 60];

    // 2. INITIALIZE STATE
    if (state.ladderIndex === undefined) state.ladderIndex = 0;
    if (state.recoveryMode === undefined) state.recoveryMode = false; // "One win to reset" flag

    // 3. PROCESS LAST SPIN
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastColor = lastSpin.winningColor; // 'red', 'black', 'green'

        // Determine Win/Loss
        // Zeros (green) are losses for Red/Black bets
        const won = (lastColor === betColor);

        if (won) {
            if (state.recoveryMode) {
                // Rule: If we were already backing down and won again -> FULL RESET
                state.ladderIndex = 0;
                state.recoveryMode = false;
            } else {
                // Standard Win -> Move back one step
                state.ladderIndex = Math.max(0, state.ladderIndex - 1);
                
                // If we were at index 0 and won, we stay at 0.
                // Recovery mode is technically only useful if we are climbing, 
                // but setting it true at index 0 doesn't hurt (next win just keeps us at 0).
                // However, logically it implies we are "recovering" from a deeper level.
                // We'll set it to true to stick to the logic: "Go back one, need one more to reset".
                state.recoveryMode = true;
            }
        } else {
            // Loss
            state.ladderIndex++;
            // Exit recovery mode on loss (back to the grind)
            state.recoveryMode = false;
        }
    }

    // 4. DETERMINE BET SIZE
    // Get multiplier. If index exceeds defined ladder, continue adding +10 units (linear extension)
    let multiplier;
    if (state.ladderIndex < LADDER.length) {
        multiplier = LADDER[state.ladderIndex];
    } else {
        // Fallback for extreme deep runs: extend the last known logic (+10 units per step roughly)
        const lastDefinedParams = LADDER[LADDER.length - 1];
        const extraSteps = state.ladderIndex - (LADDER.length - 1);
        multiplier = lastDefinedParams + (extraSteps * 10);
    }

    let betAmount = betLimitMin * multiplier;

    // 5. CLAMP TO LIMITS
    // Ensure we don't exceed table max
    betAmount = Math.min(betAmount, betLimitMax);
    // Ensure we meet table min (redundant if logic uses minOutside, but good safety)
    betAmount = Math.max(betAmount, betLimitMin);

    // 6. SAFETY CHECK: BANKROLL
    if (betAmount > bankroll) {
        // If we can't afford the bet, the strategy usually stops or bets "all in".
        // We will return empty to signal stop/bust.
        return [];
    }

    // 7. PLACE BET
    return [{
        type: betColor,
        amount: betAmount
    }];

}