/**
 * Racetrack 27 Hot Sectors System
 * 
 * Source:
 *   - Video: "New Racetrack System | 27 Numbers Yields Almost 15% Profit"
 *   - Channel: Mastering The Wheel (https://youtu.be/Pg-D5a4TsTw)
 * 
 * Full Logic in Detail:
 *   1. Physical Wheel Tracking:
 *      Uses the standard European wheel order:
 *      [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
 *       5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
 *   2. Window & Sector Definition:
 *      - Evaluates the rolling history (e.g., up to 74 spins).
 *      - Each potential sector spans 9 contiguous pockets (center number +/- 4 neighbors).
 *      - Selects 3 non-overlapping hot sectors (totaling 27 unique straight-up numbers) 
 *        with the highest cumulative hit counts.
 *   3. Triggers & Conditions:
 *      - Bets straight-up on all 27 numbers in the selected hot sectors.
 * 
 * Full Bet Progression in Detail (5-Level Triple Martingale):
 *   - Multipliers per number across levels:
 *       Level 1: 1 unit  (Total: 27 units)
 *       Level 2: 3 units (Total: 81 units)
 *       Level 3: 9 units (Total: 243 units)
 *       Level 4: 27 units (Total: 729 units)
 *       Level 5: 81 units (Total: 2,187 units)
 *   - Post-Loss: Advance to the next level. If losing at Level 5, stop betting (system failed).
 *   - Post-Win:
 *       - Check if current bankroll is at or above a new session high.
 *       - If at/above session high: Reset progression to Level 1.
 *       - If below session high: Stay at the current level to continue recovery.
 * 
 * The Goal:
 *   - Profit Target: ~5% of initial bankroll (e.g. 160 units on a 3,267 unit bankroll).
 *   - Stop-Loss: Complete loss at Level 5 or insufficient bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const EUROPEAN_WHEEL = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  const LEVELS = [1, 3, 9, 27, 81];
  const HISTORY_WINDOW = 74;

  // Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.level = 0; // 0-indexed: 0 to 4
    state.startBankroll = bankroll;
    state.sessionHigh = bankroll;
    state.profitTarget = Math.round(bankroll * 10.05); // 5% profit target
    state.stopped = false;
    state.lastBetNumbers = [];
  }

  if (state.stopped) {
    return [];
  }

  // Update session high and process previous spin outcome if available
  if (spinHistory && spinHistory.length > 0 && state.lastBetNumbers.length > 0) {
    const lastWinningNumber = spinHistory[spinHistory.length - 1].winningNumber;
    const won = state.lastBetNumbers.includes(lastWinningNumber);

    if (won) {
      if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
        state.level = 0; // Reset on new session high
      }
      // If won but didn't reach session high, remain on current level to recover
    } else {
      state.level += 1;
      if (state.level >= LEVELS.length) {
        state.stopped = true; // Stop if busted past Level 5
        return [];
      }
    }
  }

  // Check target profit
  if (bankroll >= state.startBankroll + state.profitTarget) {
    state.stopped = true;
    return [];
  }

  // Calculate frequency over window
  const windowSpins = spinHistory.slice(-HISTORY_WINDOW);
  const hitCounts = {};
  for (let i = 0; i < EUROPEAN_WHEEL.length; i++) {
    hitCounts[EUROPEAN_WHEEL[i]] = 0;
  }
  for (let i = 0; i < windowSpins.length; i++) {
    const num = windowSpins[i].winningNumber;
    if (hitCounts[num] !== undefined) {
      hitCounts[num]++;
    }
  }

  // Helper to get 9-pocket sector centered at wheel index centerIdx (+/- 4 pockets)
  function getSectorNumbers(centerIdx) {
    const sector = [];
    const len = EUROPEAN_WHEEL.length;
    for (let offset = -4; offset <= 4; offset++) {
      const idx = (centerIdx + offset + len) % len;
      sector.push(EUROPEAN_WHEEL[idx]);
    }
    return sector;
  }

  // Score all 37 possible 9-pocket sectors
  const sectorCandidates = [];
  for (let i = 0; i < EUROPEAN_WHEEL.length; i++) {
    const numbers = getSectorNumbers(i);
    const score = numbers.reduce((acc, num) => acc + (hitCounts[num] || 0), 0);
    sectorCandidates.push({ centerIdx: i, numbers, score });
  }

  // Sort sectors by descending hit count
  sectorCandidates.sort((a, b) => b.score - a.score);

  // Greedily select 3 mutually exclusive sectors to obtain exactly 27 unique numbers
  const selectedNumbers = new Set();
  for (let i = 0; i < sectorCandidates.length; i++) {
    const cand = sectorCandidates[i];
    const overlaps = cand.numbers.some(n => selectedNumbers.has(n));
    if (!overlaps) {
      cand.numbers.forEach(n => selectedNumbers.add(n));
    }
    if (selectedNumbers.size === 27) {
      break;
    }
  }

  // Fallback: fill to 27 numbers if exact non-overlapping combination was unavailable
  if (selectedNumbers.size < 27) {
    for (let i = 0; i < EUROPEAN_WHEEL.length; i++) {
      selectedNumbers.add(EUROPEAN_WHEEL[i]);
      if (selectedNumbers.size === 27) break;
    }
  }

  const targetNumbers = Array.from(selectedNumbers);
  state.lastBetNumbers = targetNumbers;

  // Determine bet sizing
  const baseUnit = config.betLimits.min;
  const multiplier = LEVELS[state.level];
  let unitBet = baseUnit * multiplier;
  unitBet = Math.max(unitBet, config.betLimits.min);
  unitBet = Math.min(unitBet, config.betLimits.max);

  const totalRequired = unitBet * targetNumbers.length;
  if (bankroll < totalRequired) {
    state.stopped = true;
    return [];
  }

  // Construct straight-up bet objects
  const bets = targetNumbers.map(num => ({
    type: 'number',
    value: num,
    amount: unitBet
  }));

  return bets;
}