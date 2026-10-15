/**
 * Eight Ball Roulette Strategy
 * 
 * Source:
 * - Channel: Gamblers University (Professor Profit)
 * - Video URL: https://youtu.be/g3ioFIwOlQQ
 * 
 * The Full Logic in Detail:
 * - The strategy targets half of the roulette board at a time (Low 1-18 or High 19-36), starting with Low.
 * - Each starting bet ("Eight Ball") combines a 5-unit Outside bet on the target half with three 1-unit Inside Split bets.
 * - Target Side Switching: Whenever a new bankroll session high (or restored high) is reached, 
 *   the system resets to Level 1 and switches target sides (Low -> High or High -> Low).
 * - Ladder Progression Mechanics:
 *   - Loss: Move UP 1 level on the ladder (adds 5 units to Outside bet and adds 3 additional Inside bets).
 *   - Win (below session High): Move DOWN 1 level on the ladder (drops 5 units from Outside bet and removes 3 Inside bets).
 *   - Win (at/above session High): Reset to Level 1, update session High, and switch target side.
 * 
 * The Full Bet Progression in Detail:
 * - LOW Side (1-18):
 *   - Level 1 ($8 total): $5 Low + 3 splits ([2,5], [8,11], [14,17])
 *   - Level 2 ($16 total): $10 Low + 6 splits (+ [3,6], [9,12], [15,18])
 *   - Level 3 ($24 total): $15 Low + 9 splits (+ [1,4], [7,10], [13,16])
 *   - Level 4 ($32 total): $20 Low + 9 vertical splits + 3 horizontal splits ([2,3], [8,9], [14,15])
 *   - Level 5 ($40 total): $25 Low + 12 splits + 3 straight-ups (4, 5, 6)
 *   - Level 6 ($48 total): $30 Low + 12 splits + 6 straight-ups (4-9)
 *   - Level 7+ ($55+ total): Adds 5 units to Low and straight-up triplets (10-12, 13-15, 16-18).
 * 
 * - HIGH Side (19-36):
 *   - Level 1 ($8 total): $5 High + 3 splits ([20,23], [26,29], [32,35])
 *   - Level 2 ($16 total): $10 High + 6 splits (+ [21,24], [27,30], [33,36])
 *   - Level 3 ($24 total): $15 High + 9 splits (+ [19,22], [25,28], [31,34])
 *   - Level 4 ($32 total): $20 High + 9 vertical splits + 3 horizontal splits ([20,21], [26,27], [32,33])
 *   - Level 5 ($40 total): $25 High + 12 splits + 3 straight-ups (22, 23, 24)
 *   - Level 6 ($48 total): $30 High + 12 splits + 6 straight-ups (22-27)
 *   - Level 7+ ($55+ total): Adds 5 units to High and straight-up triplets (28-30, 31-33, 34-36).
 * 
 * The Goal:
 * - Target Profit: +$50 over initial bankroll. When reached, stop betting.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.sessionHigh === undefined) {
    state.sessionHigh = bankroll;
    state.initialBankroll = bankroll;
    state.targetProfit = 50000;
    state.level = 1;
    state.side = 'low'; // Starts on Low (1-18)
    state.lastBankroll = bankroll;
  }

  // 2. Check Win Goal / Target Profit Stop Condition
  if (bankroll >= state.initialBankroll + state.targetProfit) {
    return []; // Reached target profit, stop betting
  }

  // Stop if bankroll is insufficient for minimum outside bet
  if (bankroll < config.betLimits.minOutside) {
    return [];
  }

  // 3. Process Spin History & Progression Ladder State Updates
  if (spinHistory.length > 0) {
    const netChange = bankroll - state.lastBankroll;

    if (bankroll >= state.sessionHigh) {
      // Reached or surpassed session high -> Reset level & switch target side
      state.sessionHigh = bankroll;
      state.level = 1;
      state.side = state.side === 'low' ? 'high' : 'low';
    } else if (netChange > 0) {
      // Won, but still below session high -> Step down 1 level on the ladder
      state.level = Math.max(1, state.level - 1);
    } else if (netChange < 0) {
      // Lost -> Step up 1 level on the ladder
      state.level = state.level + 1;
    }
  }

  // Update tracking bankroll
  state.lastBankroll = bankroll;

  // 4. Determine Units & Respect Bet Limits
  const baseUnit = config.betLimits.min || 1;
  const maxBet = config.betLimits.max || 500;
  const level = state.level;

  // Calculate Raw Amounts based on strategy's 5-to-1 ratio
  let rawOutsideAmount = 5 * baseUnit * level;
  let rawInsideAmount = baseUnit;

  // Clamp to Limits
  const outsideBetAmount = Math.min(Math.max(rawOutsideAmount, (config.betLimits.minOutside || 5)), maxBet);
  const insideBetAmount = Math.min(Math.max(rawInsideAmount, (config.betLimits.min || 1)), maxBet);

  const bets = [];

  // 5. Build Bets Array based on Current Level and Target Side
  if (state.side === 'low') {
    // Outside Bet on Low (1-18)
    bets.push({ type: 'low', amount: outsideBetAmount });

    // Level 1 Splits
    if (level >= 1) {
      bets.push({ type: 'split', value: [2, 5], amount: insideBetAmount });
      bets.push({ type: 'split', value: [8, 11], amount: insideBetAmount });
      bets.push({ type: 'split', value: [14, 17], amount: insideBetAmount });
    }

    // Level 2 Splits
    if (level >= 2) {
      bets.push({ type: 'split', value: [3, 6], amount: insideBetAmount });
      bets.push({ type: 'split', value: [9, 12], amount: insideBetAmount });
      bets.push({ type: 'split', value: [15, 18], amount: insideBetAmount });
    }

    // Level 3 Splits
    if (level >= 3) {
      bets.push({ type: 'split', value: [1, 4], amount: insideBetAmount });
      bets.push({ type: 'split', value: [7, 10], amount: insideBetAmount });
      bets.push({ type: 'split', value: [13, 16], amount: insideBetAmount });
    }

    // Level 4 Horizontal Splits
    if (level >= 4) {
      bets.push({ type: 'split', value: [2, 3], amount: insideBetAmount });
      bets.push({ type: 'split', value: [8, 9], amount: insideBetAmount });
      bets.push({ type: 'split', value: [14, 15], amount: insideBetAmount });
    }

    // Level 5+ Straight-Up Number Triplets
    if (level >= 5) {
      bets.push({ type: 'number', value: 4, amount: insideBetAmount });
      bets.push({ type: 'number', value: 5, amount: insideBetAmount });
      bets.push({ type: 'number', value: 6, amount: insideBetAmount });
    }
    if (level >= 6) {
      bets.push({ type: 'number', value: 7, amount: insideBetAmount });
      bets.push({ type: 'number', value: 8, amount: insideBetAmount });
      bets.push({ type: 'number', value: 9, amount: insideBetAmount });
    }
    if (level >= 7) {
      bets.push({ type: 'number', value: 10, amount: insideBetAmount });
      bets.push({ type: 'number', value: 11, amount: insideBetAmount });
      bets.push({ type: 'number', value: 12, amount: insideBetAmount });
    }
    if (level >= 8) {
      bets.push({ type: 'number', value: 13, amount: insideBetAmount });
      bets.push({ type: 'number', value: 14, amount: insideBetAmount });
      bets.push({ type: 'number', value: 15, amount: insideBetAmount });
    }
    if (level >= 9) {
      bets.push({ type: 'number', value: 16, amount: insideBetAmount });
      bets.push({ type: 'number', value: 17, amount: insideBetAmount });
      bets.push({ type: 'number', value: 18, amount: insideBetAmount });
    }

  } else {
    // Outside Bet on High (19-36)
    bets.push({ type: 'high', amount: outsideBetAmount });

    // Level 1 Splits
    if (level >= 1) {
      bets.push({ type: 'split', value: [20, 23], amount: insideBetAmount });
      bets.push({ type: 'split', value: [26, 29], amount: insideBetAmount });
      bets.push({ type: 'split', value: [32, 35], amount: insideBetAmount });
    }

    // Level 2 Splits
    if (level >= 2) {
      bets.push({ type: 'split', value: [21, 24], amount: insideBetAmount });
      bets.push({ type: 'split', value: [27, 30], amount: insideBetAmount });
      bets.push({ type: 'split', value: [33, 36], amount: insideBetAmount });
    }

    // Level 3 Splits
    if (level >= 3) {
      bets.push({ type: 'split', value: [19, 22], amount: insideBetAmount });
      bets.push({ type: 'split', value: [25, 28], amount: insideBetAmount });
      bets.push({ type: 'split', value: [31, 34], amount: insideBetAmount });
    }

    // Level 4 Horizontal Splits
    if (level >= 4) {
      bets.push({ type: 'split', value: [20, 21], amount: insideBetAmount });
      bets.push({ type: 'split', value: [26, 27], amount: insideBetAmount });
      bets.push({ type: 'split', value: [32, 33], amount: insideBetAmount });
    }

    // Level 5+ Straight-Up Number Triplets
    if (level >= 5) {
      bets.push({ type: 'number', value: 22, amount: insideBetAmount });
      bets.push({ type: 'number', value: 23, amount: insideBetAmount });
      bets.push({ type: 'number', value: 24, amount: insideBetAmount });
    }
    if (level >= 6) {
      bets.push({ type: 'number', value: 25, amount: insideBetAmount });
      bets.push({ type: 'number', value: 26, amount: insideBetAmount });
      bets.push({ type: 'number', value: 27, amount: insideBetAmount });
    }
    if (level >= 7) {
      bets.push({ type: 'number', value: 28, amount: insideBetAmount });
      bets.push({ type: 'number', value: 29, amount: insideBetAmount });
      bets.push({ type: 'number', value: 30, amount: insideBetAmount });
    }
    if (level >= 8) {
      bets.push({ type: 'number', value: 31, amount: insideBetAmount });
      bets.push({ type: 'number', value: 32, amount: insideBetAmount });
      bets.push({ type: 'number', value: 33, amount: insideBetAmount });
    }
    if (level >= 9) {
      bets.push({ type: 'number', value: 34, amount: insideBetAmount });
      bets.push({ type: 'number', value: 35, amount: insideBetAmount });
      bets.push({ type: 'number', value: 36, amount: insideBetAmount });
    }
  }

  return bets;
}