/**
 * Leader Repeater Strategy
 * 
 * Source:
 * - URL: https://youtu.be/A_f0EhFr4PI
 * - Channel: CEG Dealer School
 * 
 * Full Logic Details:
 * The Leader Repeater strategy is a cooperative team/couples system where two distinct positions are played:
 * 1. One player covers a Dozen (e.g., 2nd Dozen).
 * 2. The second player covers a Column (e.g., 2nd Column).
 * 3. Additionally, a straight-up bet (half unit) is placed on the PREVIOUS winning number (the "Repeater" bet).
 * 
 * Full Bet Progression Details:
 * - D'Alembert progression on outside bets (Dozen and Column):
 *   - Initial Bet: 1 unit on Dozen (e.g., $10) and 1 unit on Column (e.g., $10).
 *   - On Loss: Increase the bet on that specific outside position by 1 unit.
 *   - On Win: Decrease the bet on that specific outside position by 1 unit (minimum 1 unit).
 * - Straight Up Repeater Bet:
 *   - Place a straight-up bet on the previous winning number equal to half of the base unit (or half of the current average progression unit, clamped to inside bet limits).
 * 
 * Goal:
 * - Target Profit: +20 units total ($200 target on $10 base units) or hitting the straight-up repeater jackpot.
 * - Reset session upon reaching profit target or bankroll goals.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base units respecting bet limits
    const minOutside = config.betLimits.minOutside || 5;
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;

    // Use $10 standard unit if limits allow, otherwise adapt to minOutside
    const baseUnit = Math.max(minOutside, 10);
    const halfUnit = Math.max(minInside, Math.floor(baseUnit / 2));

    // 2. Target profit setup ($200 or 20 base units)
    if (!state.initialBankroll) {
        state.initialBankroll = bankroll;
    }
    const profitTarget = 20 * baseUnit;

    // Check if profit target achieved; reset if reached
    if (bankroll - state.initialBankroll >= profitTarget) {
        state.dozenUnits = 1;
        state.columnUnits = 1;
        state.initialBankroll = bankroll;
    }

    // Initialize state progression levels
    if (!state.dozenUnits) state.dozenUnits = 1;
    if (!state.columnUnits) state.columnUnits = 1;

    // Fixed chosen positions for team play (Dozen 2 and Column 2, yielding overlap at 14, 17, 20, 23)
    const targetDozen = 2;   // 2nd Dozen (13-24)
    const targetColumn = 2;  // 2nd Column (2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35)

    // 3. Process previous spin result to update progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Determine if Dozen 2 won
        const wonDozen = (lastNum >= 13 && lastNum <= 24);
        if (wonDozen) {
            state.dozenUnits = Math.max(1, state.dozenUnits - 1);
        } else {
            state.dozenUnits += 1;
        }

        // Determine if Column 2 won
        const wonColumn = (lastNum > 0 && lastNum % 3 === 2);
        if (wonColumn) {
            state.columnUnits = Math.max(1, state.columnUnits - 1);
        } else {
            state.columnUnits += 1;
        }
    }

    // 4. Calculate bet amounts and clamp to limits
    let dozenBetAmount = Math.min(maxBet, Math.max(minOutside, state.dozenUnits * baseUnit));
    let columnBetAmount = Math.min(maxBet, Math.max(minOutside, state.columnUnits * baseUnit));

    const bets = [
        { type: 'dozen', value: targetDozen, amount: dozenBetAmount },
        { type: 'column', value: targetColumn, amount: columnBetAmount }
    ];

    // 5. Add straight-up repeater bet on the previous winning number if spin history exists
    if (spinHistory.length > 0) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        let repeaterBetAmount = Math.min(maxBet, Math.max(minInside, halfUnit));
        bets.push({ type: 'number', value: lastNum, amount: repeaterBetAmount });
    }

    return bets;
}