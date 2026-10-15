/**
 * ============================================================================
 * ROULETTE STRATEGY: Roulette Sneaky Link (Randomized Fixed-Cycle Selection)
 * ============================================================================
 * Source:
 *   - Channel: CEG Dealer School
 *   - Video: "Sneak Way To Win Money On Roulette || Roulette Sneaky Link"
 *   - URL: https://youtu.be/2eDxBap2wIQ
 *
 * Full Logic in Detail:
 *   - At the beginning of a cycle (Stage 1 / Reset), 2 distinct dozens are chosen
 *     at random. A focal number inside the covered territory and an interconnected
 *     chain of valid, touching split bets are dynamically generated.
 *   - These selected dozens and split sequences stay LOCKED across the progression
 *     until a cycle reset occurs (on loss or after completing Stage 3).
 *
 * Betting Progression:
 *   - Stage 1 (Initial / Reset):
 *       - Bet 6 units on the 2 chosen dozens (Total: 12 units).
 *       - No inside bets placed.
 *   - Stage 2 (After 1st Win):
 *       - Press both chosen dozens to 7 units each (Total: 14 units).
 *       - Place 1 unit on each of the first 3 touching splits in the chain.
 *   - Stage 3 (After 2nd consecutive Win):
 *       - Press both chosen dozens to 8 units each (Total: 16 units).
 *       - Expand coverage to all 5 connected splits in the chain (1 unit each).
 *   - Cycle Reset:
 *       - Occurs immediately upon any loss OR upon completing Stage 3 win.
 *       - On reset, a completely new random pair of dozens and touching split link
 *         are chosen for the next cycle.
 *
 * Goal & Limits:
 *   - Uses `config.betLimits` for min/max bounds.
 *   - Exits/aborts if total wager exceeds available bankroll.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const unitOutside = config.betLimits.minOutside || 5;
    const unitInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;

    // Helper: Valid adjacent splits on a standard roulette grid (1-36)
    function getAdjacentSplits(num) {
        const splits = [];
        const col = ((num - 1) % 3) + 1; // Column: 1, 2, or 3

        // Horizontal neighbors (same row, adjacent columns)
        if (col < 3 && num + 1 <= 36) splits.push([num, num + 1]);
        if (col > 1 && num - 1 >= 1) splits.push([num - 1, num]);

        // Vertical neighbors (above / below by +/- 3)
        if (num + 3 <= 36) splits.push([num, num + 3]);
        if (num - 3 >= 1) splits.push([num - 3, num]);

        return splits;
    }

    // Helper: Generate a connected chain of unique, touching splits
    function buildTouchingSplitChain(targetDozens) {
        // Collect available numbers within the 2 selected dozens
        const availableNums = [];
        targetDozens.forEach(d => {
            const start = (d - 1) * 12 + 1;
            for (let n = start; n < start + 12; n++) {
                availableNums.push(n);
            }
        });

        // Pick a random seed number from the chosen dozens
        const seed = availableNums[Math.floor(Math.random() * availableNums.length)];
        const chain = [];
        const splitKey = (s) => `${Math.min(s[0], s[1])}-${Math.max(s[0], s[1])}`;
        const used = new Set();

        let currentFrontier = [seed];

        while (chain.length < 5 && currentFrontier.length > 0) {
            const currentNum = currentFrontier[Math.floor(Math.random() * currentFrontier.length)];
            const neighbors = getAdjacentSplits(currentNum);

            let added = false;
            // Shuffle neighbor candidates
            neighbors.sort(() => Math.random() - 0.5);

            for (const sp of neighbors) {
                const key = splitKey(sp);
                if (!used.has(key)) {
                    used.add(key);
                    chain.push(sp);
                    currentFrontier.push(sp[0], sp[1]);
                    added = true;
                    if (chain.length === 5) break;
                }
            }

            if (!added) {
                // If dead-ended, pick any remaining number from the pool
                const nextNum = availableNums[Math.floor(Math.random() * availableNums.length)];
                currentFrontier.push(nextNum);
            }
        }

        return chain;
    }

    // Initialize or Reset the Cycle with fresh random selections
    function initializeNewCycle() {
        state.stage = 1;

        // Randomly pick 2 distinct dozens from [1, 2, 3]
        const allDozens = [1, 2, 3].sort(() => Math.random() - 0.5);
        state.targetDozens = [allDozens[0], allDozens[1]];

        // Build a fresh chain of 5 connected splits touching within the board
        state.splitChain = buildTouchingSplitChain(state.targetDozens);
        state.activeSplits = [];
    }

    // Initialize if brand new session
    if (state.stage === undefined || !state.targetDozens || !state.splitChain) {
        initializeNewCycle();
    }

    // Evaluate previous spin result to advance stage or trigger reset
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        const inDozen1 = lastNumber >= 1 && lastNumber <= 12;
        const inDozen2 = lastNumber >= 13 && lastNumber <= 24;
        const inDozen3 = lastNumber >= 25 && lastNumber <= 36;

        let wonDozen = false;
        if (state.targetDozens.includes(1) && inDozen1) wonDozen = true;
        if (state.targetDozens.includes(2) && inDozen2) wonDozen = true;
        if (state.targetDozens.includes(3) && inDozen3) wonDozen = true;

        let wonSplit = false;
        if (state.activeSplits && state.activeSplits.length > 0) {
            for (let i = 0; i < state.activeSplits.length; i++) {
                const s = state.activeSplits[i];
                if (Array.isArray(s) && (s[0] === lastNumber || s[1] === lastNumber)) {
                    wonSplit = true;
                    break;
                }
            }
        }

        const won = wonDozen || wonSplit;

        if (won) {
            if (state.stage === 1) {
                state.stage = 2;
            } else if (state.stage === 2) {
                state.stage = 3;
            } else {
                // Completed Stage 3 win; reset and re-randomize for new cycle
                initializeNewCycle();
            }
        } else {
            // Loss resets and re-randomizes selection for the new cycle
            initializeNewCycle();
        }
    }

    // Helper to clamp bet amounts to configured boundaries
    function clampBet(amt, minLimit) {
        return Math.min(Math.max(amt, minLimit), maxBet);
    }

    const bets = [];

    // Construct locked bet placement for current stage
    if (state.stage === 1) {
        const dozenAmt = clampBet(unitOutside * 6, unitOutside);
        bets.push({ type: 'dozen', value: state.targetDozens[0], amount: dozenAmt });
        bets.push({ type: 'dozen', value: state.targetDozens[1], amount: dozenAmt });
        state.activeSplits = [];
    } else if (state.stage === 2) {
        const dozenAmt = clampBet(unitOutside * 7, unitOutside);
        bets.push({ type: 'dozen', value: state.targetDozens[0], amount: dozenAmt });
        bets.push({ type: 'dozen', value: state.targetDozens[1], amount: dozenAmt });

        const splitAmt = clampBet(unitInside * 1, unitInside);
        state.activeSplits = state.splitChain.slice(0, 3);
        for (let i = 0; i < state.activeSplits.length; i++) {
            bets.push({ type: 'split', value: state.activeSplits[i], amount: splitAmt });
        }
    } else if (state.stage === 3) {
        const dozenAmt = clampBet(unitOutside * 8, unitOutside);
        bets.push({ type: 'dozen', value: state.targetDozens[0], amount: dozenAmt });
        bets.push({ type: 'dozen', value: state.targetDozens[1], amount: dozenAmt });

        const splitAmt = clampBet(unitInside * 1, unitInside);
        state.activeSplits = state.splitChain.slice(0, 5);
        for (let i = 0; i < state.activeSplits.length; i++) {
            bets.push({ type: 'split', value: state.activeSplits[i], amount: splitAmt });
        }
    }

    // Bankroll check
    const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalWager > bankroll) {
        return [];
    }

    return bets;
}