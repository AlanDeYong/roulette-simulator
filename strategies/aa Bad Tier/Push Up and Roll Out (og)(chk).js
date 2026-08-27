/**
 * ============================================================================
 * Strategy Name: Push Up and Roll Out (Window Tracker with Peak Reset)
 * Source: CEG Dealer School (https://youtu.be/QZHSNryDFfA)
 * Strategist: Zach
 * 
 * 1. The Full Logic in Detail:
 *    - The board has 11 possible valid double streets (line bets starting at 
 *      1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31).
 *    - 4 joining (contiguous) double streets are selected to form a 5-row window 
 *      covering 15 individual numbers.
 *    - Initial Setup: Randomly selects 4 contiguous double streets (starting at 
 *      a random row from 1 to 8).
 *    - On Loss (Miss / 0 / 00):
 *      * Rebet the exact same 4 double streets.
 *      * Increase all 4 double street bets by 1 unit each.
 *    - On Win:
 *      * Move the 4 double streets in a sliding window fashion.
 *      * The window is positioned so that the winning street/row is centered 
 *        (index 3 of the 5 rows: startRow = winRow - 2).
 *      * When centering is not possible due to table edges (rows 1, 2 or 11, 12),
 *        the window is clamped to rows 1-5 or rows 8-12 to guarantee the winning 
 *        street is still inside the window.
 *      * Bet amounts stay at current level until session's peak profit is reached.
 *    - Peak Reset:
 *      * If current bankroll reaches or exceeds the highest recorded peak profit 
 *        for the session, reset progression back to 1 base unit.
 * 
 * 2. The Full Bet Progression in Detail:
 *    - Base Bet: 1 unit on each of the 4 joining double streets.
 *    - Loss: Rebet same positions, increase bet size by +1 unit.
 *    - Win: Shift window to center on winning row, maintain bet level unless peak reached.
 *    - Reset: Return bet size to 1 base unit only when bankroll reaches or exceeds peak bankroll.
 * 
 * 3. The Goal:
 *    - Target profit: $300 profit above starting bankroll or bankroll exhaustion.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const targetProfit = 300;

    // 1. Initialize session trackers
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.peakBankroll = bankroll;
        state.units = 1;

        // Randomly select initial 4 joining double streets (start row 1 to 8)
        state.startRow = Math.floor(Math.random() * 8) + 1;
    }

    // 2. Check overall target profit exit condition
    if (bankroll >= state.initialBankroll + targetProfit) {
        return [];
    }

    // 3. Update session peak profit
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 4. Determine base unit sizing and step
    const baseUnit = Math.max(config.betLimits.min, 1);
    const unitStep = config.incrementMode === 'base' 
        ? baseUnit 
        : (config.minIncrementalBet || 1);

    // 5. Evaluate previous spin outcome
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        const currentStartRow = state.startRow;
        const currentEndRow = currentStartRow + 4;

        let isWin = false;
        let winRow = 0;

        if (winningNum >= 1 && winningNum <= 36) {
            winRow = Math.ceil(winningNum / 3);
            if (winRow >= currentStartRow && winRow <= currentEndRow) {
                isWin = true;
            }
        }

        if (isWin) {
            // Shift window to center the winning row (clamped to valid bounds 1 to 8)
            let desiredStartRow = winRow - 2;
            state.startRow = Math.max(1, Math.min(8, desiredStartRow));

            // Reset progression ONLY if session's peak bankroll is reached
            if (bankroll >= state.peakBankroll) {
                state.units = 1;
            }
        } else {
            // On Loss: Rebet same positions, increase bet by 1 unit
            state.units += 1;
        }
    }

    // 6. Calculate clamped bet amount per double street
    let betAmount = baseUnit + (state.units - 1) * unitStep;
    betAmount = Math.max(config.betLimits.min, betAmount);
    betAmount = Math.min(config.betLimits.max, betAmount);

    // 7. Generate 4 contiguous double street (line) bets
    const startRow = state.startRow || 1;
    const bets = [];

    for (let i = 0; i < 4; i++) {
        const lineStartRow = startRow + i;
        const lineStartValue = (lineStartRow - 1) * 3 + 1; // 1, 4, 7, 10, ...
        bets.push({
            type: 'line',
            value: lineStartValue,
            amount: betAmount
        });
    }

    // 8. Bankroll sufficiency check
    const totalRequired = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalRequired > bankroll) {
        return [];
    }

    return bets;
}