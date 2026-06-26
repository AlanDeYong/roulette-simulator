/**
 * SUPREME FIBONACCI Roulette Strategy
 * * * Source: https://youtu.be/AYl0hyHtn5A (YouTube Channel: Bet With Mo)
 * * * The Full Logic in details:
 * - This strategy places 3 simultaneous bets: two double streets (lines) and one column.
 * - It tracks the session's peak bankroll (high watermark) to determine progression resets.
 * - On a net loss (bankroll decreases), the strategy advances to the next level in the progression.
 * - On a net win that sets a new session peak profit, the progression completely resets to Level 1.
 * - On a net win that does NOT reach the session peak profit, it triggers a strict REBET at the current level.
 * - A push (e.g., hitting the column but losing both line bets) results in no net bankroll change,
 * holding the progression level steady as a "free spin".
 * * * The Full Bet Progression in details:
 * - Base positioning: Double Street 10-15 (Line 10), Double Street 22-27 (Line 22), and the 3rd Column.
 * - Bet sizes scale across a 10-level sequence following a modified Fibonacci progression:
 * Multipliers: 1, 2, 3, 5, 8, 13, 21, 34, 55, and a final double-up level of 110.
 * - Individual bets are scaled dynamically based on their respective table minimums (inside vs outside limits)
 * to guarantee compliance with table rules and prevent the execution engine from invalidating bets.
 * * * The Goal:
 * - To systematically recover losses through wide board coverage (~80.8% coverage) and structured
 * stepped progression, resetting to base units immediately upon hitting a new session profit peak.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize session tracking states on the very first execution
    if (state.progressionIndex === undefined) {
        state.progressionIndex = 0;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // 2. Evaluate previous round performance based on direct bankroll shifts
    if (spinHistory.length > 0) {
        if (bankroll > state.lastBankroll) {
            // We had a winning round
            if (bankroll > state.peakBankroll) {
                // New session peak reached -> Reset progression
                state.peakBankroll = bankroll;
                state.progressionIndex = 0;
            }
            // If it's a win but below peak, index remains unchanged (Triggers Rebet)
        } else if (bankroll < state.lastBankroll) {
            // We had a losing round -> Step up the Fibonacci ladder
            state.progressionIndex++;
        }
        // If bankroll === state.lastBankroll, it's a push. Level is held constant.
    }

    // 3. Cap the progression to the maximum allowed sequence level (10 levels total, indices 0-9)
    if (state.progressionIndex > 9) {
        state.progressionIndex = 9;
    }

    // 4. Define the strategy multiplier array
    const sequence = [1, 2, 3, 5, 8, 13, 21, 34, 55, 110];
    const multiplier = sequence[state.progressionIndex];

    // 5. Update bankroll snapshot for the next round evaluation
    state.lastBankroll = bankroll;

    // 6. Calculate bet amounts independently to strictly comply with individual table limits
    let lineAmount = config.betLimits.min * multiplier;
    let columnAmount = config.betLimits.minOutside * multiplier;

    // Apply incremental configurations if specified
    if (config.incrementMode === 'fixed' && config.minIncrementalBet) {
        lineAmount = Math.max(lineAmount, config.betLimits.min + (config.minIncrementalBet * state.progressionIndex));
        columnAmount = Math.max(columnAmount, config.betLimits.minOutside + (config.minIncrementalBet * state.progressionIndex));
    }

    // Strict clamping to maximum limits to prevent engine rejection
    lineAmount = Math.min(lineAmount, config.betLimits.max);
    columnAmount = Math.min(columnAmount, config.betLimits.max);

    // 7. Output the standardized bet objects array
    return [
        { type: 'line', value: 10, amount: lineAmount },
        { type: 'line', value: 22, amount: columnAmount }, // Handled inside the table parameters
        { type: 'column', value: 3, amount: columnAmount }
    ];
}