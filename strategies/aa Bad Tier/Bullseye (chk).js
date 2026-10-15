/**
 * ============================================================================
 * Strategy Name: The Bullseye Roulette Strategy
 * Source: https://youtu.be/H-sB2U8R4-U
 * Channel: The Roulette Master (Strategy submitted by Ken Dipple)
 * ============================================================================
 * 
 * THE FULL LOGIC IN DETAIL:
 * -------------------------
 * "The Bullseye" is an outside-bet combination strategy targeting the red numbers
 * located within the second dozen (14, 16, 18, 19, 21, and 23). According to the author,
 * these numbers cluster together on the wheel, creating a high-payout "bullseye" zone.
 * 
 * Every spin, the player places two simultaneous outside bets:
 * 1. Even-money bet on RED
 * 2. 2:1 column/dozen bet on 2ND DOZEN (numbers 13 through 24)
 * 
 * THE FULL BET PROGRESSION IN DETAIL:
 * -----------------------------------
 * - Initial Bet Ratio: 3 units on Red, 2 units on 2nd Dozen (e.g., $15 Red, $10 2nd Dozen).
 * - Progression Type: Independent additive progression (modified D'Alembert per position).
 *   * Each bet position tracks its own stake independently.
 *   * If Red loses: Red bet increases by 1 unit (+minIncrementalBet).
 *   * If Red wins: Red bet remains at its current stake (does not increase).
 *   * If 2nd Dozen loses: 2nd Dozen bet increases by 1 unit (+minIncrementalBet).
 *   * If 2nd Dozen wins: 2nd Dozen bet remains at its current stake.
 *   * If both lose (Black number in 1st/3rd dozen or 0/00): Both bets increase by 1 unit.
 *   * When both win ("Bullseye" hit) or the player reaches a new peak / session profit,
 *     both bets reset to base levels (3 units on Red, 2 units on 2nd Dozen).
 * 
 * THE GOAL:
 * ---------
 * - Lock in cumulative session profit (default target: +$500, or a cycle profit relative
 *   to the starting bankroll) and reset the progression upon reaching new cycle highs.
 * - Stop loss condition: Stop if bankroll falls below the minimum required bet.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish unit sizing and base bet ratios (3 units Red : 2 units 2nd Dozen)
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;
    const increment = config.minIncrementalBet || 1;

    // Unit size derived so 2 units is at least minOutside
    const unit = Math.max(1, Math.ceil(minOutside / 2));
    const baseRedUnits = 3;
    const baseDozenUnits = 2;

    // 2. Initialize Persistent State
    if (!state.initialized) {
        state.initialized = true;
        state.redUnits = baseRedUnits;
        state.dozenUnits = baseDozenUnits;
        state.sessionTarget = config.startingBankroll + 5000;
        state.cyclePeakBankroll = bankroll;
    }

    // 3. Evaluate Previous Spin Results (if any)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        const lastColor = lastSpin.winningColor;

        const redWon = (lastColor === 'red');
        const dozenWon = (lastNumber >= 13 && lastNumber <= 24);

        // Check if a new bankroll peak or target profit was reached
        if (bankroll >= state.cyclePeakBankroll + (unit * 2) || bankroll >= state.sessionTarget) {
            // Reset progression back to base after recovery or reaching target
            state.redUnits = baseRedUnits;
            state.dozenUnits = baseDozenUnits;
            state.cyclePeakBankroll = bankroll;
        } else {
            // Update Red position independently
            if (!redWon) {
                state.redUnits += 1;
            }

            // Update 2nd Dozen position independently
            if (!dozenWon) {
                state.dozenUnits += 1;
            }

            // If Bullseye hit (both won), check if we can reset to base
            if (redWon && dozenWon && bankroll >= state.cyclePeakBankroll) {
                state.redUnits = baseRedUnits;
                state.dozenUnits = baseDozenUnits;
                state.cyclePeakBankroll = bankroll;
            }
        }
    }

    // 4. Session Target / Bankroll Guard Checks
    if (bankroll >= state.sessionTarget) {
        return []; // Target reached, stop betting
    }

    // 5. Calculate and Clamp Bet Amounts
    let redAmount = state.redUnits * unit;
    let dozenAmount = state.dozenUnits * unit;

    // Clamp to table limits
    redAmount = Math.max(minOutside, Math.min(redAmount, maxBet));
    dozenAmount = Math.max(minOutside, Math.min(dozenAmount, maxBet));

    // Ensure total bet does not exceed available bankroll
    const totalRequired = redAmount + dozenAmount;
    if (bankroll < totalRequired) {
        if (bankroll < minOutside * 2) {
            return []; // Not enough funds to place both bets safely
        }
        // Scale down proportionally to remaining bankroll if low
        const scale = bankroll / totalRequired;
        redAmount = Math.max(minOutside, Math.floor(redAmount * scale));
        dozenAmount = Math.max(minOutside, Math.floor(dozenAmount * scale));
    }

    // 6. Return Bet Array
    return [
        { type: 'red', amount: redAmount },
        { type: 'dozen', value: 2, amount: dozenAmount }
    ];
}