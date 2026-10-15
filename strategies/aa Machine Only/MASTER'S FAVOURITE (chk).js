/*
 * Strategy Name: Master's Favourite (Modified Zig-Zag)
 * Source: Modified from https://youtu.be/PvoDxUeRXgA
 * * The Full Logic in details:
 * - Starting Position: Play always starts from the left side of the table in an up-down zig-zag pattern. 
 *   On initialization, it randomly selects to start from either a 'top' or 'bottom' corner.
 *   - Bottom Start Pattern: Corners 1, 8, 13, 20, 25 (6th corner is 32)
 *   - Top Start Pattern: Corners 2, 7, 14, 19, 26 (6th corner is 31)
 * - Starting bets: Place 1 unit bet each on the first 5 corners of the chosen pattern.
 * - On a win: 
 *   - If the session's peak profit is reached (current bankroll >= highest recorded bankroll), the strategy resets to the initial 5 bets and switches to start from the opposite corner (e.g., top switches to bottom).
 *   - If the win occurs immediately after adding the 6th corner, it also resets and switches to the opposite starting corner.
 *   - Else if not at peak profit, rebet. If there are currently 6 active corners, remove the winning corner and increase all remaining bets by 2 units.
 *   - Otherwise, just increase remaining active bets by 2 units.
 * - On a loss: 
 *   - For the first loss, add the 6th corner of the active pattern and increase all bets by 2 units.
 *   - For all subsequent consecutive losses, keep increasing each bet by 2 units indefinitely until a win occurs.
 * * The Full Bet Progression in details:
 * - Initial: 5 corners * 1 unit.
 * - 1st Loss: 6 corners * (previous + 2) units.
 * - Nth Loss: 6 corners * (previous + 2) units indefinitely.
 * - Winning Progression: Drops the winning corner, then continues adding +2 units to remaining active corners until peak profit is achieved.
 * * The Goal:
 * - Continuous profit accumulation relying on high board coverage. Designed to chase losses continuously using a non-overlapping up-down pattern until a win triggers the winning progression or a peak bankroll resets the cycle.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.min;

    // Define the two alternating up-down patterns
    // Bottom start: 1(Bot), 8(Top), 13(Bot), 20(Top), 25(Bot) -> 32(Top)
    const PATTERN_BOTTOM = [1, 8, 13, 20, 25, 32];
    // Top start: 2(Top), 7(Bot), 14(Top), 19(Bot), 26(Top) -> 31(Bot)
    const PATTERN_TOP = [2, 7, 14, 19, 26, 31];

    // Helper to initialize/reset progression state and handle toggling
    function resetState(toggle = false) {
        if (toggle && state.startPattern) {
            // Switch to the opposite starting corner
            state.startPattern = state.startPattern === 'top' ? 'bottom' : 'top';
        } else if (!state.startPattern) {
            // Randomly select on the very first run
            state.startPattern = Math.random() < 0.5 ? 'bottom' : 'top';
        }
        
        const pattern = state.startPattern === 'top' ? PATTERN_TOP : PATTERN_BOTTOM;
        state.activeCorners = pattern.slice(0, 5); // Start with first 5
        state.sixthCorner = pattern[5];            // Store the 6th for later
        state.currentUnitsPerCorner = 1;
        state.justAddedSixth = false;
    }

    // 2. Initialize State on the first run
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        resetState(false);
    }

    // Check if we hit a new peak profit BEFORE processing the spin
    let reachedPeak = false;
    if (bankroll >= state.peakBankroll) {
        state.peakBankroll = bankroll;
        reachedPeak = true;
    }

    // 3. Process spin history
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinNumber = lastSpin.winningNumber;
        
        // Helper to check if a corner bet contains the winning number
        const isCornerWin = (cornerTopLeft, number) => {
            const validNumbers = [
                cornerTopLeft, cornerTopLeft + 1,
                cornerTopLeft + 3, cornerTopLeft + 4
            ];
            return validNumbers.includes(number);
        };

        // Determine if we won on the last spin and which corner secured the win
        let wonLastSpin = false;
        let winningCorner = null;
        for (let corner of state.activeCorners) {
            if (isCornerWin(corner, lastWinNumber)) {
                wonLastSpin = true;
                winningCorner = corner;
                break;
            }
        }

        // Strategy Win/Loss Logic Application
        if (wonLastSpin) {
            if (reachedPeak) {
                // Session's peak profit reached, reset and toggle pattern
                resetState(true);
            } else if (state.justAddedSixth) {
                // Win immediately after adding the 6th corner, reset and toggle
                resetState(true);
            } else {
                // Not at peak profit yet
                if (state.activeCorners.length === 6 && winningCorner !== null) {
                    // Remove the winning corner
                    state.activeCorners = state.activeCorners.filter(c => c !== winningCorner);
                    state.currentUnitsPerCorner += 2;
                } else {
                    // Otherwise, simply continue to increase remaining by 2 units
                    state.currentUnitsPerCorner += 2;
                }
                state.justAddedSixth = false;
            }
        } else {
            // Loss
            if (state.activeCorners.length === 5) {
                // 1st Loss: Add 6th corner and increase all bets by 2 units
                state.activeCorners.push(state.sixthCorner);
                state.currentUnitsPerCorner += 2;
                state.justAddedSixth = true;
            } else {
                // Subsequent Losses: keep increasing all active bets by 2 units indefinitely
                state.currentUnitsPerCorner += 2;
                state.justAddedSixth = false; 
            }
        }
    }

    // 4. Calculate amounts and build bets
    let bets = [];
    let amount = state.currentUnitsPerCorner * unit;
    
    // Clamp to table limits (Crucial!)
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Place bets on active corners
    for (let corner of state.activeCorners) {
        bets.push({
            type: 'corner',
            value: corner,
            amount: amount
        });
    }

    return bets;
}