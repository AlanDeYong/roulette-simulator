/**
 * 212 SPLITS - ROULETTE STRATEGY (CORRECTED 8-LEVEL SYSTEM)
 * 
 * Source:
 * - Channel: Bet With Mo
 * - Video URL: https://youtu.be/gIiYuH4ul4Q
 * 
 * Full Logic in Details:
 * The strategy builds patterns across the board, starting either from the left side (Streets 1, 4, 7...) 
 * or the right side (Streets 34, 31, 28...). On consecutive losses, new zones are added to the board 
 * along with specific unit multipliers or level scale increments:
 * 
 * Progression Levels & Pattern Layouts:
 * - Level 1 ($6 total):
 *   - Left: 2 units on Streets 1, 7; 1 unit on Street 4; 1 unit on Split [4,5].
 *   - Right: 2 units on Streets 34, 28; 1 unit on Street 31; 1 unit on Split [31,32].
 * - Level 2 ($12 total):
 *   - Same positions as Level 1, with bets doubled / added.
 * - Level 3 ($36 total):
 *   - Adds Zone 2 (Streets 10, 16, Street 13, Split [13,14] on left side; 25, 19, 22, Split [22,23] on right side).
 *   - Adds Zone 3 (Streets 19, 25, Street 22, Split [22,23] on left side; 16, 10, 13, Split [13,14] on right side).
 *   - All active positions doubled up.
 * - Levels 4, 5, 6 ($54, $72, $90 total):
 *   - Increase all bets incrementally by their respective base amounts per level.
 * - Level 7 ($180 total):
 *   - Double up all existing bets from Level 6.
 * - Level 8 ($270 total):
 *   - Switch to +5 unit base step scaling (+5 units on splits and 1-unit streets; +10 units on 2-unit streets across all 3 zones).
 * 
 * Win / Reset Logic:
 * - On Win: Rebet at current level if bankroll peak profit is not reached. Once new peak profit is reached, reset to Level 1 and switch sides.
 * - On Loss: Advance to next level in sequence (Level 1 -> 8).
 * 
 * Goal:
 * Achieve new bankroll peak profit and reset levels systematically.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. State Initialization
  if (state.level === undefined) state.level = 1;
  if (state.side === undefined) state.side = 'left'; // 'left' or 'right'
  if (state.peakProfit === undefined) state.peakProfit = bankroll;

  const unit = config.betLimits.min;

  // Track Peak Bankroll
  if (bankroll > state.peakProfit) {
    state.peakProfit = bankroll;
  }

  // 2. Evaluate Spin History
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    // Retrieve active bet coverage from current state level and side
    const activeBets = getBetsForLevel(state.level, state.side, unit);
    let isWin = false;

    for (const b of activeBets) {
      if (b.type === 'street') {
        const startNum = b.value;
        if (winningNum >= startNum && winningNum <= startNum + 2) {
          isWin = true;
          break;
        }
      } else if (b.type === 'split') {
        if (Array.isArray(b.value) && b.value.includes(winningNum)) {
          isWin = true;
          break;
        }
      }
    }

    if (isWin) {
      // Rebet if peak profit not reached, else reset and switch sides
      if (bankroll >= state.peakProfit) {
        state.level = 1;
        state.side = state.side === 'left' ? 'right' : 'left';
      }
    } else {
      // Advance to next progression level (1 to 8)
      state.level = Math.min(8, state.level + 1);
    }
  }

  // 3. Generate Bets for Current Level
  const bets = getBetsForLevel(state.level, state.side, unit);

  // 4. Validate Total Bet Amount & Apply Limits
  let totalBetAmount = 0;
  for (const b of bets) {
    b.amount = Math.min(Math.max(b.amount, config.betLimits.min), config.betLimits.max);
    totalBetAmount += b.amount;
  }

  if (bankroll < totalBetAmount) {
    return [];
  }

  return bets;
}

/**
 * Helper function to map exact bet positions and unit multipliers for levels 1-8
 */
function getBetsForLevel(level, side, unit) {
  const bets = [];

  if (side === 'left') {
    // Zone 1 (Streets 1, 7 [2 units], Street 4 [1 unit], Split 4/5 [1 unit])
    if (level >= 1) {
      let mult = 1;
      if (level === 2) mult = 2;
      if (level === 3) mult = 4;
      if (level === 4) mult = 6;
      if (level === 5) mult = 8;
      if (level === 6) mult = 10;
      if (level === 7) mult = 20;

      if (level === 8) {
        bets.push({ type: 'street', value: 1, amount: unit * 45 });
        bets.push({ type: 'street', value: 7, amount: unit * 45 });
        bets.push({ type: 'street', value: 4, amount: unit * 22.5 });
        bets.push({ type: 'split', value: [4, 5], amount: unit * 22.5 });
      } else {
        bets.push({ type: 'street', value: 1, amount: unit * 2 * mult });
        bets.push({ type: 'street', value: 7, amount: unit * 2 * mult });
        bets.push({ type: 'street', value: 4, amount: unit * 1 * mult });
        bets.push({ type: 'split', value: [4, 5], amount: unit * 1 * mult });
      }
    }

    // Zone 2 (Streets 10, 16 [2 units], Street 13 [1 unit], Split 13/14 [1 unit])
    if (level >= 3) {
      let mult = 1;
      if (level === 3) mult = 2;
      if (level === 4) mult = 3;
      if (level === 5) mult = 4;
      if (level === 6) mult = 5;
      if (level === 7) mult = 10;

      if (level === 8) {
        bets.push({ type: 'street', value: 10, amount: unit * 45 });
        bets.push({ type: 'street', value: 16, amount: unit * 45 });
        bets.push({ type: 'street', value: 13, amount: unit * 22.5 });
        bets.push({ type: 'split', value: [13, 14], amount: unit * 22.5 });
      } else {
        bets.push({ type: 'street', value: 10, amount: unit * 2 * mult });
        bets.push({ type: 'street', value: 16, amount: unit * 2 * mult });
        bets.push({ type: 'street', value: 13, amount: unit * 1 * mult });
        bets.push({ type: 'split', value: [13, 14], amount: unit * 1 * mult });
      }
    }

    // Zone 3 (Streets 19, 25 [2 units], Street 22 [1 unit], Split 22/23 [1 unit])
    if (level >= 3) {
      let mult = 1;
      if (level === 3) mult = 2;
      if (level === 4) mult = 3;
      if (level === 5) mult = 4;
      if (level === 6) mult = 5;
      if (level === 7) mult = 10;

      if (level === 8) {
        bets.push({ type: 'street', value: 19, amount: unit * 45 });
        bets.push({ type: 'street', value: 25, amount: unit * 45 });
        bets.push({ type: 'street', value: 22, amount: unit * 22.5 });
        bets.push({ type: 'split', value: [22, 23], amount: unit * 22.5 });
      } else {
        bets.push({ type: 'street', value: 19, amount: unit * 2 * mult });
        bets.push({ type: 'street', value: 25, amount: unit * 2 * mult });
        bets.push({ type: 'street', value: 22, amount: unit * 1 * mult });
        bets.push({ type: 'split', value: [22, 23], amount: unit * 1 * mult });
      }
    }
  } else {
    // RIGHT SIDE (Mirrored Positions)
    // Zone 1 Right (Streets 34, 28 [2 units], Street 31 [1 unit], Split 31/32 [1 unit])
    if (level >= 1) {
      let mult = 1;
      if (level === 2) mult = 2;
      if (level === 3) mult = 4;
      if (level === 4) mult = 6;
      if (level === 5) mult = 8;
      if (level === 6) mult = 10;
      if (level === 7) mult = 20;

      if (level === 8) {
        bets.push({ type: 'street', value: 34, amount: unit * 45 });
        bets.push({ type: 'street', value: 28, amount: unit * 45 });
        bets.push({ type: 'street', value: 31, amount: unit * 22.5 });
        bets.push({ type: 'split', value: [31, 32], amount: unit * 22.5 });
      } else {
        bets.push({ type: 'street', value: 34, amount: unit * 2 * mult });
        bets.push({ type: 'street', value: 28, amount: unit * 2 * mult });
        bets.push({ type: 'street', value: 31, amount: unit * 1 * mult });
        bets.push({ type: 'split', value: [31, 32], amount: unit * 1 * mult });
      }
    }

    // Zone 2 Right (Streets 25, 19 [2 units], Street 22 [1 unit], Split 22/23 [1 unit])
    if (level >= 3) {
      let mult = 1;
      if (level === 3) mult = 2;
      if (level === 4) mult = 3;
      if (level === 5) mult = 4;
      if (level === 6) mult = 5;
      if (level === 7) mult = 10;

      if (level === 8) {
        bets.push({ type: 'street', value: 25, amount: unit * 45 });
        bets.push({ type: 'street', value: 19, amount: unit * 45 });
        bets.push({ type: 'street', value: 22, amount: unit * 22.5 });
        bets.push({ type: 'split', value: [22, 23], amount: unit * 22.5 });
      } else {
        bets.push({ type: 'street', value: 25, amount: unit * 2 * mult });
        bets.push({ type: 'street', value: 19, amount: unit * 2 * mult });
        bets.push({ type: 'street', value: 22, amount: unit * 1 * mult });
        bets.push({ type: 'split', value: [22, 23], amount: unit * 1 * mult });
      }
    }

    // Zone 3 Right (Streets 16, 10 [2 units], Street 13 [1 unit], Split 13/14 [1 unit])
    if (level >= 3) {
      let mult = 1;
      if (level === 3) mult = 2;
      if (level === 4) mult = 3;
      if (level === 5) mult = 4;
      if (level === 6) mult = 5;
      if (level === 7) mult = 10;

      if (level === 8) {
        bets.push({ type: 'street', value: 16, amount: unit * 45 });
        bets.push({ type: 'street', value: 10, amount: unit * 45 });
        bets.push({ type: 'street', value: 13, amount: unit * 22.5 });
        bets.push({ type: 'split', value: [13, 14], amount: unit * 22.5 });
      } else {
        bets.push({ type: 'street', value: 16, amount: unit * 2 * mult });
        bets.push({ type: 'street', value: 10, amount: unit * 2 * mult });
        bets.push({ type: 'street', value: 13, amount: unit * 1 * mult });
        bets.push({ type: 'split', value: [13, 14], amount: unit * 1 * mult });
      }
    }
  }

  return bets;
}