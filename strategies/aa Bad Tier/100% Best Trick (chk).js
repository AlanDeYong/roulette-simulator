/**
 * Roulette Strategy: 100% Best Trick
 * Source: https://youtu.be/AJLdV_qLu7o?si=vO_t8bVYlFt0wXjm
 * 
 * The Full Logic in details:
 * This strategy covers the vast majority of the board using a specific pattern of inside bets.
 * It differentiates between "small losses" (where some bets hit but result in a net loss less than half the total bet) 
 * and "big losses" (where the net loss is significant, greater than half the total bet). 
 * 
 * The Full Bet Progression in details:
 * - Base setup (50 units total):
 *   - 1 unit on: 0 (straight)
 *   - 1 unit on splits: 2/5, 3/6, 8/11, 9/12, 14/17, 15/18, 20/23, 21/24, 26/29, 27/30, 32/35, 33/36
 *   - 1 unit on corners: 1/5, 2/6, 7/11, 8/12, 13/17, 14/18, 19/23, 20/24, 25/29, 26/30, 31/35, 32/36
 *   - 5 units on corners: 4/8, 10/14, 16/20, 22/26, 28/32
 * - On small losses: Rebet at the current progression level.
 * - On big losses: Rebet and double up all bets (progression level * 2).
 * - On win: 
 *   - If the current bankroll reaches or exceeds the session's peak profit, step down 1 level (halve the progression).
 *   - If not at the session's peak profit, reset to the base level (level 1).
 * 
 * The Goal:
 * To accumulate profit systematically through heavy board coverage, leveraging doubling on major misses to recoup losses, 
 * and protecting the bankroll by stepping down or resetting when wins occur.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.init) {
        state.level = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
        state.lastTotalBet = 0;
        state.init = true;
    }

    // 2. Process Previous Spin Result
    if (spinHistory.length > 0) {
        let netProfit = bankroll - state.lastBankroll;

        if (netProfit > 0) {
            // Win Condition
            if (bankroll >= state.peakBankroll) {
                // At or above peak profit: go down 1 level
                state.level = Math.max(1, state.level / 2);
            } else {
                // Not at peak: reset
                state.level = 1;
            }
        } else if (netProfit < 0) {
            // Loss Condition
            let lossAmount = Math.abs(netProfit);
            // Define a "big loss" as losing more than half the total bet placed on that spin
            let isBigLoss = lossAmount > (state.lastTotalBet / 2);

            if (isBigLoss) {
                // Big loss: double up all bets
                state.level *= 2;
            }
            // Small loss: implicitly rebet (state.level remains unchanged)
        }
    }

    // Update peak and last bankroll
    state.peakBankroll = Math.max(state.peakBankroll, bankroll);
    state.lastBankroll = bankroll;

    // 3. Define the Strategy's Base Bets
    const baseBets = [
        { type: 'number', value: 0, units: 1 },
        { type: 'split', value: [2, 5], units: 1 },
        { type: 'split', value: [3, 6], units: 1 },
        { type: 'split', value: [8, 11], units: 1 },
        { type: 'split', value: [9, 12], units: 1 },
        { type: 'split', value: [14, 17], units: 1 },
        { type: 'split', value: [15, 18], units: 1 },
        { type: 'split', value: [20, 23], units: 1 },
        { type: 'split', value: [21, 24], units: 1 },
        { type: 'split', value: [26, 29], units: 1 },
        { type: 'split', value: [27, 30], units: 1 },
        { type: 'split', value: [32, 35], units: 1 },
        { type: 'split', value: [33, 36], units: 1 },
        { type: 'corner', value: 1, units: 1 },   // Covers 1, 2, 4, 5
        { type: 'corner', value: 2, units: 1 },   // Covers 2, 3, 5, 6
        { type: 'corner', value: 7, units: 1 },   // Covers 7, 8, 10, 11
        { type: 'corner', value: 8, units: 1 },   // Covers 8, 9, 11, 12
        { type: 'corner', value: 13, units: 1 },  // Covers 13, 14, 16, 17
        { type: 'corner', value: 14, units: 1 },  // Covers 14, 15, 17, 18
        { type: 'corner', value: 19, units: 1 },  // Covers 19, 20, 22, 23
        { type: 'corner', value: 20, units: 1 },  // Covers 20, 21, 23, 24
        { type: 'corner', value: 25, units: 1 },  // Covers 25, 26, 28, 29
        { type: 'corner', value: 26, units: 1 },  // Covers 26, 27, 29, 30
        { type: 'corner', value: 31, units: 1 },  // Covers 31, 32, 34, 35
        { type: 'corner', value: 32, units: 1 },  // Covers 32, 33, 35, 36
        { type: 'corner', value: 4, units: 5 },   // Covers 4, 5, 7, 8
        { type: 'corner', value: 10, units: 5 },  // Covers 10, 11, 13, 14
        { type: 'corner', value: 16, units: 5 },  // Covers 16, 17, 19, 20
        { type: 'corner', value: 22, units: 5 },  // Covers 22, 23, 25, 26
        { type: 'corner', value: 28, units: 5 }   // Covers 28, 29, 31, 32
    ];

    // 4. Construct the Bet Array and Apply Progression/Limits
    let currentTotalBet = 0;
    const bets = [];
    const baseUnit = config.betLimits.min;

    for (let b of baseBets) {
        // Calculate the raw amount based on strategy multipliers and progression level
        let rawAmount = b.units * baseUnit * state.level;
        
        // Clamp to limits
        let finalAmount = Math.max(rawAmount, config.betLimits.min);
        finalAmount = Math.min(finalAmount, config.betLimits.max);

        bets.push({
            type: b.type,
            value: b.value,
            amount: finalAmount
        });

        currentTotalBet += finalAmount;
    }

    // Save total bet to evaluate small/big loss on the next spin
    state.lastTotalBet = currentTotalBet;

    return bets;
}