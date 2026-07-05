/**
 * DOCUMENTATION: Peppermint Roulette Strategy
 * Source: https://youtu.be/nrm8am_bwqA, YouTube Channel: Gamblers University
 * * Logic:
 * The strategy covers 24 numbers using two outside bets: 
 * 'low' (1-18) and 'column' (2nd).
 * * Progression:
 * 1. Initial bets: $3 on 'low', $2 on 'column'.
 * 2. On loss: Increase the 'low' bet by 3 and the 'column' bet by 2.
 * 3. On win: Maintain the current bet level.
 * * Goal:
 * Achieve a session profit of $20 - $25.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.lowBet) state.lowBet = 3;
    if (!state.colBet) state.colBet = 2;
    if (!state.baseLow) state.baseLow = 3;
    if (!state.baseCol) state.baseCol = 2;

    // 2. Check last spin for win/loss
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        // Simplified check: winning number 1-18 for low, middle column (2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35)
        const isLow = lastResult.winningNumber >= 1 && lastResult.winningNumber <= 18;
        const isCol2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].includes(lastResult.winningNumber);

        if (!isLow && !isCol2) {
            // Loss: Increase by one unit level
            state.lowBet += state.baseLow;
            state.colBet += state.baseCol;
        }
        // Win: Stay at current level
    }

    // 3. Clamp amounts to limits
    const lowAmount = Math.min(Math.max(state.lowBet, config.betLimits.minOutside), config.betLimits.max);
    const colAmount = Math.min(Math.max(state.colBet, config.betLimits.minOutside), config.betLimits.max);

    // 4. Return Bets
    return [
        { type: 'low', amount: lowAmount },
        { type: 'column', value: 2, amount: colAmount }
    ];
}