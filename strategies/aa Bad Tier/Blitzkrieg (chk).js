/**
 * Strategy: Blitzkrieg
 * 
 * Source:
 * - URL: https://youtu.be/35ZR4TqApd4
 * - Channel Name: Casino Matchmaker (Strategy by Kufu / Andrew)
 * 
 * Strategy Logic:
 * - Trigger & Selection:
 *   After every spin, place straight-up bets on the winning number and its immediate orthogonal 
 *   neighbors on the standard 3x12 roulette table layout (Left, Right, Above, Below).
 *   - Grid Neighbor Rules:
 *     - Left: winningNumber - 3 (if >= 1)
 *     - Right: winningNumber + 3 (if <= 36)
 *     - Above: winningNumber + 1 (if winningNumber % 3 !== 0)
 *     - Below: winningNumber - 1 (if winningNumber % 3 !== 1)
 *     - Zero (0): Connects to 2 (covers [0, 2]).
 *   - Each new winning pattern adds 1 base unit to its numbers. Overlapping positions 
 *     stack additional units, creating high-payout "jackpot numbers".
 * 
 * Bet Progression:
 * - Initial Bet: 1 unit per covered number in the pattern.
 * - Doubling Rule: On every 4th consecutive spin without achieving session profit, double 
 *   all accumulated units across all currently active bet positions.
 * - Intermediate Spins: Continue adding 1 base unit for newly hit patterns on each spin.
 * 
 * Goal & Reset:
 * - Target: Reach overall session profit (Bankroll > Peak Bankroll / High-Water Mark).
 * - Reset: When session profit is reached, clear all active bets and reset progression step 
 *   counters back to start.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.highWaterMark = bankroll;
        state.spinCountInLoss = 0;
        state.activeBets = {}; // Maps string number -> units count
    }

    const minBet = config.betLimits.min || 1;
    const maxBet = config.betLimits.max || 500;

    // 2. Check for Reset Condition (Session Profit)
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
        state.spinCountInLoss = 0;
        state.activeBets = {};
    }

    // 3. Process Spin History & Build Bet Patterns
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;

        state.spinCountInLoss++;

        // Calculate orthogonal table neighbors for standard 3x12 layout
        const getCrossPattern = (num) => {
            if (num === 0) return [0, 2];

            const pattern = [num];

            // Left / Right (-3 / +3)
            if (num - 3 >= 1) pattern.push(num - 3);
            if (num + 3 <= 36) pattern.push(num + 3);

            // Above / Below (+1 / -1 relative to column/row position)
            if (num % 3 !== 0 && num + 1 <= 36) pattern.push(num + 1); // Above
            if (num % 3 !== 1 && num - 1 >= 1) pattern.push(num - 1);  // Below

            return pattern;
        };

        const patternNumbers = getCrossPattern(winNum);

        // Add 1 base unit to each number in the pattern
        patternNumbers.forEach(n => {
            state.activeBets[n] = (state.activeBets[n] || 0) + 1;
        });

        // Double all existing active bets every 4th spin in loss progression
        if (state.spinCountInLoss % 4 === 0) {
            Object.keys(state.activeBets).forEach(n => {
                state.activeBets[n] *= 2;
            });
        }
    }

    // 4. Construct & Clamp Bet Objects
    const bets = [];
    Object.keys(state.activeBets).forEach(nStr => {
        const num = parseInt(nStr, 10);
        const units = state.activeBets[nStr];

        if (units > 0) {
            let amount = units * minBet;
            amount = Math.max(amount, minBet);
            amount = Math.min(amount, maxBet);

            bets.push({
                type: 'number',
                value: num,
                amount: amount
            });
        }
    });

    return bets;
}