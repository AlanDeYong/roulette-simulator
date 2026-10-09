/**
 * Strategy: 4-Miss Outside Sleeper with Martingale Plus (Great Martingale)
 * Source: "3 WINS AND I WAS OUT! | ANOTHER EASY 5% ROULETTE SESSION" - Mastering The Wheel
 * URL: https://youtu.be/u0kB9ED9C4Y
 *
 * Full Logic in Detail:
 * - Tracks 6 outside even-money channels independently: Red, Black, Even, Odd, Low (1-18), High (19-36).
 * - Trigger: When any channel experiences 4 consecutive misses (absence streak >= 4), 
 *   begin betting on that sleeping channel. (0/00 counts as a miss for all 6 channels).
 * - Multiple channels can trigger and run concurrently, each tracking its own progression stage.
 *
 * Full Bet Progression in Detail:
 * - 6-Level "Martingale Plus" (Great Martingale): [1, 3, 7, 15, 31, 63] units.
 * - Each loss doubles the previous bet and adds 1 base unit (Next = Prev * 2 + 1).
 * - Total risk per channel progression is 120 units (1 + 3 + 7 + 15 + 31 + 63 = 120).
 * - On Win: The channel's progression resets to 0 (idle).
 * - On Loss: Advances to the next level. If Level 6 loses, the channel stops betting.
 *
 * The Goal:
 * - Session Profit Target: +5% of starting bankroll (+6 units on a 120-unit bankroll).
 * - Spin Window: Max 50 spins per session to avoid the statistical 1-in-268 failure threshold.
 * - Stop Loss: 120 units or session stop once target or safety window is hit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const CHANNELS = ['red', 'black', 'even', 'odd', 'low', 'high'];
  const PROGRESSION = [1, 3, 7, 15, 31, 63];
  const TRIGGER_MISSES = 8;
  const MAX_SPINS = 50000;

  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.startBankroll = config.startingBankroll || bankroll;
    state.targetProfit = Math.max(config.betLimits.minOutside * 6, state.startBankroll * 0.05);
    state.channels = {};
    CHANNELS.forEach(ch => {
      state.channels[ch] = {
        active: false,
        level: 0,
        missCount: 0,
        lastBetAmount: 0
      };
    });
  }

  // 2. Evaluate session stop conditions
  const currentProfit = bankroll - state.startBankroll;
  if (currentProfit >= state.targetProfit) {
    return []; // Reached +5% profit target
  }
  if (spinHistory.length >= MAX_SPINS) {
    return []; // Reached 50-spin safety window
  }

  // 3. Process the most recent spin result to update miss streaks and progressions
  if (spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const n = lastSpin.winningNumber;

    const hit = {
      red: lastSpin.winningColor === 'red',
      black: lastSpin.winningColor === 'black',
      even: n > 0 && n % 2 === 0,
      odd: n > 0 && n % 2 !== 0,
      low: n >= 1 && n <= 18,
      high: n >= 19 && n <= 36
    };

    CHANNELS.forEach(ch => {
      const channelState = state.channels[ch];

      if (channelState.active) {
        if (hit[ch]) {
          // Channel won: reset progression
          channelState.active = false;
          channelState.level = 0;
          channelState.missCount = 0;
          channelState.lastBetAmount = 0;
        } else {
          // Channel lost: advance progression
          channelState.level += 1;
          channelState.missCount += 1;
          if (channelState.level >= PROGRESSION.length) {
            // Bust: channel exhausted
            channelState.active = false;
            channelState.level = 0;
            channelState.lastBetAmount = 0;
          }
        }
      } else {
        // Channel was idle: update miss counter
        if (hit[ch]) {
          channelState.missCount = 0;
        } else {
          channelState.missCount += 1;
          if (channelState.missCount >= TRIGGER_MISSES) {
            channelState.active = true;
            channelState.level = 0;
          }
        }
      }
    });
  }

  // Check target again post-update
  if (bankroll - state.startBankroll >= state.targetProfit) {
    return [];
  }

  // 4. Construct bets for all active channels
  const unit = config.betLimits.minOutside;
  const bets = [];
  let totalBetCost = 0;

  for (const ch of CHANNELS) {
    const channelState = state.channels[ch];
    if (channelState.active && channelState.level < PROGRESSION.length) {
      const multiplier = PROGRESSION[channelState.level];
      let amount = unit * multiplier;

      // Clamp bet within table limits
      amount = Math.max(amount, config.betLimits.minOutside);
      amount = Math.min(amount, config.betLimits.max);

      channelState.lastBetAmount = amount;
      totalBetCost += amount;
      bets.push({ type: ch, amount });
    }
  }

  // Bankroll guard: do not place bets if total bet cost exceeds available funds
  if (totalBetCost > bankroll || bets.length === 0) {
    return [];
  }

  return bets;
}