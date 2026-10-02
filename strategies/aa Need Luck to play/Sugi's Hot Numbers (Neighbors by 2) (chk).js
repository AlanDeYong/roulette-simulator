/**
 * ==============================================================================
 * Strategy: Sugi's Hot Numbers (Neighbors by 2) - 37-Spin Weighted Mod
 * Source: https://youtu.be/X7R9CiIxOsE
 * Channel: Casino Matchmaker
 * ==============================================================================
 *
 * THE FULL LOGIC IN DETAIL:
 * 1. Warm-Up Qualification:
 *    - Spins without placing any bets for the first 37 spins (`spinHistory.length < 37`).
 * 2. Weighted Hot Number Selection:
 *    - Evaluates all numbers (0-36) using a composite scoring model:
 *      * Frequency: Raw hit count across the history.
 *      * Recency: Normalized score giving higher weight to more recent spins.
 *      * Wheel Proximity: Wheel distance to recent outcomes (shorter wheel arc
 *        distance on the European layout awards higher proximity score).
 *    - Picks the top 3 highest-scoring numbers.
 * 3. Bet Placement & Progression:
 *    - For each of the top 3 numbers, bet that number + 2 neighbors on each side
 *      on the European wheel racetrack (5 numbers per sector).
 *    - Overlapping positions stack chips ("jackpot numbers").
 *    - The 3 hot numbers remain LOCKED during progression.
 *    - On Loss: Increase bet size by +2 units per position.
 *    - On Win (Not in session profit): Decrease bet size by -1 unit per position (min 1).
 *    - On Win (Session profit / bankroll >= session high): Reset bet size to 1 unit
 *      and recalculate the top 3 weighted hot numbers.
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. European wheel sequence in clockwise order
  const WHEEL_EU = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];
  const WHEEL_LEN = WHEEL_EU.length;

  // Shortest wheel distance between two numbers (0 to 18)
  function getWheelDistance(n1, n2) {
    const idx1 = WHEEL_EU.indexOf(n1);
    const idx2 = WHEEL_EU.indexOf(n2);
    if (idx1 === -1 || idx2 === -1) return 18;
    const diff = Math.abs(idx1 - idx2);
    return Math.min(diff, WHEEL_LEN - diff);
  }

  // Helper to get 2 neighbors on each side for a target number on European wheel
  function getNeighbors2(num) {
    const idx = WHEEL_EU.indexOf(num);
    if (idx === -1) return [num];
    return [
      WHEEL_EU[(idx - 2 + WHEEL_LEN) % WHEEL_LEN],
      WHEEL_EU[(idx - 1 + WHEEL_LEN) % WHEEL_LEN],
      WHEEL_EU[idx],
      WHEEL_EU[(idx + 1) % WHEEL_LEN],
      WHEEL_EU[(idx + 2) % WHEEL_LEN]
    ];
  }

  // Composite hot number selection: frequency, recency, and proximity to recent spins
  function findTop3WeightedHotNumbers(history) {
    const totalSpins = history.length;
    const scores = {};

    for (let n = 0; n <= 36; n++) {
      scores[n] = 0;
    }

    // Evaluate recent window for proximity (last 12 spins or total history)
    const proximityWindow = Math.min(12, totalSpins);
    const recentSpins = history.slice(totalSpins - proximityWindow);

    for (let i = 0; i < totalSpins; i++) {
      const num = history[i].winningNumber;
      if (scores[num] !== undefined) {
        // Frequency component
        scores[num] += 10.0;
        // Recency component: linear weight from 1.0 (oldest) to 5.0 (latest)
        const recencyWeight = 1.0 + (4.0 * (i + 1)) / totalSpins;
        scores[num] += recencyWeight;
      }
    }

    // Proximity component: bonus points for being physically close on the wheel to recent outcomes
    for (let n = 0; n <= 36; n++) {
      let proximityScore = 0;
      recentSpins.forEach((spin, idx) => {
        const dist = getWheelDistance(n, spin.winningNumber);
        // Numbers within 3 pockets receive exponential proximity weighting
        if (dist <= 3) {
          const recencyMultiplier = (idx + 1) / proximityWindow;
          proximityScore += (4 - dist) * 2.0 * recencyMultiplier;
        }
      });
      scores[n] += proximityScore;
    }

    const sortedNumbers = Object.keys(scores).map(Number);
    sortedNumbers.sort((a, b) => scores[b] - scores[a]);

    return sortedNumbers.slice(0, 3);
  }

  // 2. Mod Rule: Spin without betting for the first 37 spins
  if (!spinHistory || spinHistory.length < 37) {
    return [];
  }

  // 3. State Initialization
  const minInside = config.betLimits ? config.betLimits.min : 1;
  const maxLimit = config.betLimits ? config.betLimits.max : 500;

  if (state.unitsPerNumber === undefined) {
    state.unitsPerNumber = 1;
    state.sessionHighBankroll = bankroll;
    state.activeHotNumbers = null;
    state.lastTotalBet = 0;
  }

  // 4. Evaluate previous spin outcome (if a bet was placed last round)
  if (state.lastTotalBet > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastWinNum = lastResult.winningNumber;

    const wasWin = state.coveredNumbers && state.coveredNumbers.includes(lastWinNum);

    if (wasWin) {
      if (bankroll >= state.sessionHighBankroll) {
        // Reset progression and unlock hot numbers
        state.unitsPerNumber = 1;
        state.sessionHighBankroll = bankroll;
        state.activeHotNumbers = null;
      } else {
        // Won, but still in drawdown: step down 1 unit
        state.unitsPerNumber = Math.max(1, state.unitsPerNumber - 1);
      }
    } else {
      // Loss: step up 2 units
      state.unitsPerNumber += 2;
    }
  }

  // Update session high watermark
  if (bankroll > state.sessionHighBankroll) {
    state.sessionHighBankroll = bankroll;
  }

  // 5. Select / Maintain the 3 Hot Numbers
  if (!state.activeHotNumbers || state.activeHotNumbers.length < 3) {
    state.activeHotNumbers = findTop3WeightedHotNumbers(spinHistory);
  }

  // 6. Construct Neighbor Bets (Neighbors by 2)
  const chipMultipliers = {};
  state.activeHotNumbers.forEach((hotNum) => {
    const sector = getNeighbors2(hotNum);
    sector.forEach((num) => {
      chipMultipliers[num] = (chipMultipliers[num] || 0) + 1;
    });
  });

  state.coveredNumbers = Object.keys(chipMultipliers).map(Number);

  // 7. Calculate Bet Amounts and Clamp to Config Limits
  const baseUnit = minInside;
  const bets = [];
  let totalBetCost = 0;

  for (const num of state.coveredNumbers) {
    const chipCount = chipMultipliers[num];
    let betAmount = baseUnit * state.unitsPerNumber * chipCount;

    betAmount = Math.max(betAmount, minInside);
    betAmount = Math.min(betAmount, maxLimit);

    bets.push({
      type: 'number',
      value: num,
      amount: betAmount
    });

    totalBetCost += betAmount;
  }

  // 8. Bankroll Safety Check
  if (totalBetCost > bankroll) {
    state.lastTotalBet = 0;
    return [];
  }

  state.lastTotalBet = totalBetCost;
  return bets;
}