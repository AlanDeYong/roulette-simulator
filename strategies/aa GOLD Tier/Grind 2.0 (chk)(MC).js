/**
 * ==============================================================================
 * ROULETTE STRATEGY: Grind 2.0 Strategy (9-Spin Observation & Random Pick Mod)
 * ==============================================================================
 * Source:
 *   - Video URL: https://youtu.be/YqVOnB73z4Q
 *   - YouTube Channel: The Roulette Master
 *   - Strategy Designer: Caleb Cunningham
 *
 * The Full Logic in Detail:
 *   1. Observation & Wait Conditions:
 *      - Must wait and observe without betting for at least 9 spins (spinHistory >= 9).
 *      - In addition, at least 2 unique dozens (1st 12, 2nd 12, 3rd 12) must have
 *        recorded at least one winning hit in the spin history.
 *   2. Board Analysis:
 *      Once all conditions are met, the strategy identifies the dozen that has
 *      not won for the longest period (the coldest sleeper dozen).
 *   3. Number Selection:
 *      - From the 12 numbers in the selected dozen, filter out ALL numbers that
 *        appeared in the last 9 spins.
 *      - From the eligible pool, select 8 numbers randomly.
 *      - If fewer than 8 eligible numbers remain (e.g., 5 or more hit in the last
 *        9 spins), select all eligible numbers and backfill the remainder randomly
 *        from the remaining dozen numbers so exactly 8 numbers are bet.
 *   4. Bet Types:
 *      8 Inside Straight-Up 'number' bets on the chosen numbers.
 *
 * The Full Bet Progression in Detail:
 *   The progression covers 15 attempts across 12 levels:
 *     - Level 1: 1 unit per number  (8 units total)  -> 3 attempts
 *     - Level 2: 2 units per number (16 units total) -> 2 attempts
 *     - Level 3: 3 units per number (24 units total) -> 1 attempt
 *     - Level 4: 4 units per number (32 units total) -> 1 attempt
 *     - Level 5: 5 units per number (40 units total) -> 1 attempt
 *     - Level 6: 6 units per number (48 units total) -> 1 attempt
 *     - Level 7: 8 units per number (64 units total) -> 1 attempt
 *     - Level 8: 10 units per number (80 units total) -> 1 attempt
 *     - Level 9: 13 units per number (104 units total)-> 1 attempt
 *     - Level 10: 17 units per number (136 units total)-> 1 attempt
 *     - Level 11: 22 units per number (176 units total)-> 1 attempt
 *     - Level 12: 28 units per number (224 units total)-> 1 attempt
 *
 *   - After ANY Win:
 *     A hit on any straight-up number pays 35:1 (returning 36x unit bet),
 *     recovering drawdown and generating net profit. The progression resets to
 *     Level 1 and clears active numbers to re-evaluate conditions.
 *   - After Loss:
 *     Advances through attempts/levels. Resets if the 15-attempt cycle completes.
 *
 * The Goal:
 *   - Target Profit: Lock in profit on a single hit and reset.
 *   - Stop Loss: If bankroll cannot cover the total bet or progression is exhausted.
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Progression stages: [unitsPerNumber, maxAttemptsAtThisLevel]
  const PROGRESSION_STAGES = [
    { units: 1, maxAttempts: 3 },
    { units: 2, maxAttempts: 2 },
    { units: 3, maxAttempts: 1 },
    { units: 4, maxAttempts: 1 },
    { units: 5, maxAttempts: 1 },
    { units: 6, maxAttempts: 1 },
    { units: 8, maxAttempts: 1 },
    { units: 10, maxAttempts: 1 },
    { units: 13, maxAttempts: 1 },
    { units: 17, maxAttempts: 1 },
    { units: 22, maxAttempts: 1 },
    { units: 28, maxAttempts: 1 }
  ];

  // 2. Base Unit for Inside Bets
  const baseUnit = config.betLimits && config.betLimits.min ? config.betLimits.min : 1;

  // 3. Helper: Group definitions for Dozens
  const DOZENS = {
    1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    2: [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    3: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36]
  };

  function getDozen(num) {
    if (num >= 1 && num <= 12) return 1;
    if (num >= 13 && num <= 24) return 2;
    if (num >= 25 && num <= 36) return 3;
    return null;
  }

  // Fisher-Yates shuffle helper
  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 4. Initialize State
  if (state.stageIndex === undefined) state.stageIndex = 0;
  if (state.attemptInStage === undefined) state.attemptInStage = 0;
  if (!state.activeNumbers) state.activeNumbers = [];
  if (state.targetDozen === undefined) state.targetDozen = null;

  // 5. Evaluate Previous Spin Result if bets were active
  if (spinHistory && spinHistory.length > 0 && state.activeNumbers.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;
    const won = state.activeNumbers.includes(winningNum);

    if (won) {
      state.stageIndex = 0;
      state.attemptInStage = 0;
      state.activeNumbers = [];
      state.targetDozen = null;
    } else {
      state.attemptInStage++;
      const currentStage = PROGRESSION_STAGES[state.stageIndex];
      if (state.attemptInStage >= currentStage.maxAttempts) {
        state.stageIndex++;
        state.attemptInStage = 0;
        if (state.stageIndex >= PROGRESSION_STAGES.length) {
          state.stageIndex = 0;
          state.activeNumbers = [];
          state.targetDozen = null;
        }
      }
    }
  }

  // 6. Check Trigger Conditions (when starting a new attack cycle)
  if (state.activeNumbers.length === 0 || state.targetDozen === null) {
    // Condition 1: Must observe for at least 9 spins without betting
    if (!spinHistory || spinHistory.length < 9) {
      return [];
    }

    // Condition 2: At least 2 unique dozens must have won
    const uniqueDozensWon = new Set();
    for (let i = 0; i < spinHistory.length; i++) {
      const dozen = getDozen(spinHistory[i].winningNumber);
      if (dozen !== null) {
        uniqueDozensWon.add(dozen);
      }
    }

    if (uniqueDozensWon.size < 2) {
      return [];
    }

    // Find the dozen that has not won for the longest time
    const spinsSinceHit = { 1: 999, 2: 999, 3: 999 };
    for (let d = 1; d <= 3; d++) {
      let count = 0;
      let found = false;
      for (let i = spinHistory.length - 1; i >= 0; i--) {
        if (getDozen(spinHistory[i].winningNumber) === d) {
          spinsSinceHit[d] = count;
          found = true;
          break;
        }
        count++;
      }
      if (!found) {
        spinsSinceHit[d] = 999;
      }
    }

    let bestDozen = 3;
    let maxAbsence = -1;
    [3, 2, 1].forEach((d) => {
      if (spinsSinceHit[d] > maxAbsence) {
        maxAbsence = spinsSinceHit[d];
        bestDozen = d;
      }
    });

    state.targetDozen = bestDozen;
    const candidateNumbers = DOZENS[bestDozen].slice();

    // Identify all numbers that appeared in the past 9 spins to avoid them
    const recentSpins = spinHistory.slice(-9);
    const pastNineHits = new Set(recentSpins.map((s) => s.winningNumber));

    // Numbers in the target dozen that did NOT appear in the past 9 spins
    const eligibleNumbers = candidateNumbers.filter((n) => !pastNineHits.has(n));

    let chosen = [];
    if (eligibleNumbers.length >= 8) {
      // Pick 8 randomly from the eligible unhit numbers
      chosen = shuffle(eligibleNumbers).slice(0, 8);
    } else {
      // If fewer than 8 eligible, take all of them and backfill randomly from the rest
      chosen = eligibleNumbers.slice();
      const remainingPool = candidateNumbers.filter((n) => !chosen.includes(n));
      const needed = 8 - chosen.length;
      const backfill = shuffle(remainingPool).slice(0, needed);
      chosen = chosen.concat(backfill);
    }

    state.activeNumbers = chosen;
  }

  // 7. Calculate Bet Amount based on current Progression Stage
  const currentStage = PROGRESSION_STAGES[state.stageIndex] || PROGRESSION_STAGES[0];
  let unitMultiplier = currentStage.units;

  if (config.incrementMode === 'base') {
    unitMultiplier = currentStage.units;
  } else if (config.minIncrementalBet && config.minIncrementalBet > 1) {
    unitMultiplier = currentStage.units * config.minIncrementalBet;
  }

  let betPerNumber = baseUnit * unitMultiplier;

  // 8. Clamp Bet Amount within Table Limits
  if (config.betLimits) {
    if (config.betLimits.min !== undefined) {
      betPerNumber = Math.max(betPerNumber, config.betLimits.min);
    }
    if (config.betLimits.max !== undefined) {
      betPerNumber = Math.min(betPerNumber, config.betLimits.max);
    }
  }

  // 9. Bankroll Verification
  const totalRequired = betPerNumber * state.activeNumbers.length;
  if (bankroll !== undefined && bankroll < totalRequired) {
    return [];
  }

  // 10. Construct and Return Bet Objects
  return state.activeNumbers.map((num) => ({
    type: 'number',
    value: num,
    amount: betPerNumber
  }));
}