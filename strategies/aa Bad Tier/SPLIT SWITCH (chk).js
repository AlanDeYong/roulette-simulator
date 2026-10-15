/**
 * Roulette Strategy: 10 Vertical Splits Progression
 * Source: https://youtu.be/cXfaABPVlas (YouTube)
 * * The Full Logic in details:
 * - The strategy covers a large portion of the board using 10 simultaneous split bets.
 * - Initial bets are placed on the following specific splits: 5/6, 8/9, 11/12, 14/15, 17/18, 20/21, 23/24, 26/27, 29/30, 32/33.
 * - The system tracks the session's peak bankroll. 
 * - If a spin wins and the bankroll has NOT reached the peak session profit, the bet amount remains the same, but the winning split is moved to its adjacent split within the same street (e.g., if 5/6 wins, that specific bet moves to 4/5. If 4/5 wins later, it moves back to 5/6).
 * * The Full Bet Progression in details:
 * - Total bet size progresses through: 10-20-30-40-50-70-100-150-300 units.
 * - Since there are 10 splits, the per-split unit progression is: 1, 2, 3, 4, 5, 7, 10, 15, 30.
 * - On loss: Advance one step in the progression. If losses continue past the 9th step (30 units), the bet size doubles for each subsequent loss.
 * - On win (reaching session's peak profit): Reset the progression back to 1 unit and reset all split positions back to their starting defaults.
 * * The Goal:
 * - Accumulate profit by surviving loss streaks with a tailored progression and resetting the cycle immediately upon reaching a new high-water mark (session peak profit).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min; 
    
    // Default starting splits
    const defaultSplits = [
        [5,6], [8,9], [11,12], [14,15], [17,18],
        [20,21], [23,24], [26,27], [29,30], [32,33]
    ];

    // Mapping to easily swap between top and bottom splits within the same street
    const splitPairs = {
        "5,6": [4, 5], "4,5": [5, 6],
        "8,9": [7, 8], "7,8": [8, 9],
        "11,12": [10, 11], "10,11": [11, 12],
        "14,15": [13, 14], "13,14": [14, 15],
        "17,18": [16, 17], "16,17": [17, 18],
        "20,21": [19, 20], "19,20": [20, 21],
        "23,24": [22, 23], "22,23": [23, 24],
        "26,27": [25, 26], "25,26": [26, 27],
        "29,30": [28, 29], "28,29": [29, 30],
        "32,33": [31, 32], "31,32": [32, 33]
    };

    // Initialize state on first run
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.lossStreak = 0;
        state.currentSplits = JSON.parse(JSON.stringify(defaultSplits));
    }

    // Process previous spin results
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        let won = false;
        let winningSplitIndex = -1;
        
        for (let i = 0; i < state.currentSplits.length; i++) {
            if (state.currentSplits[i].includes(lastSpin)) {
                won = true;
                winningSplitIndex = i;
                break;
            }
        }

        if (won) {
            // Check if we hit or exceeded our peak profit
            if (bankroll >= state.peakBankroll) {
                state.peakBankroll = bankroll; // Update new peak
                state.lossStreak = 0; // Reset progression
                state.currentSplits = JSON.parse(JSON.stringify(defaultSplits)); // Reset positions
            } else {
                // Rebet (maintain streak) but swap the winning split
                const winningSplitKey = state.currentSplits[winningSplitIndex].join(",");
                if (splitPairs[winningSplitKey]) {
                    state.currentSplits[winningSplitIndex] = splitPairs[winningSplitKey];
                }
            }
        } else {
            // Loss: advance progression
            state.lossStreak++;
        }
    }

    // Determine current unit multiplier based on progression rules
    const progressionSteps = [1, 2, 3, 4, 5, 7, 10, 15, 30];
    let multiplier;
    
    if (state.lossStreak < progressionSteps.length) {
        multiplier = progressionSteps[state.lossStreak];
    } else {
        // Double up for each loss beyond the explicit progression
        const extraSteps = state.lossStreak - progressionSteps.length + 1;
        multiplier = progressionSteps[progressionSteps.length - 1] * Math.pow(2, extraSteps);
    }

    // Calculate and clamp the final bet amount
    let amount = unit * multiplier;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // Construct the bet array
    let bets = [];
    for (let split of state.currentSplits) {
        bets.push({ type: 'split', value: split, amount: amount });
    }

    return bets;
}