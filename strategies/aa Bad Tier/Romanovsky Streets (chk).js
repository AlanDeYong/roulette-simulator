/**
 * ============================================================================
 * STRATEGY: Romanovsky Streets
 * ============================================================================
 * Source:
 *   - Video: "How to Win at Roulette with 97.49% Winning Chances: Romanovsky Streets"
 *   - Channel: Ninja Gamblers
 *   - URL: https://youtu.be/xaIrytJiczM
 *
 * The Full Logic in Detail:
 *   1. Base Game (Romanovsky Method):
 *      - Places 3 units each on two dozens (Dozen 1 and Dozen 2).
 *      - Places 1 unit each on two non-overlapping corners in the uncovered dozen
 *        (Corner 26 covering 26, 27, 29, 30 and Corner 32 covering 32, 33, 35, 36).
 *      - This setup covers 32 out of 37 numbers (86.48% table coverage).
 *      - Only 5 numbers remain uncovered: 0, 25, 28, 31, and 34.
 *      - A win on either a dozen (paying 2:1) or a corner (paying 8:1) returns
 *        9 units against an 8-unit layout, generating exactly +1 unit net profit.
 *
 *   2. Recovery Game (5 Double Street Method):
 *      - Triggered immediately after any loss in the base Romanovsky setup (-8 units).
 *      - Places 5 double street (six line) bets covering 30 numbers total (81.08% coverage):
 *        * Line 1  (1 - 6)
 *        * Line 7  (7 - 12)
 *        * Line 13 (13 - 18)
 *        * Line 19 (19 - 24)
 *        * Line 31 (31 - 36)
 *      - Bet size per line equals the previous Romanovsky loss (8 units per line, 40 units total).
 *      - A win pays 5:1 on the winning line (+40 units profit) minus the 4 losing lines (-32 units),
 *        yielding +8 units net profit, which fully recovers the -8 units lost previously.
 *      - Once recovered, immediately return to the base Romanovsky layout.
 *
 * The Goal:
 *   - Target Profit: +10 units (as targeted in the video session).
 *   - Stop-Loss: If the recovery bet fails or the bankroll cannot sustain the 40-unit recovery.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // -------------------------------------------------------------------------
    // 1. Initialize State and Target Metrics
    // -------------------------------------------------------------------------
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.mode = 'base'; // 'base' or 'recovery'
        state.targetUnits = 10; // Default session target shown in video
        state.lastBetTotal = 0;
    }

    // -------------------------------------------------------------------------
    // 2. Unit Calculation and Limit Enforcement
    // -------------------------------------------------------------------------
    // Inside bets require config.betLimits.min; Outside bets require config.betLimits.minOutside.
    // In Romanovsky, outside bets are 3 units each and inside bets are 1 unit each.
    const minUnitFromOutside = Math.ceil(config.betLimits.minOutside / 3);
    const minUnitFromInside = config.betLimits.min;
    const baseUnit = Math.max(1, minUnitFromOutside, minUnitFromInside);

    // Stop if target profit reached
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= state.targetUnits * baseUnit) {
        return [];
    }

    // -------------------------------------------------------------------------
    // 3. Process Previous Spin Result
    // -------------------------------------------------------------------------
    if (spinHistory.length > 0 && state.lastBetPositions) {
        const lastWinningNumber = spinHistory[spinHistory.length - 1].winningNumber;
        
        let wonLastSpin = false;

        if (state.mode === 'base') {
            // Check if winning number was covered by Dozen 1, Dozen 2, Corner 26, or Corner 32
            const inDozen1 = lastWinningNumber >= 1 && lastWinningNumber <= 12;
            const inDozen2 = lastWinningNumber >= 13 && lastWinningNumber <= 24;
            const inCorner26 = [26, 27, 29, 30].includes(lastWinningNumber);
            const inCorner32 = [32, 33, 35, 36].includes(lastWinningNumber);

            wonLastSpin = inDozen1 || inDozen2 || inCorner26 || inCorner32;

            if (wonLastSpin) {
                state.mode = 'base';
            } else {
                // Shift to 5 Double Street recovery mode
                state.mode = 'recovery';
            }
        } else if (state.mode === 'recovery') {
            // Check if winning number was covered by the 5 lines:
            // 1-6, 7-12, 13-18, 19-24, 31-36 (leaving 0 and 25-30 uncovered)
            const inLines = (lastWinningNumber >= 1 && lastWinningNumber <= 24) ||
                            (lastWinningNumber >= 31 && lastWinningNumber <= 36);

            wonLastSpin = inLines;

            // Regardless of win or loss, return to base mode after recovery attempt
            state.mode = 'base';
        }
    }

    // -------------------------------------------------------------------------
    // 4. Construct Bets
    // -------------------------------------------------------------------------
    const bets = [];

    if (state.mode === 'base') {
        const dozenBetAmount = Math.min(
            Math.max(baseUnit * 3, config.betLimits.minOutside),
            config.betLimits.max
        );
        const cornerBetAmount = Math.min(
            Math.max(baseUnit * 1, config.betLimits.min),
            config.betLimits.max
        );

        const totalRequired = (dozenBetAmount * 2) + (cornerBetAmount * 2);
        if (bankroll < totalRequired) {
            return []; // Stop if unable to afford full base bet
        }

        bets.push({ type: 'dozen', value: 1, amount: dozenBetAmount });
        bets.push({ type: 'dozen', value: 2, amount: dozenBetAmount });
        bets.push({ type: 'corner', value: 26, amount: cornerBetAmount });
        bets.push({ type: 'corner', value: 32, amount: cornerBetAmount });

        state.lastBetPositions = { dozen1: true, dozen2: true, corner26: true, corner32: true };
    } else if (state.mode === 'recovery') {
        // Recovery: 8 units per line bet across 5 double streets
        const lineBetAmount = Math.min(
            Math.max(baseUnit * 8, config.betLimits.min),
            config.betLimits.max
        );

        const totalRequired = lineBetAmount * 5;
        if (bankroll < totalRequired) {
            // Fall back to base bet if recovery cannot be fully funded
            state.mode = 'base';
            return bet(spinHistory, bankroll, config, state, utils);
        }

        const lines = [1, 7, 13, 19, 31];
        for (let i = 0; i < lines.length; i++) {
            bets.push({
                type: 'line',
                value: lines[i],
                amount: lineBetAmount
            });
        }

        state.lastBetPositions = { lines: lines };
    }

    return bets;
}