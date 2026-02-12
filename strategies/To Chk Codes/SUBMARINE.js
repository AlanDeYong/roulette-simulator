/**
 * Strategy: "Submarine" Roulette Strategy
 * Source: Bet With Mo (https://www.youtube.com/watch?v=xHo4mD_04us)
 * * THE LOGIC:
 * This is a "Board Coverage" strategy that creates a chain of bets down the table.
 * It uses a specific geometry of 5 Straight Ups, 4 Streets (in between the straights), 
 * and 4 Splits (bridging the streets and straights).
 * * The Betting Layout (Interlocked Chain):
 * - Straights (5): 2, 8, 14, 20, 26
 * - Streets (4): 4-6, 10-12, 16-18, 22-24
 * - Splits (4): 5/8, 11/14, 17/20, 23/26
 * * THE PROGRESSION (8 Levels):
 * The strategy uses a negative progression (increasing on loss) with specific unit counts per bet type.
 * - Level 1: Straights(1u), Streets(1u), Splits(1u)
 * - Level 2: Straights(1u), Streets(2u), Splits(1u)
 * - Level 3: Straights(2u), Streets(2u), Splits(2u) (Double Level 1)
 * - Level 4: Straights(2u), Streets(3u), Splits(2u)
 * - Level 5: Straights(4u), Streets(4u), Splits(4u) (Double Level 3)
 * - Level 6: Straights(4u), Streets(6u), Splits(4u)
 * - Level 7: Straights(8u), Streets(8u), Splits(8u) (Double Level 5)
 * - Level 8: Straights(8u), Streets(12u), Splits(8u)
 * * MANAGEMENT RULES:
 * - Loss: Move UP 1 Level.
 * - Win: Move DOWN 1 Level (or Reset if profit target hit).
 * - "Micro-Goal" Reset: The strategy aims for small $20 profit chunks. 
 * If the current Bankroll exceeds the (Session Start + $20 * N), reset to Level 1.
 * * THE GOAL:
 * Grind small profits while using the coverage to survive volatility. 
 * Stop if Level 8 is lost (Bankroll preservation) or if a large target is hit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    const baseUnit = config.betLimits.min; // Usually $1 or chip value
    const goalIncrement = 20; // The "Micro-goal" amount defined in video

    // Define the specific numbers for the "Submarine" chain geometry
    const layout = {
        straights: [2, 8, 14, 20, 26],
        streets: [4, 10, 16, 22], // Represents start of row (e.g., 4 covers 4,5,6)
        splits: [
            [5, 8],
            [11, 14],
            [17, 20],
            [23, 26]
        ]
    };

    // 2. State Initialization
    if (state.level === undefined) state.level = 1;
    if (state.sessionStartBankroll === undefined) state.sessionStartBankroll = bankroll;
    if (state.currentTarget === undefined) state.currentTarget = bankroll + goalIncrement;

    // 3. Process Last Spin (if applicable)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.totalPayout;

        // Check for "Micro-Goal" Achievement
        if (bankroll >= state.currentTarget) {
            // Goal hit! Reset to Level 1 and ratchet up the target
            state.level = 1;
            state.currentTarget = bankroll + goalIncrement;
            // Optional: Log success
            // console.log(`Submarine: Profit Target Hit! New Target: ${state.currentTarget}`);
        } else {
            // Standard Progression Logic
            if (lastWinAmount > 0) {
                // Win: Regress level (Safety)
                if (state.level > 1) {
                    state.level--;
                } else {
                    state.level = 1;
                }
            } else {
                // Loss: Progress level (Risk)
                state.level++;
                // Cap at Level 8 (Video implies it's the final level. Reset to 1 if lost to prevent total ruin)
                if (state.level > 8) {
                    state.level = 1;
                }
            }
        }
    }

    // 4. Define Unit Multipliers for the 8 Levels
    // Format: { straight: units, street: units, split: units }
    const progressionMap = {
        1: { straight: 1, street: 1, split: 1 },
        2: { straight: 1, street: 2, split: 1 },
        3: { straight: 2, street: 2, split: 2 },
        4: { straight: 2, street: 3, split: 2 },
        5: { straight: 4, street: 4, split: 4 },
        6: { straight: 4, street: 6, split: 4 },
        7: { straight: 8, street: 8, split: 8 },
        8: { straight: 8, street: 12, split: 8 }
    };

    // Fallback if state gets weird, default to Level 1
    const currentMultipliers = progressionMap[state.level] || progressionMap[1];

    // 5. Calculate Bet Amounts (Respecting Limits)
    const calculateAmount = (units) => {
        let amt = units * baseUnit;
        amt = Math.max(amt, config.betLimits.min);
        amt = Math.min(amt, config.betLimits.max);
        return amt;
    };

    const straightAmt = calculateAmount(currentMultipliers.straight);
    const streetAmt = calculateAmount(currentMultipliers.street);
    const splitAmt = calculateAmount(currentMultipliers.split);

    // 6. Construct Bet Array
    const bets = [];

    // Add Straights
    layout.straights.forEach(num => {
        bets.push({ type: 'number', value: num, amount: straightAmt });
    });

    // Add Streets
    layout.streets.forEach(startNum => {
        bets.push({ type: 'street', value: startNum, amount: streetAmt });
    });

    // Add Splits
    layout.splits.forEach(pair => {
        bets.push({ type: 'split', value: pair, amount: splitAmt });
    });

    return bets;
}