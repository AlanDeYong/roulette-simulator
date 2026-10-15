/**
 * ==============================================================================
 * ROULETTE STRATEGY: 10 NEIGHBORS (TWO 11-NUMBER WHEEL SECTORS)
 * ==============================================================================
 * 
 * Source:
 *   - Video: "THE NEIGHBORS ROULETTE STRATEGY: LOW ROLLER STYLE"
 *   - Channel: Cruising & Craps
 *   - URL: https://youtu.be/Y5yXkJ-J9Y8
 * 
 * The Full Logic in Detail:
 *   - Coverage: Covers 22 distinct numbers on the roulette wheel across two 
 *     sectors of 11 numbers each (a target number + 5 neighbors on either side).
 *   - Cluster 1: Centered on the last winning number (hot/repeat sector).
 *   - Cluster 2: Centered on the opposite side of the wheel (~1/2 wheel offset).
 *   - Board Placement: 22 individual straight-up inside number bets.
 * 
 * The Full Bet Progression in Detail:
 *   - Progression Steps: Fibonacci Sequence (1 -> 2 -> 3 -> 5 -> 8 -> 13 -> 21 -> 34 units).
 *   - Loss: Advance to the next level in the progression sequence.
 *   - Win Rule (Peak Target): Bet size is NOT reduced after a win unless the session's
 *     peak profit (highest bankroll reached) is equaled or exceeded.
 *   - Once a new peak is reached on a win, the progression fully resets to base level (Index 0).
 * 
 * The Goal:
 *   - Secure continuous peak profits while locking bet sizing during recovery phases 
 *     until the previous high-water bankroll mark is reached.
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wheel Layout Definitions
    const AMERICAN_WHEEL = [
        0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
        '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
    ];

    const EUROPEAN_WHEEL = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
        5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];

    const isAmerican = config.tableType === 'american';
    const wheel = isAmerican ? AMERICAN_WHEEL : EUROPEAN_WHEEL;
    const wheelLength = wheel.length;

    // 2. Initialize Persistent State
    if (!state.initialized) {
        state.progressionSteps = [1, 2, 3, 5, 8, 13, 21, 34];
        state.progressionIndex = 0;
        state.peakBankroll = config.startingBankroll;
        state.lastCoveredNumbers = [];
        state.initialized = true;
    }

    // Update peak bankroll if current bankroll exceeds previous peak
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 3. Process Previous Result (if any)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const won = state.lastCoveredNumbers.includes(lastNum);

        if (won) {
            // Reset to base level ONLY when peak profit is reached or surpassed
            if (bankroll >= state.peakBankroll) {
                state.progressionIndex = 0;
                state.peakBankroll = bankroll;
            }
            // If peak profit is not reached, maintain current bet size (do not reduce)
        } else {
            // On loss, advance to the next step
            if (state.progressionIndex < state.progressionSteps.length - 1) {
                state.progressionIndex++;
            }
        }
    }

    // 4. Determine Center Numbers for the Two Clusters
    let center1 = 0;
    if (spinHistory && spinHistory.length > 0) {
        center1 = spinHistory[spinHistory.length - 1].winningNumber;
    }

    let idx1 = wheel.indexOf(center1);
    if (idx1 === -1) idx1 = 0;

    // Center 2 is positioned directly opposite on the wheel
    const idx2 = (idx1 + Math.floor(wheelLength / 2)) % wheelLength;

    // 5. Helper to collect 11 numbers (center + 5 on each side)
    function getNeighbors(centerIndex, countEachSide = 5) {
        const numbers = [];
        for (let i = -countEachSide; i <= countEachSide; i++) {
            const index = (centerIndex + i + wheelLength) % wheelLength;
            numbers.push(wheel[index]);
        }
        return numbers;
    }

    const cluster1 = getNeighbors(idx1, 5);
    const cluster2 = getNeighbors(idx2, 5);

    // Merge into unique covered numbers
    const uniqueNumbers = Array.from(new Set([...cluster1, ...cluster2]));
    state.lastCoveredNumbers = uniqueNumbers;

    // 6. Calculate Bet Amount with Limits
    const baseUnit = config.betLimits.min;
    const multiplier = state.progressionSteps[state.progressionIndex];
    let betPerNumber = baseUnit * multiplier;

    // Clamp bet per number within table limits
    betPerNumber = Math.max(betPerNumber, config.betLimits.min);
    betPerNumber = Math.min(betPerNumber, config.betLimits.max);

    // 7. Generate Bet Array
    const bets = uniqueNumbers.map((num) => ({
        type: 'number',
        value: num,
        amount: betPerNumber
    }));

    return bets;
}