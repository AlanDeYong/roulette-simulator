/**
 * Strategy: Green Corner Column Combo
 * Source: https://youtu.be/s1vWx179dXg
 * Channel: The Roulette Master
 *
 * FULL LOGIC & BET DETAILS:
 * 1. Base Placement:
 *    - 1 Column bet (Column 3 or Column 1) = 6 base units (e.g., $30)
 *    - 3 Corner bets positioned on the other columns = 2 base units each (e.g., $10 each, total $30)
 *    - 1 Straight-up bet on Zero (0) = 1 base unit (e.g., $5)
 *    - Total Base Bet = 13 units (e.g., $65).
 *
 * 2. Progression & Recovery Logic:
 *    - Normal Play (Base Level): When winning at base level, re-bet the original base layout.
 *    - Trigger for Recovery: Any loss triggers recovery mode.
 *    - Increments: Each active position increases by its individual base unit value after a missed spin:
 *      * Column: +6 base units per loss
 *      * Each Corner: +2 base units per loss
 *      * Zero: +1 base unit per loss
 *    - Position Removal on Win (in Recovery):
 *      * When a bet position hits during recovery, that position is removed from subsequent bets in the cycle.
 *      * The remaining active positions continue to be played with their accumulated progression amounts.
 *    - Reset Condition:
 *      * Once bankroll exceeds previous peak profit or when recovery resolves, reset to base level with all positions restored.
 *
 * 3. Goal:
 *    - Bankroll target profit accumulation using steady 13-unit coverage and arithmetic progression recovery.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // Helper to clamp bets to table limits
    function clamp(amount, isInside) {
        const min = isInside ? minInside : minOutside;
        return Math.min(Math.max(amount, min), maxBet);
    }

    // Define base unit scale based on limits
    const baseInsideUnit = minInside;
    const baseOutsideUnit = Math.max(minOutside, minInside * 6);

    // Initial state setup
    if (!state.initialized) {
        state.peakBankroll = bankroll;
        state.inRecovery = false;
        state.columnMultiplier = 1;
        state.cornerMultipliers = [1, 1, 1];
        state.zeroMultiplier = 1;
        state.activeColumn = true;
        state.activeCorners = [true, true, true];
        state.activeZero = true;
        state.columnChoice = 3; // Default 3rd column
        state.corners = [7, 16, 28]; // Corner top-left coordinates covering middle/first columns
        state.initialized = true;
    }

    // Process last spin result if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;

        // Check new peak bankroll
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
            // Full reset to base layout on new peak
            state.inRecovery = false;
            state.columnMultiplier = 1;
            state.cornerMultipliers = [1, 1, 1];
            state.zeroMultiplier = 1;
            state.activeColumn = true;
            state.activeCorners = [true, true, true];
            state.activeZero = true;
        } else {
            // Determine which bet won
            let wonColumn = false;
            if (state.activeColumn) {
                if (state.columnChoice === 1 && winNum > 0 && winNum % 3 === 1) wonColumn = true;
                if (state.columnChoice === 2 && winNum > 0 && winNum % 3 === 2) wonColumn = true;
                if (state.columnChoice === 3 && winNum > 0 && winNum % 3 === 0) wonColumn = true;
            }

            let wonCornerIndex = -1;
            const cornerCovers = {
                7: [7, 8, 10, 11],
                8: [8, 9, 11, 12],
                16: [16, 17, 19, 20],
                17: [17, 18, 20, 21],
                28: [28, 29, 31, 32]
            };

            for (let i = 0; i < state.corners.length; i++) {
                if (state.activeCorners[i]) {
                    const cNum = state.corners[i];
                    const covered = cornerCovers[cNum] || [cNum, cNum + 1, cNum + 3, cNum + 4];
                    if (covered.includes(winNum)) {
                        wonCornerIndex = i;
                        break;
                    }
                }
            }

            const wonZero = state.activeZero && winNum === 0;
            const isWin = wonColumn || (wonCornerIndex !== -1) || wonZero;

            if (!isWin) {
                // Total loss on the spin: enter recovery and increase all active bets
                state.inRecovery = true;
                if (state.activeColumn) state.columnMultiplier += 1;
                for (let i = 0; i < state.activeCorners.length; i++) {
                    if (state.activeCorners[i]) state.cornerMultipliers[i] += 1;
                }
                if (state.activeZero) state.zeroMultiplier += 1;
            } else {
                if (state.inRecovery) {
                    // Remove winning position in recovery mode
                    if (wonColumn) state.activeColumn = false;
                    if (wonCornerIndex !== -1) state.activeCorners[wonCornerIndex] = false;
                    if (wonZero) state.activeZero = false;

                    // Ensure we do not drop below the minimum required active coverage
                    const activeCount = (state.activeColumn ? 1 : 0) +
                        state.activeCorners.filter(Boolean).length +
                        (state.activeZero ? 1 : 0);

                    if (activeCount === 0) {
                        // Reset when all positions have cleared
                        state.inRecovery = false;
                        state.columnMultiplier = 1;
                        state.cornerMultipliers = [1, 1, 1];
                        state.zeroMultiplier = 1;
                        state.activeColumn = true;
                        state.activeCorners = [true, true, true];
                        state.activeZero = true;
                    }
                }
            }
        }
    }

    // Build the bet list
    const bets = [];

    if (state.activeColumn) {
        const colAmount = clamp(baseOutsideUnit * state.columnMultiplier, false);
        bets.push({ type: 'column', value: state.columnChoice, amount: colAmount });
    }

    for (let i = 0; i < state.corners.length; i++) {
        if (state.activeCorners[i]) {
            const cornerAmount = clamp(baseInsideUnit * 2 * state.cornerMultipliers[i], true);
            bets.push({ type: 'corner', value: state.corners[i], amount: cornerAmount });
        }
    }

    if (state.activeZero) {
        const zeroAmount = clamp(baseInsideUnit * state.zeroMultiplier, true);
        bets.push({ type: 'number', value: 0, amount: zeroAmount });
    }

    return bets;
}