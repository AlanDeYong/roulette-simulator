/**
 * 5 Corners Roulette Strategy (Randomized Non-Overlapping Corners)
 * 
 * Source: https://youtu.be/34LBR338grU
 * Channel: Gamblers University
 * 
 * The Full Logic in Details:
 * - Buy-in / Bankroll: $200 target start bankroll.
 * - Win Goal: $20 profit per session.
 * - Bet Selection Strategy:
 *   - Corners are randomly selected under two strict constraints:
 *     1) No corners overlap with each other (share numbers).
 *     2) No single corner spans across two dozens (e.g. crossing 12/13 or 24/25).
 *   - Once selected, the set of corners remains FIXED throughout the session until a reset occurs.
 *   - Base Game (Level 1): 5 randomly selected non-overlapping valid corners.
 *   - Extended Game (Level 2+): 6 randomly selected non-overlapping valid corners.
 * 
 * The Full Bet Progression in Details:
 * - Level 1: 1 unit on each of the 5 fixed corners ($5 total for $1 units).
 * - Level 2: 2 units on each of the 6 fixed corners ($12 total for $1 units).
 * - Level 3: 3 units on each of the 6 fixed corners ($18 total for $1 units).
 * - Level N: N units on each of the 6 fixed corners.
 * - After a LOSS: Advance to the next level (Level N -> Level N+1).
 * - After a WIN: Check if current bankroll achieves a new session high or hits target win goal ($20+ profit).
 *   If a new session high or target is reached, reset to Level 1 and pick a NEW set of fixed random corners.
 * 
 * Goal:
 * - Reach +$20 profit relative to starting bankroll and stop or reset session.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Helper function to get all numbers covered by a corner (value = top-left number)
    function getCornerNumbers(topLeft) {
        return [topLeft, topLeft + 1, topLeft + 3, topLeft + 4];
    }

    // Helper function to check if a corner spans across two dozens
    function isWithinSingleDozen(topLeft) {
        const nums = getCornerNumbers(topLeft);
        const dozenIndex = Math.floor((nums[0] - 1) / 12);
        return nums.every(n => Math.floor((n - 1) / 12) === dozenIndex);
    }

    // Generator function to pick N non-overlapping, valid corners
    function pickRandomCorners(count) {
        // All valid top-left numbers for corners on a 1-36 grid
        const validTopLefts = [];
        for (let row = 0; row < 11; row++) {
            for (let col = 1; col <= 2; col++) {
                const topLeft = row * 3 + col;
                if (isWithinSingleDozen(topLeft)) {
                    validTopLefts.push(topLeft);
                }
            }
        }

        // Shuffle candidate top-left positions
        const shuffled = [...validTopLefts].sort(() => Math.random() - 0.5);

        const selectedCorners = [];
        const usedNumbers = new Set();

        for (const topLeft of shuffled) {
            const cornerNums = getCornerNumbers(topLeft);
            const hasOverlap = cornerNums.some(num => usedNumbers.has(num));

            if (!hasOverlap) {
                selectedCorners.push(topLeft);
                cornerNums.forEach(num => usedNumbers.add(num));
            }

            if (selectedCorners.length === count) {
                break;
            }
        }

        return selectedCorners;
    }

    // Helper to generate and store fixed session corners (5 for Level 1, 6 total for Level 2+)
    function generateSessionCorners() {
        // Pick 6 non-overlapping valid corners; first 5 are for Level 1, all 6 for Level 2+
        state.selectedCorners = pickRandomCorners(6);
    }

    // 1. Initialize State
    if (state.sessionStartBankroll === undefined) {
        state.sessionStartBankroll = bankroll;
        state.sessionHighBankroll = bankroll;
        state.level = 1;
        generateSessionCorners();
    }

    const winGoal = 2000;
    const baseUnit = config.betLimits.min;

    // 2. Evaluate Last Spin Result (if history exists)
    if (spinHistory && spinHistory.length > 0) {
        if (bankroll > state.sessionHighBankroll) {
            state.sessionHighBankroll = bankroll;
        }

        const netProfit = bankroll - state.sessionStartBankroll;

        // Stop placing bets if win goal achieved
        if (netProfit >= winGoal) {
            return [];
        }

        const lastResult = spinHistory[spinHistory.length - 1];

        // Determine active corners for the previous spin level
        const activeCorners = state.level === 1 
            ? state.selectedCorners.slice(0, 5) 
            : state.selectedCorners;

        const hit = activeCorners.some(topLeft => 
            getCornerNumbers(topLeft).includes(lastResult.winningNumber)
        );

        if (hit) {
            // On Win: If bankroll hits a new session high, reset level and re-randomize corners
            if (bankroll >= state.sessionHighBankroll) {
                state.level = 1;
                generateSessionCorners();
            }
        } else {
            // On Loss: Increase level
            state.level += 1;
        }
    }

    // 3. Select Corners for Current Level
    const cornerPositions = state.level === 1 
        ? state.selectedCorners.slice(0, 5) 
        : state.selectedCorners;

    // 4. Calculate Bet Amounts and Clamp to Limits
    const unitMultiplier = state.level;
    let betAmountPerCorner = baseUnit * unitMultiplier;

    betAmountPerCorner = Math.max(betAmountPerCorner, config.betLimits.min);
    betAmountPerCorner = Math.min(betAmountPerCorner, config.betLimits.max);

    // 5. Construct Bet Objects
    return cornerPositions.map(cornerVal => ({
        type: 'corner',
        value: cornerVal,
        amount: betAmountPerCorner
    }));
}