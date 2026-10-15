/**
 * Strategy Name: Patient Corners (Randomized Non-Overlapping Spines)
 * Source: Junko Bodie Roulette (https://youtu.be/Lmeux-vM7iI)
 *
 * Full Strategy Logic:
 * 1. Initial Setup:
 *    - 10 Corner bets total:
 *      - Set A: 5 randomly selected non-overlapping corners between Column 1 & Column 2
 *               (Valid top-left row starters: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31).
 *               To prevent overlap within Set A, no two selected corners can share the same or adjacent row.
 *      - Set B: 5 randomly selected non-overlapping corners between Column 2 & Column 3
 *               (Valid top-left row starters: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32).
 *               To prevent overlap within Set B, no two selected corners can share the same or adjacent row.
 *      - Corners between Set A and Set B are allowed to overlap each other.
 *
 * 2. Corner Elimination & Win Progression:
 *    - On a WIN (when the winning number lands on any active corner):
 *      - The hit corner(s) are eliminated from the active pool.
 *      - Bet size on remaining corners stays the SAME.
 *      - If session cycle profit reaches +20 units (or all corners are eliminated),
 *        the cycle resets with a fresh random selection of non-overlapping corners.
 *
 * 3. Loss Progression:
 *    - On a LOSS (miss):
 *      - Phase 1 (> 3 corners active): Add +1 unit per corner on every loss spin.
 *      - Phase 2 (<= 3 corners active): Double the bet amount per remaining corner for up to 3
 *        consecutive losses, then climb +10 units per step (up to 60 units), then +20 units if needed.
 *
 * 4. Target / Goals:
 *    - Target profit per cycle: +20 units.
 *    - Target profit for overall session: +200 units.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = (config && config.betLimits && config.betLimits.min) ? config.betLimits.min : 1;
    const maxBet = (config && config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;
    const minIncrement = (config && config.minIncrementalBet) ? config.minIncrementalBet : minInside;
    const CYCLE_TARGET_UNITS = 20;

    // Helper: Select 5 non-overlapping corner starting numbers along a single spine
    // Rows range from r = 0 (row 1-3) to r = 10 (row 31-33).
    // A corner at row r covers rows r and r+1. Non-overlapping means row indices cannot be adjacent.
    function generateNonOverlappingSpineCorners(offset) {
        const rows = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        let chosenRows = [];
        let attempts = 0;

        while (chosenRows.length < 5 && attempts < 200) {
            attempts++;
            chosenRows = [];
            const available = [...rows];
            while (chosenRows.length < 5 && available.length > 0) {
                const randIndex = Math.floor(Math.random() * available.length);
                const pickedRow = available.splice(randIndex, 1)[0];
                chosenRows.push(pickedRow);
                // Remove adjacent rows to ensure no overlap within this set
                for (let i = available.length - 1; i >= 0; i--) {
                    if (Math.abs(available[i] - pickedRow) <= 1) {
                        available.splice(i, 1);
                    }
                }
            }
        }

        // Fallback to evenly spaced rows [0, 2, 4, 6, 8] if random pick doesn't resolve
        if (chosenRows.length < 5) {
            chosenRows = [0, 2, 4, 6, 8];
        }

        // Convert row indices to top-left corner values (e.g. row 0 offset 1 => 1, row 2 offset 1 => 7)
        return chosenRows.map(r => r * 3 + offset);
    }

    // Generate 10 non-overlapping corners (5 for Col 1-2 spine, 5 for Col 2-3 spine)
    function generateInitialCorners() {
        const setA = generateNonOverlappingSpineCorners(1); // Spine 1 & 2 (1, 4, 7, ...)
        const setB = generateNonOverlappingSpineCorners(2); // Spine 2 & 3 (2, 5, 8, ...)
        return [...setA, ...setB];
    }

    // Helper: Determine if a corner covers the winning number
    function cornerCovers(cornerVal, winNum) {
        if (winNum === 0 || winNum === '0' || winNum === '00') return false;
        const covered = [cornerVal, cornerVal + 1, cornerVal + 3, cornerVal + 4];
        return covered.includes(Number(winNum));
    }

    // Helper: Clamp bet amount to table limits
    function clampBet(amount) {
        return Math.min(Math.max(amount, minInside), maxBet);
    }

    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.baseUnit = minInside;
        state.currentUnit = minInside;
        state.activeCorners = generateInitialCorners();
        state.cycleStartBankroll = bankroll;
        state.doublingLossCount = 0;
        state.lastBets = [];
    }

    // 2. Process Previous Spin Results
    if (spinHistory && spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;

        // Check which active corners hit
        const hitCorners = state.activeCorners.filter(c => cornerCovers(c, winNum));
        const isWin = hitCorners.length > 0;

        if (isWin) {
            // WIN: Eliminate winning corners
            state.activeCorners = state.activeCorners.filter(c => !hitCorners.includes(c));
            state.doublingLossCount = 0;

            // Check if session cycle goal is reached or all corners eliminated
            const cycleProfit = bankroll - state.cycleStartBankroll;
            const targetProfit = CYCLE_TARGET_UNITS * state.baseUnit;

            if (cycleProfit >= targetProfit || state.activeCorners.length === 0) {
                state.activeCorners = generateInitialCorners();
                state.currentUnit = state.baseUnit;
                state.cycleStartBankroll = bankroll;
                state.doublingLossCount = 0;
            }
        } else {
            // LOSS: Step progression
            if (state.activeCorners.length > 3) {
                const increment = (config && config.incrementMode === 'base') ? state.baseUnit : minIncrement;
                state.currentUnit += increment;
            } else {
                // <= 3 corners remaining: doubling phase then ladder
                if (state.doublingLossCount < 3) {
                    state.currentUnit = state.currentUnit * 2;
                    state.doublingLossCount++;
                } else {
                    const ladderIncrement = 10 * state.baseUnit;
                    if (state.currentUnit < 60 * state.baseUnit) {
                        state.currentUnit += ladderIncrement;
                    } else {
                        state.currentUnit += (20 * state.baseUnit);
                    }
                }
            }
        }
    }

    // 3. Construct Corner Bets
    const betAmount = clampBet(state.currentUnit);
    const bets = state.activeCorners.map(cornerVal => ({
        type: 'corner',
        value: cornerVal,
        amount: betAmount
    }));

    state.lastBets = bets;
    return bets;
}