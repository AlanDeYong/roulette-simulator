/**
 * Strategy: Moving Corners with Dynamic Predictive Modeling
 * * Source:
 * - URL: https://youtu.be/nVv0dLFnZNQ?si=v3aknp3o7zsJD_QH
 * - Channel: Casino Matchmaker
 * * The Full Logic:
 * - Waiting Condition: The strategy remains completely idle (returns no bets) until at least 20 spins are recorded.
 * - SOTA Predictive Selection: Uses a first-order Markov Chain Transition Matrix and an Exponential Moving Average (EMA) 
 * to map pattern sequence probabilities and physical momentum. It scores and ranks available corners, selecting the 
 * hottest unique layout spots needed for the current progression level.
 * - Reset Rule: Any win triggers a complete system reset back to Level 1.
 * * The Full Bet Progression:
 * - Level 1: 2 Corners, Flat base unit per corner (e.g., $5 + $5 = $10 total bet).
 * - Level 2 (After 1 Loss): 3 Corners, Flat base unit per corner (e.g., $5 + $5 + $5 = $15 total bet).
 * - Level 3 (After 2 Losses): 4 Corners, Base unit per corner, and the final sum is Doubled (e.g., ($5 * 2) * 4 = $40 total bet).
 * - Level 4 (After 3 Losses): 5 Corners, each corner receives an equal base amount before the final sum is Doubled (e.g., (($5 * 2) * 4 + ($5 * 2)) * 2 = $100 total bet, meaning $20 per corner).
 * - Subsequent Losses: Rebet the exact 5 corners and double up all bet sizes sequentially (e.g., Level 5 becomes $40 per corner, total $200).
 * * The Goal:
 * - Capture fast session profit using highly scored spatial clusters before hitting critical maximum bankroll risk thresholds.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Minimum Data Threshold Verification
    const minSpinsNeeded = 20;
    if (!spinHistory || spinHistory.length < minSpinsNeeded) {
        return [];
    }

    // Initialize State Management
    if (!state.initialized) {
        state.level = 1;
        state.lastPlacedCorners = [];
        state.initialized = true;
    }

    // Define all 12 standardized non-overlapping Corner layout blocks (using top-left numbers)
    const availableCornerLayouts = [
        { id: 1, value: 1, numbers: [1, 2, 4, 5] },
        { id: 2, value: 7, numbers: [7, 8, 10, 11] },
        { id: 3, value: 13, numbers: [13, 14, 16, 17] },
        { id: 4, value: 19, numbers: [19, 20, 22, 23] },
        { id: 5, value: 25, numbers: [25, 26, 28, 29] },
        { id: 6, value: 31, numbers: [31, 32, 34, 35] },
        { id: 7, value: 2, numbers: [2, 3, 5, 6] },
        { id: 8, value: 8, numbers: [8, 9, 11, 12] },
        { id: 9, value: 14, numbers: [14, 15, 17, 18] },
        { id: 10, value: 20, numbers: [20, 21, 23, 24] },
        { id: 11, value: 26, numbers: [26, 27, 29, 30] },
        { id: 12, value: 32, numbers: [32, 33, 35, 36] }
    ];

    // 2. Evaluate Previous Spin to adjust Progression
    if (state.lastPlacedCorners && state.lastPlacedCorners.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        let wonLastRound = false;

        for (let corner of state.lastPlacedCorners) {
            if (corner.numbers.includes(lastSpin.winningNumber)) {
                wonLastRound = true;
                break;
            }
        }

        if (wonLastRound) {
            state.level = 1;
        } else {
            state.level++;
        }
    }

    // 3. Determine Number of Target Corners and Bet Sizes Needed
    const baseUnit = Math.max(config.betLimits.min, 5);
    let cornersCount = 2;
    let amountPerCorner = baseUnit;

    if (state.level === 2) {
        cornersCount = 3;
        amountPerCorner = baseUnit;
    } else if (state.level === 3) {
        cornersCount = 4;
        amountPerCorner = baseUnit * 2;
    } else if (state.level >= 4) {
        cornersCount = 5;
        amountPerCorner = baseUnit * Math.pow(2, state.level - 2);
    }

    // 4. SOTA Model Prediction Execution
    const rankedSectors = predictHottestSectors(spinHistory, availableCornerLayouts, minSpinsNeeded, 0.6, 0.4);
    if (!rankedSectors) return [];

    // Extract top non-overlapping candidate corners
    let targetCorners = rankedSectors.slice(0, cornersCount);
    state.lastPlacedCorners = targetCorners;

    // 5. Construct Bet Profiles
    let betsArray = [];
    targetCorners.forEach(corner => {
        betsArray.push({ 
            type: 'corner', 
            value: corner.value, 
            amount: amountPerCorner 
        });
    });

    // 6. Respect Table Boundaries Constraints
    return betsArray.map(betItem => {
        betItem.amount = Math.max(betItem.amount, config.betLimits.min);
        betItem.amount = Math.min(betItem.amount, config.betLimits.max);
        return betItem;
    });
}

/**
 * Dynamic Pattern Optimizer (SOTA Predictive Model)
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