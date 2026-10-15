/**
 * Roulette Strategy: High-Low Special (Dynamic Segment Tracking)
 * 
 * Source:
 * - Channel: Gamblers University
 * - Video URL: https://www.youtube.com/watch?v=Cg6VYhw62H8
 * 
 * Strategy Logic:
 * - A segment starts from when play begins until a reset, or from reset to reset.
 * - Tracks all spin results within the current segment.
 * - Upon a RESET (hitting a new bankroll high water mark):
 *   - Compares High numbers (19-36) vs Low numbers (1-18) in the completed segment.
 *   - If High > Low: Start next segment on 'high'.
 *   - If Low > High: Start next segment on 'low'.
 *   - If High == Low (Tie): Spin without betting. When a non-zero number lands:
 *     - If High: Start next segment on 'high'.
 *     - If Low: Start next segment on 'low'.
 * 
 * Bet Progression:
 * - Level 1: 1 unit on each of 3 primary streets (Total = 3 units).
 * - Level 2+: Adds 3 secondary streets + Outside bet equal to total street bets.
 * - On Loss: Advance to the next level (Level L -> L + 1).
 * - On Reset: Reset progression to Level 1 and evaluate segment history to select side.
 * 
 * Goal / Target Profit & Stop Loss:
 * - Target Profit: ~$50 profit (or 10% of starting bankroll).
 * - Stop Loss: When bankroll is insufficient to place required bets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.highWaterMark = bankroll;
        state.startingBankroll = bankroll;
        state.side = 'low'; // Default starting side
        state.targetProfit = 50000;
        state.segmentSpins = [];
        state.pendingTieBreaker = false;
        state.lastBankroll = bankroll;
    }

    // 2. Process tie-breaker spin (if active)
    if (state.pendingTieBreaker) {
        if (spinHistory && spinHistory.length > 0) {
            const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
            if (lastNum >= 19 && lastNum <= 36) {
                state.side = 'high';
                state.pendingTieBreaker = false;
            } else if (lastNum >= 1 && lastNum <= 18) {
                state.side = 'low';
                state.pendingTieBreaker = false;
            }
            // If 0 turns up during tie-breaker, stay in pendingTieBreaker and continue waiting
        }

        // If still waiting for tie-breaker resolution, do not place any bet
        if (state.pendingTieBreaker) {
            return [];
        }
    }

    // 3. Evaluate previous spin result and update progression & segment history
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Record last spin into current segment history
        state.segmentSpins.push(lastNum);

        if (bankroll >= state.highWaterMark) {
            // --- RESET TRIGGERED ---
            state.highWaterMark = bankroll;
            state.level = 1;

            // Evaluate past spins in the completed segment
            let highCount = 0;
            let lowCount = 0;

            state.segmentSpins.forEach(num => {
                if (num >= 19 && num <= 36) highCount++;
                else if (num >= 1 && num <= 18) lowCount++;
            });

            if (highCount > lowCount) {
                state.side = 'high';
            } else if (lowCount > highCount) {
                state.side = 'low';
            } else {
                // TIE: Must spin without betting on next spin to resolve direction
                state.pendingTieBreaker = true;
            }

            // Clear segment history for the new segment
            state.segmentSpins = [];

            // If tie-breaker activated, immediately exit without betting
            if (state.pendingTieBreaker) {
                return [];
            }
        } else if (state.lastBankroll !== undefined && bankroll < state.lastBankroll) {
            // Advance progression on loss
            state.level += 1;
        }
    }

    // 4. Stop betting if target profit reached
    if (bankroll >= state.startingBankroll + state.targetProfit) {
        return [];
    }

    // 5. Define Base Unit Amounts from Config Limits
    const insideMin = config.betLimits.min || 1;
    const outsideMin = config.betLimits.minOutside || 5;
    const maxLimit = config.betLimits.max || 500;

    const level = state.level;
    const side = state.side;

    // Street definitions
    const primaryStreets = side === 'low' ? [1, 4, 7] : [28, 31, 34];
    const secondaryStreets = side === 'low' ? [10, 13, 16] : [19, 22, 25];

    let bets = [];

    if (level === 1) {
        // Level 1: Primary streets only
        const streetAmt = Math.min(Math.max(insideMin, insideMin), maxLimit);
        primaryStreets.forEach(val => {
            bets.push({ type: 'street', value: val, amount: streetAmt });
        });
    } else {
        // Level L >= 2 progression
        const primaryUnits = Math.floor((level + 1) / 2);
        const secondaryUnits = Math.floor(level / 2);

        const primaryAmt = Math.min(Math.max(primaryUnits * insideMin, insideMin), maxLimit);
        const secondaryAmt = Math.min(Math.max(secondaryUnits * insideMin, insideMin), maxLimit);

        // Place Street Bets
        primaryStreets.forEach(val => {
            bets.push({ type: 'street', value: val, amount: primaryAmt });
        });
        secondaryStreets.forEach(val => {
            bets.push({ type: 'street', value: val, amount: secondaryAmt });
        });

        // Outside Bet equals total sum of all street bets
        const totalStreetBet = (3 * primaryAmt) + (3 * secondaryAmt);
        const outsideAmt = Math.min(Math.max(totalStreetBet, outsideMin), maxLimit);

        bets.push({
            type: side === 'low' ? 'low' : 'high',
            amount: outsideAmt
        });
    }

    // 6. Validate total bet against bankroll
    const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
    if (bankroll < totalBetAmount) {
        return []; // Insufficient bankroll
    }

    // 7. Snapshot current bankroll
    state.lastBankroll = bankroll;

    return bets;
}