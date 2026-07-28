/**
 * Strategy Name: 2nd Dozen & Corners Strategy
 * Source: https://youtu.be/rgH17XzySLo | YouTube Channel: WillVegas
 * 
 * Logic & Triggers:
 * - Places bets on every spin covering 28 numbers using the Second Dozen (13-24) and 4 strategic Corner bets.
 * - Bet Types:
 *   - Outside Dozen: 'dozen' (value: 2)
 *   - Inside Corners: 4 corners covering the second dozen sector (values: 13, 16, 19, 20)
 * 
 * Bet Progression:
 * - Base Level 1: Dozen = minOutside, each Corner = min.
 * - Loss (number outside coverage / zero): Increase level by 1.
 * - Push (Second Dozen hit, corners miss): Maintain current level.
 * - Win (Corner hit): Decrease level by 1 (minimum level 1).
 * 
 * Goal: Secure 30 to 50 units of session profit and exit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (typeof state.level !== 'number') {
        state.level = 1;
    }

    // 2. Update state based on previous spin result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Our 4 corners: 13, 16, 19, 20
        const inCorner13 = (num === 13 || num === 14 || num === 16 || num === 17);
        const inCorner16 = (num === 16 || num === 17 || num === 19 || num === 20);
        const inCorner19 = (num === 19 || num === 20 || num === 22 || num === 23);
        const inCorner20 = (num === 20 || num === 21 || num === 23 || num === 24);
        const hitCorner = inCorner13 || inCorner16 || inCorner19 || inCorner20;

        const inSecondDozen = (num >= 13 && num <= 24);

        if (hitCorner) {
            // Win: Decrease progression level
            state.level = Math.max(1, state.level - 1);
        } else if (inSecondDozen) {
            // Push: Dozen hit, corners missed -> maintain level
        } else {
            // Complete loss: Increase progression level
            state.level++;
        }
    }

    // 3. Calculate bet amounts respecting config limits
    const minOutside = config.betLimits.minOutside;
    const minInside = config.betLimits.min;
    const maxLimit = config.betLimits.max;

    let dozenAmount = minOutside * state.level;
    dozenAmount = Math.max(minOutside, Math.min(dozenAmount, maxLimit));

    let cornerAmount = minInside * state.level;
    cornerAmount = Math.max(minInside, Math.min(cornerAmount, maxLimit));

    // 4. Return array of bets
    return [
        { type: 'dozen', value: 2, amount: dozenAmount },
        { type: 'corner', value: 13, amount: cornerAmount },
        { type: 'corner', value: 16, amount: cornerAmount },
        { type: 'corner', value: 19, amount: cornerAmount },
        { type: 'corner', value: 20, amount: cornerAmount }
    ];
}