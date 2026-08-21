/**
 * ==============================================================================
 * Strategy: Pressing Hard On A Budget
 * Source: CEG Dealer School (https://youtu.be/T5jhkLX7UHA)
 * ==============================================================================
 * 
 * --- FULL LOGIC IN DETAIL ---
 * "Pressing Hard On A Budget" is a progressive roulette streak strategy designed
 * for a $200 buy-in using $5 base chips (or table minimum units). It begins with
 * a 2-dozen coverage and progressively presses house money through 4 structured
 * stages, locking in profit along the way while minimizing out-of-pocket downside.
 * 
 * --- BET PROGRESSION ---
 * Stage 1 (Initial Flat Bet):
 *   - Bet 2 units on Dozen 2 and 2 units on Dozen 3 (Total: 4 units / $20).
 *   - Win: +2 units net profit ($30 total returned on $20 bet). Advance to Stage 2.
 *   - Loss: Rebet Stage 1.
 * 
 * Stage 2 (The Nollie Press):
 *   - Use the $30 returned from Stage 1.
 *   - Bet 4 units on primary Dozen (Dozen 2) and 2 units on secondary Dozen (Dozen 3).
 *   - Win on Primary (4 units): Returns $60 profit ($60 payout + $30 bet back = $90).
 *     Lock up $30 profit into bankroll and advance with remaining $60 to Stage 3.
 *   - Win on Secondary (2 units): Pays $30 (Net $0 change / Push). Replay Stage 2.
 *   - Loss: Reset to Stage 1.
 * 
 * Stage 3 (The Spread):
 *   - Total Bet: 10 units ($50 total wagered):
 *     * 2 units ($10) on the last winning Dozen.
 *     * 2 units ($10) each on 2 non-overlapping Corners in the first remaining Dozen.
 *     * 2 units ($10) each on 2 non-overlapping Corners in the second remaining Dozen.
 *     (Total of 4 Corner bets @ 2 units each = 8 units / $40 across the other 2 Dozens).
 *   - Win on Corner: Pays 8:1 ($80 profit + $10 bet = $90 total return, +$40 net profit).
 *     Advance to Stage 4.
 *   - Win on Dozen (Push / Soft Recovery): Returns $30 (net -$20 on the $50 bet). Reset to Stage 1.
 *   - Loss: Reset to Stage 1.
 * 
 * Stage 4 (The High-Tier Double Press):
 *   - Bet 6 units ($30) on Dozen 2 and 6 units ($30) on Dozen 3 (Total: 12 units / $60).
 *   - Win: Pays $90 (+30 units net profit). Cycle complete; lock profits and reset to Stage 1.
 *   - Loss: Reset to Stage 1.
 * 
 * --- GOAL & STOP LOSS ---
 * - Profit Target: Reach $500 - $600 (2.5x to 3x starting buy-in).
 * - Stop Loss: $0 (preserve bankroll, walk away if depleted).
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine Unit Sizing based on Limits
    const minOutside = config.betLimits?.minOutside || 5;
    const minInside = config.betLimits?.min || 2;
    const maxBet = config.betLimits?.max || 500;
    const unit = Math.max(minOutside / 2, minInside, 5);

    // Pre-defined non-overlapping corner top-left values for each dozen
    // Dozen 1 (1-12): Corner 1 (1,2,4,5) & Corner 8 (8,9,11,12)
    // Dozen 2 (13-24): Corner 13 (13,14,16,17) & Corner 20 (20,21,23,24)
    // Dozen 3 (25-36): Corner 25 (25,26,28,29) & Corner 32 (32,33,35,36)
    const dozenCorners = {
        1: [1, 8],
        2: [13, 20],
        3: [25, 32]
    };

    // Helper: Clamps bet amounts to valid table limits
    function clampBet(amount, isInside = false) {
        const min = isInside ? minInside : minOutside;
        return Math.min(Math.max(amount, min), maxBet);
    }

    // Helper: Map a corner starting value to its 4 covered numbers
    function getCornerNumbers(cornerStart) {
        return [cornerStart, cornerStart + 1, cornerStart + 3, cornerStart + 4];
    }

    // 2. Initialize State
    if (!state.initialized) {
        state.stage = 1;
        state.primaryDozen = 2;
        state.secondaryDozen = 3;
        state.lastWinningDozen = 2;
        state.targetProfit = (config.startingBankroll || 200) + 400; // Target $600
        state.stopLoss = 0;
        state.initialized = true;
    }

    // Check Stop-Loss and Target Profit Goals
    if (bankroll <= state.stopLoss || bankroll >= state.targetProfit) {
        return [];
    }

    // 3. Evaluate Previous Result if History Exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        let hitDozen = 0;
        if (num >= 1 && num <= 12) hitDozen = 1;
        else if (num >= 13 && num <= 24) hitDozen = 2;
        else if (num >= 25 && num <= 36) hitDozen = 3;

        if (state.stage === 1) {
            if (hitDozen === state.primaryDozen || hitDozen === state.secondaryDozen) {
                state.lastWinningDozen = hitDozen;
                state.stage = 2;
            } else {
                state.stage = 1;
            }
        } else if (state.stage === 2) {
            if (hitDozen === state.primaryDozen) {
                state.lastWinningDozen = hitDozen;
                state.stage = 3;
            } else if (hitDozen === state.secondaryDozen) {
                state.stage = 2; // Push -> repeat Stage 2
            } else {
                state.stage = 1;
            }
        } else if (state.stage === 3) {
            // Check which other 2 dozens had the 4 corners placed
            const otherDozens = [1, 2, 3].filter(d => d !== state.lastWinningDozen);
            const activeCornerNums = otherDozens
                .flatMap(d => dozenCorners[d])
                .flatMap(c => getCornerNumbers(c));

            if (activeCornerNums.includes(num)) {
                // Corner hit: full payout -> advance to Stage 4
                state.stage = 4;
            } else if (hitDozen === state.lastWinningDozen) {
                // Dozen hit: soft recovery -> reset to Stage 1
                state.stage = 1;
            } else {
                state.stage = 1;
            }
        } else if (state.stage === 4) {
            // End of progression cycle on either win or loss
            state.stage = 1;
        }
    }

    const bets = [];

    // 4. Construct Stage Bets
    if (state.stage === 1) {
        bets.push({ type: 'dozen', value: state.primaryDozen, amount: clampBet(unit * 2) });
        bets.push({ type: 'dozen', value: state.secondaryDozen, amount: clampBet(unit * 2) });
    } else if (state.stage === 2) {
        bets.push({ type: 'dozen', value: state.primaryDozen, amount: clampBet(unit * 4) });
        bets.push({ type: 'dozen', value: state.secondaryDozen, amount: clampBet(unit * 2) });
    } else if (state.stage === 3) {
        // 2 units on last winning dozen
        bets.push({ type: 'dozen', value: state.lastWinningDozen, amount: clampBet(unit * 2) });

        // 2 non-overlapping corners in each of the other 2 dozens (4 corners total @ 2 units each)
        const otherDozens = [1, 2, 3].filter(d => d !== state.lastWinningDozen);
        otherDozens.forEach(dozenNum => {
            dozenCorners[dozenNum].forEach(cornerValue => {
                bets.push({ type: 'corner', value: cornerValue, amount: clampBet(unit * 2, true) });
            });
        });
    } else if (state.stage === 4) {
        bets.push({ type: 'dozen', value: state.primaryDozen, amount: clampBet(unit * 6) });
        bets.push({ type: 'dozen', value: state.secondaryDozen, amount: clampBet(unit * 6) });
    }

    // Ensure total bet does not exceed current bankroll
    const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalWager > bankroll) {
        return [];
    }

    return bets;
}