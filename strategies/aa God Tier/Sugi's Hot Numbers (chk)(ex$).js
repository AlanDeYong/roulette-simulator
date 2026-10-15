/**
 * ============================================================================
 * ROUTETTE STRATEGY: Sugi's Hot Numbers
 * ============================================================================
 * Source:
 *   - Video URL: https://youtu.be/_YWriS54xPU
 *   - Channel: Casino Matchmaker
 *   - Strategy Creator: Sugiso ("Sugi's Hot Numbers")
 *
 * Full Logic Details:
 *   1. Hot Number Selection:
 *      - Tracks spin history to determine the top 3 most frequently occurring ("hot") numbers.
 *      - If history is short/empty, defaults to a default set of hot numbers (e.g., [12, 32, 3]).
 *      - Updates hot numbers whenever the session hits net profit or at the start of a session.
 *
 *   2. Neighbor Coverage:
 *      - For each of the top 3 hot numbers, bets on the target number plus 2 wheel neighbors on
 *        each side (a pocket of 5 numbers per hot number on the European roulette wheel).
 *      - A total of up to 15 unique numbers are covered across the wheel.
 *
 *   3. Bet Progression Rules:
 *      - Initial / Base Bet: 1 unit per number (clamped to config.betLimits.min).
 *      - On Loss: Increase bet amount per position by +2 units (or +2 * base step).
 *      - On Win: Decrease bet amount per position by -1 unit, down to minimum 1 base unit.
 *      - On Net Session Profit (Bankroll > Starting Bankroll / Peak Bankroll): Reset bet size to 1 base unit
 *        and recalculate top 3 hot numbers.
 *
 *   4. Goal / Stop Conditions:
 *      - Target Profit: Session profit target (e.g., +$100 or user-defined goal).
 *      - Stop Loss: Max allowable loss or bankroll depletion protection.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // European roulette wheel order in sequence around the wheel
    const EUROPEAN_WHEEL = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
        5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];

    // 1. Initialize State Variables
    if (!state.initialized) {
        state.initialized = true;
        state.startingBankroll = bankroll;
        state.highestBankroll = bankroll;
        state.units = 1; // Current progression level in units
        state.hotNumbers = [];
    }

    // Helper: Find top N hot numbers from spin history
    function getHotNumbers(history, count = 3) {
        if (!history || history.length === 0) {
            return [12, 32, 3]; // Default fallback hot numbers from source video
        }

        const frequencyMap = {};
        for (let i = 0; i < 37; i++) frequencyMap[i] = 0;

        // Count occurrences in history
        history.forEach(spin => {
            const num = spin.winningNumber;
            if (num !== undefined && num >= 0 && num <= 36) {
                frequencyMap[num] = (frequencyMap[num] || 0) + 1;
            }
        });

        // Sort numbers by frequency descending
        const sortedNumbers = Object.keys(frequencyMap)
            .map(Number)
            .sort((a, b) => frequencyMap[b] - frequencyMap[a]);

        return sortedNumbers.slice(0, count);
    }

    // Helper: Get target number + 2 neighbors on each side on European wheel
    function getNumberWithNeighbors(targetNum, neighborCount = 2) {
        const index = EUROPEAN_WHEEL.indexOf(targetNum);
        if (index === -1) return [targetNum];

        const len = EUROPEAN_WHEEL.length;
        const numbers = new Set();

        for (let offset = -neighborCount; offset <= neighborCount; offset++) {
            const neighborIdx = (index + offset + len) % len;
            numbers.add(EUROPEAN_WHEEL[neighborIdx]);
        }

        return Array.from(numbers);
    }

    // Update highest bankroll track
    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
    }

    // 2. Evaluate Last Spin & Adjust Progression
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNum = lastSpin.winningNumber;

        // Check if last spin was a hit on any of our bet positions
        const isWin = state.coveredNumbers ? state.coveredNumbers.includes(lastWinningNum) : false;

        // Session Profit condition check (Reset progression & update hot numbers)
        if (bankroll >= state.startingBankroll + 100 || bankroll > state.highestBankroll) {
            state.units = 1;
            state.hotNumbers = getHotNumbers(spinHistory, 3);
            state.startingBankroll = bankroll; // Reset session baseline
        } else if (isWin) {
            // Decrease by 1 unit on win (minimum 1)
            state.units = Math.max(1, state.units - 1);
        } else {
            // Increase by 2 units on loss
            state.units += 2;
        }
    } else {
        // Initial spin: set hot numbers
        state.hotNumbers = getHotNumbers(spinHistory, 3);
    }

    // 3. Build Unique Set of Covered Numbers (Hot numbers + 2 neighbors each)
    const coveredSet = new Set();
    state.hotNumbers.forEach(hotNum => {
        const pocket = getNumberWithNeighbors(hotNum, 2);
        pocket.forEach(n => coveredSet.add(n));
    });

    const coveredNumbers = Array.from(coveredSet);
    state.coveredNumbers = coveredNumbers; // Save to state for next spin verification

    // 4. Calculate Bet Amount per Inside Bet Number & Clamp Limits
    const minInsideBet = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;

    let baseStep = config.minIncrementalBet || 1;
    let rawAmount = minInsideBet * state.units;

    // Respect increment mode logic
    if (config.incrementMode === 'base') {
        rawAmount = minInsideBet * state.units;
    } else {
        rawAmount = minInsideBet + (state.units - 1) * baseStep;
    }

    // Clamp bet amount within limits
    let finalBetAmount = Math.max(rawAmount, minInsideBet);
    finalBetAmount = Math.min(finalBetAmount, maxBet);

    // Stop placing bets if bankroll cannot cover all numbers
    const totalRequiredBankroll = finalBetAmount * coveredNumbers.length;
    if (bankroll < totalRequiredBankroll) {
        return [];
    }

    // 5. Construct & Return Bet Objects
    const bets = coveredNumbers.map(num => ({
        type: 'number',
        value: num,
        amount: finalBetAmount
    }));

    return bets;
}