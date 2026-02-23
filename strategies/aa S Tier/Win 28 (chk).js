/**
 * Strategy: Win 28
 * Source: https://www.youtube.com/watch?v=B-RZMpbAu7w (The Roulette Factory / Will Vegas)
 * * The Logic: The strategy covers 28 numbers on the wheel. It places a heavy bet (12 base units) 
 * on the center column (Column 2) and 1 base unit on 16 individual numbers scattered across 
 * Columns 1 and 3, plus the Zero. This leaves only 9-10 numbers exposed.
 * * The Progression: A negative progression capped at 6 levels. 
 * - On a loss (bankroll drops from previous spin), increase the progression level by 1.
 * - On a win (but not a session high), hold the current progression level.
 * - On reaching a new session high profit, reset the progression level back to 1.
 * * The Goal: Achieve frequent hits due to high board coverage, aiming for a short-term 
 * session profit target (e.g., $50-$100) before resetting or ending the session.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
        state.lastBankroll = bankroll;
        state.level = 1;
    }

    // 2. Determine Progression Level based on previous spin outcome
    if (spinHistory.length > 0) {
        let netChange = bankroll - state.lastBankroll;

        if (bankroll > state.sessionHigh) {
            // Reached a new session high -> Reset to base
            state.level = 1;
            state.sessionHigh = bankroll;
        } else if (netChange < 0) {
            // Suffered a loss -> Increase level (capped at 6)
            state.level++;
            if (state.level > 6) {
                state.level = 6;
            }
        }
        // If netChange > 0 but bankroll <= sessionHigh, we hold the current level.
    }

    // Update lastBankroll for the next spin's calculation
    state.lastBankroll = bankroll;

    // 3. Define Bet Units & Apply Progression
    const insideUnit = config.betLimits.min;
    
    // The center column acts as 12 units. We use the inside unit to maintain the math ratio 
    // of the strategy, but must ensure it meets the outside bet minimum.
    let columnBaseAmount = insideUnit * 12; 
    let columnAmount = columnBaseAmount * state.level;
    let numberAmount = insideUnit * state.level;

    // 4. Clamp to Config Limits
    columnAmount = Math.max(columnAmount, config.betLimits.minOutside);
    columnAmount = Math.min(columnAmount, config.betLimits.max);

    numberAmount = Math.max(numberAmount, config.betLimits.min);
    numberAmount = Math.min(numberAmount, config.betLimits.max);

    // 5. Construct the Bet Array
    let bets = [];

    // Center Column Bet (Column 2)
    bets.push({ type: 'column', value: 2, amount: columnAmount });

    // 16 Individual Numbers (Scattered across Col 1, Col 3, and Zero)
    const targetNumbers = [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 24];
    
    for (let num of targetNumbers) {
        bets.push({ type: 'number', value: num, amount: numberAmount });
    }

    return bets;
}