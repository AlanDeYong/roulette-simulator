/**
 * Roulette Strategy: Casino Heist
 * Source: Bet With Mo (https://www.youtube.com/watch?v=P7OJu8zaGMY)
 * * The Logic: 
 * - Covers 28 numbers (~75% of the board) using 4 strategic bets.
 * - 1x Outside bet on Low (1-18) [Ratio: 4 units]
 * - 1x Inside Street bet on 19-21 [Ratio: 1 unit]
 * - 1x Inside Street bet on 22-24 [Ratio: 1 unit]
 * - 1x Inside Corner bet on 32, 33, 35, 36 [Ratio: 1 unit]
 * * The Progression:
 * - Operates on a strict 8-level multiplier sequence: [1x, 2x, 3x, 4x, 5x, 10x, 20x, 25x].
 * - On a net loss (an uncovered number hits), advance to the next progression level.
 * - On a small win (net profit > 0 but session target not reached), stay at the current level.
 * - Caps at level 8 to prevent integer overflow or runaway bankroll drain.
 * * The Goal:
 * - Target profit increments of $20.
 * - Once the bankroll hits the target (Current Target + $20), reset progression to Level 1, 
 * and set a new milestone target.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (state.progression === undefined) {
        state.progression = 1;
        state.targetBankroll = bankroll + 20; 
    }

    // 2. Evaluate previous spin to adjust progression or goals
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        // Uncovered numbers: 0, 00, 25, 26, 27, 28, 29, 30, 31, 34
        const isLoss = ![
            1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18, // Low
            19,20,21, // Street 1
            22,23,24, // Street 2
            32,33,35,36 // Corner
        ].includes(num);

        if (bankroll >= state.targetBankroll) {
            // Goal reached: Reset to base level and set new $20 milestone
            state.progression = 1;
            state.targetBankroll = bankroll + 20;
        } else if (isLoss) {
            // Loss: Move up one level in the progression (capped at level 8)
            state.progression = Math.min(state.progression + 1, 8);
        }
        // If it's a win but target not reached, we do nothing and stay at current level
    }

    // 3. Define the Casino Heist progression multipliers
    const multipliers = [1, 2, 3, 4, 5, 10, 20, 25];
    const currentMultiplier = multipliers[state.progression - 1];

    // 4. Calculate Base Units ensuring config limits are met
    // The strategy requires the inside bets to be 1/4 the size of the outside bet.
    let baseInsideUnit = config.betLimits.min; 
    let baseOutsideUnit = Math.max(config.betLimits.minOutside, baseInsideUnit * 4);

    // 5. Calculate actual bet amounts using the multiplier
    let amountInside = baseInsideUnit * 2 * currentMultiplier; // Strategy uses $2 base for inside
    let amountOutside = baseOutsideUnit * currentMultiplier;   // Strategy uses $8 base for outside

    // 6. Clamp to Limits
    amountInside = Math.min(Math.max(amountInside, config.betLimits.min), config.betLimits.max);
    amountOutside = Math.min(Math.max(amountOutside, config.betLimits.minOutside), config.betLimits.max);

    // 7. Return Bet Array
    return [
        { type: 'low', amount: amountOutside },
        { type: 'street', value: 19, amount: amountInside },
        { type: 'street', value: 22, amount: amountInside },
        { type: 'corner', value: 32, amount: amountInside }
    ];
}