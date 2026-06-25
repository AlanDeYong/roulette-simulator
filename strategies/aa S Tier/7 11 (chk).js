/**
 * 7-11 Roulette Strategy
 * * Source: https://youtu.be/s858C9o2Z4M (Bet With Mo)
 * * The Full Logic:
 * This strategy relies on an 8-level progression to methodically cover a large portion of the board, 
 * focusing on the 2nd column accompanied by specific corners and streets.
 * - On a Win: If the current bankroll hits a new session peak (all losses recovered + profit), the 
 * progression resets to Level 1. If it is a win but the bankroll is NOT at a peak (meaning the 
 * session is still recovering from a deep drawdown), you stay at the same level (rebet).
 * - On a Loss: Move to the next level in the progression array.
 * - On a Push: Rebet at the current level.
 * - On a Level 8 Loss: The progression resets back to Level 1.
 * * The Full Bet Progression (Units):
 * Level 1 (3u): 1u on Corner 1, 1u on Street 4, 1u on Col 2
 * Level 2 (6u): Add 1u on Corner 8, 1u on Street 10, add 1u to Col 2
 * Level 3 (18u): Add 1u on Corner 13, 1u on Street 16, add 1u to Col 2. Double all current bets.
 * Level 4 (24u): Add 2u on Corner 20, 2u on Street 22, add 2u to Col 2.
 * Level 5 (60u): Add 2u on Corner 25, 2u on Street 28, add 2u to Col 2. Double all current bets.
 * Level 6 (120u): Increase all corners/streets by 5u, add 10u to Col 2
 * Level 7 (180u): Increase all corners/streets by 5u, add 10u to Col 2
 * Level 8 (300u): Increase all corners/streets by 10u, add 20u to Col 2
 * * The Goal:
 * Safely grind out profits by aggressively covering a vast majority of the board numbers. The progressive 
 * board coverage and bet size multipliers are designed to rapidly recover drawdowns. The stop-loss is an 
 * 8-level break, and the reset condition is strictly tied to hitting a new session peak profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const levels = [
    // Level 1: 3 units
    [
      { type: 'corner', value: 1, amount: 1 },
      { type: 'street', value: 4, amount: 1 },
      { type: 'column', value: 2, amount: 1 }
    ],
    // Level 2: 6 units
    [
      { type: 'corner', value: 1, amount: 1 },
      { type: 'corner', value: 8, amount: 1 },
      { type: 'street', value: 4, amount: 1 },
      { type: 'street', value: 10, amount: 1 },
      { type: 'column', value: 2, amount: 2 }
    ],
    // Level 3: 18 units
    [
      { type: 'corner', value: 1, amount: 2 },
      { type: 'corner', value: 8, amount: 2 },
      { type: 'corner', value: 13, amount: 2 },
      { type: 'street', value: 4, amount: 2 },
      { type: 'street', value: 10, amount: 2 },
      { type: 'street', value: 16, amount: 2 },
      { type: 'column', value: 2, amount: 6 }
    ],
    // Level 4: 24 units
    [
      { type: 'corner', value: 1, amount: 2 },
      { type: 'corner', value: 8, amount: 2 },
      { type: 'corner', value: 13, amount: 2 },
      { type: 'corner', value: 20, amount: 2 },
      { type: 'street', value: 4, amount: 2 },
      { type: 'street', value: 10, amount: 2 },
      { type: 'street', value: 16, amount: 2 },
      { type: 'street', value: 22, amount: 2 },
      { type: 'column', value: 2, amount: 8 }
    ],
    // Level 5: 60 units
    [
      { type: 'corner', value: 1, amount: 4 },
      { type: 'corner', value: 8, amount: 4 },
      { type: 'corner', value: 13, amount: 4 },
      { type: 'corner', value: 20, amount: 4 },
      { type: 'corner', value: 25, amount: 4 },
      { type: 'street', value: 4, amount: 4 },
      { type: 'street', value: 10, amount: 4 },
      { type: 'street', value: 16, amount: 4 },
      { type: 'street', value: 22, amount: 4 },
      { type: 'street', value: 28, amount: 4 },
      { type: 'column', value: 2, amount: 20 }
    ],
    // Level 6: 120 units
    [
      { type: 'corner', value: 1, amount: 9 },
      { type: 'corner', value: 8, amount: 9 },
      { type: 'corner', value: 13, amount: 9 },
      { type: 'corner', value: 20, amount: 9 },
      { type: 'corner', value: 25, amount: 9 },
      { type: 'street', value: 4, amount: 9 },
      { type: 'street', value: 10, amount: 9 },
      { type: 'street', value: 16, amount: 9 },
      { type: 'street', value: 22, amount: 9 },
      { type: 'street', value: 28, amount: 9 },
      { type: 'column', value: 2, amount: 30 }
    ],
    // Level 7: 180 units
    [
      { type: 'corner', value: 1, amount: 14 },
      { type: 'corner', value: 8, amount: 14 },
      { type: 'corner', value: 13, amount: 14 },
      { type: 'corner', value: 20, amount: 14 },
      { type: 'corner', value: 25, amount: 14 },
      { type: 'street', value: 4, amount: 14 },
      { type: 'street', value: 10, amount: 14 },
      { type: 'street', value: 16, amount: 14 },
      { type: 'street', value: 22, amount: 14 },
      { type: 'street', value: 28, amount: 14 },
      { type: 'column', value: 2, amount: 40 }
    ],
    // Level 8: 300 units
    [
      { type: 'corner', value: 1, amount: 24 },
      { type: 'corner', value: 8, amount: 24 },
      { type: 'corner', value: 13, amount: 24 },
      { type: 'corner', value: 20, amount: 24 },
      { type: 'corner', value: 25, amount: 24 },
      { type: 'street', value: 4, amount: 24 },
      { type: 'street', value: 10, amount: 24 },
      { type: 'street', value: 16, amount: 24 },
      { type: 'street', value: 22, amount: 24 },
      { type: 'street', value: 28, amount: 24 },
      { type: 'column', value: 2, amount: 60 }
    ]
  ];

  // 1. Initialize variables and state tracking
  if (state.peakBankroll === undefined) {
    state.peakBankroll = bankroll;
    state.level = 0;
  }

  // 2. Process win/loss triggers based on preceding bankroll change
  if (state.lastBankroll !== undefined && spinHistory.length > 0) {
    if (bankroll > state.lastBankroll) {
      // Net Win detected
      if (bankroll >= state.peakBankroll) {
        state.peakBankroll = bankroll;
        state.level = 0; // Peak hit, reset progression
      }
      // If won but didn't beat peak, do nothing (rebet same level)
    } else if (bankroll < state.lastBankroll) {
      // Net Loss detected
      state.level++;
      if (state.level >= levels.length) {
        state.level = 0; // Progression failed, reset to Level 1
      }
    }
    // Net Push: bankroll is unchanged. Do nothing (rebet same level)
  }

  // 3. Save bankroll baseline for next calculation
  state.lastBankroll = bankroll;

  // 4. Generate Bets & Clamp to Limits
  const baseUnit = config.betLimits.min;
  const currentProgression = levels[state.level];
  const betsToPlace = [];

  for (const betObj of currentProgression) {
    let amount = betObj.amount * baseUnit;
    
    // Clamp limits specifically depending on outside vs inside
    if (betObj.type === 'column') {
      amount = Math.max(amount, config.betLimits.minOutside);
    } else {
      amount = Math.max(amount, config.betLimits.min);
    }
    amount = Math.min(amount, config.betLimits.max);

    betsToPlace.push({
      type: betObj.type,
      value: betObj.value,
      amount: amount
    });
  }

  return betsToPlace;
}