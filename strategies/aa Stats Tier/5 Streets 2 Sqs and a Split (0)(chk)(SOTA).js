/**
 * @description SOTA Dynamic Pattern Optimized Roulette Strategy
 * * @source
 * - URL: Not Provided
 * - Channel: Not Provided
 * * @logic
 * - Triggers: Collects spin history data up to a 50-spin threshold. Once met, the SOTA 
 * model scores and locks the hottest 5 streets, 2 corners, and 1 split based on first-order 
 * Markov chains and EMA momentum. It places bets every spin after data collection completes.
 * - Conditions: Tracks the session's peak bankroll. If the current bankroll drops below 
 * the peak, the progression increases. Once the bankroll returns to or exceeds the 
 * session peak profit, the progression resets to the base level.
 * * @progression
 * - Initial Bet Layout (10 total base units dynamically assigned):
 * - 5 Hottest Streets x 1 unit each
 * - 2 Hottest Corners x 2 units each
 * - 1 Hottest Split x 1 unit
 * - 1 Straight Up x 1 unit on Number 0
 * - On Loss / No Peak Reached: Multiplier increases by +1 (equivalent to adding 
 * the initial base bet amounts to each position, honoring the 'base' increment mode).
 * - On Win / Peak Profit Reached: Multiplier resets to 1.
 * * @goal
 * - Continually hit or exceed the rolling session peak bankroll using dynamically tuned bet tracking.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const MIN_DATA_SPINS = 50;

    // 1. Data Collection Phase Check
    if (!spinHistory || spinHistory.length < MIN_DATA_SPINS) {
        return [];
    }

    // 2. Initialize State Tracking
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
    }
    if (state.multiplier === undefined) {
        state.multiplier = 1;
    }

    // Update peak bankroll and handle session reset/progression logic
    if (bankroll >= state.peakBankroll) {
        state.peakBankroll = bankroll;
        state.multiplier = 1;
    } else {
        state.multiplier += 1;
    }

    // 3. Define All Match Layout Pools for the SOTA Model
    // Generate Streets
    const streetLayouts = [];
    for (let i = 1; i <= 34; i += 3) {
        streetLayouts.push({ id: `st_${i}`, type: 'street', value: i, numbers: [i, i + 1, i + 2] });
    }

    // Generate Corners
    const cornerLayouts = [];
    for (let r = 0; r < 11; r++) {
        const start = r * 3 + 1;
        cornerLayouts.push({ id: `co_${start}`, type: 'corner', value: start, numbers: [start, start + 1, start + 3, start + 4] });
        cornerLayouts.push({ id: `co_${start + 1}`, type: 'corner', value: start + 1, numbers: [start + 1, start + 2, start + 4, start + 5] });
    }

    // Generate Splits (Horizontal and Vertical)
    const splitLayouts = [];
    let splitId = 0;
    for (let n = 1; n <= 36; n++) {
        // Horizontal Splits
        if (n % 3 !== 0 && n + 1 <= 36) {
            splitLayouts.push({ id: `sp_${splitId++}`, type: 'split', value: [n, n + 1], numbers: [n, n + 1] });
        }
        // Vertical Splits
        if (n + 3 <= 36) {
            splitLayouts.push({ id: `sp_${splitId++}`, type: 'split', value: [n, n + 3], numbers: [n, n + 3] });
        }
    }

    // 4. Compute Top Performing Sectors Using the SOTA Predictor
    const hotStreets = predictHottestSectors(spinHistory, streetLayouts, MIN_DATA_SPINS);
    const hotCorners = predictHottestSectors(spinHistory, cornerLayouts, MIN_DATA_SPINS);
    const hotSplits = predictHottestSectors(spinHistory, splitLayouts, MIN_DATA_SPINS);

    if (!hotStreets || !hotCorners || !hotSplits) {
        return [];
    }

    // Select the target layout allocations based on highest predictive scores
    const chosenStreets = hotStreets.slice(0, 5);
    const chosenCorners = hotCorners.slice(0, 2);
    const chosenSplits = hotSplits.slice(0, 1);

    // 5. Build Final Strategy Bet Matrix
    const strategyPlacements = [];
    
    chosenStreets.forEach(s => strategyPlacements.push({ type: 'street', value: s.value, baseUnits: 1 }));
    chosenCorners.forEach(c => strategyPlacements.push({ type: 'corner', value: c.value, baseUnits: 2 }));
    chosenSplits.forEach(sp => strategyPlacements.push({ type: 'split', value: sp.value, baseUnits: 1 }));
    
    // Always include the strategy required safety zero element
    strategyPlacements.push({ type: 'number', value: 0, baseUnits: 1 });

    const baseUnit = config.betLimits.min;
    const bets = [];

    // 6. Map and Clamp Bets to Table Constraints
    for (let i = 0; i < strategyPlacements.length; i++) {
        const item = strategyPlacements[i];
        let amount = baseUnit * item.baseUnits * state.multiplier;

        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({
            type: item.type,
            value: item.value,
            amount: amount
        });
    }

    return bets;
}

/**
 * Dynamic Pattern Optimizer (SOTA Predictive Model)
 */
function predictHottestSectors(spinHistory, targetLayouts, minSpinsNeeded = 37, weightMarkov = 0.6, weightEMA = 0.4) {
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