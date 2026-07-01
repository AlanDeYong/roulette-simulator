/**
 * Strategy: Gold Pockets (Modified with Peak-Profit Hold Logic)
 * Source: https://youtu.be/9ZOMCxBtr2Y (Channel: Casino Matchmaker)
 * 
 * Logic:
 * - Start: No bet on the first spin (observation only).
 * - Betting: Tracks groups of 7 numbers (up to 4 groups).
 * - Overlap Prevention: If a new number overlaps an active bet, it moves to the nearest empty spot.
 * - Loss Progression: Add 7 numbers (max 28) and double bet multiplier.
 * - Win Progression:
 *    - If Bankroll < Session Peak: Keep numbers, maintain current bet multiplier.
 *    - If Bankroll >= Session Peak: Reset numbers and bet multiplier to base.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wheel Layout (European)
    const wheel = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

    // Helper: Get group of 7 numbers
    const getGroup = (num) => {
        const centerIndex = wheel.indexOf(num);
        let group = [];
        for (let i = -3; i <= 3; i++) {
            let index = (centerIndex + i + wheel.length) % wheel.length;
            group.push(wheel[index]);
        }
        return group;
    };

    // Helper: Find nearest empty spot on the wheel
    const getNearestEmpty = (num, currentAllNumbers) => {
        const idx = wheel.indexOf(num);
        let dist = 1;
        while (dist < wheel.length) {
            const left = wheel[(idx - dist + wheel.length) % wheel.length];
            const right = wheel[(idx + dist) % wheel.length];
            if (!currentAllNumbers.includes(right)) return right;
            if (!currentAllNumbers.includes(left)) return left;
            dist++;
        }
        return num;
    };

    // 2. State Initialization
    if (state.activeBets === undefined) state.activeBets = [];
    if (state.betMultiplier === undefined) state.betMultiplier = 1;
    if (state.peakBalance === undefined) state.peakBalance = config.startingBankroll;

    // Track peak balance
    if (bankroll > state.peakBalance) state.peakBalance = bankroll;

    // 3. Logic: No bet on first spin
    if (spinHistory.length === 0) return [];

    const lastResult = spinHistory[spinHistory.length - 1].winningNumber;
    const isWin = state.activeBets.some(b => b.number === lastResult);

    // 4. Update Progression
    if (isWin) {
        if (bankroll >= state.peakBalance) {
            // Reset on hitting peak profit
            state.activeBets = getGroup(lastResult).map(n => ({ number: n }));
            state.betMultiplier = 1;
        } else {
            // Keep numbers, maintain current multiplier level (do nothing)
        }
    } else {
        // Loss progression
        state.betMultiplier *= 2;
        
        // Add new set if < 4 groups (max 28 numbers)
        const currentActiveNumbers = state.activeBets.map(b => b.number);
        if (currentActiveNumbers.length < 28) {
            const newGroup = getGroup(lastResult);
            newGroup.forEach(num => {
                if (currentActiveNumbers.includes(num)) {
                    const empty = getNearestEmpty(num, currentActiveNumbers);
                    state.activeBets.push({ number: empty });
                    currentActiveNumbers.push(empty);
                } else {
                    state.activeBets.push({ number: num });
                    currentActiveNumbers.push(num);
                }
            });
        }
    }

    // 5. Calculate Bets
    const baseUnit = config.betLimits.min;
    const amount = Math.min(baseUnit * state.betMultiplier, config.betLimits.max);

    // 6. Return Bets
    return state.activeBets.map(b => ({
        type: 'number',
        value: b.number,
        amount: amount
    }));
}