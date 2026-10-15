/**
 * Strategy: Dark Matter Roulette
 * 
 * Source:
 * - Channel: The Roulette Master
 * - Video URL: https://youtu.be/0hCsZYGXb2o
 * - Strategy Origin: Joey (Subscriber system featured on the channel)
 * 
 * The Full Logic in Detail:
 * - Dark Matter Roulette covers 26 out of 37 (or 38) numbers with a heavy bias towards black numbers:
 *   1. 1 unit on Black (Outside bet)
 *   2. 1 unit on Column 1 (Outside bet covering numbers 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34)
 *   3. 1 unit on Column 2 (Outside bet covering numbers 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35)
 * - Columns 1 and 2 together hold 16 black numbers and only 8 red numbers. Column 3 contains 8 red numbers and only 4 black numbers.
 * 
 * Outcome Scenarios:
 * 1. Black in Column 1 or Column 2 (16 numbers):
 *    - Win on Black (+1 unit net) and win on Column (+1 unit net after losing the other column) = Total Net Win +2 units.
 * 2. Red in Column 1 or Column 2 (8 numbers):
 *    - Lose Black (-1 unit), Win Column (+1 unit net) = Break even (Net $0).
 * 3. Black in Column 3 (4 numbers: 6, 15, 24, 33):
 *    - Win Black (+1 unit), Lose both Columns (-2 units) = Partial Loss (-1 unit).
 * 4. Red in Column 3 (8 numbers) or 0 / 00:
 *    - Lose Black (-1 unit), Lose both Columns (-2 units) = Full Loss (-3 units).
 * 
 * The Full Bet Progression in Detail (D'Alembert-style single unit rise on loss):
 * - Initial Bet: 1 base unit on Black, 1 base unit on Column 1, 1 base unit on Column 2.
 * - On any Net Loss (either full loss -3 units or partial loss -1 unit):
 *   - Increase the bet size on all three positions by 1 unit (+config.minIncrementalBet or base unit).
 * - On Break Even (Net $0):
 *   - Keep bets at the exact same progression level.
 * - On Net Win (+2 units):
 *   - If the session is back in profit (bankroll >= highest target or starting bankroll): Reset progression back to base (1 unit).
 *   - If still recovering from a drawdown: Maintain current bet level to recover bankroll faster without escalating risk.
 * 
 * The Goal:
 * - Accumulate consistent session profits through the combination of frequent double wins (+2 units) and 
 *   frequent break-even safety nets, resetting to base level upon achieving session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit for Outside bets
    const baseUnit = config.betLimits.minOutside;
    const increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.progression = 1; // Current unit multiplier
        state.sessionTarget = bankroll; // Peak bankroll to reach for reset
        state.lastBankroll = bankroll;
        state.lastTotalBet = 0;
    }

    // 3. Process the last spin result if history exists
    if (spinHistory && spinHistory.length > 0 && state.lastTotalBet > 0) {
        const netProfitLastSpin = bankroll - state.lastBankroll;

        if (netProfitLastSpin > 0) {
            // Winning spin (Hit Black in Column 1 or 2)
            if (bankroll >= state.sessionTarget) {
                // Reached or surpassed session target profit: Reset
                state.progression = 1;
                state.sessionTarget = bankroll;
            }
            // If still in drawdown, maintain progression level to recover
        } else if (netProfitLastSpin < 0) {
            // Net loss (Column 3 hit or 0/00)
            state.progression += 1;
        }
        // If netProfitLastSpin === 0 (Break-even red hit in Column 1 or 2), keep progression unchanged
    }

    // Update session peak target if bankroll naturally exceeds it
    if (bankroll > state.sessionTarget) {
        state.sessionTarget = bankroll;
    }

    // 4. Calculate Bet Amounts
    const unitAmount = baseUnit + (state.progression - 1) * increment;

    // Clamp bet amounts between table limits
    let clampedAmount = Math.max(unitAmount, config.betLimits.minOutside);
    clampedAmount = Math.min(clampedAmount, config.betLimits.max);

    // Ensure bankroll has enough funds for all three bets (Black, Column 1, Column 2)
    const totalRequired = clampedAmount * 3;
    if (bankroll < totalRequired) {
        // Scale down proportionally if bankroll is tight
        clampedAmount = Math.floor(bankroll / 3);
        if (clampedAmount < config.betLimits.minOutside) {
            return []; // Cannot meet minimum table bet
        }
    }

    // 5. Save state for next spin resolution
    state.lastBankroll = bankroll;
    state.lastTotalBet = clampedAmount * 3;

    // 6. Return Bet Placements (Dark Matter: Black + Column 1 + Column 2)
    return [
        { type: 'black', amount: clampedAmount },
        { type: 'column', value: 1, amount: clampedAmount },
        { type: 'column', value: 2, amount: clampedAmount }
    ];
}