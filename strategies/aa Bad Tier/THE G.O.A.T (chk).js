/**
 * Source: https://youtu.be/R0jq80L5UrM ("THE G.O.A.T" - The Roulette Master)
 * Strategy: "Genius Cash Roulette System" by Julian (Milestone Method adaptation)
 *
 * Full Logic in Detail:
 * 1. Track the last 4 distinct winning numbers from spin history.
 * 2. Bet 1 unit (straight up) on all numbers except those last 4 distinct numbers (starts with 34 covered numbers on American / 33 on European).
 * 3. On each WIN:
 *    - Remove the winning number from the active bet set (peeling down 1 number per win).
 *    - Continue until only 26 numbers remain covered (12 numbers uncovered).
 *    - Upon reaching 26 covered numbers, cycle resets: pick the latest 4 unique winning numbers and bet the remaining 34.
 * 4. Full Bet Progression in Detail:
 *    - 1st loss: Do NOT increase bet size; rebet same unit amount.
 *    - 2nd loss: Increase bet size by 1 base unit (+1 unit per straight-up bet).
 *    - On recovery / reset of cycle: Return bet unit back to 1 base unit.
 * 5. The Goal:
 *    - High strike-rate steady accumulation while peeling numbers down to increase per-spin payout, without doubling down aggressively on single losses.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.unitMultiplier = 1;
    state.consecutiveLosses = 0;
    state.coveredNumbers = [];
    state.inCycle = false;
    state.totalWheelNumbers = config.tableType === 'american' ? 38 : 37;
  }

  const baseUnit = config.betLimits.min;

  // Build full list of table numbers
  const allNumbers = [];
  for (let i = 0; i <= 36; i++) {
    allNumbers.push(i);
  }
  // If American wheel, number 37 can represent 00 in standard simulation engines
  if (config.tableType === 'american') {
    allNumbers.push(37); // '00'
  }

  // 2. Evaluate previous spin outcome if in an active cycle
  if (state.inCycle && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastWonNumber = lastSpin.winningNumber;
    const wasHit = state.coveredNumbers.includes(lastWonNumber);

    if (wasHit) {
      state.consecutiveLosses = 0;
      // Remove winning number from active set
      state.coveredNumbers = state.coveredNumbers.filter(n => n !== lastWonNumber);

      // Check if we hit milestone threshold: 26 covered numbers remaining
      if (state.coveredNumbers.length <= 26) {
        state.inCycle = false; // Reset cycle
        state.unitMultiplier = 1;
      }
    } else {
      // Loss
      state.consecutiveLosses += 1;
      if (state.consecutiveLosses >= 2) {
        state.unitMultiplier += 1;
        state.consecutiveLosses = 0;
      }
    }
  }

  // 3. Start new cycle if needed
  if (!state.inCycle) {
    // Need at least 4 past unique spins to establish exclude list
    const excluded = [];
    for (let i = spinHistory.length - 1; i >= 0 && excluded.length < 4; i--) {
      const num = spinHistory[i].winningNumber;
      if (!excluded.includes(num)) {
        excluded.push(num);
      }
    }

    // If not enough history, wait or take default exclusions
    if (excluded.length < 4) {
      return [];
    }

    state.coveredNumbers = allNumbers.filter(n => !excluded.includes(n));
    state.inCycle = true;
  }

  // 4. Calculate chip sizing and check bankroll
  let unitBet = baseUnit * state.unitMultiplier;
  unitBet = Math.max(unitBet, config.betLimits.min);
  unitBet = Math.min(unitBet, config.betLimits.max);

  const totalRequired = unitBet * state.coveredNumbers.length;
  if (bankroll < totalRequired) {
    return [];
  }

  // 5. Generate straight-up bets
  const bets = [];
  for (const num of state.coveredNumbers) {
    bets.push({
      type: 'number',
      value: num,
      amount: unitBet
    });
  }

  return bets;
}