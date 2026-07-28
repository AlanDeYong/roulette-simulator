/**
 * Strategy: Gold Panning (Gold Mining) - Corrected Layout
 * Source: https://youtu.be/We_e28z6558
 * Channel: The Roulette Master
 *
 * --- FULL LOGIC IN DETAIL ---
 * The strategy places bets covering the 2nd and 3rd dozens, utilizing a combination
 * of Dozen outside bets, Double Street (Line) bets, and Split bets.
 *
 * Bet Layout:
 *   - Dozen Bets (3 units each):
 *     • 2nd Dozen (13-24)
 *     • 3rd Dozen (25-36)
 *   - Line (Double Street) Bets (1 unit each):
 *     • Line 13 (covers 13-18)
 *     • Line 16 (covers 16-21)
 *     • Line 22 (covers 22-27)
 *     • Line 25 (covers 25-30)
 *   - Split Bets (1 unit each):
 *     • Split [14, 17]
 *     • Split [15, 18]
 *     • Split [17, 21]
 *     • Split [18, 21]
 *     • Split [23, 26]
 *     • Split [24, 27]
 *     • Split [26, 29]
 *     • Split [27, 30]
 *
 * --- BET PROGRESSION IN DETAIL ---
 * - On Loss (Net negative spin):
 *   Increase all dozen bets by their respective base bet amount (3 units per loss level).
 *   Line and Split bets remain at their fixed initial base amount (1 unit).
 * - On Win/Push:
 *   Maintain current bet level until cumulative bankroll reaches a new session peak,
 *   at which point dozen bets reset to their initial 3-unit base level.
 *
 * --- GOAL ---
 * Lock in profit upon reaching a new bankroll peak and reset progression to base units.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    // Unit definition
    const unitInside = Math.max(1, minInside);
    const unitOutside = Math.max(1, minOutside);

    // Base amounts: 3 units for Dozens, 1 unit for Line/Split inside bets
    const baseDozenAmount = unitOutside * 3;
    const baseInsideAmount = unitInside * 1;

    // State initialization
    if (state.dozenLevel === undefined) {
        state.dozenLevel = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // Evaluate spin outcome
    if (spinHistory.length > 0) {
        const netChange = bankroll - state.lastBankroll;

        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
            state.dozenLevel = 1; // Reset progression on new peak
        } else if (netChange < 0) {
            state.dozenLevel += 1; // Increase dozen level on loss
        }
    }

    state.lastBankroll = bankroll;

    // Calculate progression for dozen bets
    const currentDozenAmount = Math.min(
        Math.max(baseDozenAmount * state.dozenLevel, minOutside),
        maxBet
    );

    const currentInsideAmount = Math.min(
        Math.max(baseInsideAmount, minInside),
        maxBet
    );

    return [
        // Dozen Bets (3 units base)
        { type: 'dozen', value: 2, amount: currentDozenAmount },
        { type: 'dozen', value: 3, amount: currentDozenAmount },

        // Double Street / Line Bets (1 unit)
        { type: 'line', value: 13, amount: currentInsideAmount },
        { type: 'line', value: 16, amount: currentInsideAmount },
        { type: 'line', value: 22, amount: currentInsideAmount },
        { type: 'line', value: 25, amount: currentInsideAmount },

        // Split Bets (1 unit)
        { type: 'split', value: [14, 17], amount: currentInsideAmount },
        { type: 'split', value: [15, 18], amount: currentInsideAmount },
        { type: 'split', value: [17, 21], amount: currentInsideAmount },
        { type: 'split', value: [18, 21], amount: currentInsideAmount },
        { type: 'split', value: [23, 26], amount: currentInsideAmount },
        { type: 'split', value: [24, 27], amount: currentInsideAmount },
        { type: 'split', value: [26, 29], amount: currentInsideAmount },
        { type: 'split', value: [27, 30], amount: currentInsideAmount }
    ];
}