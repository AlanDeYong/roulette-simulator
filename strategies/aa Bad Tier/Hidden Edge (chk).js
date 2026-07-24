/**
 * Hidden Edge Roulette Strategy
 * Source: https://youtu.be/T39C5mjpNGk (The Roulette Master / Silent Tiger)
 * 
 * The Full Logic in details:
 * - Triggers: Evaluate the most recent valid Dozen and Color to hit in the spin history (ignoring zeros).
 * - Placements: 
 *    1. Bet on the TWO Dozens that DID NOT hit last.
 *    2. Bet on the ONE Color that DID hit last (Follow the winner).
 * - Conditions: You are always placing exactly 3 bets (2 outside dozens, 1 outside color).
 * 
 * The Full Bet Progression in details:
 * - Starts at a base progression level (L = 1) for each of the 3 positions.
 * - Calculates the net profit from the previous spin's bets:
 *   - If Profit < 0 (Loss): INCREASE progression level (L) by 1.
 *   - If Profit == 0 (Break Even): KEEP progression level (L) the same.
 *   - If Profit > 0 (Win): 
 *       - If the bankroll is at or above the highest recorded bankroll (Session High), RESET L to 1.
 *       - If the bankroll is still below the session high, KEEP L the same to recover faster.
 * 
 * The Goal:
 * - Utilize the high coverage (24 numbers on dozens + 18 on color) to frequently break even or win.
 * - Escalate bets linearly on losses and use break-evens as a "hidden edge" safety net to survive 
 *   long enough until a full win recovers the bankroll to a new session high.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.L === undefined) {
        state.L = 1;
        state.highWaterMark = bankroll;
        state.lastBankroll = bankroll;
    }

    // 2. Progression Update based on previous spin profit
    if (spinHistory.length > 0) {
        const profit = bankroll - state.lastBankroll;
        
        if (profit < 0) {
            state.L += 1; // Increase unit on loss
        } else if (profit > 0) {
            if (bankroll >= state.highWaterMark) {
                state.L = 1; // Reset on full recovery / new session high
            }
            // If still in a hole, state.L stays the same to press the recovery
        }
        // If profit === 0 (Break Even), state.L stays the same
    }

    // 3. Update High Water Mark
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
    }

    // 4. Record current bankroll before we place new bets
    state.lastBankroll = bankroll;

    // 5. Determine Placements from History
    let lastDozen = null;
    let lastColor = null;

    for (let i = spinHistory.length - 1; i >= 0; i--) {
        const num = spinHistory[i].winningNumber;
        const color = spinHistory[i].winningColor;
        
        // Ignore zeros for determining the "last valid" hits
        if (num !== 0 && num !== '00') {
            if (!lastDozen) {
                if (num >= 1 && num <= 12) lastDozen = 1;
                else if (num >= 13 && num <= 24) lastDozen = 2;
                else if (num >= 25 && num <= 36) lastDozen = 3;
            }
            if (!lastColor && (color === 'red' || color === 'black')) {
                lastColor = color;
            }
        }
        
        // Break early if we've successfully found both previous indicators
        if (lastDozen && lastColor) break;
    }

    // Defaults for the very first spin or if only zeros have appeared
    if (!lastDozen) lastDozen = 3;
    if (!lastColor) lastColor = 'red';

    // Map which two dozens DID NOT hit
    let dozensToBet = [];
    if (lastDozen === 1) dozensToBet = [2, 3];
    else if (lastDozen === 2) dozensToBet = [1, 3];
    else if (lastDozen === 3) dozensToBet = [1, 2];

    // 6. Calculate Bet Amount
    const unit = config.betLimits.minOutside;
    const increment = config.incrementMode === 'base' ? unit : config.minIncrementalBet;
    
    let amount = unit + (state.L - 1) * increment;

    // Clamp to min/max limits
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 7. Return the 3 bets (2 dozens, 1 color)
    return [
        { type: 'dozen', value: dozensToBet[0], amount: amount },
        { type: 'dozen', value: dozensToBet[1], amount: amount },
        { type: lastColor, amount: amount } 
    ];
}