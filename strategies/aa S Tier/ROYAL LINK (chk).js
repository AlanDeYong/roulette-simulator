/**
 * SOURCE: URL: https://youtu.be/IsqHufZkgmA | Channel: Bet With Mo
 * STRATEGY: "ROYAL LINK" - HUGE 30# COVERAGE
 *
 * THE FULL LOGIC:
 * - This system targets 30 numbers by placing horizontal splits between columns 1 & 2, paired with an outside bet on the 3rd Column.
 * - It progressively adds more splits, leaving only the Zero(s) and a block of 6 numbers at the bottom of the board (28, 29, 31, 32, 34, 35) exposed.
 * - A "win" occurs if any covered number is hit. A "loss" occurs on 0 or the missing numbers.
 * 
 * THE FULL BET PROGRESSION:
 * - The strategy scales using a bespoke 7-step progression for recovery:
 * - Step 1: 3 splits (1u), 3rd Column (2u)
 * - Step 2: 6 splits (1u), 3rd Column (4u)
 * - Step 3: 9 splits (2u), 3rd Column (12u)
 * - Step 4: 9 splits (3u), 3rd Column (16u)
 * - Step 5: 9 splits (5u), 3rd Column (25u)
 * - Step 6: 9 splits (10u), 3rd Column (50u)
 * - Step 7: 9 splits (20u), 3rd Column (100u)
 * - On a LOSS: Move to the next step. If the final step is lost, reset to Step 1 (stop-loss).
 * - On a WIN: Check the bankroll. If you have reached or exceeded the session high (high-water mark), RESET to Step 1 to secure profits. 
 * - If you won but the bankroll is still in drawdown, STAY on the current step and rebet to farm the recovery.
 * 
 * THE GOAL:
 * - High-win-rate profit farming with aggressive unit scaling upon losses, resetting only when a new bankroll high is achieved.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.step === undefined) state.step = 0;
    if (state.highWaterMark === undefined) state.highWaterMark = bankroll;

    const progression = [
        { splits: 3, splitUnits: 1, colUnits: 2 },   // Step 1
        { splits: 6, splitUnits: 1, colUnits: 4 },   // Step 2
        { splits: 9, splitUnits: 2, colUnits: 12 },  // Step 3
        { splits: 9, splitUnits: 3, colUnits: 16 },  // Step 4
        { splits: 9, splitUnits: 5, colUnits: 25 },  // Step 5
        { splits: 9, splitUnits: 10, colUnits: 50 }, // Step 6
        { splits: 9, splitUnits: 20, colUnits: 100 } // Step 7
    ];

    const splitPositions = [
        [1, 2], [4, 5], [7, 8],          // First 3 (Group 1)
        [10, 11], [13, 14], [16, 17],    // Next 3 (Group 2)
        [19, 20], [22, 23], [25, 26]     // Last 3 (Group 3)
    ];

    // 2. Process the previous spin result
    if (spinHistory.length > 0 && state.lastStep !== undefined) {
        let lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        let pastProgression = progression[state.lastStep];
        let wonLastSpin = false;

        // Check if 3rd column hit (multiples of 3, excluding 0)
        if (lastSpin !== 0 && lastSpin % 3 === 0) {
            wonLastSpin = true;
        }

        // Check if an active split hit
        for (let i = 0; i < pastProgression.splits; i++) {
            if (splitPositions[i].includes(lastSpin)) {
                wonLastSpin = true;
                break;
            }
        }

        if (wonLastSpin) {
            if (bankroll >= state.highWaterMark) {
                // Recovered drawdown or reached new high, reset to base
                state.step = 0;
                state.highWaterMark = bankroll;
            }
            // Else: We are still in a drawdown. Stay on current step to recover.
        } else {
            // Loss occurred, move to next step
            state.step++;
            if (state.step >= progression.length) {
                // Stop-loss reached, reset to base
                state.step = 0;
                state.highWaterMark = bankroll; 
            }
        }
    } else {
        // First spin baseline
        state.highWaterMark = Math.max(state.highWaterMark, bankroll);
    }

    // Save state for the next spin's evaluation
    state.lastStep = state.step;

    // 3. Determine Base Unit (Scale to increment settings or table minimums)
    let baseMultiplier = (config.incrementMode === 'fixed' && config.minIncrementalBet) ? config.minIncrementalBet : config.betLimits.min;
    let currentStep = progression[state.step];

    let splitAmount = currentStep.splitUnits * baseMultiplier;
    let colAmount = currentStep.colUnits * baseMultiplier;

    // 4. Clamp Amounts to Valid Limits
    splitAmount = Math.max(splitAmount, config.betLimits.min);
    colAmount = Math.max(colAmount, config.betLimits.minOutside);

    splitAmount = Math.min(splitAmount, config.betLimits.max);
    colAmount = Math.min(colAmount, config.betLimits.max);

    // 5. Build and Return Bets Array
    let bets = [];

    // Add designated Split Bets
    for (let i = 0; i < currentStep.splits; i++) {
        bets.push({
            type: 'split',
            value: splitPositions[i],
            amount: splitAmount
        });
    }

    // Add 3rd Column Bet
    bets.push({
        type: 'column',
        value: 3,
        amount: colAmount
    });

    return bets;
}