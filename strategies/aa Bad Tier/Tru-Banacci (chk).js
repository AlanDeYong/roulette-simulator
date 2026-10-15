/**
 * Tru-Banacci Roulette Strategy
 *
 * Source:
 * - Channel: Ninja Gamblers
 * - Video URL: https://youtu.be/FtzuNW8nzoU ("$130 Profit in 7 Minutes — Tru-Banacci Roulette Strategy")
 *
 * Full Logic in Detail:
 * - The Tru-Banacci strategy is a modified Fibonacci progression played on 2:1 payout bets
 *   (Dozens or Columns; Dozens are used here).
 * - A unit is defined based on the table's outside bet minimum (config.betLimits.minOutside).
 * - Target bets:
 *   - Steps 1 to 3: Bet on a single dozen (e.g., Dozen 1, or following chosen/last winning dozen).
 *   - Step 4: Split the wager across two dozens (e.g., Dozens 1 and 2), covering ~64.8% of the wheel
 *     to cushion losses and recover momentum.
 *
 * Progression Details (4-Step Cycle):
 * - Step 1: Bet 2 units on 1 dozen.
 *   - Win: Stay on Step 1 (bet 2 units).
 *   - Loss: Advance to Step 2.
 * - Step 2: Bet 3 units on 1 dozen (adds 1 unit).
 *   - Win: Return to Step 1.
 *   - Loss: Advance to Step 3.
 * - Step 3: Bet 5 units on 1 dozen.
 *   - Win: Step back to Step 2.
 *   - Loss: Advance to Step 4.
 * - Step 4: Bet 4 units each on 2 separate dozens (8 units total).
 *   - Win (one dozen hits): Step back to Step 3.
 *   - Loss (both miss): Accept loss, reset cycle back to Step 1.
 *
 * Session Goal:
 * - Profit Target: +20 units above starting bankroll.
 * - Stop Loss: Maximum loss of 40 units from starting bankroll, or when remaining bankroll cannot cover the next bet.
 * - Stop betting (return empty array) once either threshold is met.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minOutside = config.betLimits.minOutside;
    const maxLimit = config.betLimits.max;
    const unit = minOutside;

    // Initialize state
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.step = 1; // Progression step: 1, 2, 3, or 4
        state.lastBets = null;
    }

    const currentProfit = bankroll - state.initialBankroll;
    const profitTarget = 2000 * unit;
    const stopLoss = -40 * unit;

    // Evaluate progression after spin results
    if (spinHistory && spinHistory.length > 0 && state.lastBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;

        // Determine which dozen won (1: 1-12, 2: 13-24, 3: 25-36, 0 for zero)
        let winningDozen = 0;
        if (winningNumber >= 1 && winningNumber <= 12) winningDozen = 1;
        else if (winningNumber >= 13 && winningNumber <= 24) winningDozen = 2;
        else if (winningNumber >= 25 && winningNumber <= 36) winningDozen = 3;

        // Check if any placed dozen bet won
        const won = state.lastBets.some(b => b.type === 'dozen' && b.value === winningDozen);

        if (won) {
            if (state.step === 1) {
                state.step = 1;
            } else if (state.step === 2) {
                state.step = 1;
            } else if (state.step === 3) {
                state.step = 2;
            } else if (state.step === 4) {
                state.step = 3;
            }
        } else {
            if (state.step === 1) {
                state.step = 2;
            } else if (state.step === 2) {
                state.step = 3;
            } else if (state.step === 3) {
                state.step = 4;
            } else if (state.step === 4) {
                // Cycle bust: accept loss and reset to step 1
                state.step = 1;
            }
        }
    }

    // Check profit target and stop loss goals
    if (currentProfit >= profitTarget || currentProfit <= stopLoss) {
        return [];
    }

    // Helper function to clamp bet amounts to table limits
    const clampBet = (amt) => Math.min(Math.max(amt, minOutside), maxLimit);

    let bets = [];

    if (state.step === 1) {
        // Step 1: 2 units on 1 dozen
        bets = [{ type: 'dozen', value: 1, amount: clampBet(2 * unit) }];
    } else if (state.step === 2) {
        // Step 2: 3 units on 1 dozen
        bets = [{ type: 'dozen', value: 1, amount: clampBet(3 * unit) }];
    } else if (state.step === 3) {
        // Step 3: 5 units on 1 dozen
        bets = [{ type: 'dozen', value: 1, amount: clampBet(5 * unit) }];
    } else if (state.step === 4) {
        // Step 4: 4 units each on 2 separate dozens (total 8 units)
        const betAmount = clampBet(4 * unit);
        bets = [
            { type: 'dozen', value: 1, amount: betAmount },
            { type: 'dozen', value: 2, amount: betAmount }
        ];
    }

    // Verify bankroll covers total bet amount
    const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
    if (bankroll < totalWager) {
        return [];
    }

    state.lastBets = bets;
    return bets;
}