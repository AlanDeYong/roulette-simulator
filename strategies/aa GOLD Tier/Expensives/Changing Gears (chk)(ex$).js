/**
 * Strategy: Changing Gears (Flat Betting + Triple Martingale Recovery)
 * Source: https://youtu.be/JHrSwFsWAKM (Channel: Mastering The Wheel)
 *
 * Full Logic in Detail:
 * - Evaluates the frequency of all single numbers (0-36) over a rolling window of the last 74 spins.
 * - Numbers are ranked from "hottest" (most frequent in the last 74 spins, with recency as tie-breaker) to coldest.
 * - Starts in Gear 1 (Level 1): Flat betting 1 unit each on the 18 hottest numbers (18 units total).
 * - Continuously tracks the `sessionHigh` bankroll.
 * - Profit Protection Trigger ("Changing Gears"): If the current bankroll drops by 54 units or more below
 *   `sessionHigh` (equivalent to 3 net losses at Level 1), the system locks in `sessionHigh` as the recovery
 *   target and shifts into Gear 2 (Recovery Mode, Levels 2-5).
 *
 * Full Bet Progression in Detail:
 * - Level 1: 1 unit on each of the 18 hottest numbers (18 units total).
 *   - Win/Loss: Stay at Level 1 unless drawdown from `sessionHigh` reaches >= 54 units -> Move to Level 2.
 * - Level 2: 3 units on each of the 22 hottest numbers (66 units total).
 *   - Win (+42u net): If `bankroll >= sessionHigh`, recovery is complete -> Reset to Level 1.
 *     Otherwise, stay at Level 2 until `sessionHigh` is reached.
 *   - Loss (-66u net): Move to Level 3.
 * - Level 3: 9 units on each of the 22 hottest numbers (198 units total).
 *   - Win (+126u net): If `bankroll >= sessionHigh`, reset to Level 1; otherwise move to Level 2.
 *   - Loss (-198u net): Move to Level 4.
 * - Level 4: 27 units on each of the 22 hottest numbers (594 units total).
 *   - Win (+378u net): If `bankroll >= sessionHigh`, reset to Level 1; otherwise move to Level 2.
 *   - Loss (-594u net): Move to Level 5.
 * - Level 5: 81 units on each of the 22 hottest numbers (1,782 units total).
 *   - Win (+1,134u net): If `bankroll >= sessionHigh`, reset to Level 1; otherwise move to Level 2.
 *   - Loss (-1,782u net): Progression limit reached -> Reset `sessionHigh` to current `bankroll` and return to Level 1.
 *
 * The Goal:
 * - Capitalize on hot number trends with low-risk flat bets on 18 numbers, using a high-coverage (22-number)
 *   Triple Martingale recovery gear only when down 3 flat bets (54 units) from the session peak.
 * - Designed for a 2,665-unit bankroll targeting a 5% session profit (130 units).
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const baseUnit = config.betLimits.min;
  const maxBet = config.betLimits.max;
  const windowSize = 74;
  const recoveryTriggerThreshold = 54 * baseUnit;

  // Define the 5 levels configured in Bet Master
  const levels = {
    1: { count: 18, units: 1 },
    2: { count: 22, units: 3 },
    3: { count: 22, units: 9 },
    4: { count: 22, units: 27 },
    5: { count: 22, units: 81 }
  };

  // Initialize persistent state on the first spin
  if (!state.initialized) {
    state.initialized = true;
    state.level = 1;
    state.inRecovery = false;
    state.sessionHigh = bankroll;
    state.recoveryTarget = bankroll;
    state.lastBankroll = bankroll;
  }

  // Update progression state after the first spin
  if (spinHistory.length > 0 && state.lastBetPlaced) {
    const wonLastSpin = bankroll > state.lastBankroll;

    // Update session high whenever a new peak is achieved
    if (bankroll > state.sessionHigh) {
      state.sessionHigh = bankroll;
    }

    if (!state.inRecovery) {
      // Gear 1 (Level 1): Check if drawdown from sessionHigh reached 54 units
      const drawdown = state.sessionHigh - bankroll;
      if (drawdown >= recoveryTriggerThreshold) {
        state.inRecovery = true;
        state.recoveryTarget = state.sessionHigh;
        state.level = 2;
      } else {
        state.level = 1;
      }
    } else {
      // Gear 2 (Recovery Mode: Levels 2 to 5)
      if (bankroll >= state.recoveryTarget) {
        // Recovery target (previous session high) reached -> Return to Level 1
        state.inRecovery = false;
        state.level = 1;
        state.sessionHigh = bankroll;
      } else if (wonLastSpin) {
        // Won in recovery, but haven't reached the session high yet:
        // Level 2 action is "Stay Same"; Levels 3-5 action is "Go to Lv. 2"
        state.level = 2;
      } else {
        // Lost in recovery: advance to the next Triple Martingale level
        if (state.level < 5) {
          state.level += 1;
        } else {
          // Level 5 loss: stop/reset cycle to avoid infinite lock if bankroll remains
          state.inRecovery = false;
          state.level = 1;
          state.sessionHigh = bankroll;
        }
      }
    }
  }

  state.lastBankroll = bankroll;

  // Determine the hottest numbers over the last 74 spins
  const recentSpins = spinHistory.slice(-windowSize);
  const frequencies = new Array(37).fill(0);
  const lastSeenIndex = new Array(37).fill(-1);

  for (let i = 0; i < recentSpins.length; i++) {
    const num = recentSpins[i].winningNumber;
    if (num >= 0 && num <= 36) {
      frequencies[num]++;
      lastSeenIndex[num] = i;
    }
  }

  const allNumbers = Array.from({ length: 37 }, (_, i) => i);
  allNumbers.sort((a, b) => {
    if (frequencies[b] !== frequencies[a]) {
      return frequencies[b] - frequencies[a]; // Higher frequency first
    }
    if (lastSeenIndex[b] !== lastSeenIndex[a]) {
      return lastSeenIndex[b] - lastSeenIndex[a]; // More recently hit first
    }
    return a - b; // Fallback to numerical order
  });

  // Select current level parameters
  const currentConfig = levels[state.level];
  const selectedNumbers = allNumbers.slice(0, currentConfig.count);

  // Calculate and clamp per-number bet amount
  let betPerNumber = baseUnit * currentConfig.units;
  betPerNumber = Math.max(betPerNumber, config.betLimits.min);
  betPerNumber = Math.min(betPerNumber, maxBet);

  const totalBetRequired = betPerNumber * selectedNumbers.length;

  // Ensure sufficient bankroll to place the full bet layout
  if (bankroll < totalBetRequired) {
    // If bankroll cannot cover the recovery bet, reset to Level 1 if affordable, else stop
    const level1Total = baseUnit * levels[1].count;
    if (state.inRecovery && bankroll >= level1Total) {
      state.inRecovery = false;
      state.level = 1;
      state.sessionHigh = bankroll;
      const fallbackNumbers = allNumbers.slice(0, levels[1].count);
      state.lastBetPlaced = true;
      return fallbackNumbers.map((num) => ({
        type: 'number',
        value: num,
        amount: baseUnit
      }));
    }
    state.lastBetPlaced = false;
    return [];
  }

  state.lastBetPlaced = true;
  return selectedNumbers.map((num) => ({
    type: 'number',
    value: num,
    amount: betPerNumber
  }));
}