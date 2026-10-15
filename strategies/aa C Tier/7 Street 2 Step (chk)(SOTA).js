/**
 * Strategy: Dynamic 7 Street 2 Step (SOTA Predictive Variant)
 * Source: Stacking Chips (https://youtu.be/32QI4VDIfXo)
 * Channel: Stacking Chips
 * * * The Full Logic in Details:
 * - This strategy is an enhanced adaptation of the "7 Street 2 Step" system. 
 * - Instead of playing flat or arbitrary street positions, it relies on a data collection phase.
 * - The function collects spin history data without betting until a tracking threshold is met (minimum 20 spins).
 * - Once data criteria are satisfied, all 12 roulette street layouts are fed into the SOTA Dynamic Pattern Optimizer.
 * - This optimizer computes a first-order Markov Chain transition matrix alongside an EMA momentum calculation to dynamically calculate, score, and rank the hottest positions.
 * - The strategy then dynamically targets and places bets on the top 7 highest-ranked (hottest) street locations, covering 21 numbers in total.
 * * * The Full Bet Progression in Details:
 * - Progression begins at Level 1 with 1 base unit placed on each of the 7 highest-ranked streets (Total: 7 units).
 * - MODIFIED Reset Condition: The progression level and the selected hot streets will ONLY reset when the current bankroll meets or exceeds the highest recorded peak profit achieved during this session.
 * - Loss Condition: If a spin misses all covered streets, the level steps up by adding 2 units to EACH street bet.
 * - Level 1: 1 unit per street (Total: 7 units)
 * - Level 2: 3 units per street (Total: 21 units)
 * - Level 3: 5 units per street (Total: 35 units)
 * - Level 4: 7 units per street (Total: 49 units)
 * - ... and so on, incrementing by 2 units per position for every loss level.
 * * * The Goal:
 * - Achieve a compounding target profit of approximately 50% over the initial session bankroll (e.g., locking profits when up $50 on a $100 baseline).
 * - Stop-loss activates automatically when remaining capital can no longer sustain the full required progression tier.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const MIN_SPINS_NEEDED = 20;
    const baseUnit = config.betLimits.min;

    // 1. Initialize State Persistence Engine
    if (!state.currentLevel) state.currentLevel = 1;
    if (!state.initialBankroll) state.initialBankroll = bankroll;
    if (!state.peakBankroll) state.peakBankroll = bankroll;
    if (!state.activeStreets) state.activeStreets = [];

    // Update session peak bankroll if current bankroll surpasses it
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Map all 12 Standard Roulette Streets for Predictive Scoring
    const targetLayouts = [
        { id: 1, value: 1, numbers: [1, 2, 3] },
        { id: 2, value: 4, numbers: [4, 5, 6] },
        { id: 3, value: 7, numbers: [7, 8, 9] },
        { id: 4, value: 10, numbers: [10, 11, 12] },
        { id: 5, value: 13, numbers: [13, 14, 15] },
        { id: 6, value: 16, numbers: [16, 17, 18] },
        { id: 7, value: 19, numbers: [19, 20, 21] },
        { id: 8, value: 22, numbers: [22, 23, 24] },
        { id: 9, value: 25, numbers: [25, 26, 27] },
        { id: 10, value: 28, numbers: [28, 29, 30] },
        { id: 11, value: 31, numbers: [31, 32, 33] },
        { id: 12, value: 34, numbers: [34, 35, 36] }
    ];

    // 3. Evaluate Data Sufficiency Threshold Window
    if (!spinHistory || spinHistory.length < MIN_SPINS_NEEDED) {
        return []; // Passive tracking phase: Collect historical variance safely
    }

    // 4. Target Profit Rule Matcher
    const targetProfit = state.initialBankroll * 0.50;
    if ((bankroll - state.initialBankroll) >= targetProfit) {
        return []; // Lock-in earnings: Cash out session securely
    }

    // 5. Track Past Outcomes & Calculate Progression Level Steps
    if (state.activeStreets.length > 0) {
        // If current bankroll reaches or breaks past the peak session bankroll, reset progression
        if (bankroll >= state.peakBankroll) {
            state.currentLevel = 1;   // Reset back to sequence baseline floor
            state.activeStreets = [];  // Invalidate array optimization layer to recalculate fresh data sets
        } else {
            const lastResult = spinHistory[spinHistory.length - 1];
            const lastNumber = lastResult.winningNumber;
            let wonLastSpin = false;

            // Determine if the previous spin hit an allocated hot sector
            for (let i = 0; i < state.activeStreets.length; i++) {
                const streetVal = state.activeStreets[i];
                if (lastNumber >= streetVal && lastNumber <= streetVal + 2) {
                    wonLastSpin = true;
                    break;
                }
            }

            // Progression only advances to next level if we missed entirely
            if (!wonLastSpin) {
                state.currentLevel += 1; // Advance progression tier scaling (+2 units per street position)
            }
        }
    }

    // 6. Execute SOTA Predictive Model Execution Layer
    // Recalculate or choose new optimized paths if baseline peak reset occurred
    if (state.activeStreets.length === 0) {
        const sortedSectors = predictHottestSectors(spinHistory, targetLayouts, MIN_SPINS_NEEDED, 0.6, 0.4);
        if (sortedSectors && sortedSectors.length >= 7) {
            // Isolate the top 7 highest ranking probabilistic street nodes
            state.activeStreets = sortedSectors.slice(0, 7).map(sector => sector.value);
        } else {
            // Fallback safety if model execution errors out
            state.activeStreets = [1, 4, 16, 19, 22, 25, 28];
        }
    }

    // 7. Compute Mathematical Unit Injections
    const unitsPerStreet = 1 + (state.currentLevel - 1) * 2; // Level 1 = 1, Level 2 = 3, Level 3 = 5...
    let finalBetAmount = baseUnit * unitsPerStreet;

    // Clamp values inside active engine boundaries
    finalBetAmount = Math.max(finalBetAmount, config.betLimits.min);
    finalBetAmount = Math.min(finalBetAmount, config.betLimits.max);

    // 8. Capital Asset Risk Evaluation check
    const totalRequiredBet = finalBetAmount * 7;
    if (bankroll < totalRequiredBet) {
        return []; // Break sequence execution if balance drops below threshold requirements
    }

    // 9. Build and Return Optimized Bet Profiles Array
    return state.activeStreets.map(streetValue => {
        return {
            type: 'street',
            value: streetValue,
            amount: finalBetAmount
        };
    });
}

/**
 * Dynamic Pattern Optimizer (SOTA Predictive Model)
 * Computes a first-order Markov Chain transition matrix alongside an
 * Exponential Moving Average (EMA) momentum calculation to score and rank positions.
 */
function predictHottestSectors(spinHistory, targetLayouts, minSpinsNeeded = 20, weightMarkov = 0.6, weightEMA = 0.4) {
    if (!spinHistory || spinHistory.length < minSpinsNeeded) {
        return null;
    }

    const numSectors = targetLayouts.length;

    const getSectorIndex = (num) => {
        return targetLayouts.findIndex(sector => sector.numbers.includes(num));
    };

    const transitionMatrix = Array(numSectors).fill(0).map(() => Array(numSectors).fill(0));
    const recentEmaWeights = Array(numSectors).fill(0);
    const alpha = 2 / (minSpinsNeeded + 1);

    let previousSectorIdx = -1;

    for (let i = 0; i < spinHistory.length; i++) {
        const currentSectorIdx = getSectorIndex(spinHistory[i].winningNumber);
        if (currentSectorIdx === -1) continue;

        if (previousSectorIdx !== -1) {
            transitionMatrix[previousSectorIdx][currentSectorIdx] += 1;
        }

        for (let s = 0; s < numSectors; s++) {
            const hitFlag = (s === currentSectorIdx) ? 1 : 0;
            recentEmaWeights[s] = (hitFlag * alpha) + (recentEmaWeights[s] * (1 - alpha));
        }

        previousSectorIdx = currentSectorIdx;
    }

    const lastWinningNum = spinHistory[spinHistory.length - 1].winningNumber;
    const activeOriginIndex = getSectorIndex(lastWinningNum);
    const resolvedOriginIdx = activeOriginIndex !== -1 ? activeOriginIndex : previousSectorIdx;

    const scoredSectors = targetLayouts.map((sector, targetIdx) => {
        let transitionProbability = 0;
        
        if (resolvedOriginIdx !== -1) {
            const totalTransitionsFromOrigin = transitionMatrix[resolvedOriginIdx].reduce((sum, val) => sum + val, 0);
            if (totalTransitionsFromOrigin > 0) {
                transitionProbability = transitionMatrix[resolvedOriginIdx][targetIdx] / totalTransitionsFromOrigin;
            }
        }

        const predictionScore = (transitionProbability * weightMarkov) + (recentEmaWeights[targetIdx] * weightEMA);

        return {
            ...sector,
            score: predictionScore
        };
    });

    return scoredSectors.sort((a, b) => b.score - a.score);
}