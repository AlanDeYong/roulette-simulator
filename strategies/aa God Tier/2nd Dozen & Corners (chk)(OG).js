/**
 * Strategy Name: 2nd Dozen & Randomized Non-Overlapping Corners Strategy
 * Source: https://youtu.be/rgH17XzySLo | YouTube Channel: WillVegas
 * 
 * Logic & Triggers:
 * - Places bets on every spin covering 28 numbers using:
 *   - Outside Bet: Second Dozen ('dozen', value: 2) covering 13-24 (Base: 2 units).
 *   - 1st Dozen Corners: 2 randomly chosen non-overlapping corners (Base: 1 unit each).
 *   - 3rd Dozen Corners: 2 randomly chosen non-overlapping corners (Base: 1 unit each).
 * - Selected corners remain fixed across spins until a full reset to Level 1 occurs.
 * 
 * Bet Progression:
 * - Base Bet Amounts (Level 1):
 *   - Each Corner = 1 * min (e.g., $1 or $2 depending on min limit)
 *   - 2nd Dozen = 2 * min (clamped to at least minOutside)
 * - Complete Loss (Misses Dozen and Corners / Zero): Progression level increases by 1 (+1 base unit to every bet position).
 * - Push (Second Dozen hit, Corners miss): Maintain current progression level.
 * - Win (Corner hit): Progression level decreases by 1.
 * - Reset: Resets to Level 1 and selects new random corners ONLY when session peak profit (peak bankroll) is reached or exceeded.
 * 
 * Goal: Achieve target session profit and exit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Helper function to pick 2 non-overlapping corners from 1st Dozen and 2 from 3rd Dozen
    function getRandomNonOverlappingCorners() {
        const dozen1Pairs = [[1, 7], [1, 8], [2, 7], [2, 8]];
        const dozen3Pairs = [[25, 31], [25, 32], [26, 31], [26, 32]];

        const pair1 = dozen1Pairs[Math.floor(Math.random() * dozen1Pairs.length)];
        const pair3 = dozen3Pairs[Math.floor(Math.random() * dozen3Pairs.length)];

        return [...pair1, ...pair3];
    }

    // 1. Initialize State
    if (typeof state.level !== 'number') {
        state.level = 1;
    }
    if (typeof state.peakBankroll !== 'number') {
        state.peakBankroll = bankroll;
    }
    if (!Array.isArray(state.corners) || state.corners.length !== 4) {
        state.corners = getRandomNonOverlappingCorners();
    }

    // 2. Evaluate peak bankroll and reset condition
    if (bankroll >= state.peakBankroll) {
        state.peakBankroll = bankroll;
        state.level = 1;
        state.corners = getRandomNonOverlappingCorners();
    } else if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Check if winning number hits any of the 4 active corners
        const hitCorner = state.corners.some(c => 
            num === c || num === (c + 1) || num === (c + 3) || num === (c + 4)
        );
        const inSecondDozen = (num >= 13 && num <= 24);

        if (hitCorner) {
            // Win: Decrease progression level (will not drop below 1)
            state.level = Math.max(1, state.level - 1);
        } else if (inSecondDozen) {
            // Push: Dozen hit, corners missed -> maintain level and corners
        } else {
            // Loss: Increase progression level by 1 unit
            state.level++;
        }
    }

    // 3. Define Base Bet Amounts and scale by progression level
    const baseCornerUnit = config.betLimits.min;
    const baseDozenUnit = Math.max(config.betLimits.minOutside, baseCornerUnit * 2);
    const maxLimit = config.betLimits.max;

    let cornerAmount = Math.max(baseCornerUnit, Math.min(baseCornerUnit * state.level, maxLimit));
    let dozenAmount = Math.max(baseDozenUnit, Math.min(baseDozenUnit * state.level, maxLimit));

    // 4. Construct bet objects
    const bets = [
        { type: 'dozen', value: 2, amount: dozenAmount }
    ];

    state.corners.forEach(cornerVal => {
        bets.push({ type: 'corner', value: cornerVal, amount: cornerAmount });
    });

    return bets;
}