/**
 * ============================================================================
 * STRATEGY: Sliding Dozens Strategy
 * ============================================================================
 * Source: https://youtu.be/yNpFNsNFLaU
 * Channel: The Roulette Factory
 * 
 * THE FULL LOGIC IN DETAILS:
 * - This strategy alternates ("slides") between betting on two dozens (e.g., 1st 12 and 2nd 12)
 *   and betting on the single remaining uncovered dozen (3rd 12).
 * - Initial Bet: Starts on Level 1 by placing 1 base unit on the First Dozen and 1 base unit
 *   on the Second Dozen.
 * - On Win:
 *   - If the current bankroll reaches or exceeds a new session high (high-water mark),
 *     the progression fully resets back to Level 1 (1 unit each on 1st & 2nd dozen).
 *   - If the current bankroll is below the session high, hold the current bet position and level (repeat).
 * - On Loss:
 *   - Step up progression level by +1 unit (Level 1 -> Level 2 -> Level 3...).
 *   - Slide target coverage:
 *     - If currently covering 2 dozens, slide to the single uncovered dozen.
 *     - If currently covering 1 dozen, slide back to covering 2 dozens.
 * 
 * THE FULL BET PROGRESSION IN DETAILS:
 * - Level 1: 1 unit on 1st Dozen, 1 unit on 2nd Dozen (Total: 2 units)
 * - Level 2 (after loss): 2 units on 3rd Dozen (Total: 2 units)
 * - Level 3 (after loss): 3 units on 1st Dozen, 3 units on 2nd Dozen (Total: 6 units)
 * - Level 4 (after loss): 4 units on 3rd Dozen (Total: 4 units)
 * - Level 5 (after loss): 5 units on 1st Dozen, 5 units on 2nd Dozen (Total: 10 units)
 * - Continues laddering up +1 unit level per loss, sliding coverage back and forth until net recovery.
 * 
 * THE GOAL:
 * - Recover previous drawdown and hit new session profit highs through 66% board coverage,
 *   capitalizing on streakiness and gradual unit increments.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.minOutside;

    // 1. Initialize State Variables
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
        state.level = 1;
        state.coverageMode = 'two'; // 'two' = 1st & 2nd dozen, 'one' = 3rd dozen
    }

    // Update Session High Mark
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
    }

    // 2. Process Last Spin Result (if history exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Calculate if last spin won
        let lastWon = false;
        if (lastNum >= 1 && lastNum <= 36) {
            const lastDozen = Math.ceil(lastNum / 12);
            if (state.coverageMode === 'two' && (lastDozen === 1 || lastDozen === 2)) {
                lastWon = true;
            } else if (state.coverageMode === 'one' && lastDozen === 3) {
                lastWon = true;
            }
        }

        if (lastWon) {
            // Reset to Level 1 if bankroll reaches or surpasses previous session high
            if (bankroll >= state.sessionHigh) {
                state.level = 1;
                state.coverageMode = 'two';
            }
            // Else maintain current level and coverage mode (hold bet)
        } else {
            // On Loss: Ladder up level and slide coverage target
            state.level += 1;
            state.coverageMode = state.coverageMode === 'two' ? 'one' : 'two';
        }
    }

    // 3. Calculate Bet Amounts and Clamp to Config Limits
    let unitAmount = baseUnit * state.level;
    unitAmount = Math.max(unitAmount, config.betLimits.minOutside);
    unitAmount = Math.min(unitAmount, config.betLimits.max);

    // 4. Construct Bet Array
    const bets = [];
    if (state.coverageMode === 'two') {
        bets.push({ type: 'dozen', value: 1, amount: unitAmount });
        bets.push({ type: 'dozen', value: 2, amount: unitAmount });
    } else {
        bets.push({ type: 'dozen', value: 3, amount: unitAmount });
    }

    return bets;
}