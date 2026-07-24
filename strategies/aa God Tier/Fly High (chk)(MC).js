/**
 * Fly High Roulette Strategy
 * 
 * Source: https://youtu.be/AwJiE4wQ70Q (The Roulette Master - "Fly High Roulette system by John")
 * 
 * The Full Logic in details:
 * This strategy covers 28 numbers by placing two outside bets simultaneously:
 * 1. A bet on 'High' (19-36).
 * 2. A bet on the '1st Dozen' (1-12) at exactly half the size of the High bet (e.g., $20 on High, $10 on 1st Dozen).
 * - Numbers 19-36 are Wins (Net positive profit).
 * - Numbers 1-12 are Break-Evens (The dozen bet wins paying 2:1, exactly covering the lost High bet).
 * - Numbers 13-18 and Zeros (0/00) are Losses (Both bets lose).
 * 
 * The Full Bet Progression in details:
 * - Start with base bets (e.g., 2 units on High, 1 unit on 1st Dozen).
 * - On a Loss (13-18 or Green): Increase the bets by the base unit amounts (or by config.minIncrementalBet). 
 *   For example, a $20/$10 bet becomes a $40/$20 bet.
 * - On a Break-Even (1-12): Keep the bet sizes exactly the same.
 * - On a Win (19-36): If the bankroll is still below the session high (i.e., recovering from a drawdown), 
 *   keep the bet sizes the same. Do not increase or decrease. 
 * - Reset Condition: Once the bankroll reaches or exceeds the highest recorded session bankroll, 
 *   reset the progression back to the initial base bets.
 * 
 * The Goal:
 * To grind out consistent session profits by heavily covering the board, safely absorbing break-evens, 
 * and using a linear add-on recovery sequence to reach a new all-time high bankroll, at which point the bets reset.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base units (Ensuring a 2:1 ratio while respecting minimums)
    const baseHigh = config.betLimits.minOutside * 2;
    const baseDoz = config.betLimits.minOutside * 1;

    // 2. Initialize State
    // We track the highest bankroll to know when we are in a drawdown vs hitting a new profit high
    if (state.highestBankroll === undefined) {
        state.highestBankroll = bankroll;
        state.currentHigh = baseHigh;
        state.currentDoz = baseDoz;
    }

    // 3. Process History & Update State
    if (spinHistory.length > 0) {
        if (bankroll >= state.highestBankroll) {
            // Goal reached: We hit a new high water mark. Reset progression to base.
            state.highestBankroll = bankroll;
            state.currentHigh = baseHigh;
            state.currentDoz = baseDoz;
        } else {
            // Drawdown: Evaluate the last spin to determine if we need to increase bets
            const lastSpin = spinHistory[spinHistory.length - 1];
            const num = lastSpin.winningNumber;
            const color = lastSpin.winningColor;

            // A loss is 13-18 or any green (0/00). 
            const isLoss = (num >= 13 && num <= 18) || color === 'green';

            if (isLoss) {
                // Increase bets
                const highIncrement = config.incrementMode === 'base' ? baseHigh : (config.minIncrementalBet || 1);
                const dozIncrement = config.incrementMode === 'base' ? baseDoz : (config.minIncrementalBet || 1);
                
                state.currentHigh += highIncrement;
                state.currentDoz += dozIncrement;
            }
            // If it was a win (19-36) or break-even (1-12), bets stay exactly the same 
            // because we haven't reached the `highestBankroll` target yet.
        }
    }

    // 4. Clamp to Limits
    let finalHigh = Math.max(state.currentHigh, config.betLimits.minOutside);
    finalHigh = Math.min(finalHigh, config.betLimits.max);

    let finalDoz = Math.max(state.currentDoz, config.betLimits.minOutside);
    finalDoz = Math.min(finalDoz, config.betLimits.max);

    // 5. Return Bets
    return [
        { type: 'high', amount: finalHigh },
        { type: 'dozen', value: 1, amount: finalDoz }
    ];
}