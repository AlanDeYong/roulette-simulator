/**
 * ============================================================================
 * Strategy: Neighbors 22 (Dealer Bias / Sector Targeting)
 * Source: YouTube - "I Built a Roulette System to Target Dealer Bias… +10% in Just 21 Spins!"
 * Channel: Mastering The Wheel (https://youtu.be/9aP36DZK994)
 * ============================================================================
 * 
 * 1. THE FULL LOGIC IN DETAIL:
 *    - Trigger: Needs at least 1 previous spin to determine the "last one to hit".
 *    - Selection: Covers 22 numbers across two opposing 11-number sectors on the European wheel:
 *        a) Cluster 1: The last winning number + 5 wheel neighbors to the left + 5 wheel neighbors to the right (11 numbers total).
 *        b) Cluster 2: The exact opposite side of the wheel, consisting of 11 numbers (5 neighbors left, center opposite, 5 neighbors right).
 *        Together, this covers 22 numbers (~59.46% wheel coverage), leaving 15 unbet numbers.
 *    - The logic exploits potential dealer signature / muscle memory where the ball lands in the same
 *      region or the exact opposite hemisphere.
 * 
 * 2. THE FULL BET PROGRESSION IN DETAIL:
 *    - Uses a 5-level Triple Martingale progression (each level multiplies the straight up bet by 3):
 *        * Level 1: 1 unit per number  (22 units total)
 *        * Level 2: 3 units per number  (66 units total)
 *        * Level 3: 9 units per number  (198 units total)
 *        * Level 4: 27 units per number (594 units total)
 *        * Level 5: 81 units per number (1782 units total)
 *    - Total risk across 5 levels = 2,662 units.
 *    - After any WIN: Reset back to Level 1.
 *    - After a LOSS: Advance to the next level (Level 1 -> 2 -> 3 -> 4 -> 5).
 *    - After losing Level 5: Stop betting (stop-loss triggered).
 * 
 * 3. THE GOAL (STOP-WIN & STOP-LOSS):
 *    - Target Profit (Stop-Win): ~10% of starting bankroll (e.g., +260 to +266 units on a 2,662 bankroll).
 *    - Stop-Loss: Reached if the 5th level loses or bankroll cannot cover the next bet.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. European Wheel Sequence
    const EUROPEAN_WHEEL = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
        5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];
    const TOTAL_POCKETS = EUROPEAN_WHEEL.length; // 37

    // 2. Initialize State
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.levelIndex = 0; // Levels 0 through 4 (1, 3, 9, 27, 81 multiplier)
        state.targetProfit = (config.startingBankroll || bankroll) * 10; // +10% target
        state.stopped = false;
        state.lastCoveredNumbers = [];
    }

    // Stop conditions check
    if (state.stopped) return [];

    // Profit target reached (+10%)
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        state.stopped = true;
        return [];
    }

    // Need at least 1 spin history to find the "last one to hit"
    if (!spinHistory || spinHistory.length === 0) {
        return [];
    }

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastWinningNumber = lastSpin.winningNumber;

    // 3. Update Progression based on last spin outcome
    if (state.lastCoveredNumbers && state.lastCoveredNumbers.length > 0) {
        const won = state.lastCoveredNumbers.includes(lastWinningNumber);
        if (won) {
            state.levelIndex = 0; // Reset to level 1 on win
        } else {
            state.levelIndex += 1; // Advance progression on loss
            if (state.levelIndex >= 5) {
                // Exhausted all 5 levels
                state.stopped = true;
                return [];
            }
        }
    }

    // 4. Calculate Bet Sizing
    const progressionMultipliers = [1, 3, 9, 27, 81];
    const baseUnit = config.betLimits.min || 1;
    const unitMultiplier = progressionMultipliers[state.levelIndex];

    let betPerNumber = baseUnit * unitMultiplier;
    // Clamp to table limits
    betPerNumber = Math.max(betPerNumber, config.betLimits.min);
    betPerNumber = Math.min(betPerNumber, config.betLimits.max);

    // Total required for 22 straight-up numbers
    const totalRequired = betPerNumber * 22;
    if (bankroll < totalRequired) {
        state.stopped = true;
        return [];
    }

    // 5. Determine 22 Target Numbers on the Wheel
    // Find index of last winning number on the physical wheel
    const lastIndex = EUROPEAN_WHEEL.indexOf(lastWinningNumber);
    if (lastIndex === -1) return [];

    const selectedNumbers = new Set();

    // Cluster 1: Last hit + 5 neighbors to the left + 5 neighbors to the right (11 numbers)
    for (let offset = -5; offset <= 5; offset++) {
        const wheelIdx = (lastIndex + offset + TOTAL_POCKETS) % TOTAL_POCKETS;
        selectedNumbers.add(EUROPEAN_WHEEL[wheelIdx]);
    }

    // Cluster 2: Directly opposite sector (18 pockets away) + 5 neighbors on each side (11 numbers)
    const oppositeIndex = (lastIndex + 18) % TOTAL_POCKETS;
    for (let offset = -5; offset <= 5; offset++) {
        const wheelIdx = (oppositeIndex + offset + TOTAL_POCKETS) % TOTAL_POCKETS;
        selectedNumbers.add(EUROPEAN_WHEEL[wheelIdx]);
    }

    const targetList = Array.from(selectedNumbers);
    state.lastCoveredNumbers = targetList;

    // 6. Build and Return Bets
    const bets = targetList.map(num => ({
        type: 'number',
        value: num,
        amount: betPerNumber
    }));

    return bets;
}