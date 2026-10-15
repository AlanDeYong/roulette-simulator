/**
 * -----------------------------------------------------------------------------------------
 * Roulette Strategy: 18 Number Elimination (Modification 1 - Color Splits)
 * Source:
 *   - Video: https://youtu.be/EzOtZPhzPjs
 *   - Channel: The Roulette Factory
 *   - Title: BRACKET CHALLENGE WINNER - NEW MODIFICATIONS!
 * 
 * Full Logic in Detail:
 *   - The strategy covers 18 numbers using 9 same-color adjacent split bets:
 *       Red Splits:   [9, 12], [16, 19], [18, 21], [27, 30]
 *       Black Splits: [8, 11], [10, 13], [17, 20], [26, 29], [28, 31]
 *   - On start: Places 1 base inside unit on all 9 splits.
 *   - At base stake, flat bet on wins, update session bankroll high, and reset lossCount on win.
 *   - Upon a loss, recovery mode activates to track both losses and wins.
 * 
 * Full Bet Progression in Detail:
 *   - Base Bet Win Rule:
 *       Any win at base stake resets lossCount to 0.
 *   - Loss Rule:
 *       Count losses during recovery. When 2 losses accumulate (need not be consecutive):
 *       1. Double the bet multiplier (multiplier *= 2).
 *       2. Reset loss counter to 0.
 *       3. Restore all previously removed split bets (resetting to 9 splits at the higher stake).
 *   - Win & Peel-Off Rule:
 *       If a win pushes current bankroll past sessionHigh:
 *       - Reset completely back to base: multiplier = 1, all 9 splits active, win/loss counts = 0.
 *       If bankroll remains <= sessionHigh:
 *       - Count wins. When 2 wins accumulate without a new session high:
 *         1. Peel off (remove) the split that just hit on the winning spin.
 *         2. Coverage floor is 6 splits (12 numbers). Do not peel below 6 active splits.
 *         3. Reset win counter to 0.
 * 
 * The Goal:
 *   - Lock in new session profit highs, continuously resetting to base stakes while buffering
 *     drawdowns through slowed doubling and selective peel-off margin expansion.
 * -----------------------------------------------------------------------------------------
 */

function bet(spinHistory, bankroll, config, state, utils) {
  const COLOR_SPLITS = [
    [9, 12],
    [16, 19],
    [18, 21],
    [27, 30],
    [8, 11],
    [10, 13],
    [17, 20],
    [26, 29],
    [28, 31]
  ];

  // 1. Initialize persistent state on session start
  if (!state.initialized) {
    state.initialized = true;
    state.sessionHigh = bankroll;
    state.inRecovery = false;
    state.multiplier = 1;
    state.lossCount = 0;
    state.winCount = 0;
    state.activeSplits = COLOR_SPLITS.map(pair => [...pair]);
  }

  // 2. Process previous spin outcome
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNumber = lastSpin.winningNumber;

    // Check if the winning number was covered by any of our active split bets
    const hitSplit = state.activeSplits.find(pair => pair.includes(winningNumber));
    const wasWin = Boolean(hitSplit);

    if (wasWin) {
      if (bankroll > state.sessionHigh) {
        // Reached a new session profit peak -> Full reset to base
        state.sessionHigh = bankroll;
        state.inRecovery = false;
        state.multiplier = 1;
        state.lossCount = 0;
        state.winCount = 0;
        state.activeSplits = COLOR_SPLITS.map(pair => [...pair]);
      } else if (state.inRecovery) {
        // Winning in recovery mode without new peak
        state.winCount += 1;

        // After 2 wins, peel off the last hit split if above minimum coverage (6 splits / 12 numbers)
        if (state.winCount >= 2) {
          if (state.activeSplits.length > 6) {
            const splitIndex = state.activeSplits.findIndex(pair => pair.includes(winningNumber));
            if (splitIndex !== -1) {
              state.activeSplits.splice(splitIndex, 1);
            } else {
              state.activeSplits.pop();
            }
          }
          state.winCount = 0;
        }
      } else {
        // Win at base level -> reset lossCount to 0 and maintain session high
        state.lossCount = 0;
        state.sessionHigh = Math.max(state.sessionHigh, bankroll);
      }
    } else {
      // Loss occurred -> enter recovery mode and track losses
      state.inRecovery = true;
      state.lossCount += 1;

      // After 2 accumulated losses, double the bet size and restore full coverage
      if (state.lossCount >= 2) {
        state.multiplier *= 2;
        state.lossCount = 0;
        state.activeSplits = COLOR_SPLITS.map(pair => [...pair]);
      }
    }
  }

  // 3. Calculate chip sizing per split respecting table limits
  const baseUnit = config.betLimits.min;
  let splitAmount = baseUnit * state.multiplier;
  splitAmount = Math.max(splitAmount, config.betLimits.min);
  splitAmount = Math.min(splitAmount, config.betLimits.max);

  // 4. Construct bets for all active splits
  const bets = state.activeSplits.map(pair => ({
    type: 'split',
    value: [...pair],
    amount: splitAmount
  }));

  // 5. Total bankroll availability check
  const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
  if (totalBetAmount > bankroll) {
    return [];
  }

  return bets;
}