/**
 * Source:
 *   URL: https://youtu.be/SCJZwYOD7Ks
 *   Channel: Casino Matchmaker
 *   Strategy: D'Alembert Double Dozens ("Follow the Winner")
 *
 * Full Logic in Detail:
 *   1. Selection:
 *      - Bets on two of the three dozens simultaneously.
 *      - Selection follows the most recent winning dozens ("follow the winner").
 *      - If the last winning dozen was different from the two currently tracked,
 *        the oldest dozen is replaced with the newly hit dozen.
 *      - If 0 hits, the previous dozen selections remain active.
 *
 * Full Bet Progression in Detail:
 *   - Base Bet: 1 unit per dozen (respecting config.betLimits.minOutside).
 *   - On Loss (neither dozen hits, or 0 lands):
 *     - Increase the bet level by +2 units for both dozens.
 *   - On Win (one of the two covered dozens hits):
 *     - Decrease the bet level by -1 unit for both dozens (minimum level 1).
 *   - Session Profit Reset:
 *     - If the player achieves net profit above the starting bankroll and wins,
 *       the bet level resets to 1 (base unit) to lock in gains and prevent steep drawdowns.
 *
 * The Goal:
 *   - Target steady incremental gains (~4 to 8 base units) over short sessions
 *     (typically 20 spins) while controlling risk via D'Alembert regression.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.level = 1;
    state.trackedDozens = [1, 2]; // Default starting dozens
    state.startingBankroll = bankroll;
    state.lastSpinCount = 0;
  }

  const minOutside = config?.betLimits?.minOutside || 1;
  const maxBet = config?.betLimits?.max || Infinity;
  const unit = minOutside;

  // Helper to determine the dozen of a winning number (1-3, or 0 for zero)
  function getDozen(num) {
    if (num >= 1 && num <= 12) return 1;
    if (num >= 13 && num <= 24) return 2;
    if (num >= 25 && num <= 36) return 3;
    return 0;
  }

  // 2. Evaluate outcome of previous spin if new spin has resolved
  if (spinHistory && spinHistory.length > state.lastSpinCount) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;
    const hitDozen = getDozen(winningNum);

    if (state.lastPlacedDozens && state.lastPlacedDozens.length === 2) {
      const won = state.lastPlacedDozens.includes(hitDozen);

      if (won) {
        // Win: Decrease level by 1, or reset if in overall session profit
        if (bankroll > state.startingBankroll) {
          state.level = 1;
        } else {
          state.level = Math.max(1, state.level - 1);
        }
      } else {
        // Loss: Increase level by 2 units
        state.level += 2;
      }
    }

    // Update tracked dozens to follow the winner (ignoring zero)
    if (hitDozen !== 0) {
      if (!state.trackedDozens.includes(hitDozen)) {
        // Replace the oldest tracked dozen with the latest hit dozen
        state.trackedDozens = [state.trackedDozens[1], hitDozen];
      }
    }

    state.lastSpinCount = spinHistory.length;
  }

  // 3. Calculate stake per dozen
  let betAmount = unit * state.level;
  betAmount = Math.max(betAmount, minOutside);
  betAmount = Math.min(betAmount, maxBet);

  const totalRequired = betAmount * 2;
  if (bankroll < totalRequired) {
    // Insufficient bankroll to place both bets
    return [];
  }

  // 4. Construct bets for the two tracked dozens
  const activeDozens = state.trackedDozens && state.trackedDozens.length === 2
    ? state.trackedDozens
    : [1, 2];

  state.lastPlacedDozens = [...activeDozens];

  return [
    { type: 'dozen', value: activeDozens[0], amount: betAmount },
    { type: 'dozen', value: activeDozens[1], amount: betAmount }
  ];
}