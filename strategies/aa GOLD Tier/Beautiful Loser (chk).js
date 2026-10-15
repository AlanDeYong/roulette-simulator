/**
 * Strategy: Beautiful Loser (Random Non-Overlapping Corners)
 * Source: https://youtu.be/bhyqeg82u-8
 * Channel: The Roulette Factory
 *
 * --- The Full Logic in Detail ---
 * 1. Initial Setup:
 *    - The wheel board consists of 6 distinct two-row blocks:
 *      Sector 0: Rows [1,2,3] and [4,5,6]   -> Options: Corner 1 [1,2,4,5] or Corner 2 [2,3,5,6]
 *      Sector 1: Rows [7,8,9] and [10,11,12] -> Options: Corner 7 [7,8,10,11] or Corner 8 [8,9,11,12]
 *      Sector 2: Rows [13..15] and [16..18]  -> Options: Corner 13 or Corner 14
 *      Sector 3: Rows [19..21] and [22..24]  -> Options: Corner 19 or Corner 20
 *      Sector 4: Rows [25..27] and [28..30]  -> Options: Corner 25 or Corner 26
 *      Sector 5: Rows [31..33] and [34..36]  -> Options: Corner 31 or Corner 32
 *    - To ensure exactly 6 mutually non-overlapping corners covering 24 unique numbers,
 *      one valid corner is randomly selected from each of the 6 sectors.
 *    - These randomly selected corners remain fixed throughout losses and partial hits,
 *      and are only re-randomized upon reaching a full reset (new session profit).
 * 2. Hit / Win Handling:
 *    - If a hit produces a new session profit (bankroll > peakBankroll):
 *      Reset progression to Level 0, update peakBankroll, and randomly select a fresh
 *      set of 6 non-overlapping corners.
 *    - If a hit occurs but bankroll is NOT yet in profit:
 *      Maintain current bet size. Peel off the winning corner if holding 6 corners
 *      (preserving a minimum of 5 corners / 20 numbers).
 * 3. Miss / Loss Handling:
 *    - Move up one level on the 8-stage progression multiplier.
 *    - Retain active corners without change.
 *
 * --- The Full Bet Progression in Detail ---
 * - 8-Level Double + Fibonacci Progression:
 *    Level 0: 1 unit
 *    Level 1: (1 * 2) + 1  = 3 units
 *    Level 2: (3 * 2) + 1  = 7 units
 *    Level 3: (7 * 2) + 2  = 16 units
 *    Level 4: (16 * 2) + 3 = 35 units
 *    Level 5: (35 * 2) + 5 = 75 units
 *    Level 6: (75 * 2) + 8 = 158 units
 *    Level 7: (158 * 2) + 13 = 329 units
 *
 * --- The Goal ---
 * - Secure new session profit highs (+1 or more units above peak).
 * - Progression capped at Level 7 to guard against deeper drawdowns.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Sector corner definitions: exactly 1 chosen per sector guarantees 0 overlap
    const SECTOR_CORNERS = [
        [
            { value: 1, numbers: [1, 2, 4, 5] },
            { value: 2, numbers: [2, 3, 5, 6] }
        ],
        [
            { value: 7, numbers: [7, 8, 10, 11] },
            { value: 8, numbers: [8, 9, 11, 12] }
        ],
        [
            { value: 13, numbers: [13, 14, 16, 17] },
            { value: 14, numbers: [14, 15, 17, 18] }
        ],
        [
            { value: 19, numbers: [19, 20, 22, 23] },
            { value: 20, numbers: [20, 21, 23, 24] }
        ],
        [
            { value: 25, numbers: [25, 26, 28, 29] },
            { value: 26, numbers: [26, 27, 29, 30] }
        ],
        [
            { value: 31, numbers: [31, 32, 34, 35] },
            { value: 32, numbers: [32, 33, 35, 36] }
        ]
    ];

    // Helper to generate 6 random non-overlapping corners (1 per 6-line block)
    function generateRandomCorners() {
        return SECTOR_CORNERS.map(sector => {
            const randomIndex = Math.floor(Math.random() * sector.length);
            return sector[randomIndex];
        });
    }

    const PROGRESSION = [1, 3, 7, 16, 35, 75, 158, 329];
    const baseUnit = config.betLimits.min;

    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.peakBankroll = config.startingBankroll || bankroll;
        state.level = 0;
        state.selectedCorners = generateRandomCorners();
        state.activeCornerValues = state.selectedCorners.map(c => c.value);
        state.lastBets = [];
    }

    // 2. Process spin history
    if (spinHistory && spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Check if winning number hit an active corner
        const hitCorner = state.selectedCorners.find(c =>
            state.activeCornerValues.includes(c.value) && c.numbers.includes(winningNum)
        );

        if (hitCorner) {
            // WIN
            if (bankroll > state.peakBankroll) {
                // New session profit: Full reset + new random selection of 6 corners
                state.peakBankroll = bankroll;
                state.level = 0;
                state.selectedCorners = generateRandomCorners();
                state.activeCornerValues = state.selectedCorners.map(c => c.value);
            } else {
                // Win without session high: Peel off the hit corner (min 5 corners / 20 numbers)
                if (state.activeCornerValues.length > 5) {
                    state.activeCornerValues = state.activeCornerValues.filter(val => val !== hitCorner.value);
                }
                // Maintain bet size and remaining corners
            }
        } else {
            // LOSS
            if (state.level < PROGRESSION.length - 1) {
                state.level++;
            }
            // Retain active corners and selection
        }
    }

    // 3. Compute Bet Amount per Corner
    const unitMultiplier = PROGRESSION[state.level];
    let amountPerCorner = baseUnit * unitMultiplier;

    // Clamp bet amounts to limits
    amountPerCorner = Math.max(amountPerCorner, config.betLimits.min);
    amountPerCorner = Math.min(amountPerCorner, config.betLimits.max);

    // Bankroll constraint check
    const totalCost = amountPerCorner * state.activeCornerValues.length;
    if (bankroll < totalCost) {
        amountPerCorner = Math.floor(bankroll / state.activeCornerValues.length);
        if (amountPerCorner < config.betLimits.min) {
            return [];
        }
    }

    // 4. Return Bet Array
    const bets = state.activeCornerValues.map(cornerValue => ({
        type: 'corner',
        value: cornerValue,
        amount: amountPerCorner
    }));

    state.lastBets = bets;
    return bets;
}