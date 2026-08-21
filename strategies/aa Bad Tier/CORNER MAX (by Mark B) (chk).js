/**
 * SOURCE:
 * - Video URL: https://youtu.be/qWE0DvDa9OI
 * - YouTube Channel: Bet With Mo
 * - Strategy Name: CORNER MAX (by Mark B) - Randomized Non-Overlapping Corners Variation
 *
 * THE FULL LOGIC IN DETAIL:
 * - Covers Dozen 1 (4 units), Dozen 2 (4 units), and 5 randomly selected, non-overlapping Corner bets (1 unit each).
 * - Corner Selection:
 *     - 5 valid corners are randomly chosen such that none share any overlapping numbers on the board.
 *     - Corners remain locked across spins and are only re-rolled upon a strategy reset (level 1 / profit target reached).
 *
 * THE FULL BET PROGRESSION:
 * - On Win (Net positive / Big Hit):
 *     - Reset progression level back to 1 and re-roll 5 new non-overlapping corners.
 * - On Small Loss (partial payout / small negative outcome):
 *     - Flat rebet at the current progression level with the same corner selections.
 * - On Big Loss (complete miss, 0/00, or uncovered number):
 *     - Step up progression level by +1 unit multiplier while keeping the active corner layout.
 *
 * THE GOAL:
 * - Accumulate session profit and reset upon achieving recovery or peak gains.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Helper function to get the 4 covered numbers for a top-left corner value
    function getCornerNumbers(val) {
        return [val, val + 1, val + 3, val + 4];
    }

    // Helper function to generate 5 random, strictly non-overlapping corners
    function generateNonOverlappingCorners() {
        const allPossibleCorners = [];
        for (let col = 0; col < 11; col++) {
            const base = col * 3 + 1;
            allPossibleCorners.push(base);     // Bottom-left (e.g., 1 covers 1,2,4,5)
            allPossibleCorners.push(base + 1); // Middle-left (e.g., 2 covers 2,3,5,6)
        }

        // Shuffle candidate corners
        const shuffled = [...allPossibleCorners].sort(() => Math.random() - 0.5);
        const selected = [];
        const coveredNumbers = new Set();

        for (const corner of shuffled) {
            const numbers = getCornerNumbers(corner);
            const hasOverlap = numbers.some(n => coveredNumbers.has(n));

            if (!hasOverlap) {
                selected.push(corner);
                numbers.forEach(n => coveredNumbers.add(n));
                if (selected.length === 5) break;
            }
        }

        return selected;
    }

    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.lastBankroll = bankroll;
        state.initialBankroll = bankroll;
        state.peakBankroll = bankroll;
        state.corners = generateNonOverlappingCorners();
    }

    // 2. Track bankroll and outcome of the previous spin
    if (spinHistory && spinHistory.length > 0) {
        const lastProfit = bankroll - state.lastBankroll;

        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
        }

        if (lastProfit > 0) {
            // Net Win: Reset progression and re-roll corners on reset
            if (bankroll >= state.peakBankroll || state.level <= 1) {
                state.level = 1;
                state.corners = generateNonOverlappingCorners();
            } else {
                state.level = Math.max(1, state.level - 1);
                if (state.level === 1) {
                    state.corners = generateNonOverlappingCorners();
                }
            }
        } else if (lastProfit === 0) {
            state.level = state.level || 1;
        } else {
            // Loss evaluation
            const insideUnit = config.betLimits.min;
            const threshold = insideUnit * 6 * state.level;

            if (Math.abs(lastProfit) < threshold) {
                // Small loss: Rebet same level and retain corners
                state.level = state.level || 1;
            } else {
                // Big loss: Step up progression and retain corners
                state.level = (state.level || 1) + 1;
            }
        }
    }

    state.lastBankroll = bankroll;

    // 3. Ensure valid corners exist
    if (!state.corners || state.corners.length < 5) {
        state.corners = generateNonOverlappingCorners();
    }

    // 4. Determine base unit sizing respecting limits
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;

    const cornerUnit = Math.max(minInside, Math.floor(minOutside / 4) || 1);
    const dozenUnit = Math.max(minOutside, cornerUnit * 4);

    const cornerAmount = Math.min(
        config.betLimits.max,
        Math.max(minInside, cornerUnit * state.level)
    );

    const dozenAmount = Math.min(
        config.betLimits.max,
        Math.max(minOutside, dozenUnit * state.level)
    );

    // 5. Construct Bet Array (Dozen 1, Dozen 2, + 5 Locked Non-Overlapping Corners)
    const bets = [
        { type: 'dozen', value: 1, amount: dozenAmount },
        { type: 'dozen', value: 2, amount: dozenAmount }
    ];

    for (const cornerVal of state.corners) {
        bets.push({ type: 'corner', value: cornerVal, amount: cornerAmount });
    }

    return bets;
}