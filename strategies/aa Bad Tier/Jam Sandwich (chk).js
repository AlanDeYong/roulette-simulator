/**
 * ============================================================================
 * Strategy Name: The Jam Sandwich (by Logi41)
 * Source: Casino Matchmaker (https://youtu.be/O_vLsZmLsYc)
 * ============================================================================
 * 
 * THE FULL LOGIC IN DETAIL:
 * -------------------------
 * "The Jam Sandwich" is a high-coverage European roulette sector strategy that
 * covers 29 out of 37 wheel pockets (~78.4% coverage) by combining the two major
 * French wheel sectors (Voisins du Zéro and Tiers du Cylindre) with an outside 
 * bet on Red.
 * 
 * Bet Placement Breakdown per progression unit:
 * 1. Voisins du Zéro (9 chips):
 *    - Trio [0, 2, 3]: 2 chips
 *    - Split [4, 7]: 1 chip
 *    - Split [12, 15]: 1 chip
 *    - Split [18, 21]: 1 chip
 *    - Split [19, 22]: 1 chip
 *    - Corner 25 (covers 25, 26, 28, 29): 2 chips
 *    - Split [32, 35]: 1 chip
 * 
 * 2. Tiers du Cylindre (6 chips):
 *    - Split [5, 8]: 1 chip
 *    - Split [10, 11]: 1 chip
 *    - Split [13, 16]: 1 chip
 *    - Split [23, 24]: 1 chip
 *    - Split [27, 30]: 1 chip
 *    - Split [33, 36]: 1 chip
 * 
 * 3. Outside Bet:
 *    - Red: 1 unit (Base $5)
 * 
 * Only the 8 Orphelins numbers (1, 6, 9, 14, 17, 20, 31, 34) miss the wheel call
 * bets. If a red number hits in Voisins/Tier, both the inside call and outside Red
 * win. If a black number hits in Voisins/Tier, the inside call covers the loss on Red.
 * 
 * THE FULL BET PROGRESSION:
 * -------------------------
 * - Flat Add-a-Unit Progression on Loss (No level-out system).
 * - After a losing spin (net loss / Orphelins): Increase progression level by +1 unit.
 * - After a winning spin: Maintain current progression level until the bankroll
 *   reaches overall session profit (bankroll >= initial bankroll + target profit).
 * - Once in session profit: Reset progression level back to Level 1.
 * 
 * THE GOAL:
 * ---------
 * - Achieve session target profit ($150 target in tournament play or dynamic target).
 * - Reset back to base level once recovered and in profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.targetProfit = 150; // Target session profit
        state.progressionLevel = 1;
        state.lastBankroll = bankroll;
    }

    // 2. Track Wins / Losses & Update Progression
    if (spinHistory && spinHistory.length > 0) {
        const lastProfit = bankroll - state.lastBankroll;

        // If overall session target or recovery profit is achieved, reset progression
        if (bankroll >= state.initialBankroll + state.targetProfit || bankroll > state.initialBankroll) {
            state.progressionLevel = 1;
        } else if (lastProfit < 0) {
            // On a losing spin, add 1 unit to the progression
            state.progressionLevel += 1;
        }
        // On a win without reaching session profit, stay on the current level
    }
    state.lastBankroll = bankroll;

    // 3. Determine Base Chip Sizes
    const insideUnit = Math.max(config.betLimits.min, 3);
    const outsideUnit = Math.max(config.betLimits.minOutside, 5);
    const level = state.progressionLevel;

    // Helper function to clamp bet amounts to limits
    const clampInside = (chips) => {
        const amount = chips * insideUnit * level;
        return Math.min(Math.max(amount, config.betLimits.min), config.betLimits.max);
    };

    const clampOutside = (units) => {
        const amount = units * outsideUnit * level;
        return Math.min(Math.max(amount, config.betLimits.minOutside), config.betLimits.max);
    };

    // 4. Construct Bets
    const bets = [
        // --- Outside Bet ---
        { type: 'red', amount: clampOutside(1) },

        // --- Voisins du Zéro (9 Chips) ---
        { type: 'trio', value: [0, 2, 3], amount: clampInside(2) },
        { type: 'split', value: [4, 7], amount: clampInside(1) },
        { type: 'split', value: [12, 15], amount: clampInside(1) },
        { type: 'split', value: [18, 21], amount: clampInside(1) },
        { type: 'split', value: [19, 22], amount: clampInside(1) },
        { type: 'corner', value: 25, amount: clampInside(2) }, // covers 25, 26, 28, 29
        { type: 'split', value: [32, 35], amount: clampInside(1) },

        // --- Tiers du Cylindre (6 Chips) ---
        { type: 'split', value: [5, 8], amount: clampInside(1) },
        { type: 'split', value: [10, 11], amount: clampInside(1) },
        { type: 'split', value: [13, 16], amount: clampInside(1) },
        { type: 'split', value: [23, 24], amount: clampInside(1) },
        { type: 'split', value: [27, 30], amount: clampInside(1) },
        { type: 'split', value: [33, 36], amount: clampInside(1) }
    ];

    return bets;
}