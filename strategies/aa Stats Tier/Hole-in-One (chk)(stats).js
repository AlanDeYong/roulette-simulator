/**
 * Roulette Strategy: "Hole-in-One" Roulette System (Peak Profit Progression Reset)
 * * Source:
 * - Video URL: https://youtu.be/L0mmy5i5tDs
 * - Channel Name: The Roulette Master
 * * The Full Logic in details:
 * - The strategy monitors the past 37 spins of history to dynamically calculate the single "hottest" 
 * (most frequently hit) number. This hot number receives a 1-unit inside Straight Up bet.
 * - Concurrently, the 2 hottest columns over those same 37 spins are determined. Each of these 
 * 2 columns receives an outside bet equal to 5 units.
 * - No bets are placed until a valid 37-spin history is populated.
 * - Progression Locking Rules:
 * - On a win (Straight Up, Split, or Column), the progression does **NOT** reset automatically unless 
 * the current bankroll has reached or exceeded its **highest recorded session peak profit**. 
 * - If a win occurs but the bankroll is still in a recovery phase (below peak profit), the strategy 
 * holds its current progression level and active splits, continuing to collect chips at the heightened tier.
 * - On a loss:
 * 1. A new, non-overlapping split bet is introduced. This split must reside entirely within the 2 
 * currently targeted columns, and its base bet unit matches the straight number's base unit.
 * 2. Up to a maximum of 4 splits can be progressively added.
 * 3. All active bets (Straight up, columns, and all currently deployed splits) are increased by their 
 * respective base bet amounts (1 unit for inside positions, 5 units for columns).
 * - On further losses beyond 4 splits: No new splits are added, but all existing bets continue to scale 
 * additively by their respective base amounts.
 * - On a true reset (Win achieved AT or ABOVE session peak profit): The progression level resets, and the system 
 * dynamically recalibrates using the immediate past 37 spins to determine the next hot tracking profile.
 * * The Full Bet Progression in details:
 * - Inside Base Bet: config.betLimits.min (1 Unit)
 * - Outside Base Bet: 5 units (clamped to at least config.betLimits.minOutside)
 * - Loss Progression: Increase all active positions by their base amount + add a new qualifying split.
 * - Win Progression (Below Peak): Maintain current bet sizing tier and composition.
 * - Win Progression (At/Above Peak): Reset state variables, update peak baseline, and recalculate tracking data.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Setup default structural parameters and constants
    const baseInside = config.betLimits ? config.betLimits.min : 1;
    const baseOutsideLimit = config.betLimits ? config.betLimits.minOutside : 5;
    const maxLimit = config.betLimits ? config.betLimits.max : 500;

    // Minimum history required to calculate hot tracking profiles
    const historyWindow = 37;
    if (!spinHistory || spinHistory.length < historyWindow) {
        return []; 
    }

    // 2. Initialize persistent internal state
    if (!state.initialized) {
        state.level = 0;              // Tracking layer for multiplier increments
        state.activeSplits = [];      // Array of arrays containing active [n1, n2] splits
        state.targetNumber = null;    // Active Straight Up number
        state.targetColumns = [];     // Array tracking the 2 hot columns
        state.peakBankroll = bankroll;// Keep track of the session's peak bankroll performance
        state.initialized = true;
        state.recalculateTracking = true; 
    }

    // Update peak bankroll if the current bankroll surpasses previous tracking records
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 3. Process outcomes from the most recent spin execution
    if (state.targetNumber !== null && !state.recalculateTracking) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastNum = lastResult.winningNumber;

        // Verify if any active bet won
        let straightWin = (lastNum === state.targetNumber);
        let columnWin = state.targetColumns.some(col => {
            if (lastNum === 0 || lastNum === 37) return false;
            const c = lastNum % 3 === 0 ? 3 : lastNum % 3;
            return c === col;
        });
        let splitWin = state.activeSplits.some(pair => lastNum === pair[0] || lastNum === pair[1]);

        if (straightWin || columnWin || splitWin) {
            // ONLY reset if we have completely recovered and are at or above session's peak bankroll profit
            if (bankroll >= state.peakBankroll) {
                state.level = 0;
                state.activeSplits = [];
                state.recalculateTracking = true;
            } else {
                // Win encountered below peak profit: Maintain current betting level and splits to accelerate recovery.
                // Do not increment level, do not add splits, do not reset.
            }
        } else {
            // Progress on loss
            state.level += 1;

            // Attempt to add a new split if maximum threshold (4) hasn't been hit
            if (state.activeSplits.length < 4) {
                const newSplit = findValidSplit(state.targetColumns, state.targetNumber, state.activeSplits);
                if (newSplit) {
                    state.activeSplits.push(newSplit);
                }
            }
        }
    }

    // 4. Recalculate tracking profiles using the historical window frame if flagged
    if (state.recalculateTracking) {
        const lookbackHistory = spinHistory.slice(-historyWindow);
        
        // Count frequencies for numbers (0-36) and columns (1-3)
        const numberCounts = {};
        const columnCounts = { 1: 0, 2: 0, 3: 0 };
        for (let i = 0; i <= 36; i++) numberCounts[i] = 0;

        lookbackHistory.forEach(spin => {
            const num = spin.winningNumber;
            if (num >= 0 && num <= 36) {
                numberCounts[num]++;
                if (num >= 1 && num <= 36) {
                    const col = num % 3 === 0 ? 3 : num % 3;
                    columnCounts[col]++;
                }
            }
        });

        // Determine hottest single inside number
        let hottestNum = 0;
        let maxNumCount = -1;
        for (let i = 0; i <= 36; i++) {
            if (numberCounts[i] > maxNumCount) {
                maxNumCount = numberCounts[i];
                hottestNum = i;
            }
        }
        state.targetNumber = hottestNum;

        // Sort columns to isolate the top two performers
        const sortedColumns = [1, 2, 3].sort((a, b) => columnCounts[b] - columnCounts[a]);
        state.targetColumns = [sortedColumns[0], sortedColumns[1]];
        
        state.recalculateTracking = false;
    }

    // 5. Construct structural output schema objects matching limits
    const bets = [];
    const multiplier = state.level + 1;

    // Inside Straight Up selection (1 unit base)
    let straightAmount = Math.min(baseInside * multiplier, maxLimit);
    bets.push({ type: 'number', value: state.targetNumber, amount: straightAmount });

    // Inside Splits array processing (1 unit base)
    state.activeSplits.forEach(pair => {
        let splitAmount = Math.min(baseInside * multiplier, maxLimit);
        bets.push({ type: 'split', value: pair, amount: splitAmount });
    });

    // Outside Columns selection (5 units base)
    const baseColumnUnit = Math.max(5 * baseInside, baseOutsideLimit);
    let columnAmount = Math.min(baseColumnUnit * multiplier, maxLimit);
    state.targetColumns.forEach(col => {
        bets.push({ type: 'column', value: col, amount: columnAmount });
    });

    return bets;

    // Helper utility to identify non-overlapping valid board configurations
    function findValidSplit(allowedCols, hotNum, existingSplits) {
        const takenNumbers = [hotNum];
        existingSplits.forEach(pair => {
            takenNumbers.push(pair[0], pair[1]);
        });

        // Try horizontal splits first
        for (let num = 1; num <= 35; num++) {
            if (num % 3 !== 0) {
                const n1 = num;
                const n2 = num + 1;
                const col1 = n1 % 3 === 0 ? 3 : n1 % 3;
                const col2 = n2 % 3 === 0 ? 3 : n2 % 3;
                if (allowedCols.includes(col1) && allowedCols.includes(col2)) {
                    if (!takenNumbers.includes(n1) && !takenNumbers.includes(n2)) {
                        return [n1, n2];
                    }
                }
            }
        }

        // Try vertical splits if no horizontal non-overlapping split is found
        for (let num = 1; num <= 33; num++) {
            const n1 = num;
            const n2 = num + 3;
            const col1 = n1 % 3 === 0 ? 3 : n1 % 3;
            const col2 = n2 % 3 === 0 ? 3 : n2 % 3;
            if (allowedCols.includes(col1) && allowedCols.includes(col2)) {
                if (!takenNumbers.includes(n1) && !takenNumbers.includes(n2)) {
                    return [n1, n2];
                }
            }
        }
        return null; 
    }
}