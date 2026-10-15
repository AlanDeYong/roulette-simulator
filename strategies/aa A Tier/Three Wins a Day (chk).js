/**
 * Strategy: Three Wins a Day
 * Source: https://youtu.be/KwH2qS_LJtk (The Roulette Master)
 *
 * The Full Logic in details:
 * - Wait for one spin to establish a "last dozen" and "last column".
 * - Trigger: Bet 1 unit on the Dozen that hit last (Follow the winner).
 * - Trigger: Bet 1 unit on each of the TWO Columns that did NOT hit last (Opposite of winner).
 * - Total initial bet is 3 units (1 on dozen, 1 on column A, 1 on column B).
 * - A spin has three outcomes:
 * 1. WIN: Hit the chosen Dozen AND one of the chosen Columns. (Profit: +3 units)
 * 2. BREAK EVEN: Hit ONLY the Dozen OR ONLY one of the Columns. (Profit: 0 units)
 * 3. LOSS: Hit NEITHER the Dozen nor the Columns, or hit a 0/00. (Profit: -3 units)
 * - If a zero hits, the target Dozen and Column do NOT change for the next spin.
 *
 * The Full Bet Progression in details:
 * - Martingale Progression on Loss: If the result is a LOSS, double the bet amount on all three positions.
 * - On BREAK EVEN: The bet size stays exactly the same.
 * - On WIN: The bet size resets to the base unit.
 *
 * The Goal:
 * - Target profit is 3 net wins per session.
 * - Once 3 wins are achieved (e.g., +$225 if betting $25 units), the session resets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.minOutside;

    // 2. Initialize State
    if (state.progression === undefined) {
        state.progression = 1;
        state.winsThisSession = 0;
        state.lastDoz = null;
        state.lastCol = null;
        state.hasBet = false;
    }

    // 3. Process previous spin and calculate progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = parseInt(lastSpin.winningNumber, 10);
        
        // Ensure the number is 1-36 (Filters out 0, 00, or edge cases)
        const isValidNumber = !isNaN(num) && num >= 1 && num <= 36;

        let currentDoz = null;
        let currentCol = null;

        if (isValidNumber) {
            currentDoz = Math.ceil(num / 12);
            currentCol = ((num - 1) % 3) + 1;
        }

        // Evaluate the result of the previous bet if one was placed
        if (state.hasBet && state.lastDoz !== null && state.lastCol !== null) {
            let hitDoz = false;
            let hitCol = false;

            if (isValidNumber) {
                hitDoz = (currentDoz === state.lastDoz);
                // We win the column bet if the current column is one of the two we bet on
                // (i.e., it is NOT the last column)
                hitCol = (currentCol !== state.lastCol);
            }

            if (hitDoz && hitCol) {
                // WIN: Both targets hit
                state.progression = 1;
                state.winsThisSession++;
                
                // Goal Check: Reset session if 3 wins are reached
                if (state.winsThisSession >= 3) {
                    state.winsThisSession = 0;
                }
            } else if (hitDoz || hitCol) {
                // BREAK EVEN: One target hit, one target missed
                // Progression stays exactly the same
            } else {
                // LOSS: Both targets missed, or a zero hit
                state.progression *= 2;
            }
        }

        // Update target variables for the next bet (only if a valid number hit)
        // If a zero hit, targets remain the same as the previous spin
        if (isValidNumber) {
            state.lastDoz = currentDoz;
            state.lastCol = currentCol;
        }
    }

    // 4. Wait for a valid target
    // If there is no target yet (e.g., very first spin, or only zeros so far), skip betting
    if (state.lastDoz === null || state.lastCol === null) {
        state.hasBet = false;
        return [];
    }

    // 5. Calculate Bet Amount
    let amount = unit * state.progression;

    // 6. Clamp to Limits
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 7. Construct Bet Array
    let bets = [];
    
    // Follow the winner on Dozens
    bets.push({ type: 'dozen', value: state.lastDoz, amount: amount });

    // Opposite on Columns (Bet the two columns that did not hit)
    for (let c = 1; c <= 3; c++) {
        if (c !== state.lastCol) {
            bets.push({ type: 'column', value: c, amount: amount });
        }
    }

    state.hasBet = true;
    return bets;
}