/**
 * Strategy: The Shatter Point (Randomized & Non-Overlapping)
 * Source: https://youtu.be/2jH0up3rejw (The Lucky Felt)
 * * Logic Details:
 * - Begins with a small "concentrated block" of inside bets (2 Corners).
 * - Placements for all stages (Corners, Splits, Singles) are generated randomly at the start 
 * and strictly DO NOT overlap (share the same numbers). These exact placements remain fixed until a reset.
 * - When a loss occurs (net loss on the spin), the strategy "shatters" the block to cover more of the board, 
 * first adding 3 Split bets, and upon a subsequent loss, adding 4 Single (straight-up) numbers.
 * - If a win occurs but the bankroll does not exceed the session high, the exact same layout and bet amounts repeat.
 * * Bet Progression (Rotational Press):
 * - Stage 0: Bet 2 Corners at 1 unit.
 * - Stage 1 (after 1st loss): Bet 2 Corners + 3 Splits at 1 unit each.
 * - Stage 2 (after 2nd loss): Bet 2 Corners + 3 Splits + 4 Singles at 1 unit each.
 * - Rotational Press (after 3rd loss and beyond): Methodically add 1 unit to the bet types in rotation:
 * - Next loss: Add 1 unit to Corners.
 * - Next loss: Add 1 unit to Splits.
 * - Next loss: Add 1 unit to Singles.
 * - Repeat rotation.
 * - Reset: Whenever the current bankroll exceeds the highest recorded session bankroll (session high), 
 * the entire progression resets back to Stage 0 at base unit amounts, AND a completely new random, 
 * non-overlapping layout is generated.
 * * Goal:
 * - Grind the house edge down using safe board expansion and a slow, rotating negative progression, 
 * spiking the bankroll to a new session high. Target profit is open-ended, but the system continuously 
 * locks in profit by resetting upon reaching new high-water marks.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.min;
    const increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);

    // Helper to generate a random, non-overlapping layout
    function generateLayout() {
        const covered = new Set();
        const newLayout = { corners: [], splits: [], singles: [] };

        const tryAdd = (nums) => {
            if (nums.some(n => covered.has(n))) return false;
            nums.forEach(n => covered.add(n));
            return true;
        };

        // Generate 2 random valid corners
        while (newLayout.corners.length < 2) {
            const tl = Math.floor(Math.random() * 32) + 1;
            if (tl % 3 === 0) continue; // Invalid top-left for a corner
            if (tryAdd([tl, tl + 1, tl + 3, tl + 4])) newLayout.corners.push(tl);
        }

        // Generate 3 random valid splits (horizontal or vertical)
        while (newLayout.splits.length < 3) {
            const isHoriz = Math.random() > 0.5;
            if (isHoriz) {
                const n = Math.floor(Math.random() * 35) + 1;
                if (n % 3 === 0) continue; // Invalid left side for horizontal split
                if (tryAdd([n, n + 1])) newLayout.splits.push([n, n + 1]);
            } else {
                const n = Math.floor(Math.random() * 33) + 1;
                if (tryAdd([n, n + 3])) newLayout.splits.push([n, n + 3]);
            }
        }

        // Generate 4 random singles (0-36)
        while (newLayout.singles.length < 4) {
            const n = Math.floor(Math.random() * 37);
            if (tryAdd([n])) newLayout.singles.push(n);
        }

        return newLayout;
    }

    // 1. Initialize State
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
        state.layoutStage = 0;
        state.cornerAmt = baseUnit;
        state.splitAmt = baseUnit;
        state.singleAmt = baseUnit;
        state.pressState = 0; // 0 = Corners, 1 = Splits, 2 = Singles
        state.layout = generateLayout();
    }

    // 2. Evaluate previous spin
    if (state.lastBankroll !== undefined) {
        const netProfit = bankroll - state.lastBankroll;
        const isLoss = netProfit < 0;

        if (bankroll > state.sessionHigh) {
            // Reached new session high: Reset completely and pick new numbers
            state.sessionHigh = bankroll;
            state.layoutStage = 0;
            state.cornerAmt = baseUnit;
            state.splitAmt = baseUnit;
            state.singleAmt = baseUnit;
            state.pressState = 0;
            state.layout = generateLayout();
        } else if (isLoss) {
            // Net loss: Expand board or apply Rotational Press
            if (state.layoutStage < 2) {
                state.layoutStage++;
            } else {
                if (state.pressState === 0) {
                    state.cornerAmt = Math.min(state.cornerAmt + increment, config.betLimits.max);
                    state.pressState = 1;
                } else if (state.pressState === 1) {
                    state.splitAmt = Math.min(state.splitAmt + increment, config.betLimits.max);
                    state.pressState = 2;
                } else if (state.pressState === 2) {
                    state.singleAmt = Math.min(state.singleAmt + increment, config.betLimits.max);
                    state.pressState = 0;
                }
            }
        }
    }

    // Update last bankroll for the next spin's evaluation
    state.lastBankroll = bankroll;

    // 3. Build Bets
    const bets = [];

    // Always play corners
    state.layout.corners.forEach(val => {
        bets.push({ type: 'corner', value: val, amount: state.cornerAmt });
    });

    // Play splits if at least Stage 1
    if (state.layoutStage >= 1) {
        state.layout.splits.forEach(val => {
            bets.push({ type: 'split', value: val, amount: state.splitAmt });
        });
    }

    // Play singles if at least Stage 2
    if (state.layoutStage >= 2) {
        state.layout.singles.forEach(val => {
            bets.push({ type: 'number', value: val, amount: state.singleAmt });
        });
    }

    return bets;
}