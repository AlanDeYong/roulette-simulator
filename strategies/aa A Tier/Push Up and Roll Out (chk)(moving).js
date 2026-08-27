/**
 * ============================================================================
 * Strategy Name: Push Up and Roll Out
 * Source: CEG Dealer School (https://youtu.be/QZHSNryDFfA)
 * Strategist: Zach
 * 
 * 1. The Full Logic in Detail:
 *    - The player covers 4 connecting double streets (six-line bets) spanning
 *      5 consecutive rows (15 individual numbers total).
 *    - Due to the nature of overlapping double streets:
 *      * The 2 end rows (outer rows) are covered by 1 double street (Single Hit).
 *      * The 3 interior rows (middle rows) are covered by 2 overlapping double streets (Double Hit).
 *    - "Roll Out" Placement: After a spin, the 5-row betting window shifts/rolls
 *      so that it encompasses or touches the last winning number (clamped within rows 1 to 8).
 * 
 * 2. The Full Bet Progression in Detail (Modified D'Alembert):
 *    - Base Bet: 1 base unit on each of the 4 double street lines.
 *    - On a Loss (Miss / 0 / 00): Add 1 unit to each line (+1 progression level).
 *    - On a Side/End Win (Single line hit): Reduce progression level by 2 units.
 *    - On a Middle Win (Double line hit): Reduce progression level by 4 units.
 *    - The progression level never drops below 1 (base level).
 * 
 * 3. The Goal:
 *    - Target profit of $200 to $300 above starting bankroll.
 *    - Stop if bankroll is insufficient to place the minimum required bets.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Target profit and stop conditions
    const targetProfit = 300000;
    if (!state.initialBankroll) {
        state.initialBankroll = bankroll;
    }

    // Stop if profit target reached
    if (bankroll >= state.initialBankroll + targetProfit) {
        return [];
    }

    // 2. Initialize unit and progression state
    const baseUnit = Math.max(config.betLimits.min, 1);
    const unitStep = config.incrementMode === 'base' 
        ? baseUnit 
        : (config.minIncrementalBet || 1);

    if (state.progressionLevel === undefined) {
        state.progressionLevel = 1;
        state.startRow = 1; // Default to rows 1-5 (numbers 1-15)
    }

    // 3. Evaluate previous spin outcome to adjust progression and position
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        if (state.activeRows && state.activeRows.length === 5) {
            const startRow = state.activeRows[0];
            const endRow = state.activeRows[4];
            
            // Check if winning number landed on the roulette number grid (1-36)
            if (winningNum >= 1 && winningNum <= 36) {
                const winRow = Math.ceil(winningNum / 3);

                if (winRow >= startRow && winRow <= endRow) {
                    if (winRow === startRow || winRow === endRow) {
                        // Side/End row hit (1 line covered) -> Decrease level by 2 units
                        state.progressionLevel = Math.max(1, state.progressionLevel - 2);
                    } else {
                        // Middle row hit (2 lines covered) -> Decrease level by 4 units
                        state.progressionLevel = Math.max(1, state.progressionLevel - 4);
                    }
                } else {
                    // Miss outside active rows -> Increase level by 1 unit
                    state.progressionLevel += 1;
                }

                // "Roll Out": reposition 5-row window centered around the winning row
                let newStartRow = winRow - 2;
                newStartRow = Math.max(1, Math.min(8, newStartRow));
                state.startRow = newStartRow;
            } else {
                // Landed on 0 or 00 -> Loss
                state.progressionLevel += 1;
            }
        }
    }

    // 4. Calculate line bet amounts and clamp to table limits
    let unitAmount = baseUnit + (state.progressionLevel - 1) * unitStep;
    unitAmount = Math.max(config.betLimits.min, unitAmount);
    unitAmount = Math.min(config.betLimits.max, unitAmount);

    // 5. Define active 5 rows and build 4 connecting double street bets
    const startRow = state.startRow || 1;
    state.activeRows = [startRow, startRow + 1, startRow + 2, startRow + 3, startRow + 4];

    const bets = [];
    for (let i = 0; i < 4; i++) {
        const lineStartRow = startRow + i;
        const lineValue = (lineStartRow - 1) * 3 + 1; // Starting number of the 6-line (e.g., 1, 4, 7, 10)
        bets.push({
            type: 'line',
            value: lineValue,
            amount: unitAmount
        });
    }

    // Ensure total bet does not exceed current bankroll
    const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBetAmount > bankroll) {
        return [];
    }

    return bets;
}