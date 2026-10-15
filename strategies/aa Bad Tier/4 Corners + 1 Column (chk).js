/**
 * MY GO-TO ROULETTE STRATEGY FOR BIG WINS AND COMPS (Random Column & Zero-Overlap Inside Bets)
 * 
 * Source: https://youtu.be/6QpaPB928XI
 * YouTube Channel: Cruising & Craps
 * 
 * FULL LOGIC IN DETAIL:
 * - On session start or progression reset, a column (1, 2, or 3) is randomly selected along with zero-overlap inside bets:
 *   - If Column 1 is chosen: 4 random non-overlapping corners are placed across Columns 2 & 3.
 *   - If Column 3 is chosen: 4 random non-overlapping corners are placed across Columns 1 & 2.
 *   - If Column 2 is chosen: NO corner bets are placed. Instead, 8 random non-overlapping vertical splits are placed in Columns 1 and 3 (never touching Column 2).
 * - Selected layout persists across spins until a progression RESET occurs.
 * 
 * FULL BET PROGRESSION IN DETAIL:
 * - Sizing Ratio:
 *   - Corner bet = 1 unit.
 *   - Split bet = Exactly half of corner bet amount (0.5 units).
 *   - Column bet = 3x corner bet amount (3 units).
 * - Base unit sizes are derived so that a split bet strictly meets or exceeds `config.betLimits.min`.
 * - Progression Level starts at Level 1.
 * - On Loss (Whack): Increase progression level by +2 units (Level 1 -> 3 -> 5...).
 * - On Win:
 *   - If bankroll >= initial bankroll: Reset progression to Level 1 and generate a NEW random layout.
 *   - If still in net loss: Step down progression level by -1 unit (e.g., Level 3 -> 2) keeping the current layout.
 * 
 * THE GOAL:
 * - High table coverage with zero bet overlap, maintaining proper proportional payouts across corners and splits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Helper function to pick N random items from an array
    function getRandomSubarray(arr, size) {
        const shuffled = arr.slice();
        let i = arr.length;
        while (i--) {
            const index = Math.floor((i + 1) * Math.random());
            const temp = shuffled[index];
            shuffled[index] = shuffled[i];
            shuffled[i] = temp;
        }
        return shuffled.slice(0, size);
    }

    // Generate a fresh random layout based on chosen column
    function generateLayout() {
        const column = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3

        if (column === 1) {
            // Pick 4 non-overlapping corners in Columns 2 & 3
            const candidateCorners = [
                { value: 2, numbers: [2, 3, 5, 6] },
                { value: 8, numbers: [8, 9, 11, 12] },
                { value: 14, numbers: [14, 15, 17, 18] },
                { value: 20, numbers: [20, 21, 23, 24] },
                { value: 26, numbers: [26, 27, 29, 30] },
                { value: 32, numbers: [32, 33, 35, 36] }
            ];
            const chosenCorners = getRandomSubarray(candidateCorners, 4);
            return {
                type: 'corners',
                column: 1,
                insideBets: chosenCorners
            };
        } else if (column === 3) {
            // Pick 4 non-overlapping corners in Columns 1 & 2
            const candidateCorners = [
                { value: 1, numbers: [1, 2, 4, 5] },
                { value: 7, numbers: [7, 8, 10, 11] },
                { value: 13, numbers: [13, 14, 16, 17] },
                { value: 19, numbers: [19, 20, 22, 23] },
                { value: 25, numbers: [25, 26, 28, 29] },
                { value: 31, numbers: [31, 32, 34, 35] }
            ];
            const chosenCorners = getRandomSubarray(candidateCorners, 4);
            return {
                type: 'corners',
                column: 3,
                insideBets: chosenCorners
            };
        } else {
            // Column 2 chosen: Pick 8 non-overlapping vertical splits in Columns 1 & 3
            const candidateSplits = [
                // Col 1 splits
                { value: [1, 4], numbers: [1, 4] },
                { value: [7, 10], numbers: [7, 10] },
                { value: [13, 16], numbers: [13, 16] },
                { value: [19, 22], numbers: [19, 22] },
                { value: [25, 28], numbers: [25, 28] },
                { value: [31, 34], numbers: [31, 34] },
                // Col 3 splits
                { value: [3, 6], numbers: [3, 6] },
                { value: [9, 12], numbers: [9, 12] },
                { value: [15, 18], numbers: [15, 18] },
                { value: [21, 24], numbers: [21, 24] },
                { value: [27, 30], numbers: [27, 30] },
                { value: [33, 36], numbers: [33, 36] }
            ];
            const chosenSplits = getRandomSubarray(candidateSplits, 8);
            return {
                type: 'splits',
                column: 2,
                insideBets: chosenSplits
            };
        }
    }

    // 1. Initialize session state and initial layout
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
    }
    if (state.level === undefined) {
        state.level = 1;
    }
    if (!state.currentLayout) {
        state.currentLayout = generateLayout();
    }

    // 2. Process last spin outcome to update level / trigger layout reset
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        const isColumnHit = (num > 0 && num % 3 === state.currentLayout.column % 3);
        const isInsideHit = state.currentLayout.insideBets.some(b => b.numbers.includes(num));
        const isWin = isColumnHit || isInsideHit;

        if (isWin) {
            // Check if overall bankroll reached or exceeded initial bankroll
            if (bankroll >= state.initialBankroll) {
                // RESET: level to 1 and pick new layout
                state.level = 1;
                state.currentLayout = generateLayout();
            } else {
                // STEP DOWN: decrease level by 1 unit, maintain current layout
                state.level = Math.max(1, state.level - 1);
            }
        } else {
            // LOSS: increase progression level by +2 units, maintain current layout
            state.level += 2;
        }
    }

    // 3. Calculate bet amounts respecting table bet limits & exact ratios
    const minInside = config.betLimits.min || 2;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // Base unit for corner bets ensuring split (half corner) satisfies minInside & column satisfies minOutside
    const baseCornerUnit = Math.max(minInside * 2, Math.ceil(minOutside / 3));

    let cornerAmount = baseCornerUnit * state.level;
    let splitAmount = cornerAmount / 2; // Exactly half of corner bet amount
    let columnAmount = cornerAmount * 3;

    // Clamp bet amounts within table limits
    cornerAmount = Math.min(Math.max(cornerAmount, minInside), maxBet);
    splitAmount = Math.min(Math.max(splitAmount, minInside), maxBet);
    columnAmount = Math.min(Math.max(columnAmount, minOutside), maxBet);

    // 4. Construct output bets array
    const bets = [];

    // Column bet
    bets.push({
        type: 'column',
        value: state.currentLayout.column,
        amount: columnAmount
    });

    // Inside bets (Corners or Splits)
    if (state.currentLayout.type === 'corners') {
        state.currentLayout.insideBets.forEach(b => {
            bets.push({
                type: 'corner',
                value: b.value,
                amount: cornerAmount
            });
        });
    } else if (state.currentLayout.type === 'splits') {
        state.currentLayout.insideBets.forEach(b => {
            bets.push({
                type: 'split',
                value: b.value,
                amount: splitAmount
            });
        });
    }

    return bets;
}