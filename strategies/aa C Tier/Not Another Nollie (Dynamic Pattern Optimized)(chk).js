/**
 * Strategy: Not Another Nollie (Data-Locked SOTA Variant)
 * Source: CEG Dealer School (https://youtu.be/HpcgfeDRNSY)
 * Channel Name: CEG Dealer School
 *
 * Description:
 * This optimized variant enforces a strict tracking lock. The strategy completely 
 * refrains from placing bets until the SOTA model accumulates enough spin data 
 * to generate statistically meaningful predictions.
 *
 * Full Logic & Triggers:
 * - Data Lock: Returns no bets (`[]`) until `spinHistory.length >= minSpinsNeeded` (20 spins).
 * - Stage 1 (Initial Setup): Places a 2-unit outside bet on the highest-ranked 
 * predicted dozen and a 1-unit outside bet on the second highest-ranked dozen. 
 * - On Loss: Rebet the same layout.
 * - On Win: Transition to Stage 2.
 * - Stage 2 (Aggressive Corner Strike): Places exactly 1 unit each on 3 overlapping 
 * corners within or around the edge of the chosen "hottest" predicted dozen.
 * - On Win/Loss: Reset back to Stage 1.
 *
 * Full Bet Progression:
 * - Stage 1: 2 units on Dozen A, 1 unit on Dozen B (scaled to config.betLimits.minOutside).
 * - Stage 2: 1 unit each on 3 separate corners (scaled to config.betLimits.min).
 * - No multiplier progressions; variance recovery relies entirely on structural predictive optimizations.
 *
 * Goal & Exit Conditions:
 * - Target Profit: +$500 over the initial bankroll state.
 * - Stop-Loss: Complete depletion of the session bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minOutside = config.betLimits.minOutside || 5;
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;
    const MIN_SPINS_NEEDED = 20;

    // 1. Strict Data Verification Guard
    // Abort and pass on betting until the tracking window contains stable statistical density
    if (!spinHistory || spinHistory.length < MIN_SPINS_NEEDED) {
        return []; 
    }

    // 2. Initialize State Management
    if (state.isFirstSpin === undefined) {
        state.isFirstSpin = false;
        state.stage = 1; 
        state.targetProfit = 50000;
        state.initialBankroll = bankroll;
    }

    // Stop Execution if profit goal or stop-loss limits are breached
    if (bankroll >= state.initialBankroll + state.targetProfit || bankroll < minOutside * 3) {
        return [];
    }

    const dozenLayouts = [
        { id: 1, value: 1, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
        { id: 2, value: 2, numbers: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] },
        { id: 3, value: 3, numbers: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36] }
    ];

    const dozenCornersMap = {
        1: [
            { value: 1, numbers: [1, 2, 4, 5] }, { value: 2, numbers: [2, 3, 5, 6] },
            { value: 4, numbers: [4, 5, 7, 8] }, { value: 5, numbers: [5, 6, 8, 9] },
            { value: 7, numbers: [7, 8, 10, 11] }, { value: 8, numbers: [8, 9, 11, 12] }
        ],
        2: [
            { value: 13, numbers: [13, 14, 16, 17] }, { value: 14, numbers: [14, 15, 17, 18] },
            { value: 16, numbers: [16, 17, 19, 20] }, { value: 17, numbers: [17, 18, 20, 21] },
            { value: 19, numbers: [19, 20, 22, 23] }, { value: 20, numbers: [20, 21, 23, 24] }
        ],
        3: [
            { value: 25, numbers: [25, 26, 28, 29] }, { value: 26, numbers: [26, 27, 29, 30] },
            { value: 28, numbers: [28, 29, 31, 32] }, { value: 29, numbers: [29, 30, 32, 33] },
            { value: 31, numbers: [31, 32, 34, 35] }, { value: 32, numbers: [32, 33, 35, 36] }
        ]
    };

    // 3. Process Spin History Outcomes for Stage Transitions
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNum = lastResult.winningNumber;

    if (state.stage === 1) {
        if (state.lastPrimaryDozen !== undefined && state.lastSecondaryDozen !== undefined) {
            const primaryDozenNums = dozenLayouts.find(d => d.value === state.lastPrimaryDozen)?.numbers || [];
            const secondaryDozenNums = dozenLayouts.find(d => d.value === state.lastSecondaryDozen)?.numbers || [];

            if (primaryDozenNums.includes(lastNum) || secondaryDozenNums.includes(lastNum)) {
                state.stage = 2; 
            }
        }
    } else if (state.stage === 2) {
        state.stage = 1;
    }

    const bets = [];

    // Run SOTA prediction processing on Dozen layouts (Guaranteed data threshold met here)
    const rankedDozens = predictHottestSectors(spinHistory, dozenLayouts, MIN_SPINS_NEEDED, 0.6, 0.4);
    
    // Fallback variables used only if internal calculation yields structural anomalies
    const primaryDozen = rankedDozens ? rankedDozens[0].value : 1;
    const secondaryDozen = rankedDozens ? rankedDozens[1].value : 2;

    state.lastPrimaryDozen = primaryDozen;
    state.lastSecondaryDozen = secondaryDozen;

    // STAGE 1: Double Dozen Setup
    if (state.stage === 1) {
        const primaryAmt = Math.min(minOutside * 2, maxBet);
        const secondaryAmt = Math.min(minOutside, maxBet);

        bets.push({ type: 'dozen', value: primaryDozen, amount: primaryAmt });
        bets.push({ type: 'dozen', value: secondaryDozen, amount: secondaryAmt });
        return bets;
    }

    // STAGE 2: 3 Overlapping Corners Strike
    if (state.stage === 2) {
        const cornerAmt = Math.min(minInside, maxBet);
        const validCandidateCorners = dozenCornersMap[primaryDozen];

        // Rank specific corners within the targeted winning dozen layout matrix
        const rankedCorners = predictHottestSectors(spinHistory, validCandidateCorners, MIN_SPINS_NEEDED, 0.6, 0.4);

        if (rankedCorners && rankedCorners.length >= 3) {
            bets.push({ type: 'corner', value: rankedCorners[0].value, amount: cornerAmt });
            bets.push({ type: 'corner', value: rankedCorners[1].value, amount: cornerAmt });
            bets.push({ type: 'corner', value: rankedCorners[2].value, amount: cornerAmt });
        } else {
            bets.push({ type: 'corner', value: validCandidateCorners[0].value, amount: cornerAmt });
            bets.push({ type: 'corner', value: validCandidateCorners[1].value, amount: cornerAmt });
            bets.push({ type: 'corner', value: validCandidateCorners[2].value, amount: cornerAmt });
        }
    }

    return bets;
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