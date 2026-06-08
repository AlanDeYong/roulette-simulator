/**
 * Camouflage System (Magic Circle 2.0)
 * Source: The Lucky Felt (https://youtu.be/ntM4Y1XPQbk?si=JtfCXe_stFyDGLIT)
 * * The Full Logic in details:
 * The strategy places 6 overlapping bets to create a dense mathematical trap that covers 34 numbers.
 * The bets are placed on:
 * 1. Low (1-18)
 * 2. Even
 * 3. 2nd Dozen (13-24)
 * 4. 3rd Dozen (25-36)
 * 5. 2nd Column
 * 6. Line Bet (Double Street) on 13-18
 * These bets trigger simultaneously when the spin resolves.
 * * The Full Bet Progression in details:
 * Initial bets start at 1 base unit across all 6 positions.
 * - If a spin results in a Full Loss (e.g., hitting 0, netting a total loss of the bet amount), the progression increases by 1 unit immediately.
 * - If a spin results in a Partial Loss (a net loss, but some bets won and returned funds), a counter is incremented. Every 2 consecutive partial losses increase the progression by 1 unit.
 * - If a spin results in a Push (net 0 profit/loss), the progression and counters do not change.
 * - If a spin results in a Win (net positive), the consecutive partial loss counter resets to 0. The bet size stays the same to grind back towards session profit.
 * - Whenever the bankroll reaches a new session high (positive territory), the progression fully resets to 1 unit.
 * * The Goal:
 * Grind through partial losses with high durability until a heavily overlapping number (like 14 or 18) hits, pushing the session into a new high profit to reset the cycle.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Determine the base unit to respect both inside and outside bet minimums
    const unit = Math.max(config.betLimits.min, config.betLimits.minOutside);

    // Initialize State
    if (state.progression === undefined) {
        state.progression = 1;
        state.partialLossCounter = 0;
        state.sessionHigh = bankroll;
        state.lastBankroll = bankroll;
        state.lastTotalBet = 0;
    }

    // Process previous spin outcome to adjust progression
    if (spinHistory.length > 0 && state.lastTotalBet > 0) {
        const netProfit = bankroll - state.lastBankroll;

        if (bankroll > state.sessionHigh) {
            // Reached a new session high, fully reset progression
            state.sessionHigh = bankroll;
            state.progression = 1;
            state.partialLossCounter = 0;
        } else {
            if (netProfit < 0) {
                // Loss processing
                if (netProfit <= -state.lastTotalBet) {
                    // Full loss (e.g., zero hits)
                    state.progression += 1;
                    state.partialLossCounter = 0; // Resets consecutive partial loss counter
                } else {
                    // Partial loss
                    state.partialLossCounter += 1;
                    if (state.partialLossCounter >= 2) {
                        state.progression += 1;
                        state.partialLossCounter = 0;
                    }
                }
            } else if (netProfit > 0) {
                // Win, but haven't reached session profit
                // Reset consecutive partial loss counter, maintain progression
                state.partialLossCounter = 0;
            }
            // If netProfit === 0 (Push), do nothing to the counters
        }
    }

    // Calculate current bet amount per position
    let amount;
    if (config.incrementMode === 'base') {
        amount = unit * state.progression;
    } else {
        amount = unit + ((state.progression - 1) * config.minIncrementalBet);
    }

    // Clamp bet to table limits
    amount = Math.max(amount, unit);
    amount = Math.min(amount, config.betLimits.max);

    // Update state for next spin's comparison
    state.lastBankroll = bankroll;
    state.lastTotalBet = amount * 6; // 6 betting positions

    // Return the 6 overlapping bets
    return [
        { type: 'low', amount: amount },
        { type: 'even', amount: amount },
        { type: 'dozen', value: 2, amount: amount },
        { type: 'dozen', value: 3, amount: amount },
        { type: 'column', value: 2, amount: amount },
        { type: 'line', value: 13, amount: amount }
    ];
}