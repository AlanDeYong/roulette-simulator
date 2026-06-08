/**
 * @fileoverview Roulette Strategy: Dynamic Predictive Dozen Strategy
 * * @description
 * 1. Source: Generic YouTube/Community Roulette Strategy integrated with a SOTA Dynamic Pattern Optimizer.
 * * 2. The Full Logic in Details:
 * - Before making any bets, the strategy waits for a data collection phase defined by `minSpinsNeeded` (default 20).
 * - During this phase, it passes the spin history into a predictive SOTA model (`predictHottestSectors`) that uses a 
 * first-order Markov Chain transition matrix and an Exponential Moving Average (EMA) momentum tracker to calculate a 
 * predictive score for each of the three roulette dozens.
 * - If the minimum spin threshold is not met, the function skips betting (`return []`).
 * - Once data is sufficient, it extracts the highest-scoring dozen dynamically on every single spin. The strategy 
 * then anchors its layout map (dozen, double streets, and subsequent corners) specifically around that dynamically selected hottest dozen.
 * - A win/loss cycle is tracked locally per dozen state to step through the progression levels when the targeted hot zone fails or hits.
 * * 3. The Full Bet Progression in Details:
 * - Initial Bet (Level 0):
 * - 3 units on the dynamically calculated Hottest Dozen (Outside bet, pays 2:1).
 * - 1 unit on the Lower Double Street mapping of that dozen.
 * - 1 unit on the Upper Double Street mapping of that dozen.
 * - First Loss (Level 1):
 * - Rebet the Initial Bet components.
 * - Add 1 unit each to the 4 internal Corners corresponding to the selected dozen.
 * - Subsequent Losses (Level > 1):
 * - Rebet the Initial Bet components.
 * - Increase each of the 4 corner positions by 1 unit per level loss (respecting config.incrementMode).
 * - Win:
 * - Reset the progression level back to 0.
 * * 4. The Goal:
 * - Leverage predictive asset velocity modeling to place high-probability coverage configurations over the hot sector, 
 * scaling up inside table coverage via nested progression mechanics during local variance shifts.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // ==========================================
    // 1. STATE INITIALIZATION & SETUP
    // ==========================================
    if (state.currentLevel === undefined) {
        state.currentLevel = 0;
        state.lastBankroll = bankroll;
    }

    // Define the structural layouts for the 3 Dozens required by the SOTA model
    const dozenLayouts = [
        { id: 1, value: 1, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
        { id: 2, value: 2, numbers: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] },
        { id: 3, value: 3, numbers: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36] }
    ];

    const minSpinsNeeded = 37;

    // ==========================================
    // 2. SOTA DATA VERIFICATION & SELECTION
    // ==========================================
    // Run prediction tracking matrix
    const rankedSectors = predictHottestSectors(spinHistory, dozenLayouts, minSpinsNeeded, 0.6, 0.4);

    // Skip betting if data acquisition threshold has not been reached
    if (!rankedSectors || rankedSectors.length === 0) {
        state.lastBankroll = bankroll; 
        return [];
    }

    // Select the current optimized best target dozen
    const targetDozen = rankedSectors[0].value;

    // ==========================================
    // 3. TRACK PROGRESSION LEVEL VIA BANKROLL
    // ==========================================
    if (spinHistory.length > 0) {
        if (bankroll > state.lastBankroll) {
            state.currentLevel = 0; // Reset progression on win
        } else if (bankroll < state.lastBankroll) {
            state.currentLevel++;  // Advance level on loss
        }
    }
    state.lastBankroll = bankroll;

    // ==========================================
    // 4. MAP THE GEOMETRIC POSITIONS FOR CHOSEN DOZEN
    // ==========================================
    let line1Val, line2Val, cornerVals;

    if (targetDozen === 1) {
        line1Val = 1;   // Covers 1-6
        line2Val = 7;   // Covers 7-12
        cornerVals = [1, 2, 7, 8]; // Corners: 1/5, 2/6, 7/11, 8/12
    } else if (targetDozen === 2) {
        line1Val = 13;  // Covers 13-18
        line2Val = 19;  // Covers 19-24
        cornerVals = [13, 14, 19, 20]; // Corners: 13/17, 14/18, 19/23, 20/24
    } else {
        line1Val = 25;  // Covers 25-30
        line2Val = 31;  // Covers 31-36
        cornerVals = [25, 26, 31, 32]; // Corners: 25/29, 26/30, 31/35, 32/36
    }

    // ==========================================
    // 5. CONSTRUCT BETS WITH MIN/MAX CLAMPING
    // ==========================================
    const insideMin = config.betLimits.min;
    const outsideMin = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    const bets = [];

    // Base Dozen Position Bet
    let dozenAmount = outsideMin * 3;
    dozenAmount = Math.max(dozenAmount, outsideMin);
    dozenAmount = Math.min(dozenAmount, maxBet);
    bets.push({ type: 'dozen', value: targetDozen, amount: dozenAmount });

    // Double Street Position 1
    let line1Amount = Math.max(insideMin, insideMin);
    line1Amount = Math.min(line1Amount, maxBet);
    bets.push({ type: 'line', value: line1Val, amount: line1Amount });

    // Double Street Position 2
    let line2Amount = Math.max(insideMin, insideMin);
    line2Amount = Math.min(line2Amount, maxBet);
    bets.push({ type: 'line', value: line2Val, amount: line2Amount });

    // Progression Layer (Triggered on Loss)
    if (state.currentLevel > 0) {
        let cornerModifier = 0;
        if (config.incrementMode === 'base') {
            cornerModifier = (state.currentLevel - 1) * insideMin;
        } else {
            const increment = config.minIncrementalBet !== undefined ? config.minIncrementalBet : 1;
            cornerModifier = (state.currentLevel - 1) * increment;
        }

        let cornerAmount = insideMin + cornerModifier;
        cornerAmount = Math.max(cornerAmount, insideMin);
        cornerAmount = Math.min(cornerAmount, maxBet);

        cornerVals.forEach(val => {
            bets.push({ type: 'corner', value: val, amount: cornerAmount });
        });
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