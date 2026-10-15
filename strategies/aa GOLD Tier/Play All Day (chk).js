/**
 * Strategy: Play All Day Roulette System
 * Source: YouTube - "Play All Day Roulette System | We Almost Lost... But Hit Our 5%!" by Mastering The Wheel
 * URL: https://youtu.be/dMmfrN4eh0M
 *
 * Full Logic in Detail:
 * - Monitors all 6 outside even-money bet categories: Red, Black, Even, Odd, Low (1-18), and High (19-36).
 * - Tracks consecutive misses for each of the 6 options. Zero (0) counts as a miss for all even-money bets.
 * - When any option has missed 7 consecutive times (i.e., the opposing outcome or 0 has appeared 7 times in a row),
 *   that option triggers an active betting cycle.
 *
 * Full Bet Progression in Detail:
 * - A 7-level standard Martingale progression: [1, 2, 4, 8, 16, 32, 64] units.
 * - After a win on any active bet, that bet group immediately resets to idle (wait for 7 misses).
 * - After a loss, the active bet group advances to the next Martingale step (up to step 7).
 * - If step 7 loses, the progression stops for that group and resets to idle.
 *
 * The Goal:
 * - Target profit is 6 units (+5% profit target).
 * - Once reached or if the bankroll is depleted, stops betting.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const TARGET_PROFIT_UNITS = 6000;
  const TRIGGER_MISSES = 7;
  const MARTINGALE_STEPS = [1, 2, 4, 8, 16, 32, 64];

  const OUTSIDE_BETS = ['red', 'black', 'even', 'odd', 'low', 'high'];

  const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  function isHit(betType, number) {
    if (number === 0) return false;
    switch (betType) {
      case 'red':
        return RED_NUMBERS.includes(number);
      case 'black':
        return !RED_NUMBERS.includes(number);
      case 'even':
        return number % 2 === 0;
      case 'odd':
        return number % 2 !== 0;
      case 'low':
        return number >= 1 && number <= 18;
      case 'high':
        return number >= 19 && number <= 36;
      default:
        return false;
    }
  }

  // Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.startBankroll = bankroll;
    state.groups = {};
    for (const b of OUTSIDE_BETS) {
      state.groups[b] = {
        missStreak: 0,
        active: false,
        level: 0
      };
    }
  }

  const baseUnit = config.betLimits.minOutside || 1;

  // Check if session profit target has been achieved
  const currentProfit = bankroll - state.startBankroll;
  if (currentProfit >= TARGET_PROFIT_UNITS * baseUnit) {
    return [];
  }

  // Update streaks based on the latest spin
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    for (const b of OUTSIDE_BETS) {
      const won = isHit(b, winningNum);
      const group = state.groups[b];

      if (group.active) {
        if (won) {
          // Win: reset progression and miss streak
          group.active = false;
          group.level = 0;
          group.missStreak = 0;
        } else {
          // Loss: advance progression
          group.level += 1;
          if (group.level >= MARTINGALE_STEPS.length) {
            // Bust at level 7: stop and reset
            group.active = false;
            group.level = 0;
            group.missStreak = 0;
          }
        }
      } else {
        if (won) {
          group.missStreak = 0;
        } else {
          group.missStreak += 1;
          if (group.missStreak >= TRIGGER_MISSES) {
            group.active = true;
            group.level = 0;
          }
        }
      }
    }
  }

  // Build bet orders for all active groups
  const bets = [];
  let totalBetAmount = 0;

  for (const b of OUTSIDE_BETS) {
    const group = state.groups[b];
    if (group.active && group.level < MARTINGALE_STEPS.length) {
      const multiplier = MARTINGALE_STEPS[group.level];
      let amount = baseUnit * multiplier;

      // Clamp bet within table limits
      amount = Math.max(amount, config.betLimits.minOutside || 1);
      amount = Math.min(amount, config.betLimits.max);

      bets.push({ type: b, amount });
      totalBetAmount += amount;
    }
  }

  // Stop placing bets if insufficient bankroll
  if (totalBetAmount > bankroll) {
    return [];
  }

  return bets;
}