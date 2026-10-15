/**
 * Pinnacle Roulette Strategy
 * 
 * Source: https://youtu.be/yC5MIunA_Xs
 * Channel: The Roulette Master ("Pinnacle Roulette" by Ralph)
 * 
 * LOGIC DETAILS:
 * - The strategy begins by betting on two dozens: 1st Dozen (1-12) and 2nd Dozen (13-24).
 * - On each loss, the bet amount on each position increases linearly by an additional step (+2 units after 1st loss, +3 units after 2nd loss, +4 units after 3rd loss, etc.).
 * - When a win occurs at an elevated level in Two-Dozen mode, the winning dozen is removed, 
 *   and a single-dozen bet (at the current progression amount) is placed on the remaining (losing) dozen.
 * - Winning in Single-Dozen mode completes the recovery and resets the progression back to base level (1 unit each).
 * 
 * BET PROGRESSION:
 * - Base level (Loss 0): 1 unit each on Dozen 1 & Dozen 2
 * - Loss 1: Rebet previous amount (1) + add 2 units = 3 units each (+2)
 * - Loss 2: Rebet previous amount (3) + add 3 units = 6 units each (+3)
 * - Loss 3: Rebet previous amount (6) + add 4 units = 10 units each (+4)
 * - Loss 4: Rebet previous amount (10) + add 5 units = 15 units each (+5)
 * - Loss 5: Rebet previous amount (15) + add 6 units = 21 units each (+6)
 * - Loss k (General Formula): total units = 1 + (k * (k + 3)) / 2
 * 
 * GOAL:
 * - Recover losses with high-coverage two-dozen play and single-dozen recovery spins.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const minOutside = config.betLimits.minOutside || 5;
  const maxBet = config.betLimits.max || 500;

  // Initialize state variables
  if (state.lossLevel === undefined) state.lossLevel = 0;
  if (state.mode === undefined) state.mode = 'TWO_DOZENS';
  if (state.activeDozen === undefined) state.activeDozen = null;

  // Process last spin result
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    let hitDozen = null;
    if (winningNum >= 1 && winningNum <= 12) hitDozen = 1;
    else if (winningNum >= 13 && winningNum <= 24) hitDozen = 2;
    else if (winningNum >= 25 && winningNum <= 36) hitDozen = 3;

    if (state.mode === 'TWO_DOZENS') {
      const won = (hitDozen === 1 || hitDozen === 2);
      if (won) {
        if (state.lossLevel === 0) {
          state.lossLevel = 0;
        } else {
          // Move to single dozen recovery mode on the losing dozen
          state.mode = 'SINGLE_DOZEN';
          state.activeDozen = (hitDozen === 1) ? 2 : 1;
        }
      } else {
        // Loss: increment loss level (adds +2, +3, +4, ... units)
        state.lossLevel += 1;
      }
    } else if (state.mode === 'SINGLE_DOZEN') {
      const won = (hitDozen === state.activeDozen);
      if (won) {
        // Full recovery achieved, reset progression
        state.mode = 'TWO_DOZENS';
        state.lossLevel = 0;
        state.activeDozen = null;
      } else {
        // Single dozen lost, advance loss level further
        state.lossLevel += 1;
      }
    }
  }

  // Calculate unit count for loss level k:
  // k=0 -> 1 unit
  // k=1 -> 1 + 2 = 3 units
  // k=2 -> 3 + 3 = 6 units
  // k=3 -> 6 + 4 = 10 units
  const k = state.lossLevel;
  const units = 1 + Math.floor((k * (k + 3)) / 2);
  let rawAmount = minOutside * units;

  // Clamp bet amount to limits
  let betAmount = Math.max(minOutside, Math.min(rawAmount, maxBet));

  const bets = [];

  if (state.mode === 'TWO_DOZENS') {
    if (bankroll < betAmount * 2) {
      betAmount = Math.floor(bankroll / 2);
    }
    if (betAmount >= minOutside) {
      bets.push({ type: 'dozen', value: 1, amount: betAmount });
      bets.push({ type: 'dozen', value: 2, amount: betAmount });
    }
  } else if (state.mode === 'SINGLE_DOZEN') {
    if (bankroll < betAmount) {
      betAmount = bankroll;
    }
    if (betAmount >= minOutside) {
      bets.push({ type: 'dozen', value: state.activeDozen, amount: betAmount });
    }
  }

  return bets.length > 0 ? bets : null;
}