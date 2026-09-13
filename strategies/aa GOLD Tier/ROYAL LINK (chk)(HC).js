/**
 * SOURCE: URL: https://youtu.be/IsqHufZkgmA | Channel: Bet With Mo
 * STRATEGY: "ROYAL LINK" - HUGE 30# COVERAGE (Modified: Trend-Following & Non-Overlapping)
 *
 * THE FULL LOGIC:
 * - This system waits for 37 spins to determine market trends. 
 * - It evaluates the last 37 spins to find the "Trending Column" (highest hits).
 * - It then finds the 9 hottest "Vertical Splits" (e.g., 1|4, 2|5) explicitly EXCLUDING any splits that reside within the Trending Column to ensure maximum board coverage without overlap.
 * - A "win" occurs if any covered number is hit. A "loss" occurs on 0 or the missing numbers.
 * - After a cycle resets, it recalculates the trends from the last 37 spins for the next placements.
 * 
 * THE FULL BET PROGRESSION:
 * - Step 1: Top 3 hottest non-overlapping splits (1u), Trending Column (2u)
 * - Step 2: Top 6 hottest non-overlapping splits (1u), Trending Column (4u)
 * - Step 3: Top 9 hottest non-overlapping splits (2u), Trending Column (12u)
 * - Step 4: Top 9 hottest non-overlapping splits (3u), Trending Column (16u)
 * - Step 5: Top 9 hottest non-overlapping splits (5u), Trending Column (25u)
 * - Step 6: Top 9 hottest non-overlapping splits (10u), Trending Column (50u)
 * - Step 7: Top 9 hottest non-overlapping splits (20u), Trending Column (100u)
 * - On a LOSS: Move to the next step. If the final step is lost, reset to Step 1 (stop-loss) and re-evaluate trends.
 * - On a WIN: If session high is reached, RESET to Step 1 and re-evaluate trends. If still in drawdown, STAY on current step and keep current trends.
 * 
 * THE GOAL:
 * - High-win-rate profit farming with dynamic trend targeting, scaling aggressively on losses, and ensuring no wasted overlapping bets.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.step === undefined) state.step = 0;
    if (state.highWaterMark === undefined) state.highWaterMark = bankroll;
    if (state.needsTrendUpdate === undefined) state.needsTrendUpdate = true;

    // We must wait for 37 spins before any betting to determine initial trends
    if (spinHistory.length < 37) {
        return []; // No bets placed, wait for more data
    }

    const progression = [
        { splits: 3, splitUnits: 1, colUnits: 2 },   // Step 1
        { splits: 6, splitUnits: 1, colUnits: 4 },   // Step 2
        { splits: 9, splitUnits: 2, colUnits: 12 },  // Step 3
        { splits: 9, splitUnits: 3, colUnits: 16 },  // Step 4
        { splits: 9, splitUnits: 5, colUnits: 25 },  // Step 5
        { splits: 9, splitUnits: 10, colUnits: 50 }, // Step 6
        { splits: 9, splitUnits: 20, colUnits: 100 } // Step 7
    ];

    // 2. Process the previous spin result (if we actively bet last time)
    if (state.lastStep !== undefined && !state.needsTrendUpdate) {
        let lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        let pastProgression = progression[state.lastStep];
        let wonLastSpin = false;

        // Check if trending column hit
        let colMod = state.activeColumn === 3 ? 0 : state.activeColumn;
        if (lastSpin !== 0 && lastSpin % 3 === colMod) {
            wonLastSpin = true;
        }

        // Check if an active split hit
        for (let i = 0; i < pastProgression.splits; i++) {
            if (state.activeSplits[i].includes(lastSpin)) {
                wonLastSpin = true;
                break;
            }
        }

        if (wonLastSpin) {
            if (bankroll >= state.highWaterMark) {
                // Recovered drawdown or reached new high, flag for trend reset
                state.needsTrendUpdate = true;
            }
            // Else: We are still in a drawdown. Stay on current step and keep current trends.
        } else {
            // Loss occurred, move to next step
            state.step++;
            if (state.step >= progression.length) {
                // Stop-loss reached, flag for trend reset
                state.needsTrendUpdate = true;
            }
        }
    }

    // 3. Update Trends if required (Initial or after a Reset)
    if (state.needsTrendUpdate) {
        const recentSpins = spinHistory.slice(-37).map(s => s.winningNumber);

        // Analyze Trending Column
        let colCounts = { 1: 0, 2: 0, 3: 0 };
        recentSpins.forEach(num => {
            if (num !== 0) {
                let col = num % 3 === 0 ? 3 : num % 3;
                colCounts[col]++;
            }
        });
        
        // Find column with highest hits
        state.activeColumn = parseInt(
            Object.keys(colCounts).reduce((a, b) => colCounts[a] > colCounts[b] ? a : b)
        );

        // Analyze Trending Vertical Splits EXCLUDING the active column
        let validVertSplits = [];
        for (let i = 1; i <= 33; i++) {
            let splitCol = i % 3 === 0 ? 3 : i % 3;
            // Only add the vertical split if it does NOT belong to the active column
            if (splitCol !== state.activeColumn) {
                validVertSplits.push([i, i + 3]);
            }
        }

        let splitCounts = validVertSplits.map(split => {
            let hits = recentSpins.filter(num => split.includes(num)).length;
            return { split, hits };
        });

        // Sort descending by hits, extract top 9 hottest non-overlapping splits
        splitCounts.sort((a, b) => b.hits - a.hits);
        state.activeSplits = splitCounts.slice(0, 9).map(item => item.split);

        // Reset tracking vars for the new sequence
        state.step = 0;
        state.highWaterMark = bankroll;
        state.needsTrendUpdate = false;
    }

    // Save state for the next spin's evaluation
    state.lastStep = state.step;

    // 4. Determine Base Unit and Amounts
    let baseMultiplier = (config.incrementMode === 'fixed' && config.minIncrementalBet) ? config.minIncrementalBet : config.betLimits.min;
    let currentStep = progression[state.step];

    let splitAmount = currentStep.splitUnits * baseMultiplier;
    let colAmount = currentStep.colUnits * baseMultiplier;

    // 5. Clamp Amounts to Valid Limits
    splitAmount = Math.max(splitAmount, config.betLimits.min);
    colAmount = Math.max(colAmount, config.betLimits.minOutside);

    splitAmount = Math.min(splitAmount, config.betLimits.max);
    colAmount = Math.min(colAmount, config.betLimits.max);

    // 6. Build and Return Bets Array
    let bets = [];

    // Add targeted Vertical Split Bets based on current step volume
    for (let i = 0; i < currentStep.splits; i++) {
        bets.push({
            type: 'split',
            value: state.activeSplits[i],
            amount: splitAmount
        });
    }

    // Add Trending Column Bet
    bets.push({
        type: 'column',
        value: state.activeColumn,
        amount: colAmount
    });

    return bets;
}