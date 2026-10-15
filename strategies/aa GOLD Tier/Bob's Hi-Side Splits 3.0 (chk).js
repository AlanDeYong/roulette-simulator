/**
 * Bob's Hi-Side Splits 3.0 Roulette Strategy
 * 
 * Source: https://youtu.be/9Fbp-IGhr5o
 * YouTube Channel: The Roulette Factory
 * 
 * The Full Logic in Details:
 * 1. Target & Triggers:
 *    - The strategy focuses on covering the 'high' outside bet (19-36) while progressively 
 *      layering inside bets (Double Streets, Corners, Single Streets, Vertical Splits, and 
 *      Horizontal Splits) on losses to ensure every winning hit on a High number yields net profit.
 *    - Starts at Level 1 with 1 unit on 'high'.
 *    - On WIN: If session profit achieves a new overall session high (or net profit), reset to Level 1.
 *      Otherwise, hold/repeat current progression level.
 *    - On LOSS: Advance 1 level up in the 58-level negative progression sequence.
 * 
 * 2. The Full Bet Progression in Details:
 *    - The progression spans 58 levels.
 *    - Inside bets receive a fixed base unit (1 unit each), while the 'high' outside bet size
 *      gradually increases (e.g., $1 -> $2 -> $3 -> $4 -> $5 -> $6 -> $7 -> $8 -> $9 -> $10 -> $11 ... up to $75).
 *    - Inside Bet Addition Order across levels:
 *      a. Non-overlapping Double Streets (31-36, 25-30, 19-24)
 *      b. Overlapping Double Streets (28-33, 22-27)
 *      c. Flank/Outside Corners (32-36 area, 20-24 area)
 *      d. Single Streets on outer edges (34-36, 19-21, 31-33, 22-24, 28-30, 25-27)
 *      e. Remaining Corners filling gaps
 *      f. Vertical Splits (outer edges then middle)
 *      g. Horizontal Splits (outer edges then middle)
 *      h. Beyond Level 48 (max inside coverage): Keep maximum inside coverage and escalate 'high' bet size.
 * 
 * 3. The Goal:
 *    - Continually achieve new session profit highs and reset to base level, leveraging deep 58-level
 *      recovery resilience to endure long low-number dry spells.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine Unit Sizes based on Bet Limits
  const baseOutsideUnit = Math.max(config.betLimits.minOutside, 1);
  const baseInsideUnit = Math.max(config.betLimits.min, 1);

  // 2. Initialize Persistent State
  if (state.level === undefined) {
    state.level = 1;
    state.initialBankroll = bankroll;
    state.sessionHigh = bankroll;
  }

  // Update Bankroll & Session High Tracking after spins
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    
    if (bankroll > state.sessionHigh) {
      state.sessionHigh = bankroll;
      state.level = 1; // Reset to base level on new session profit high
    } else {
      // Determine if last spin was a loss or insufficient win to reach new high
      const lastNum = lastResult.winningNumber;
      if (lastNum < 19) {
        // Loss on low number (1-18 or 0/00) -> Advance progression level
        state.level = Math.min(state.level + 1, 58);
      }
      // On High number hit, if it didn't achieve session high, stay on current level
    }
  }

  // 3. Helper to clamp bet amounts to config limits
  function clampOutside(amt) {
    return Math.min(Math.max(amt, config.betLimits.minOutside), config.betLimits.max);
  }

  function clampInside(amt) {
    return Math.min(Math.max(amt, config.betLimits.min), config.betLimits.max);
  }

  // 4. Map Level to High Bet Units & Inside Bet Structures
  // High bet multipliers per progression level (1 to 58)
  const highUnits = [
    1, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11,
    11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20,
    21, 23, 26, 30, 35, 41, 48, 56, 65, 75, 85, 95, 105, 115, 125
  ];

  const currentLevel = Math.min(Math.max(state.level, 1), 58);
  const highBetAmount = clampOutside(highUnits[currentLevel - 1] * baseOutsideUnit);

  const bets = [
    { type: 'high', amount: highBetAmount }
  ];

  // Inside Bets Definition Schedule (Added sequentially as level increases)
  const insideBetSchedule = [
    // Step 2-4: Non-overlapping Double Streets
    { level: 2, bet: { type: 'line', value: 31 } }, // 31-36
    { level: 3, bet: { type: 'line', value: 25 } }, // 25-30
    { level: 4, bet: { type: 'line', value: 19 } }, // 19-24

    // Step 5-6: Overlapping Double Streets
    { level: 5, bet: { type: 'line', value: 28 } }, // 28-33
    { level: 6, bet: { type: 'line', value: 22 } }, // 22-27

    // Step 7-10: Flank Corners
    { level: 7, bet: { type: 'corner', value: 32 } }, // 32,33,35,36
    { level: 8, bet: { type: 'corner', value: 31 } }, // 31,32,34,35
    { level: 9, bet: { type: 'corner', value: 20 } }, // 20,21,23,24
    { level: 10, bet: { type: 'corner', value: 19 } }, // 19,20,22,23

    // Step 11-16: Single Streets (Edges first for full high-side profit coverage)
    { level: 11, bet: { type: 'street', value: 34 } }, // 34-36
    { level: 12, bet: { type: 'street', value: 19 } }, // 19-21
    { level: 13, bet: { type: 'street', value: 31 } }, // 31-33
    { level: 14, bet: { type: 'street', value: 22 } }, // 22-24
    { level: 15, bet: { type: 'street', value: 28 } }, // 28-30
    { level: 16, bet: { type: 'street', value: 25 } }, // 25-27

    // Step 17-20: Fill Middle Corners
    { level: 17, bet: { type: 'corner', value: 29 } }, // 29,30,32,33
    { level: 18, bet: { type: 'corner', value: 28 } }, // 28,29,31,32
    { level: 19, bet: { type: 'corner', value: 23 } }, // 23,24,26,27
    { level: 20, bet: { type: 'corner', value: 22 } }, // 22,23,25,26

    // Step 21-28: Vertical Splits
    { level: 21, bet: { type: 'split', value: [34, 35] } },
    { level: 22, bet: { type: 'split', value: [35, 36] } },
    { level: 23, bet: { type: 'split', value: [19, 20] } },
    { level: 24, bet: { type: 'split', value: [20, 21] } },
    { level: 25, bet: { type: 'split', value: [31, 32] } },
    { level: 26, bet: { type: 'split', value: [32, 33] } },
    { level: 27, bet: { type: 'split', value: [22, 23] } },
    { level: 28, bet: { type: 'split', value: [23, 24] } },

    // Step 29-36: Remaining Vertical Splits
    { level: 29, bet: { type: 'split', value: [28, 29] } },
    { level: 30, bet: { type: 'split', value: [29, 30] } },
    { level: 31, bet: { type: 'split', value: [25, 26] } },
    { level: 32, bet: { type: 'split', value: [26, 27] } },
    { level: 33, bet: { type: 'split', value: [22, 25] } },
    { level: 34, bet: { type: 'split', value: [23, 26] } },
    { level: 35, bet: { type: 'split', value: [24, 27] } },
    { level: 36, bet: { type: 'split', value: [28, 31] } },

    // Step 37-48: Horizontal Splits
    { level: 37, bet: { type: 'split', value: [29, 32] } },
    { level: 38, bet: { type: 'split', value: [30, 33] } },
    { level: 39, bet: { type: 'split', value: [31, 34] } },
    { level: 40, bet: { type: 'split', value: [32, 35] } },
    { level: 41, bet: { type: 'split', value: [33, 36] } },
    { level: 42, bet: { type: 'split', value: [19, 22] } },
    { level: 43, bet: { type: 'split', value: [20, 23] } },
    { level: 44, bet: { type: 'split', value: [21, 24] } },
    { level: 45, bet: { type: 'split', value: [25, 28] } },
    { level: 46, bet: { type: 'split', value: [26, 29] } },
    { level: 47, bet: { type: 'split', value: [27, 30] } },
    { level: 48, bet: { type: 'split', value: [22, 25] } }
  ];

  // 5. Append inside bets applicable up to the current level
  for (let i = 0; i < insideBetSchedule.length; i++) {
    if (currentLevel >= insideBetSchedule[i].level) {
      const betObj = Object.assign({}, insideBetSchedule[i].bet, {
        amount: clampInside(baseInsideUnit)
      });
      bets.push(betObj);
    }
  }

  return bets;
}