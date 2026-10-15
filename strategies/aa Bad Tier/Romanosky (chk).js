/**
 * Romanosky Roulette Strategy
 *
 * Source:
 * - URL: https://youtu.be/V9FHYFWBsgw
 * - Channel: CEG Dealer School / Casino Quest
 *
 * The Full Logic in Detail:
 * - The Romanosky strategy covers 32 out of 37 numbers on a European wheel (86.48% coverage).
 * - It places bets on two Dozens (3 units each) and two Corner bets (1 unit each) inside the remaining uncovered Dozen.
 * - This leaves only 4 numbers in the uncovered Dozen plus the zero (5 numbers total) unprotected.
 * - Placement selection:
 *   - The Dozen that contains the last winning number and the adjacent/preceding Dozen are covered.
 *   - The remaining unselected Dozen is protected by placing two 4-number Corner bets (e.g., corners on rows 1-2 and rows 3-4, leaving row 2-3 middle lane uncovered).
 *   - Specifically:
 *     - If leaving Dozen 1 open: Corners placed at top-left 1 ([1,2,4,5]) and 8 ([8,9,11,12]).
 *     - If leaving Dozen 2 open: Corners placed at top-left 13 ([13,14,16,17]) and 20 ([20,21,23,24]).
 *     - If leaving Dozen 3 open: Corners placed at top-left 25 ([25,26,28,29]) and 32 ([32,33,35,36]).
 *
 * The Full Bet Progression in Detail:
 * - Base Bet Structure:
 *   - 3 units on Dozen A
 *   - 3 units on Dozen B
 *   - 1 unit on Corner 1
 *   - 1 unit on Corner 2
 *   Total bet per stage = 8 units.
 * - Payout Mechanics:
 *   - Any Dozen win returns 9 units on an 8-unit layout (Net +1 unit).
 *   - Any Corner win returns 9 units on an 8-unit layout (Net +1 unit).
 * - On Win:
 *   - If bankroll hits a new peak or session target, reset multiplier to 1.
 *   - Otherwise, if recovering, remain or step down to 1.
 * - On Loss (Uncovered number or 0 hits):
 *   - Increase progression multiplier (Martingale: 1 -> 2 -> 4 -> 8...) to recover losses.
 *   - Clamped strictly by table maximums and available bankroll.
 *
 * The Goal:
 * - High-frequency steady grind to accumulate unit wins, resetting after every loss recovery.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.multiplier) state.multiplier = 1;
    if (state.lastBankroll === undefined) state.lastBankroll = bankroll;
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;

    // Track peak bankroll to detect complete recovery
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
        state.multiplier = 1;
    } else if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinNum = lastSpin.winningNumber;

        // Check if last spin resulted in a bankroll drop (loss)
        if (bankroll < state.lastBankroll) {
            state.multiplier = Math.min(state.multiplier * 2, 64);
        } else {
            // Check if we recovered
            if (bankroll >= state.peakBankroll) {
                state.multiplier = 1;
            }
        }
    }
    state.lastBankroll = bankroll;

    // 2. Determine Unit Sizing
    const minInside = config.betLimits.min || 2;
    const minOutside = config.betLimits.minOutside || 5;
    const maxLimit = config.betLimits.max || 500;

    // A single base unit must satisfy minimums for both inside and outside positions
    const unitSize = Math.max(minInside, Math.ceil(minOutside / 3));

    let dozenBetAmount = Math.max(minOutside, unitSize * 3 * state.multiplier);
    let cornerBetAmount = Math.max(minInside, unitSize * 1 * state.multiplier);

    // Enforce maximum bet constraints
    dozenBetAmount = Math.min(dozenBetAmount, maxLimit);
    cornerBetAmount = Math.min(cornerBetAmount, maxLimit);

    // 3. Determine Layout Configuration
    // Target the uncovered dozen based on the last winning number
    let uncoveredDozen = 3;
    if (spinHistory.length > 0) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        if (lastNum >= 1 && lastNum <= 12) {
            uncoveredDozen = 3; // Cover Dozens 1 & 2, corners in 3
        } else if (lastNum >= 13 && lastNum <= 24) {
            uncoveredDozen = 1; // Cover Dozens 2 & 3, corners in 1
        } else if (lastNum >= 25 && lastNum <= 36) {
            uncoveredDozen = 2; // Cover Dozens 1 & 3, corners in 2
        }
    }

    const bets = [];

    if (uncoveredDozen === 1) {
        // Cover Dozens 2 & 3
        bets.push({ type: 'dozen', value: 2, amount: dozenBetAmount });
        bets.push({ type: 'dozen', value: 3, amount: dozenBetAmount });
        // Corners in Dozen 1: [1,2,4,5] (top-left 1) and [8,9,11,12] (top-left 8)
        bets.push({ type: 'corner', value: 1, amount: cornerBetAmount });
        bets.push({ type: 'corner', value: 8, amount: cornerBetAmount });
    } else if (uncoveredDozen === 2) {
        // Cover Dozens 1 & 3
        bets.push({ type: 'dozen', value: 1, amount: dozenBetAmount });
        bets.push({ type: 'dozen', value: 3, amount: dozenBetAmount });
        // Corners in Dozen 2: [13,14,16,17] (top-left 13) and [20,21,23,24] (top-left 20)
        bets.push({ type: 'corner', value: 13, amount: cornerBetAmount });
        bets.push({ type: 'corner', value: 20, amount: cornerBetAmount });
    } else {
        // Cover Dozens 1 & 2
        bets.push({ type: 'dozen', value: 1, amount: dozenBetAmount });
        bets.push({ type: 'dozen', value: 2, amount: dozenBetAmount });
        // Corners in Dozen 3: [25,26,28,29] (top-left 25) and [32,33,35,36] (top-left 32)
        bets.push({ type: 'corner', value: 25, amount: cornerBetAmount });
        bets.push({ type: 'corner', value: 32, amount: cornerBetAmount });
    }

    // Ensure total bet does not exceed current bankroll
    const totalRequired = (dozenBetAmount * 2) + (cornerBetAmount * 2);
    if (bankroll < totalRequired) {
        // Downscale or abort if insufficient funds
        if (bankroll < (minOutside * 2 + minInside * 2)) {
            return [];
        }
        state.multiplier = 1;
        const fallbackDozen = minOutside;
        const fallbackCorner = minInside;
        return bets.map(b => ({
            ...b,
            amount: b.type === 'dozen' ? fallbackDozen : fallbackCorner
        }));
    }

    return bets;
}