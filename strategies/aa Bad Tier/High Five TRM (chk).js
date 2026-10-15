/**
 * Strategy: High Five Roulette
 * Source: https://youtu.be/ANipjWNcw7U
 * Channel: The Roulette Master
 * 
 * --- FULL LOGIC ---
 * 1. Target Selection:
 *    - Select 5 straight-up numbers (either focusing on low numbers 1-18 or high numbers 19-36).
 *    - Pick numbers that have NOT hit in the recent spin history (coldest/unhit numbers in the last 9+ spins).
 * 
 * --- BET PROGRESSION ---
 * - Base Bet: 1 unit per straight-up number (clamped to config.betLimits.min).
 * - Progression on Loss:
 *   - Increase each straight-up bet by 1 unit (+1 x base unit) per loss.
 *   - When the individual bet size reaches 15 units, increase by 2 units (+2 x base unit) per loss.
 * - Progression on Win:
 *   - On a win, reset the progression level back to 1 unit per number and re-evaluate target numbers.
 * 
 * --- GOAL & STOP LOSS ---
 * - Profit Target: Target +$200 - $300 profit per session before cashing out/resetting.
 * - Bankroll Requirement: Recommended $1,000 bankroll for $1 base units ($200 for $5 base units).
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine base unit for inside bets (straight-up numbers)
  const baseUnit = config.betLimits.min;

  // 2. Initialize State
  if (!state.init) {
    state.init = true;
    state.level = 1;              // Progression multiplier/level
    state.activeNumbers = [];     // Currently targeted 5 numbers
    state.targetSide = 'low';     // 'low' (1-18) or 'high' (19-36)
  }

  const lastSpin = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1] : null;

  // 3. Evaluate Win/Loss from Previous Spin
  if (lastSpin && state.activeNumbers.length === 5) {
    const won = state.activeNumbers.includes(lastSpin.winningNumber);

    if (won) {
      // Reset progression and select new numbers
      state.level = 1;
      state.activeNumbers = [];
    } else {
      // Increase progression level on loss
      if (state.level < 15) {
        state.level += 1;
      } else {
        state.level += 2;
      }
    }
  }

  // 4. Select 5 Numbers if needed
  if (state.activeNumbers.length < 5) {
    const recentSpins = spinHistory.slice(-9).map(s => s.winningNumber);

    let candidates = [];
    if (state.targetSide === 'low') {
      candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    } else {
      candidates = [19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];
    }

    // Filter out numbers that hit in recent history
    let unhit = candidates.filter(num => !recentSpins.includes(num));

    // Fallback if fewer than 5 unhit numbers available
    if (unhit.length < 5) {
      unhit = candidates;
    }

    // Pick top 5 numbers
    state.activeNumbers = unhit.slice(0, 5);
  }

  // 5. Calculate Bet Amount
  let betAmount = baseUnit * state.level;

  // Clamp bet amount to config limits
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // 6. Build Bet Array
  const bets = state.activeNumbers.map(num => ({
    type: 'number',
    value: num,
    amount: betAmount
  }));

  return bets;
}