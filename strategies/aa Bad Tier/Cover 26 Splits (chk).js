/**
 * ============================================================================
 * Roulette Strategy: Cover 26
 * ============================================================================
 * 
 * Source:
 * - Channel: Roulette Strategy / Community Submission
 * - Strategy: Cover 26 Non-Overlapping Splits Progression
 * 
 * The Full Logic in Details:
 * - Triggers & Conditions:
 *   - Bets are placed on every spin.
 *   - Exactly 13 non-overlapping split bets are placed on each spin, covering
 *     a total of 26 unique numbers on the layout.
 *   - The 13 splits are randomly selected each round from a valid pool of
 *     non-overlapping adjacent number pairs on the roulette table.
 * 
 * The Full Bet Progression in Details:
 * - Initial Bet:
 *   - 1 unit (config.betLimits.min) on each of the 13 chosen splits.
 * - On Loss:
 *   - Multiply the unit bet amount by 3 (3x aggressive recovery).
 *   - Randomly re-select 13 non-overlapping splits.
 * - On Win:
 *   - If the current bankroll reaches or exceeds the session's peak bankroll,
 *     reset the bet size back to 1 base unit and update the peak.
 *   - If the current bankroll is still below the session's peak bankroll,
 *     maintain the current unit bet level (same multiplier).
 *   - Randomly re-select 13 non-overlapping splits.
 * 
 * The Goal:
 * - Recover drawdowns quickly using 13 covered splits (paying 17:1 on hit,
 *   yielding +5 units profit per winning spin at base) and lock in new session
 *   profit peaks before resetting.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. All 18 standard non-overlapping split pairs across numbers 1-36
    const ALL_18_DISJOINT_SPLITS = [
        [1, 2],   [4, 5],   [7, 8],   [10, 11], [13, 14], [16, 17],
        [19, 20], [22, 23], [25, 26], [28, 29], [31, 32], [34, 35],
        [3, 6],   [9, 12],  [15, 18], [21, 24], [27, 30], [33, 36]
    ];

    // 2. Initialize State
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.unitMultiplier = 1;
        state.lastBankroll = bankroll;
    }

    // 3. Process Result of Previous Spin
    if (spinHistory && spinHistory.length > 0 && state.lastBankroll !== undefined) {
        const isWin = bankroll > state.lastBankroll;

        if (isWin) {
            if (bankroll >= state.peakBankroll) {
                state.peakBankroll = bankroll;
                state.unitMultiplier = 1; // Reset to base unit on peak profit
            }
            // If win but below peak, unitMultiplier remains unchanged
        } else {
            // On Loss: Increase unit bet by 3x
            state.unitMultiplier *= 3;
        }
    }

    // Update peak bankroll if current bankroll is higher
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 4. Calculate Bet Amount per Split
    const baseUnit = config.betLimits.min;
    let betAmount = baseUnit * state.unitMultiplier;

    // Clamp bet amount to configured table limits
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 5. Check Bankroll Sufficiency (13 splits total)
    const totalRequired = betAmount * 13;
    if (bankroll < totalRequired) {
        betAmount = Math.floor(bankroll / 13);
        if (betAmount < config.betLimits.min) {
            return []; // Not enough funds to meet minimum table limits across 13 splits
        }
    }

    // 6. Randomly select 13 non-overlapping splits from the 18 available
    const shuffledSplits = [...ALL_18_DISJOINT_SPLITS].sort(() => Math.random() - 0.5);
    const selected13Splits = shuffledSplits.slice(0, 13);

    // 7. Store current bankroll for next spin's comparison
    state.lastBankroll = bankroll;

    // 8. Build and Return the Bet Array
    return selected13Splits.map(splitPair => ({
        type: 'split',
        value: splitPair,
        amount: betAmount
    }));
}