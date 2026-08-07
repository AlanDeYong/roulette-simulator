/**
 * Strategy Name: Scepter Beta (37-Spin Wait Modification)
 * Source: https://youtu.be/6reQLCcd1QE
 * YouTube Channel: Casino Matchmaker
 *
 * Full Logic Details:
 * 1. Observation Phase (Modification):
 *    - The strategy waits for the first 37 spins without placing any bets (`return []`).
 *    - Uses all 37 observation spins to accurately calculate the true "Hottest Dozen".
 * 2. Target Selection:
 *    - Once 37 spins have completed (or when resetting after session profit), the strategy identifies 
 *      the hottest dozen from the latest 37 spins:
 *      - 1st Dozen (1-12): Key number is 10. Six-line bet is 7-12 (line value 7). Race-track neighbors (+/- 5 numbers) around 10.
 *      - 2nd Dozen (13-24): Key number is 22. Six-line bet is 19-24 (line value 19). Race-track neighbors (+/- 5 numbers) around 22.
 *      - 3rd Dozen (25-36): Key number is 34. Six-line bet is 31-36 (line value 31). Race-track neighbors (+/- 5 numbers) around 34.
 * 3. Bet Setup:
 *    - Places 1 Six-Line bet on the corresponding 6-line range.
 *    - Places Straight-Up bets on the key number and its 5 neighbors on both sides of the European roulette wheel (11 numbers total).
 *    - Base ratio: 10 units on the Six-Line bet to 1 unit on each of the 11 Straight-Up numbers.
 *
 * Full Bet Progression Details:
 * - On Loss: Increase progression level by 1 (+1 unit per straight-up number, +10 units on the six-line bet).
 * - On Win: Decrease progression level by 2 levels (minimum level 1).
 * - Target / Reset: If overall session profit is achieved (bankroll > initial/peak target bankroll), reset progression to Level 1 and re-evaluate the hottest dozen across the last 37 spins.
 *
 * Goal:
 * - Reach positive session profit, lock in target bankroll, and reset back to base level.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Wait for 37 spins before placing any bets
  if (!spinHistory || spinHistory.length < 37) {
    return [];
  }

  // 2. Initialize initial bankroll reference and target state
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
    state.targetBankroll = bankroll;
  }

  // Session Profit Check -> Reset progression and target selection
  if (bankroll > state.targetBankroll) {
    state.targetBankroll = bankroll;
    state.level = 1;
    state.selectedDozen = null; // Re-evaluate hottest dozen on next spin
  }

  if (!state.level) state.level = 1;

  // 3. Track win/loss outcome from last spin
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNum = lastResult.winningNumber;

    if (state.lastBets && state.lastBets.length > 0) {
      let isWin = false;
      for (const b of state.lastBets) {
        if (b.type === 'line' && lastNum >= b.value && lastNum <= b.value + 5) {
          isWin = true;
          break;
        }
        if (b.type === 'number' && b.value === lastNum) {
          isWin = true;
          break;
        }
      }

      if (isWin) {
        // Step down 2 levels on win (minimum level 1)
        state.level = Math.max(1, state.level - 2);
      } else {
        // Step up 1 level on loss
        state.level += 1;
      }
    }
  }

  // European Wheel Layout for calculating Race-track Neighbors
  const europeanWheel = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
    24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  function getNeighbors(targetNum, count) {
    const idx = europeanWheel.indexOf(targetNum);
    if (idx === -1) return [targetNum];
    const neighbors = [];
    const len = europeanWheel.length;
    for (let i = -count; i <= count; i++) {
      let nIdx = (idx + i) % len;
      if (nIdx < 0) nIdx += len;
      neighbors.push(europeanWheel[nIdx]);
    }
    return neighbors;
  }

  // 4. Determine Hottest Dozen across the last 37 spins if not currently locked into one
  if (!state.selectedDozen) {
    let d1 = 0, d2 = 0, d3 = 0;
    const startIndex = spinHistory.length - 37;

    for (let i = startIndex; i < spinHistory.length; i++) {
      const num = spinHistory[i].winningNumber;
      if (num >= 1 && num <= 12) d1++;
      else if (num >= 13 && num <= 24) d2++;
      else if (num >= 25 && num <= 36) d3++;
    }

    if (d1 >= d2 && d1 >= d3) {
      state.selectedDozen = 1;
    } else if (d2 >= d1 && d2 >= d3) {
      state.selectedDozen = 2;
    } else {
      state.selectedDozen = 3;
    }
  }

  // 5. Set key number & six-line based on active dozen
  let keyNumber = 22;
  let lineStart = 19;

  if (state.selectedDozen === 1) {
    keyNumber = 10;
    lineStart = 7;
  } else if (state.selectedDozen === 2) {
    keyNumber = 22;
    lineStart = 19;
  } else if (state.selectedDozen === 3) {
    keyNumber = 34;
    lineStart = 31;
  }

  const straightNumbers = getNeighbors(keyNumber, 5);

  // 6. Calculate & clamp bet amounts adhering to limits
  const minInside = config.betLimits.min || 1;
  const straightAmount = Math.min(
    config.betLimits.max,
    Math.max(minInside * state.level, minInside)
  );

  const lineAmount = Math.min(
    config.betLimits.max,
    Math.max(straightAmount * 10, config.betLimits.min)
  );

  const bets = [];

  // Place Six-Line Bet
  bets.push({
    type: 'line',
    value: lineStart,
    amount: lineAmount
  });

  // Place Straight-Up Bets (Key number + 5 neighbors on each side)
  for (const num of straightNumbers) {
    bets.push({
      type: 'number',
      value: num,
      amount: straightAmount
    });
  }

  state.lastBets = bets;
  return bets;
}