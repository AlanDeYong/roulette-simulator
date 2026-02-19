
/**
 * Strategy: Triplets (by Bet With Mo)
 * Source: https://www.youtube.com/watch?v=9npNNzNMoRY
 * * THE LOGIC:
 * This strategy focuses on maximizing coverage across all three dozens simultaneously
 * using a specific combination of Split and Straight-Up bets.
 * - "Triplets" refers to placing 3 specific Split bets in EACH dozen (9 splits total).
 * - As the progression increases, we add Straight-Up bets "on top" of the splits
 * (covering one of the two numbers in the split) and aggressively increase the 
 * split bet amount to recover losses and profit.
 * * BET SETUP (9 Positions Total - 3 per Dozen):
 * We define 9 fixed split locations. For example:
 * - Dozen 1: Splits (1|2), (4|5), (7|8)
 * - Dozen 2: Splits (13|14), (16|17), (19|20)
 * - Dozen 3: Splits (25|26), (28|29), (31|32)
 * * THE PROGRESSION (7 Levels):
 * Triggers on Loss. Resets to Level 1 on Win.
 * Unit calculations based on video bet totals ($9, $18, $36, $54, $81...):
 * * - Level 1: 1 unit on Split only. (Total 9 units)
 * - Level 2: 1 unit on Split + 1 unit on Straight (on the first number of split). (Total 18 units)
 * - Level 3: 3 units on Split + 1 unit on Straight. (Total 36 units)
 * - Level 4: 5 units on Split + 1 unit on Straight. (Total 54 units)
 * - Level 5: 8 units on Split + 1 unit on Straight. (Total 81 units)
 * - Level 6: Double Level 5 (16 units Split + 2 units Straight).
 * - Level 7: Double Level 6 (32 units Split + 4 units Straight).
 * * NOTE: The exact numbers chosen for the splits are arbitrary as long as they
 * stay within their respective dozens to match the strategy's structure.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Betting Constants
    const baseUnit = config.betLimits.min; // Usually 1 or 2
    const maxLevel = 7;

    // 2. Define the 9 "Triplet" Positions (Split pairs and the Straight 'kicker')
    // We choose 3 horizontal splits per dozen to ensure clean dozen coverage.
    const targets = [
        // Dozen 1
        { split: [1, 2], straight: 1 },
        { split: [4, 5], straight: 4 },
        { split: [7, 8], straight: 7 },
        // Dozen 2
        { split: [13, 14], straight: 13 },
        { split: [16, 17], straight: 16 },
        { split: [19, 20], straight: 19 },
        // Dozen 3
        { split: [25, 26], straight: 25 },
        { split: [28, 29], straight: 28 },
        { split: [31, 32], straight: 31 }
    ];

    // 3. Initialize State
    if (state.level === undefined) state.level = 1;
    if (state.lastBetTotal === undefined) state.lastBetTotal = 0;

    // 4. Handle Previous Spin Result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.winAmount || 0; // Simulator usually provides this
        
        // Basic Win/Loss check based on if we got back more than we bet
        // Note: In roulette, "winAmount" usually includes the returned stake.
        // Profit = winAmount - lastBetTotal.
        const isWin = lastWinAmount > state.lastBetTotal;

        if (isWin) {
            // Reset on Win
            state.level = 1;
        } else {
            // Increase level on Loss
            state.level++;
            if (state.level > maxLevel) {
                state.level = 1; // Stop loss / Reset after max progression
            }
        }
    }

    // 5. Determine Unit Distribution based on Level
    let splitUnits = 0;
    let straightUnits = 0;

    switch (state.level) {
        case 1:
            splitUnits = 1;
            straightUnits = 0;
            break;
        case 2:
            splitUnits = 1;
            straightUnits = 1;
            break;
        case 3:
            splitUnits = 3;
            straightUnits = 1;
            break;
        case 4:
            splitUnits = 5;
            straightUnits = 1;
            break;
        case 5:
            splitUnits = 8;
            straightUnits = 1;
            break;
        case 6:
            splitUnits = 16;
            straightUnits = 2;
            break;
        case 7:
            splitUnits = 32;
            straightUnits = 4;
            break;
        default:
            splitUnits = 1;
            straightUnits = 0;
    }

    // 6. Construct Bets
    const bets = [];
    let currentBetTotal = 0;

    // Check if we have enough bankroll for the full spread, otherwise stop or reset
    // This calculation is a rough check; strict checking happens in loop
    const estimatedCost = (splitUnits + straightUnits) * baseUnit * 9;
    if (bankroll < estimatedCost) {
        // Not enough money for the full level bet, fallback to level 1 or stop
        // We'll attempt Level 1 logic if current logic is too expensive
        if (state.level > 1 && bankroll >= 9 * baseUnit) {
            state.level = 1;
            splitUnits = 1;
            straightUnits = 0;
        } else if (bankroll < 9 * baseUnit) {
            return []; // Stop betting
        }
    }

    targets.forEach(target => {
        // Add Split Bet
        if (splitUnits > 0) {
            let sAmount = splitUnits * baseUnit;
            // Clamp
            sAmount = Math.max(sAmount, config.betLimits.min);
            sAmount = Math.min(sAmount, config.betLimits.max);
            
            bets.push({
                type: 'split',
                value: target.split,
                amount: sAmount
            });
            currentBetTotal += sAmount;
        }

        // Add Straight Bet
        if (straightUnits > 0) {
            let kAmount = straightUnits * baseUnit;
            // Clamp
            kAmount = Math.max(kAmount, config.betLimits.min);
            kAmount = Math.min(kAmount, config.betLimits.max);

            bets.push({
                type: 'number',
                value: target.straight,
                amount: kAmount
            });
            currentBetTotal += kAmount;
        }
    });

    // 7. Store Bet Total for next spin profit calculation
    state.lastBetTotal = currentBetTotal;

    return bets;

}