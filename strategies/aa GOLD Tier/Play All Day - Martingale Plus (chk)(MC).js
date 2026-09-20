/**
 * ============================================================================
 * Strategy Name: Play All Day - Martingale Plus (6-Level / 4-Miss Modified)
 * Channel:       Mastering The Wheel
 * Source URL:    https://youtu.be/RNvqegYb57c
 * ============================================================================
 * 
 * 1. THE FULL LOGIC IN DETAIL:
 *    - The strategy tracks all six 1:1 Outside bet propositions independently:
 *      1. Red ('red')
 *      2. Black ('black')
 *      3. Even ('even')
 *      4. Odd ('odd')
 *      5. Low 1-18 ('low')
 *      6. High 19-36 ('high')
 *    - For each proposition, the system tracks consecutive "misses". A miss occurs
 *      whenever the winning number is not covered by that proposition (including 0/00).
 *    - Trigger: When any proposition experiences 4 consecutive misses (e.g., 4 consecutive
 *      Red numbers mean Black has 4 misses), that proposition triggers and begins betting.
 *    - Multiple propositions can qualify and bet at the same time independently.
 * 
 * 2. THE FULL BET PROGRESSION IN DETAIL:
 *    - Type: Martingale Plus (Next Bet = 2 * Previous Bet + 1 unit).
 *    - Levels: 6 levels max per proposition:
 *        Level 1: 1 unit
 *        Level 2: 3 units  (1 * 2 + 1)
 *        Level 3: 7 units  (3 * 2 + 1)
 *        Level 4: 15 units (7 * 2 + 1)
 *        Level 5: 31 units (15 * 2 + 1)
 *        Level 6: 63 units (31 * 2 + 1)
 *      Total risk per proposition = 120 units.
 *    - On Win:
 *      - The active group resets to inactive (level 0).
 *      - Its miss counter resets to 0. It must wait for 4 new misses to trigger again.
 *    - On Loss:
 *      - The active group advances to the next progression level.
 *      - If it loses Level 6 (63 units), that group ceases betting (bust).
 * 
 * 3. THE GOAL & EXIT CONDITIONS:
 *    - Target Profit: 5% of allocated risk bankroll (e.g. 5% gain from startingBankroll).
 *    - Spin Window (Risk Management): Exit at 50 spins (20% of the 250-spin statistical
 *      risk window) to avoid overstaying and running into long adverse streaks.
 *    - Stop Loss: If bankroll falls below the amount needed for the next active bets.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  const BET_GROUPS = ['red', 'black', 'even', 'odd', 'low', 'high'];
  const MULTIPLIERS = [1, 3, 7, 15, 31, 63]; // 6-level Martingale Plus
  const TRIGGER_MISSES = 10;
  const MAX_SPINS = 5000;
  const TARGET_PROFIT_PERCENT = 100; // 5% profit target

  // Base unit for outside bets clamped to table limits
  const baseUnit = config.betLimits.minOutside || 5;

  // 1. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.initialBankroll =1000//bankroll;
    state.targetProfit = bankroll * 100//TARGET_PROFIT_PERCENT;
    state.processedSpins = 0;
    state.channels = {};

    for (const group of BET_GROUPS) {
      state.channels[group] = {
        active: false,
        level: 0,      // 0-indexed: 0 to 5 corresponds to Levels 1 to 6
        misses: 0
      };
    }
  }

  // 2. Check Session Stop Conditions (Profit Target or Spin Cap)
  const currentProfit = bankroll - state.initialBankroll;
  if (currentProfit >= state.targetProfit) {
    return []; // Reached 5% profit target, stop session
  }

  if (spinHistory.length >= MAX_SPINS) {
    // If no active progressions are currently in flight, exit at the 50-spin window
    const hasActiveProgression = Object.values(state.channels).some(ch => ch.active);
    if (!hasActiveProgression) {
      return [];
    }
  }

  // 3. Process the Most Recent Spin (if new)
  if (spinHistory.length > state.processedSpins) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const n = lastSpin.winningNumber;
    const color = lastSpin.winningColor;

    // Helper: Determine if a specific proposition hit on this spin
    const hits = {
      red: color === 'red',
      black: color === 'black',
      even: n !== 0 && n % 2 === 0,
      odd: n !== 0 && n % 2 !== 0,
      low: n >= 1 && n <= 18,
      high: n >= 19 && n <= 36
    };

    // Update each independent channel
    for (const group of BET_GROUPS) {
      const ch = state.channels[group];
      const didHit = hits[group];

      if (ch.active) {
        if (didHit) {
          // Win: Reset progression and miss counter
          ch.active = false;
          ch.level = 0;
          ch.misses = 0;
        } else {
          // Loss: Advance to next Martingale Plus level
          ch.level += 1;
          if (ch.level >= MULTIPLIERS.length) {
            // Reached beyond level 6, stop betting this channel
            ch.active = false;
            ch.level = 0;
            ch.misses = 0;
          }
        }
      } else {
        // Channel is currently inactive, tracking misses
        if (didHit) {
          ch.misses = 0; // Reset streak of misses
        } else {
          ch.misses += 1;
          if (ch.misses >= TRIGGER_MISSES) {
            ch.active = true;
            ch.level = 0; // Trigger Level 1
          }
        }
      }
    }

    state.processedSpins = spinHistory.length;
  }

  // Re-check profit target after state update
  if (bankroll - state.initialBankroll >= state.targetProfit) {
    return [];
  }

  // 4. Construct Bets for all active channels
  const bets = [];

  for (const group of BET_GROUPS) {
    const ch = state.channels[group];
    if (ch.active && ch.level < MULTIPLIERS.length) {
      const multiplier = MULTIPLIERS[ch.level];
      let betAmount = baseUnit * multiplier;

      // Clamp bet to table limits
      betAmount = Math.max(betAmount, config.betLimits.minOutside);
      betAmount = Math.min(betAmount, config.betLimits.max);

      bets.push({
        type: group,
        amount: betAmount
      });
    }
  }

  // Verify bankroll sufficiency
  const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
  if (totalBetAmount > bankroll || bets.length === 0) {
    return [];
  }

  return bets;
}