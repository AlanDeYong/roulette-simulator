/**
 * Source: https://www.youtube.com/watch?v=DYP4CoNXP74 (The Roulette Master)
 * Strategy: Champion Roulette
 *
 * The Full Logic in details:
 * - This strategy focuses exclusively on Dozen bets (12 numbers).
 * - Target Selection: The strategy targets the "sleeping" dozen—the one that has 
 *   not hit for the longest number of spins.
 * - Once a dozen is targeted, the strategy stays on that specific dozen until a win occurs.
 * - After a win, the strategy re-evaluates the spin history and selects the new 
 *   longest sleeping dozen.
 *
 * The Full Bet Progression in details:
 * - The system uses a slow, stepped progression defined by "Levels" to survive long losing streaks.
 * - Level 1: Starts at 1 unit. Increases by 1 unit after every loss.
 * - Level 2: Starts at 3 units. Increases by 2 units after every loss.
 * - Level 3: Starts at 4 units. Increases by 3 units after every loss.
 * - Level 4+: Starts at (Level + 1) units. Increases by (Level) units after every loss.
 * 
 * - After a Loss: The bet increases by the step size of the current Level.
 * - After a Win: 
 *   - The strategy checks if the overall bankroll is in profit compared to the session start (High Water Mark).
 *   - If in profit: Completely reset to Level 1 (1 unit bet, 1 unit step).
 *   - If still in deficit (not in profit): Do NOT reset to base. Instead, increase the Level by 1 
 *     (e.g., jump from Level 1 to Level 2), setting the new starting bet and new step size.
 *
 * The Goal: 
 * - Survive long dozen losing streaks using a slow linear progression, then leverage 
 *   the accelerated progression Levels to recover the deficit upon winning, ultimately 
 *   reaching a new session bankroll high.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.minOutside;

    // 1. Initialize State
    if (state.highWaterMark === undefined) {
        state.highWaterMark = bankroll;
        state.stepLevel = 1;
        state.currentBetUnits = 1;
        state.targetDozen = null;
    }

    // 2. Helper to find the sleeping dozen
    function getSleepingDozen() {
        if (!spinHistory || spinHistory.length === 0) return 3; // Video starts on 3rd 12

        let lastSeen = { 1: -1, 2: -1, 3: -1 };
        for (let i = 0; i < spinHistory.length; i++) {
            let n = spinHistory[i].winningNumber;
            if (n >= 1 && n <= 12) lastSeen[1] = i;
            else if (n >= 13 && n <= 24) lastSeen[2] = i;
            else if (n >= 25 && n <= 36) lastSeen[3] = i;
        }

        let sleeping = 1;
        let minIndex = lastSeen[1];
        if (lastSeen[2] < minIndex) { sleeping = 2; minIndex = lastSeen[2]; }
        if (lastSeen[3] < minIndex) { sleeping = 3; minIndex = lastSeen[3]; }

        return sleeping;
    }

    // 3. Initial Target Selection
    if (state.targetDozen === null) {
        state.targetDozen = getSleepingDozen();
    }

    // 4. Process Previous Spin Result
    if (spinHistory.length > 0 && state.lastBetPlaced) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Determine if our targeted dozen won
        const won = (state.targetDozen === 1 && num >= 1 && num <= 12) ||
                    (state.targetDozen === 2 && num >= 13 && num <= 24) ||
                    (state.targetDozen === 3 && num >= 25 && num <= 36);

        if (won) {
            // Check if we hit session profit
            if (bankroll >= state.highWaterMark) {
                // Full Reset
                state.highWaterMark = bankroll; 
                state.stepLevel = 1;
                state.currentBetUnits = 1;
            } else {
                // Won, but still in deficit -> Increase Level
                state.stepLevel++;
                state.currentBetUnits = state.stepLevel === 1 ? 1 : state.stepLevel + 1;
            }
            // Pick a new dozen after any win
            state.targetDozen = getSleepingDozen();
        } else {
            // Lost -> Increase bet by the current level's step size
            state.currentBetUnits += state.stepLevel;
        }
    }

    // 5. Calculate Bet Amount & Clamp to Limits
    let amount = state.currentBetUnits * unit;
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 6. Record action for next evaluation
    state.lastBetPlaced = true;

    // 7. Execute Bet
    return [{ type: 'dozen', value: state.targetDozen, amount: amount }];
}