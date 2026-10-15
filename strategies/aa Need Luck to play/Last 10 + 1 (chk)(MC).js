/**
 * STRATEGY DOCUMENTATION
 * * Source: Custom implementation integrating a State-Of-The-Art (SOTA) Dynamic Pattern Optimizer.
 * * The Full Logic in Details:
 * - The strategy uses a 1-to-1 mapping layout where every single number on the wheel (0-36) is treated as its own discrete sector.
 * - It waits until at least 20 spins are available to satisfy the model's threshold (`minSpinsNeeded = 20`).
 * - When triggered, it invokes `predictHottestSectors()` which runs a first-order Markov Chain transition matrix and an Exponential Moving Average (EMA) momentum tracker to calculate a hybrid probability score for each number.
 * - The strategy selects the top 10 highest-ranked numbers based on this prediction score.
 * * The Full Bet Progression in Details:
 * - Initial Bet: 1 base unit (equal to `config.betLimits.min`) per target number on the top 10 ranked selections.
 * - On Loss: Rebet on the newly calculated top 10 predicted numbers, increasing the step size per position.
 * - The escalation respects `config.incrementMode`:
 * - 'fixed': Multiplier step increases by `config.minIncrementalBet`.
 * - 'base': Multiplier step increases by the base unit value (`config.betLimits.min`).
 * - On Win: Unlike standard setups, a single win does NOT reset the progression. The progression continues to scale or maintain its step level unless the session peak profit condition is fulfilled.
 * * The Goal:
 * - **Session Peak Profit Locked Reset**: Tracks the highest bankroll achieved during the running session. The progression multiplier and betting states will ONLY reset back to baseline step 1 when the current bankroll breaks its previous historical peak record, effectively locking in macro-session profits.
 */

// --- Predictive SOTA Model Dependency ---
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

// --- Main Roulette Strategy Implementation ---
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.min;
    const minSpins = 20;

    // 1. Initialize State Framework
    if (state.currentMultiplier === undefined) {
        state.currentMultiplier = 1;
    }
    if (!state.activeTargets) {
        state.activeTargets = [];
    }
    if (state.isBetting === undefined) {
        state.isBetting = false;
    }
    // Initialize session peak profit metric tracking
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
    }

    // 2. Track Session Peak Performance Condition (CRITICAL OVERRIDE)
    // The progression resetting behavior is decoupled entirely from single win triggers 
    // and is tied exclusively to hitting a brand new bankroll high point.
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
        state.currentMultiplier = 1;
        state.isBetting = false;
        state.activeTargets = [];
    }

    // Abort if processing depth does not meet the mathematical threshold requirements
    if (spinHistory.length < minSpins) {
        return [];
    }

    // 3. Performance Analysis Evaluation (Win/Loss Tracking)
    if (state.isBetting && spinHistory.length > 0) {
        const lastWinningNumber = spinHistory[spinHistory.length - 1].winningNumber;
        const wasWin = state.activeTargets.includes(lastWinningNumber);

        if (!wasWin) {
            // Increase progression strictly on loss cycles
            state.currentMultiplier += 1;
        }
        // Note: If it was a win, we do NOT reset the multiplier here. 
        // It stays at its current tier until a peak bankroll breakthrough triggers the code block above.
    }

    // 4. Construct Layout Array for Single Number Targets (0 - 36)
    const singleNumberLayouts = [];
    for (let i = 0; i <= 36; i++) {
        singleNumberLayouts.push({ id: i, value: i, numbers: [i] });
    }

    // 5. Invoke Dynamic Pattern Optimizer
    const rankedSectors = predictHottestSectors(spinHistory, singleNumberLayouts, minSpins, 0.6, 0.4);
    
    if (!rankedSectors) {
        return [];
    }

    // Capture the top 10 recommended predictive vectors
    const optimalTopTen = rankedSectors.slice(0, 10);
    state.activeTargets = optimalTopTen.map(sector => sector.value);
    state.isBetting = true;

    // 6. Progression Sizing Execution
    const unitIncrement = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);
    const finalCalculatedBet = baseUnit + (state.currentMultiplier - 1) * unitIncrement;

    // Clamp bet boundaries using global structural limits
    let finalBetAmount = Math.max(finalCalculatedBet, config.betLimits.min);
    finalBetAmount = Math.min(finalBetAmount, config.betLimits.max);

    // 7. Generate Array of Bet Positions
    const bets = [];
    for (let i = 0; i < state.activeTargets.length; i++) {
        bets.push({
            type: 'number',
            value: state.activeTargets[i],
            amount: finalBetAmount
        });
    }

    return bets;
}