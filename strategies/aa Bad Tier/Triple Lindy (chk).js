/**
 * Strategy Name: Triple Lindy
 * 
 * Source:
 * - URL: https://youtu.be/r6OxMDLv7tU
 * - YouTube Channel: The Roulette Master
 * 
 * Strategy Logic & Bet Placements:
 * - Simultaneously places bets on three independent even-money outside positions:
 *   1. Low (1 to 18)
 *   2. Even
 *   3. Red
 * 
 * Bet Progression & Rules:
 * - Each of the 3 positions maintains its own independent progression level.
 * - The progression ladder consists of 8 levels:
 *   [1, 5, 15, 40, 80, 160, 320, 640] units.
 * - After a WIN on a position: That specific position resets back to Level 0 (1 unit).
 * - After a LOSS on a position: That specific position advances 1 step up the progression ladder.
 * - If 0 or 00 hits: All three positions lose and advance to their next progression step.
 * 
 * Goal:
 * - Target profit is typically +100 units / $100 per session.
 * - Stop loss occurs if bankroll cannot sustain the next required bet or progression maxes out.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Progression Ladder (in base units)
  const PROGRESSION_LADDER = [1, 5, 15, 40, 80, 160, 320, 640];
  const minOutside = (config.betLimits && config.betLimits.minOutside) || 1;
  const maxBet = (config.betLimits && config.betLimits.max) || 500;

  // 2. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.startBankroll = bankroll;
    state.targetProfit = 100; // Default session target profit
    state.levels = {
      low: 0,
      even: 0,
      red: 0
    };
  }

  // 3. Process previous spin result if history exists
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winNum = lastSpin.winningNumber;
    const winColor = lastSpin.winningColor;

    // Check Low (1-18)
    const isLow = winNum >= 1 && winNum <= 18;
    if (isLow) {
      state.levels.low = 0;
    } else {
      state.levels.low = Math.min(state.levels.low + 1, PROGRESSION_LADDER.length - 1);
    }

    // Check Even (2, 4, 6, ..., 36) - 0 and 00 are not even
    const isEven = winNum > 0 && winNum % 2 === 0;
    if (isEven) {
      state.levels.even = 0;
    } else {
      state.levels.even = Math.min(state.levels.even + 1, PROGRESSION_LADDER.length - 1);
    }

    // Check Red
    const isRed = winColor === 'red';
    if (isRed) {
      state.levels.red = 0;
    } else {
      state.levels.red = Math.min(state.levels.red + 1, PROGRESSION_LADDER.length - 1);
    }
  }

  // 4. Calculate Bet Amounts for each position
  const positions = [
    { type: 'low', level: state.levels.low },
    { type: 'even', level: state.levels.even },
    { type: 'red', level: state.levels.red }
  ];

  const bets = [];

  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    const unitMultiplier = PROGRESSION_LADDER[pos.level];
    
    // Scale unit based on minimum outside bet allowed by table limits
    let betAmount = unitMultiplier * (minOutside > 1 ? minOutside : 1);

    // Clamp bet within limits
    betAmount = Math.max(betAmount, minOutside);
    betAmount = Math.min(betAmount, maxBet);

    bets.push({
      type: pos.type,
      amount: betAmount
    });
  }

  return bets;
}