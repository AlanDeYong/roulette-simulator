/**
 * Roly Poly Roulette Strategy
 * 
 * Source:
 * - URL: https://youtu.be/HprjaxWSqtI
 * - Channel: Casino Matchmaker
 * - Creator / Presenter: Rodney G / Casino Matchmaker
 * 
 * The Full Logic in Details:
 * - The strategy operates on racetrack neighbors (specifically 6 neighbors on each side of key target numbers).
 * - Primary target numbers are 2 and 7. Betting 6 neighbors on either side of 2 and 7 covers 13 numbers each (25 total unique numbers, as 0 is overlapped by both).
 * - Target sets:
 *   - Base Bet: 6 neighbors of 2 and 6 neighbors of 7 (25 numbers total).
 *   - Jackpot Bet: Added after a regular win. Adds 6 neighbors around 0 (13 numbers total).
 * - Classification of Outcome:
 *   - Loss (12 losing numbers): Numbers outside the 25 base numbers.
 *   - Regular Win (Small Win): Hitting a base number that is not covered by the Jackpot bet.
 *   - Jackpot Win (Banger): Hitting a number covered by the Jackpot bet (0 and its 6 neighbors).
 * 
 * The Full Bet Progression in Details:
 * 1. Initial State / Base Level (Level L = 1):
 *    - Place base bet: 1 unit on number 2 and its 6 neighbors, and 1 unit on number 7 and its 6 neighbors.
 * 2. On a Regular Win:
 *    - If no Jackpot bet is currently active, activate Jackpot bet: Place (0.5 * Level L) units on number 0 and its 6 neighbors.
 *    - Track small win count. If small wins reach 5, reset to base level L = 1.
 * 3. On a Jackpot Win (Banger):
 *    - Reset progression level L = 1 and clear jackpot active state.
 * 4. On a Loss:
 *    - Increase level: L = L + 1.
 *    - Reset Jackpot active state.
 *    - Place L units on 2 + 6 neighbors and L units on 7 + 6 neighbors.
 * 
 * The Goal:
 * - Hit a Jackpot win or 5 regular wins to reset and achieve systematic net gains.
 * - Target profit / stop-loss can be configured via bankroll targets.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // Helper to get European wheel neighbor array for a center number and radius
    const wheelOrder = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
        5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];

    function getNeighbors(center, radius) {
        const idx = wheelOrder.indexOf(center);
        const result = [];
        const len = wheelOrder.length;
        for (let i = -radius; i <= radius; i++) {
            let pos = (idx + i) % len;
            if (pos < 0) pos += len;
            result.push(wheelOrder[pos]);
        }
        return result;
    }

    // Define neighbor sets (radius = 6)
    const baseNeighbors2 = getNeighbors(2, 6);
    const baseNeighbors7 = getNeighbors(7, 6);
    const jackpotNeighbors0 = getNeighbors(0, 6);

    // Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.hasJackpot = false;
        state.smallWins = 0;
        state.initialBankroll = bankroll;
    }

    const minUnit = config.betLimits.min || 1;

    // Process previous spin outcome if available
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        const isBaseWin = baseNeighbors2.includes(lastNum) || baseNeighbors7.includes(lastNum);
        const isJackpotWin = state.hasJackpot && jackpotNeighbors0.includes(lastNum);

        if (isJackpotWin) {
            // Jackpot win triggers full reset
            state.level = 1;
            state.hasJackpot = false;
            state.smallWins = 0;
        } else if (isBaseWin) {
            state.smallWins += 1;
            if (state.smallWins >= 5) {
                // 5 small wins trigger reset
                state.level = 1;
                state.hasJackpot = false;
                state.smallWins = 0;
            } else {
                // Add jackpot bet on next round
                state.hasJackpot = true;
            }
        } else {
            // Loss: increase progression level, reset jackpot state
            state.level += 1;
            state.hasJackpot = false;
            state.smallWins = 0;
        }
    }

    // Determine Bet Amounts according to limits and current level
    const baseUnitAmount = Math.max(minUnit * state.level, config.betLimits.min);
    const jackpotUnitAmount = Math.max(minUnit * (state.level * 0.5), config.betLimits.min);

    const betsMap = {}; // number -> amount

    function addBet(num, amt) {
        // Ensure individual bet respects max limits
        const clampedAmt = Math.min(amt, config.betLimits.max);
        if (!betsMap[num]) {
            betsMap[num] = clampedAmt;
        } else {
            betsMap[num] = Math.min(betsMap[num] + clampedAmt, config.betLimits.max);
        }
    }

    // Place Base Bets (2 and 7 neighbors)
    baseNeighbors2.forEach(n => addBet(n, baseUnitAmount));
    baseNeighbors7.forEach(n => addBet(n, baseUnitAmount));

    // Place Jackpot Bets (0 neighbors) if active
    if (state.hasJackpot) {
        jackpotNeighbors0.forEach(n => addBet(n, jackpotUnitAmount));
    }

    // Format final return array
    const bets = [];
    for (const [numStr, amt] of Object.entries(betsMap)) {
        bets.push({
            type: 'number',
            value: parseInt(numStr, 10),
            amount: amt
        });
    }

    return bets;
}