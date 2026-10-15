/**
 * ============================================================================
 * STRATEGY: Sextant Roulette System (Custom Rules)
 * ============================================================================
 * Source: 
 *   - Video: "Sextant Roulette Software System Review: $14 to $59 Profit with My Custom Rules!"
 *   - Video URL: https://youtu.be/bv5JrNJOwgk
 *   - YouTube Channel: Roulette FACTS (Frankie / Blackjack Hammer)
 *   - Original Software: Sextant Roulette System by Ian (Roulette Management)
 * 
 * ----------------------------------------------------------------------------
 * THE FULL LOGIC IN DETAIL:
 * ----------------------------------------------------------------------------
 * 1. Cycle & Trigger:
 *    - In idle mode (after a win/at start), the system observes 6 spins.
 *    - After 6 spins, the software predicts 2 key numbers based on wheel activity.
 * 
 * 2. Board Placements (Frankie's Modifications):
 *    - Extended Neighbors: Default bets cover 4 neighbors on each side for both numbers.
 *    - Proximity / Merged Sector: If the 2 target numbers are <= 4 pockets apart,
 *      merge into 1 primary number with 9 neighbors (covering 19 contiguous pockets).
 *    - Zero Is Your Hero: Number 0 is always included on every active bet.
 * 
 * 3. Bet Progression (Immediate Rebet on Loss):
 *    - On Loss: Rebet IMMEDIATELY on the very next spin with doubled stakes (Martingale).
 *      Keep the same numbers or update hot numbers/targets until a win is secured.
 *    - On Win: Reset bet multiplier to 1x and wait for a fresh 6-spin observation cycle.
 * 
 * 4. Goal & Limits:
 *    - Clamps bet amounts to config.betLimits.min and config.betLimits.max.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const WHEEL_ORDER = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
        5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];

    function getWheelDistance(num1, num2) {
        const idx1 = WHEEL_ORDER.indexOf(num1);
        const idx2 = WHEEL_ORDER.indexOf(num2);
        if (idx1 === -1 || idx2 === -1) return 99;
        const diff = Math.abs(idx1 - idx2);
        return Math.min(diff, WHEEL_ORDER.length - diff);
    }

    function getNeighbors(centerNum, radius) {
        const centerIdx = WHEEL_ORDER.indexOf(centerNum);
        if (centerIdx === -1) return [centerNum];
        const result = [];
        const len = WHEEL_ORDER.length;
        for (let i = -radius; i <= radius; i++) {
            const idx = (centerIdx + i + len) % len;
            result.push(WHEEL_ORDER[idx]);
        }
        return result;
    }

    // Initialize state
    if (!state.initialized) {
        state.initialized = true;
        state.multiplier = 1;
        state.cycleSpins = [];
        state.lastBetNumbers = [];
        state.activeBetting = false;
    }

    const minInside = config.betLimits.min || 1;
    const maxLimit = config.betLimits.max || 500;

    // Evaluate previous spin result if we were actively betting
    if (state.activeBetting && spinHistory.length > 0) {
        const lastWinningNum = spinHistory[spinHistory.length - 1].winningNumber;
        const won = state.lastBetNumbers.includes(lastWinningNum);

        if (won) {
            // Win: Reset progression and start a new 6-spin observation cycle
            state.multiplier = 1;
            state.activeBetting = false;
            state.lastBetNumbers = [];
            state.cycleSpins = [];
        } else {
            // Loss: Double up immediately on the next spin
            state.multiplier *= 2;
        }
    }

    // If currently in a loss progression, rebet immediately with doubled stakes
    if (state.activeBetting) {
        let unitAmount = minInside * state.multiplier;
        unitAmount = Math.max(minInside, Math.min(unitAmount, maxLimit));

        return state.lastBetNumbers.map(num => ({
            type: 'number',
            value: num,
            amount: unitAmount
        }));
    }

    // Idle observation phase: record spin history to complete 6-spin cycle
    if (spinHistory.length > 0) {
        state.cycleSpins.push(spinHistory[spinHistory.length - 1].winningNumber);
    }

    if (state.cycleSpins.length < 6) {
        return [];
    }

    // Sextant Cycle complete: calculate 2 target predictions
    const cycle = state.cycleSpins.slice(-6);
    state.cycleSpins = [];

    const counts = {};
    for (const num of cycle) {
        counts[num] = (counts[num] || 0) + 1;
    }
    const sorted = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a]);

    const target1 = sorted[0];
    const target2 = sorted.length > 1 ? sorted[1] : (target1 + 12) % 37;

    const numbersToCover = new Set();
    const wheelDist = getWheelDistance(target1, target2);

    if (wheelDist <= 4) {
        // Proximity rule: 9 neighbors around primary target
        getNeighbors(target1, 9).forEach(n => numbersToCover.add(n));
    } else {
        // Standard rule: 4 neighbors around both targets
        getNeighbors(target1, 4).forEach(n => numbersToCover.add(n));
        getNeighbors(target2, 4).forEach(n => numbersToCover.add(n));
    }

    // "Zero is your hero" backup bet
    numbersToCover.add(0);

    const coveredArray = Array.from(numbersToCover);
    let unitAmount = minInside * state.multiplier;
    unitAmount = Math.max(minInside, Math.min(unitAmount, maxLimit));

    state.lastBetNumbers = coveredArray;
    state.activeBetting = true;

    return coveredArray.map(num => ({
        type: 'number',
        value: num,
        amount: unitAmount
    }));
}