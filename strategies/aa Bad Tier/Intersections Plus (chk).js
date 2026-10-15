/**
 * ROLETTE STRATEGY: Intersections Plus Strategy
 * 
 * SOURCE:
 * - URL: https://youtu.be/LcfkmnZ-XCM
 * - Channel: Gamblers University
 * 
 * THE FULL LOGIC IN DETAIL:
 * 1. The strategy bets on a combination of 1 Dozen, 1 Column, and 4 specific Split bets.
 * 2. It rotates through 3 preset layout sets across the board:
 *    - Set 1: 1st Dozen (1), 1st Column (1), and Splits [2,5], [8,11], [14,17], [20,23].
 *    - Set 2: 2nd Dozen (2), 2nd Column (2), and Splits [14,17], [20,23], [26,29], [32,35].
 *    - Set 3: 3rd Dozen (3), 3rd Column (3), and Splits [15,18], [21,24], [27,30], [33,36].
 * 3. On reaching a NEW session high (peak bankroll), the strategy resets its progression level to 1
 *    and rotates to the next bet position set (Set 1 -> Set 2 -> Set 3 -> Set 1).
 * 
 * THE FULL BET PROGRESSION IN DETAIL:
 * - Base Unit (Level 1):
 *   - Dozen Bet: 1 x minOutside ($5 base)
 *   - Column Bet: 1 x minOutside ($5 base)
 *   - 4 x Split Bets: 1 x min ($1 base each)
 * - Loss Progression:
 *   - On any spin resulting in a loss, increase the progression level by 1 (Level 1 -> 2 -> 3 -> 4...).
 *   - At level L, Dozen = L * minOutside, Column = L * minOutside, each Split = L * min.
 *   - For example: Level 1 = $5/$5/$1 ($14 total), Level 2 = $10/$10/$2 ($28 total), 
 *     Level 3 = $15/$15/$3 ($42 total), Level 4 = $20/$20/$4 ($56 total).
 * - Win Progression:
 *   - If bankroll reaches a new session high: Reset progression level to 1 and rotate set.
 *   - If spin is a partial win that does NOT reach a new session high: Maintain current progression level.
 * 
 * THE GOAL:
 * - Target Profit: +$100 over initial bankroll (or reaching the defined session win goal).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.peakBankroll = bankroll;
        state.level = 1;
        state.setIndex = 0; // 0: Set 1, 1: Set 2, 2: Set 3
        state.initialized = true;
    }

    // Target profit goal ($100 above starting bankroll)
    const targetProfit = 10000;
    if (bankroll >= state.initialBankroll + targetProfit) {
        return []; // Stop betting once goal is achieved
    }

    // 2. Process spin history results to update state
    if (spinHistory.length > 0) {
        if (bankroll > state.peakBankroll) {
            // New Session High -> Reset level and rotate set
            state.peakBankroll = bankroll;
            state.level = 1;
            state.setIndex = (state.setIndex + 1) % 3;
        } else if (bankroll < state.lastBankroll) {
            // Loss -> Step up progression level by 1
            state.level += 1;
        }
        // Note: If bankroll stayed same or increased without reaching peak, keep same level/set
    }

    // Track bankroll before current spin
    state.lastBankroll = bankroll;

    // 3. Define Bet Sets
    const sets = [
        {
            dozen: 1,
            column: 1,
            splits: [[2, 5], [8, 11], [14, 17], [20, 23]]
        },
        {
            dozen: 2,
            column: 2,
            splits: [[14, 17], [20, 23], [26, 29], [32, 35]]
        },
        {
            dozen: 3,
            column: 3,
            splits: [[15, 18], [21, 24], [27, 30], [33, 36]]
        }
    ];

    const currentSet = sets[state.setIndex];

    // 4. Calculate Bet Amounts respecting limits
    const baseOutsideUnit = Math.max(config.betLimits.minOutside, 5);
    const baseInsideUnit = Math.max(config.betLimits.min, 1);

    let dozenAmount = baseOutsideUnit * state.level;
    let columnAmount = baseOutsideUnit * state.level;
    let splitAmount = baseInsideUnit * state.level;

    // Clamp bet amounts to table limits
    dozenAmount = Math.min(Math.max(dozenAmount, config.betLimits.minOutside), config.betLimits.max);
    columnAmount = Math.min(Math.max(columnAmount, config.betLimits.minOutside), config.betLimits.max);
    splitAmount = Math.min(Math.max(splitAmount, config.betLimits.min), config.betLimits.max);

    // 5. Construct Bets Array
    const bets = [
        { type: 'dozen', value: currentSet.dozen, amount: dozenAmount },
        { type: 'column', value: currentSet.column, amount: columnAmount }
    ];

    for (const split of currentSet.splits) {
        bets.push({
            type: 'split',
            value: split,
            amount: splitAmount
        });
    }

    return bets;
}