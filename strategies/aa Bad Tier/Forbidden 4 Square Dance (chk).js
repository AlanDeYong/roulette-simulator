/**
 * ============================================================================
 * Strategy: Forbidden 4 Square Dance
 * Source: CEG Dealer School (YouTube: https://youtu.be/jY3ZCjMfH5g)
 * Strategist / Creator: The Roulette Magician
 *
 * FULL LOGIC & RULES:
 * 1. Overview:
 *    The strategy is a hybrid two-phase recovery system consisting of an initial
 *    outside dozen/column progression followed by an inside 4-corner attack.
 *
 * 2. Phase 1 (Standard Progression):
 *    - Bet on a chosen Dozen (or Column) starting at 1 unit (scaled to outside minimum).
 *    - Progression steps: 1, 2, 3, 4 units.
 *    - Win at step 1, 2, or 3: Resets immediately back to 1 unit.
 *    - Loss at step 4: Triggers Phase 2 ("Forbidden 4 Square" recovery mode).
 *
 * 3. Phase 2 (Forbidden 4 Square Progression & Inside Attack):
 *    - Bet on the Dozen using an extended negative progression sequence:
 *      [4, 6, 8, 10, 14, 18, 24, 34, 44, 58, 78, 104, 130] units.
 *    - If the Dozen LOSES:
 *      * Advance to the next progression step.
 *    - If the Dozen WINS:
 *      * Lock up / pocket the original bet principal.
 *      * Take the net 2:1 profit and split it equally across 4 non-touching
 *        corner bets (each corner receives: (dozenWinProfit) / 4).
 *    - Corner Spin Outcomes:
 *      * If ANY of the 4 corners hits: Yields an 8:1 payout (+5 units net on the corners),
 *        fully recovering prior losses and locking in a profit. RESET completely to Phase 1 (1 unit).
 *      * If corners miss: Advance to the next level of the Phase 2 Dozen progression.
 *
 * 4. Goal & Walk-Away:
 *    - Target profit: +50% of starting bankroll (or walking away when tired of winning).
 *    - Stop-loss: Exhaustion of bankroll or reaching the end of the 130-unit progression.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine Unit Sizing based on table limits
    const baseOutsideUnit = Math.max(config.betLimits.minOutside, 10);
    const minInsideUnit = config.betLimits.min;
    const maxBet = config.betLimits.max;

    // 2. Initialize Persistent State
    if (!state.initialized) {
        state.initialized = true;
        state.phase = 1; // Phase 1: Initial progression; Phase 2: Extended recovery
        state.phase1Step = 0; // Steps 0 to 3 (1, 2, 3, 4 units)
        state.phase2Index = 0; // Index in phase2Sequence
        state.pendingCorners = false; // Flag indicating the next spin must be corner bets
        state.cornerBetAmount = 0; // Bet amount per corner
        state.lastTargetDozen = 2; // Default to 2nd Dozen (13-24)
        state.lastBetType = null; // 'dozen' or 'corners'
        state.lastCornerNumbers = [];
        state.initialBankroll = bankroll;
    }

    const phase1Units = [1, 2, 3, 4];
    const phase2Units = [4, 6, 8, 10, 14, 18, 24, 34, 44, 58, 78, 104, 130];

    // Four non-touching (disjoint) corners:
    // Corner 1: (1, 2, 4, 5)
    // Corner 7: (7, 8, 10, 11)
    // Corner 19: (19, 20, 22, 23)
    // Corner 25: (25, 26, 28, 29)
    const nonTouchingCornerTopLefts = [1, 7, 19, 25];
    const cornerCoveredNumbers = [
        1, 2, 4, 5,
        7, 8, 10, 11,
        19, 20, 22, 23,
        25, 26, 28, 29
    ];

    // Helper: Determine if a number falls in a specific dozen (1, 2, or 3)
    function inDozen(num, dozenIdx) {
        if (num < 1 || num > 36) return false;
        if (dozenIdx === 1) return num >= 1 && num <= 12;
        if (dozenIdx === 2) return num >= 13 && num <= 24;
        if (dozenIdx === 3) return num >= 25 && num <= 36;
        return false;
    }

    // 3. Process Result of Previous Spin
    if (spinHistory && spinHistory.length > 0 && state.lastBetType) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        if (state.lastBetType === 'dozen') {
            const wonDozen = inDozen(winningNum, state.lastTargetDozen);

            if (state.phase === 1) {
                if (wonDozen) {
                    // Reset on win in Phase 1
                    state.phase1Step = 0;
                } else {
                    // Lost dozen in Phase 1
                    if (state.phase1Step < phase1Units.length - 1) {
                        state.phase1Step++;
                    } else {
                        // Lost the 4-unit bet -> Enter Phase 2
                        state.phase = 2;
                        state.phase2Index = 0;
                    }
                }
            } else if (state.phase === 2) {
                if (wonDozen) {
                    // Won Dozen in Phase 2:
                    // Take the 2:1 profit (2 * betAmount) and allocate to 4 non-touching corners
                    const currentUnits = phase2Units[state.phase2Index];
                    const dozenBetAmount = Math.min(Math.max(currentUnits * baseOutsideUnit, config.betLimits.minOutside), maxBet);
                    const grossProfit = dozenBetAmount * 2;
                    let perCorner = Math.floor(grossProfit / 4);

                    // Clamp to inside limits
                    perCorner = Math.max(perCorner, minInsideUnit);
                    perCorner = Math.min(perCorner, maxBet);

                    state.pendingCorners = true;
                    state.cornerBetAmount = perCorner;
                } else {
                    // Lost Dozen in Phase 2: advance progression
                    state.phase2Index++;
                    if (state.phase2Index >= phase2Units.length) {
                        // Reached end of progression / table limits: Reset
                        state.phase = 1;
                        state.phase1Step = 0;
                        state.phase2Index = 0;
                    }
                }
            }
        } else if (state.lastBetType === 'corners') {
            const wonCorner = cornerCoveredNumbers.includes(winningNum);

            if (wonCorner) {
                // Successful recovery! Reset to Phase 1
                state.phase = 1;
                state.phase1Step = 0;
                state.phase2Index = 0;
                state.pendingCorners = false;
            } else {
                // Corners missed: advance to next Dozen progression level
                state.pendingCorners = false;
                state.phase2Index++;
                if (state.phase2Index >= phase2Units.length) {
                    state.phase = 1;
                    state.phase1Step = 0;
                    state.phase2Index = 0;
                }
            }
        }
    }

    // 4. Target Profit Check (+50% target bankroll)
    if (bankroll >= state.initialBankroll * 1.5) {
        return []; // Walk away satisfied
    }

    // 5. Place Bets
    // Case A: Corner attack from Phase 2 Dozen win
    if (state.pendingCorners) {
        state.lastBetType = 'corners';
        const totalCornerRequired = state.cornerBetAmount * 4;

        if (bankroll < totalCornerRequired) {
            // Insufficient bankroll to place all 4 corners
            state.phase = 1;
            state.phase1Step = 0;
            state.pendingCorners = false;
            return [];
        }

        return nonTouchingCornerTopLefts.map((cornerTopLeft) => ({
            type: 'corner',
            value: cornerTopLeft,
            amount: state.cornerBetAmount
        }));
    }

    // Case B: Dozen Bet (Phase 1 or Phase 2)
    state.lastBetType = 'dozen';
    let betMultiplier = 1;

    if (state.phase === 1) {
        betMultiplier = phase1Units[state.phase1Step];
    } else {
        betMultiplier = phase2Units[state.phase2Index];
    }

    let dozenBetAmount = betMultiplier * baseOutsideUnit;
    dozenBetAmount = Math.max(dozenBetAmount, config.betLimits.minOutside);
    dozenBetAmount = Math.min(dozenBetAmount, maxBet);

    if (bankroll < dozenBetAmount) {
        // Cannot afford next progression step
        return [];
    }

    return [
        {
            type: 'dozen',
            value: state.lastTargetDozen,
            amount: dozenBetAmount
        }
    ];
}