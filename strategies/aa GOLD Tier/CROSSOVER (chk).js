/**
 * ============================================================================
 * Strategy: "The Crossover" Roulette Strategy
 * Source: Bet With Mo (https://youtu.be/GAmBvmdH-0A)
 * ============================================================================
 *
 * THE FULL LOGIC IN DETAIL:
 * -------------------------
 * "The Crossover" is a multi-coverage hybrid system covering high-probability 
 * crossover intersections across the board using a blend of inside Corner bets 
 * and outside Dozen/Column bets:
 *   1. Corner Bet on 11 (covers 11, 12, 14, 15)  [1 Unit]
 *   2. Corner Bet on 17 (covers 17, 18, 20, 21)  [1 Unit]
 *   3. Corner Bet on 23 (covers 23, 24, 26, 27)  [1 Unit]
 *   4. 2nd Dozen (numbers 13-24)                 [4 Units]
 *   5. 2nd Column (2, 5, 8, ..., 35)             [4 Units]
 *   6. 3rd Column (3, 6, 9, ..., 36)             [4 Units]
 *   Base total bet at Level 1 = 15 Units.
 *
 * THE FULL BET PROGRESSION IN DETAIL:
 * -----------------------------------
 * - Outcomes are categorized into three types:
 *     a) Profitable Win: Payout > Total Bet placed on the spin.
 *     b) Small Loss: Partial hit where 0 < Payout < Total Bet.
 *     c) Total Loss: Payout == 0 (e.g., 0, 00, or uncovered numbers).
 *
 * - Progression Rules:
 *     1. On Total Loss:
 *        - Immediately step up +1 level.
 *        - Reset consecutive small loss count to 0.
 *     2. On Small Loss:
 *        - Track consecutive small losses.
 *        - Stay at current level for the 1st small loss.
 *        - After 2 consecutive small losses, step up +1 level and reset counter.
 *     3. On Profitable Win:
 *        - Reset consecutive small loss count to 0.
 *        - If session profit target is reached, reset progression to Level 1.
 *        - Otherwise, step down -1 level (minimum Level 1).
 *
 * THE GOAL:
 * ---------
 * Target incremental session profits (default +$20 profit steps or recovery to 
 * a new peak profit) before resetting to base level, with an optional stop-loss.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // ------------------------------------------------------------------------
    // 1. Initialize State Variables
    // ------------------------------------------------------------------------
    if (!state.initialized) {
        state.level = 1;
        state.consecutiveSmallLosses = 0;
        state.initialBankroll = bankroll;
        state.targetProfitIncrement = 20; // $20 target profit steps
        state.sessionTarget = bankroll + state.targetProfitIncrement;
        state.lastTotalBet = 0;
        state.lastBankroll = bankroll;
        state.initialized = true;
    }

    // ------------------------------------------------------------------------
    // 2. Evaluate Previous Spin Result & Update Progression
    // ------------------------------------------------------------------------
    if (spinHistory && spinHistory.length > 0 && state.lastTotalBet > 0) {
        const netChange = bankroll - state.lastBankroll;

        if (netChange > 0) {
            // Net Profitable Win
            state.consecutiveSmallLosses = 0;
            
            // Check if profit target reached
            if (bankroll >= state.sessionTarget) {
                state.level = 1;
                state.sessionTarget = bankroll + state.targetProfitIncrement;
            } else {
                // Drop down 1 level on win
                state.level = Math.max(1, state.level - 1);
            }
        } else if (netChange <= -state.lastTotalBet) {
            // Total Loss (payout was 0)
            state.level += 1;
            state.consecutiveSmallLosses = 0;
        } else {
            // Small Loss (partial payout received, netChange is negative but > -totalBet)
            state.consecutiveSmallLosses += 1;
            if (state.consecutiveSmallLosses >= 2) {
                state.level += 1;
                state.consecutiveSmallLosses = 0;
            }
        }
    }

    // ------------------------------------------------------------------------
    // 3. Determine Base Unit Sizing & Limits
    // ------------------------------------------------------------------------
    const minInside = config.betLimits?.min || 1;
    const minOutside = config.betLimits?.minOutside || 5;
    const maxLimit = config.betLimits?.max || 500;

    // Unit calculations matching video ratio (1:1:1 corner, 4:4:4 outside)
    const baseInsideUnit = Math.max(1, minInside);
    const baseOutsideUnit = Math.max(4 * baseInsideUnit, minOutside);

    const cornerAmount = Math.min(
        maxLimit,
        Math.max(minInside, baseInsideUnit * state.level)
    );

    const outsideAmount = Math.min(
        maxLimit,
        Math.max(minOutside, baseOutsideUnit * state.level)
    );

    // ------------------------------------------------------------------------
    // 4. Construct Crossover Bet Positions
    // ------------------------------------------------------------------------
    const bets = [
        // 3 Corners
        { type: 'corner', value: 11, amount: cornerAmount }, // 11, 12, 14, 15
        { type: 'corner', value: 17, amount: cornerAmount }, // 17, 18, 20, 21
        { type: 'corner', value: 23, amount: cornerAmount }, // 23, 24, 26, 27
        // 2nd Dozen & Columns 2 and 3
        { type: 'dozen', value: 2, amount: outsideAmount },
        { type: 'column', value: 2, amount: outsideAmount },
        { type: 'column', value: 3, amount: outsideAmount }
    ];

    // ------------------------------------------------------------------------
    // 5. Track State for Next Spin
    // ------------------------------------------------------------------------
    state.lastTotalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    state.lastBankroll = bankroll;

    return bets;
}