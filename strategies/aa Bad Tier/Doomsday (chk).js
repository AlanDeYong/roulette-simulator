/**
 * ============================================================================
 * STRATEGY NAME: The Doomsday Roulette Strategy
 * SOURCE: Ninja Gamblers (YouTube)
 * URL: https://youtu.be/JfLEjairMFw
 * ============================================================================
 * 
 * THE FULL LOGIC IN DETAIL:
 * The Doomsday strategy is an aggressive 3-stage recovery system designed around
 * high hit-rate coverage, offering an 87.8% mathematical probability of completing
 * each cycle in profit.
 * 
 * STAGE 1 (Inside Precision Attack):
 * - Focuses on a single dozen (Dozen 1: 1-12, Dozen 2: 13-24, or Dozen 3: 25-36).
 * - Places 5 equal units total:
 *     - 1 unit on each of the 4 outer corner bets of that dozen.
 *     - 1 unit on the central split connecting the two rows.
 *   For example, on Dozen 1:
 *     - Corner: [1, 2, 4, 5] (corner 1)
 *     - Corner: [2, 3, 5, 6] (corner 2)
 *     - Corner: [7, 8, 10, 11] (corner 7)
 *     - Corner: [8, 9, 11, 12] (corner 8)
 *     - Split: [5, 8]
 * - Payouts in Stage 1:
 *     - Hitting the central numbers (e.g., 5 or 8) hits two corners + the split simultaneously
 *       ("Jackpot"), yielding +31 units net profit.
 *     - Hitting shared boundary numbers awards two corners (+13 units net profit).
 *     - Hitting single corner numbers yields +4 units net profit.
 * - Win: Reset / stay in Stage 1.
 * - Loss: Advance to Stage 2 (Cumulative loss: 5 units).
 * 
 * STAGE 2 (Two-Dozen Recovery):
 * - Triggered after 1 loss in Stage 1.
 * - Places 7 units each on two dozens (14 units total, e.g., Dozen 1 and Dozen 3).
 * - Win: Returns 21 units, recovering the 19 units total risked (5 + 14) and securing 
 *        +2 units profit for the cycle. Reset to Stage 1.
 * - Loss: Advance to Stage 3 (Cumulative loss: 19 units).
 * 
 * STAGE 3 (Even-Money "Doomsday" Spin):
 * - Triggered after 2 consecutive losses (losing Stage 1 and Stage 2).
 * - Places 20 units on an even-money bet (e.g., Red, Black, Even, Odd, Low, or High).
 * - Win: Pays 1:1 (+20 units), recovering the 19 units previously lost and securing
 *        +1 unit profit for the cycle. Reset to Stage 1.
 * - Loss: Stop-loss reached for this cycle (-39 units total). Reset to Stage 1.
 * 
 * GOAL & STOP-LOSS:
 * - Cycle Profit Goal: Secure +1 to +31 units per cycle.
 * - Stop-Loss: Exactly 3 consecutive missed stages (-39 units per cycle).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // ------------------------------------------------------------------------
    // 1. Determine Base Unit Sizing (Respecting Table Limits)
    // ------------------------------------------------------------------------
    const minInside = config.betLimits?.min ?? 1;
    const minOutside = config.betLimits?.minOutside ?? 5;
    const maxBet = config.betLimits?.max ?? 500;

    // A unit must satisfy both inside corner/split minimums and allow 7 units
    // to satisfy the outside dozen minimum (7 * unit >= minOutside).
    let unit = Math.max(minInside, Math.ceil(minOutside / 7));

    // ------------------------------------------------------------------------
    // 2. Initialize Persistent State
    // ------------------------------------------------------------------------
    if (!state.stage) {
        state.stage = 1;              // Stages: 1, 2, or 3
        state.chosenDozen = 1;        // Default target dozen for Stage 1 (1, 2, or 3)
        state.lastBets = null;        // Bets placed in the previous spin
    }

    // ------------------------------------------------------------------------
    // 3. Evaluate Result of the Previous Spin
    // ------------------------------------------------------------------------
    if (spinHistory && spinHistory.length > 0 && state.lastBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;
        const winningColor = lastSpin.winningColor;

        let wonPreviousSpin = false;

        if (state.stage === 1) {
            // Stage 1 wins if winning number is covered by any corner or split in the chosen dozen
            const d = state.chosenDozen;
            const dozenStart = (d - 1) * 12 + 1;
            const dozenEnd = d * 12;
            if (winningNumber >= dozenStart && winningNumber <= dozenEnd) {
                wonPreviousSpin = true;
            }
        } else if (state.stage === 2) {
            // Stage 2 wins if number falls within either of the two selected dozens
            const d1 = state.stage2Dozens ? state.stage2Dozens[0] : 1;
            const d2 = state.stage2Dozens ? state.stage2Dozens[1] : 3;
            const inD1 = winningNumber >= (d1 - 1) * 12 + 1 && winningNumber <= d1 * 12;
            const inD2 = winningNumber >= (d2 - 1) * 12 + 1 && winningNumber <= d2 * 12;
            wonPreviousSpin = inD1 || inD2;
        } else if (state.stage === 3) {
            // Stage 3 wins if the even-money bet hits
            const betType = state.stage3BetType || 'even';
            if (winningNumber !== 0 && winningNumber !== 37) {
                if (betType === 'red' && winningColor === 'red') wonPreviousSpin = true;
                if (betType === 'black' && winningColor === 'black') wonPreviousSpin = true;
                if (betType === 'even' && winningNumber % 2 === 0) wonPreviousSpin = true;
                if (betType === 'odd' && winningNumber % 2 === 1) wonPreviousSpin = true;
                if (betType === 'low' && winningNumber >= 1 && winningNumber <= 18) wonPreviousSpin = true;
                if (betType === 'high' && winningNumber >= 19 && winningNumber <= 36) wonPreviousSpin = true;
            }
        }

        // Progression Transition
        if (wonPreviousSpin) {
            // Reset to Stage 1 upon any win
            state.stage = 1;
        } else {
            // Advance to next stage or reset if Doomsday stop-loss hit
            if (state.stage === 1) {
                state.stage = 2;
            } else if (state.stage === 2) {
                state.stage = 3;
            } else {
                // Stage 3 failed: Stop-loss reached for this cycle
                state.stage = 1;
            }
        }
    }

    // ------------------------------------------------------------------------
    // 4. Construct Bets According to Current Stage
    // ------------------------------------------------------------------------
    const bets = [];

    // Helper to safely clamp bet amount within table limits
    const clamp = (amount, isOutside = false) => {
        const minLimit = isOutside ? minOutside : minInside;
        return Math.min(Math.max(amount, minLimit), maxBet);
    };

    if (state.stage === 1) {
        // --- STAGE 1: 4 Outside Corners + 1 Central Split on Chosen Dozen ---
        const d = state.chosenDozen || 1;
        const base = (d - 1) * 12;

        const cornerStake = clamp(unit, false);
        const splitStake = clamp(unit, false);

        // Corner 1: top-left corner of the first 2 rows
        // Corner 2: top-middle corner of the first 2 rows
        // Corner 3: top-left corner of the last 2 rows
        // Corner 4: top-middle corner of the last 2 rows
        // Split: between middle row 2 and row 3
        bets.push({ type: 'corner', value: base + 1, amount: cornerStake });
        bets.push({ type: 'corner', value: base + 2, amount: cornerStake });
        bets.push({ type: 'corner', value: base + 7, amount: cornerStake });
        bets.push({ type: 'corner', value: base + 8, amount: cornerStake });
        bets.push({ type: 'split', value: [base + 5, base + 8], amount: splitStake });

    } else if (state.stage === 2) {
        // --- STAGE 2: 7 Units on Two Dozens (e.g. Dozen 1 & Dozen 3) ---
        state.stage2Dozens = [1, 3];
        const dozenStake = clamp(unit * 7, true);

        bets.push({ type: 'dozen', value: state.stage2Dozens[0], amount: dozenStake });
        bets.push({ type: 'dozen', value: state.stage2Dozens[1], amount: dozenStake });

    } else if (state.stage === 3) {
        // --- STAGE 3: 20 Units on an Even-Money Bet ---
        state.stage3BetType = 'even';
        const evenStake = clamp(unit * 20, true);

        bets.push({ type: state.stage3BetType, amount: evenStake });
    }

    // ------------------------------------------------------------------------
    // 5. Bankroll Guard & State Saving
    // ------------------------------------------------------------------------
    const totalRequired = bets.reduce((sum, b) => sum + b.amount, 0);
    if (bankroll < totalRequired) {
        // Insufficient funds to fulfill the required bets
        return [];
    }

    state.lastBets = bets;
    return bets;
}