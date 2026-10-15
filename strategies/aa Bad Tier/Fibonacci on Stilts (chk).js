/**
 * Fibonacci on Stilts with Dynamic Pattern Optimizer
 * * Source: CEG Dealer School - https://youtu.be/xhB_l6GxP_Y
 * * The Full Logic in details:
 * - The strategy utilizes a first-order Markov Chain transition matrix and an Exponential Moving Average (EMA) 
 * momentum calculation to score and track roulette dozens dynamically.
 * - The strategy requires a minimum data collection window (default 37 spins) before making any bets.
 * - Once the data threshold is satisfied, the strategy identifies the "hottest" dozen (highest probability score)
 * to place its bet on.
 * * The Full Bet Progression in details:
 * - Progression steps follow the standard Fibonacci sequence units: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, etc.
 * - The player stays at the current betting level until a win occurs or 5 consecutive losses hit at that specific level.
 * - Every time a WIN occurs on the tracked bet: The loss counter resets to 0, and the progression drops down 1 level (minimum level 0).
 * - Every time a LOSS occurs on the tracked bet: The consecutive loss counter increases by 1.
 * - If 5 consecutive losses hit at the current level: The counter resets to 0, and the progression jumps UP 2 levels.
 * * The Goal:
 * - To filter variance and optimize entry timing using statistical modeling, paired with an ultra-conservative 
 * progression to survive heavy table swings and maximize time on the floor.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Define Target Dozens Layout for the Predictive Model
  const targetLayouts = [
    { id: 1, value: 1, numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    { id: 2, value: 2, numbers: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24] },
    { id: 3, value: 3, numbers: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36] }
  ];

  const minSpinsNeeded = 37;

  // 2. Run SOTA Predictive Model Data Check
  const predictions = predictHottestSectors(spinHistory, targetLayouts, minSpinsNeeded);
  
  // Abort and wait if data threshold hasn't been met
  if (!predictions || predictions.length === 0) {
    return [];
  }

  // 3. Initialize State
  if (state.currentLevel === undefined) {
    state.currentLevel = 0;
    state.consecutiveLosses = 0;
    state.lastTargetDozen = null;
  }

  // Fibonacci Sequence values
  const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];

  // 4. Update Progression State based on the previous round's outcome
  if (spinHistory.length > 0 && state.lastTargetDozen !== null) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    
    // Determine if the previous targeted dozen won
    const targetSector = targetLayouts.find(d => d.value === state.lastTargetDozen);
    const isWin = targetSector && targetSector.numbers.includes(lastNum);

    if (isWin) {
      state.consecutiveLosses = 0;
      state.currentLevel = Math.max(0, state.currentLevel - 1);
    } else {
      state.consecutiveLosses += 1;
      
      if (state.consecutiveLosses >= 5) {
        state.currentLevel += 2;
        state.consecutiveLosses = 0;
        
        if (state.currentLevel >= fib.length) {
          state.currentLevel = fib.length - 1;
        }
      }
    }
  }

  // 5. Select the Hottest Dozen according to predictive ranking
  const hottestDozen = predictions[0].value;
  state.lastTargetDozen = hottestDozen;

  // 6. Calculate Base Bet Amount
  const unit = config.betLimits.minOutside;
  let amount = unit * fib[state.currentLevel];

  // 7. Clamp to Limits
  amount = Math.max(amount, config.betLimits.minOutside); 
  amount = Math.min(amount, config.betLimits.max);

  // 8. Return Calculated Bet
  return [{ type: 'dozen', value: hottestDozen, amount: amount }];
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