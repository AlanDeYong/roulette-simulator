/**
 * Source: https://youtu.be/wAPpHeRTQP0
 * Channel Name: The Roulette Factory
 * Strategy: 6-Corner Sector Mod #3 (6 Corner Positive Fibonacci Progression)
 *
 * THE FULL LOGIC IN DETAIL:
 * - Bet Placement:
 *   The strategy covers 6 corner bets on the roulette board:
 *   1. Corner 2-3-5-6 (value: 2)
 *   2. Corner 4-5-7-8 (value: 4)
 *   3. Corner 14-15-17-18 (value: 14)
 *   4. Corner 16-17-19-20 (value: 16)
 *   5. Corner 20-21-23-24 / 20-21-33-34 sector coverage (value: 20)
 *   6. Corner 31-32-34-35 (value: 31)
 *
 * THE FULL BET PROGRESSION IN DETAIL:
 * - Sequence: Fibonacci sequence units: [1, 2, 3, 5, 8, 13, 21, 34, 55, ...]
 * - Positive Progression Rule:
 *   - Initial Bet: Level 0 (1 unit per corner, total 6 units).
 *   - On WIN: If bankroll hits a new peak session high, reset to Level 0 (1 unit).
 *     Otherwise, step UP 1 level in the Fibonacci sequence on wins.
 *   - On LOSS: Hold the current bet level ("foot off the gas"). Do not increase bet amounts on losses.
 * - Reset Condition: Reset to base bet (1 unit per corner) whenever current bankroll hits a new high bankroll peak.
 *
 * THE GOAL:
 * - Target Profit: Capitalize on positive streaks to continuously achieve new session highs across a spin session.
 * - Stop Loss: Protected by holding bet levels on loss streaks and capped by bankroll depletion or maximum allowed bet limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Corrected 6 corner bet top-left reference values
    const corners = [2, 4, 14, 16, 20, 31];

    // Determine base unit based on minimum inside bet limit
    const baseUnit = config.betLimits.min || 1;

    // Fibonacci progression multipliers
    const fibSequence = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

    // Initialize persistent state variables on the first run
    if (state.progressionIndex === undefined) {
        state.progressionIndex = 0;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // Process outcome of the previous spin if history exists
    if (spinHistory && spinHistory.length > 0) {
        const wonPrevious = bankroll > state.lastBankroll;

        if (bankroll > state.peakBankroll) {
            // Reached a new peak session high -> reset progression back to base level
            state.peakBankroll = bankroll;
            state.progressionIndex = 0;
        } else if (wonPrevious) {
            // Positive progression: Move up one step on a win
            state.progressionIndex = Math.min(state.progressionIndex + 1, fibSequence.length - 1);
        } else {
            // On loss: Hold current bet level
        }
    }

    // Update last bankroll for next turn comparison
    state.lastBankroll = bankroll;

    // Calculate current unit multiplier from Fibonacci sequence
    const currentMultiplier = fibSequence[state.progressionIndex];

    // Calculate bet amount per corner and clamp to configured bet limits
    let amountPerCorner = baseUnit * currentMultiplier;
    amountPerCorner = Math.max(amountPerCorner, config.betLimits.min);
    amountPerCorner = Math.min(amountPerCorner, config.betLimits.max);

    // Build and return array of corner bet objects
    return corners.map(cornerVal => ({
        type: 'corner',
        value: cornerVal,
        amount: amountPerCorner
    }));
}