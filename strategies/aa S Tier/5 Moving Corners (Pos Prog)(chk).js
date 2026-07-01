/**
 * Strategy: Moving Corners (Positive Progression)
 * Source: https://www.youtube.com/watch?v=ZtS_1TCSLHs (Gamblers University)
 *
 * The Full Logic in details:
 * - Start with 3 non-overlapping corner bets.
 * - If a win occurs, shift the corners to the "other end" of the board to randomize coverage.
 * - If a loss occurs on the initial base level, increase the coverage from 3 corners to 5 corners.
 * - Do not increase the bet amount or coverage on any subsequent losses (wait for a win to increase).
 * 
 * The Full Bet Progression in details:
 * - Base bet is 1 unit on 3 corners (total 3 units).
 * - On first loss: Increase coverage to 5 corners, keeping the base 1 unit per corner (total 5 units).
 * - On a win (while in a drawdown): Increase the bet by 2 units per corner (e.g., $1 -> $3 -> $5). Keep the same number of corners (usually 5).
 * - Reset: Whenever the bankroll hits a new session high, reset the progression back to the base level (3 corners, 1 unit each).
 * 
 * The Goal:
 * - Target profit is typically +50 units (as shown in the video with a $225 buy-in to $275).
 * - Stop loss is the exhaustion of the buy-in ($225). 
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initial State Setup
    if (!state.initialized) {
        state.sessionHigh = bankroll;
        state.currentCorners = 3;
        state.betLevel = 1;
        state.position = 'A'; 
        state.lastBankroll = bankroll;
        state.initialized = true;
    }

    // 2. Progression & Win/Loss Logic (Skips on the very first spin)
    if (spinHistory.length > 0) {
        // Compare current bankroll to the bankroll before the last spin's outcome
        const isWin = bankroll > state.lastBankroll;

        // Update Session High
        if (bankroll > state.sessionHigh) {
            state.sessionHigh = bankroll;
        }

        if (bankroll >= state.sessionHigh) {
            // Reached new high -> Reset to base
            state.currentCorners = 3;
            state.betLevel = 1;
            if (isWin) {
                // Move corners on win
                state.position = state.position === 'A' ? 'B' : 'A';
            }
        } else {
            // In a drawdown
            if (isWin) {
                // Win -> Go up 2 levels (as per video: "$1 to $3")
                state.betLevel += 2;
                state.position = state.position === 'A' ? 'B' : 'A';
            } else {
                // Loss -> Increase coverage to 5 corners ONLY if at base level
                if (state.currentCorners === 3 && state.betLevel === 1) {
                    state.currentCorners = 5;
                }
                // Never increase betLevel on a loss
            }
        }
    }

    // 3. Define Non-Overlapping Corners
    // Top-left numbers of corners. No overlapping rows (1-2, 3-4, 5-6, 7-8, 9-10, 11-12)
    const corners3_A = [1, 7, 13];
    const corners5_A = [1, 7, 13, 19, 25];
    const corners3_B = [19, 25, 31];
    const corners5_B = [7, 13, 19, 25, 31];

    let selectedCorners = [];
    if (state.currentCorners === 3) {
        selectedCorners = state.position === 'A' ? corners3_A : corners3_B;
    } else {
        selectedCorners = state.position === 'A' ? corners5_A : corners5_B;
    }

    // 4. Calculate Bet Amount
    const baseUnit = config.betLimits.min;
    let amount = baseUnit;

    if (state.betLevel > 1) {
        const increaseSteps = state.betLevel - 1; 
        if (config.incrementMode === 'fixed') {
            amount += increaseSteps * config.minIncrementalBet;
        } else {
            amount += increaseSteps * baseUnit;
        }
    }

    // 5. Clamp to Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 6. Bankroll Stop-Loss Check
    if (amount * selectedCorners.length > bankroll) {
        return []; // Cannot afford the next progression sequence
    }

    // 7. Update state for the next spin
    state.lastBankroll = bankroll;

    // 8. Generate Bet Array
    return selectedCorners.map(cornerVal => ({
        type: 'corner',
        value: cornerVal,
        amount: amount
    }));
}