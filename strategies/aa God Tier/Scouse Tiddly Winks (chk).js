/*
 * Strategy Name: Scouse Tiddly Winks
 * Source: YouTube (https://youtu.be/Q_XRQP3DqDA?si=AO-S-0pvZZUegyq2)
 * 
 * The Logic:
 * The strategy places a broad coverage of inside bets using a mix of corners and streets. 
 * Initial configuration:
 * - 5 units each on 4 corners (top-left values: 2, 11, 20, 29).
 * - 4 units each on 4 streets (start values: 7, 16, 25, 34).
 * This covers 28 numbers on the layout, giving a high hit rate.
 *
 * The Progression:
 * - On a Loss: Increase each bet by its initial base amount (moving up 1 multiplier level). 
 *   Consecutive win counter is reset.
 * - On a Win: 
 *      - If session profit is reached (current bankroll > sequence starting bankroll), 
 *        the progression completely resets to base bets.
 *      - If session profit is NOT reached:
 *          - 1st Win: Rebet the same amount once more (progression level stays the same).
 *          - 2nd Consecutive Win (and beyond): Go back 1 level in the progression 
 *            (e.g., decrease bets by their base amounts) until profit is achieved.
 *
 * The Goal:
 * To hit a high-water mark (session profit) while mitigating steep drawdowns. By stepping back 
 * down the ladder on consecutive wins instead of aggressive pressing, the strategy aims to 
 * steadily grind back into profit after a downswing.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish the foundational base unit multiplier
    const unit = config.betLimits.min;

    // 2. Define the specific positions and base weights for the strategy
    const baseBets = [
        { type: 'corner', value: 2, baseAmount: 5 },
        { type: 'corner', value: 11, baseAmount: 5 },
        { type: 'corner', value: 20, baseAmount: 5 },
        { type: 'corner', value: 29, baseAmount: 5 },
        { type: 'street', value: 7, baseAmount: 4 },
        { type: 'street', value: 16, baseAmount: 4 },
        { type: 'street', value: 25, baseAmount: 4 },
        { type: 'street', value: 34, baseAmount: 4 }
    ];

    // Flat array of all numbers covered to easily determine a win or loss
    const coveredNumbers = [
        2, 3, 5, 6,             // Corner 2
        11, 12, 14, 15,         // Corner 11
        20, 21, 23, 24,         // Corner 20
        29, 30, 32, 33,         // Corner 29
        7, 8, 9,                // Street 7
        16, 17, 18,             // Street 16
        25, 26, 27,             // Street 25
        34, 35, 36              // Street 34
    ];

    // 3. Initialize Strategy State for the first spin
    if (!state.level) {
        state.level = 1;                             // Multiplier for base amounts
        state.consecutiveWins = 0;                   // Tracker for step-down logic
        state.sequenceStartBankroll = bankroll;      // High-water mark tracker
    }

    // 4. Process previous spin outcome to adjust progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const isWin = coveredNumbers.includes(lastSpin.winningNumber);

        if (!isWin) {
            // LOSS: Increase bets by their initial base (go up 1 level)
            state.level++;
            state.consecutiveWins = 0;
        } else {
            // WIN: Register the win and evaluate session profit
            state.consecutiveWins++;

            if (bankroll > state.sequenceStartBankroll) {
                // Reached session profit -> Reset progression
                state.level = 1;
                state.consecutiveWins = 0;
                state.sequenceStartBankroll = bankroll; 
            } else {
                // Not reached session profit yet -> Apply streak logic
                if (state.consecutiveWins >= 2) {
                    // Step back down 1 level after 2 consecutive wins without hitting total profit
                    state.level = Math.max(1, state.level - 1);
                }
                // (If consecutiveWins === 1, the level intentionally remains unchanged to "rebet once more")
            }
        }
    }

    // 5. Generate and return the calculated bets for this spin
    const currentBets = [];
    
    for (const bet of baseBets) {
        // Calculate the raw amount based on base weight, unit limit, and current progression level
        let amount = bet.baseAmount * unit * state.level;
        
        // CLAMP: Ensure bets strictly respect table minimums and maximums
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        currentBets.push({
            type: bet.type,
            value: bet.value,
            amount: amount
        });
    }

    return currentBets;
}