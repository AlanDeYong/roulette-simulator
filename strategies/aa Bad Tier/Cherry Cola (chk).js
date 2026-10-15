/**
 * Strategy: Cherry Cola Roulette System (Updated)
 * Source: https://youtu.be/9xEUjavdkKc (Bet With Mo)
 *
 * Full Logic:
 * 1. Warm-up Phase:
 *    - In the beginning, wait for 3 spins without betting to observe the colors.
 * 2. Bet Selection:
 *    - Looks at the colors of the last 3 spins.
 *    - For each of the 3 colors, selects 5 entirely random numbers of that color (15 numbers total).
 *      - Example: 2 Black and 1 Red -> 10 randomly picked Black numbers + 5 randomly picked Red numbers.
 *      - Example: 3 Reds -> 15 randomly picked Red numbers.
 *    - Zero Coverage:
 *      * American table: Split bet on [0, '00'].
 *      * European table: Straight-up number bet on 0.
 *    - Total bets placed: 16 bet positions.
 *
 * 3. Progression:
 *    - Base bet: 1 unit per position.
 *    - Loss Progression:
 *      * Level 1: 1 unit
 *      * Level 2: 2 units (+1 unit)
 *      * Level 3: 3 units (+1 unit)
 *      * Level 4: 5 units (+2 units)
 *      * Level 5+: Doubles previous bet amount (e.g., 10, 20, 40...) clamped to limits.
 *    - On Win:
 *      * If bankroll reaches a new session high (bankroll > peakBankroll):
 *        Reset progression back to Level 1, pick new random numbers based on the latest 3 colors.
 *      * If win does not exceed session high:
 *        Rebet the same positions at the current unit level.
 *    - On Loss:
 *      * Advance to the next progression level and keep the active set of numbers.
 *
 * 4. Goal & Stop-Loss:
 *    - Lock in new session highs and reset progression to minimum unit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
  const PROGRESSION = [1, 2, 3, 5, 10, 20, 40, 80, 160];

  const minUnit = config.betLimits.min || 1;

  // 1. Initial 3-spin observation phase
  if (spinHistory.length < 3) {
    return [];
  }

  // Initialize state
  if (!state.initialized) {
    state.initialized = true;
    state.peakBankroll = bankroll;
    state.progressionIndex = 0;
    state.activeNumbers = [];
    state.lastBankroll = bankroll;
  }

  // Check if bankroll set a new session peak
  const isNewSessionHigh = bankroll > state.peakBankroll;
  if (isNewSessionHigh) {
    state.peakBankroll = bankroll;
    state.progressionIndex = 0;
  } else if (bankroll < state.lastBankroll) {
    // Previous spin was a loss: advance progression
    state.progressionIndex = Math.min(state.progressionIndex + 1, PROGRESSION.length - 1);
  }

  state.lastBankroll = bankroll;

  // Re-pick numbers if resetting at a session high or on the first betting spin
  const needsNewSelection = isNewSessionHigh || state.activeNumbers.length !== 15;

  if (needsNewSelection) {
    const lastThreeSpins = spinHistory.slice(-3);
    let redCountNeeded = 0;
    let blackCountNeeded = 0;

    for (const spin of lastThreeSpins) {
      if (spin.winningColor === 'red') {
        redCountNeeded += 5;
      } else if (spin.winningColor === 'black') {
        blackCountNeeded += 5;
      } else {
        // Fallback for green: evenly split 3/2 randomly
        if (Math.random() < 0.5) {
          redCountNeeded += 3;
          blackCountNeeded += 2;
        } else {
          redCountNeeded += 2;
          blackCountNeeded += 3;
        }
      }
    }

    // Fully randomized Fisher-Yates sample
    function pickRandom(arr, count) {
      const pool = [...arr];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, count);
    }

    const selectedRed = pickRandom(RED_NUMBERS, redCountNeeded);
    const selectedBlack = pickRandom(BLACK_NUMBERS, blackCountNeeded);
    state.activeNumbers = [...selectedRed, ...selectedBlack];
  }

  // Calculate unit bet amount based on progression level
  const multiplier = PROGRESSION[state.progressionIndex];
  let betAmount = minUnit * multiplier;

  // Clamp bet amount to table limits
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  const bets = [];

  // 15 straight-up number bets
  for (const num of state.activeNumbers) {
    bets.push({
      type: 'number',
      value: num,
      amount: betAmount
    });
  }

  // Zero bet coverage
  if (config.tableType === 'american') {
    bets.push({
      type: 'split',
      value: [0, '00'],
      amount: betAmount
    });
  } else {
    bets.push({
      type: 'number',
      value: 0,
      amount: betAmount
    });
  }

  return bets;
}