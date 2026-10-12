/**
 * SOURCE:
 * - Video: "The Fibonacci Roulette Strategy Gets a SERIOUS Upgrade"
 * - Channel: Casino Matchmaker
 * - URL: https://youtu.be/oDoJ65PeQkQ
 *
 * FULL LOGIC IN DETAIL:
 * 1. The strategy upgrades the traditional Fibonacci system by applying it to 13 numbers
 *    instead of even-money bets or single dozens.
 * 2. 13 numbers are selected using "Neighbors by 6" (the target number plus 6 numbers
 *    clockwise and 6 numbers counter-clockwise on the physical European wheel).
 * 3. The target number is predicted using dealer spin signature / sector offset analysis:
 *    tracking the wheel distance/offset between consecutive winning numbers to find the
 *    dealer's preferred landing sector relative to the previous winning pocket.
 *
 * FULL BET PROGRESSION IN DETAIL:
 * 1. Base Fibonacci sequence: [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144].
 *    The creator explicitly notes never skipping the second "1".
 * 2. Each active step multiplies the base inside unit for all 13 straight-up numbers.
 * 3. On Loss: Advance to the next step in the Fibonacci sequence.
 * 4. On Win: Because a hit on 13 numbers pays 35:1 (+23 units net at multiplier 1),
 *    a win easily covers losses from preceding steps. Reset to step 0 (or step back
 *    2 positions if deep in the sequence).
 *
 * THE GOAL:
 * - Reach a profit target of +100 units / $100 and stop the session.
 * - Cease betting if the bankroll cannot sustain the full 13-chip placement.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // European wheel order (clockwise)
  const WHEEL = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];
  const TARGET_PROFIT = 10000; // Session target (+100 base units / $)
  const NEIGHBORS_COUNT = 6;  // 6 neighbors each side = 13 numbers total

  // Initialize state
  if (!state.initialized) {
    state.initialized = true;
    state.fibIndex = 0;
    state.startBankroll = bankroll;
    state.sessionStopped = false;
    state.lastCoveredNumbers = [];
    state.offsetFrequencies = {};
  }

  // Check if session profit target reached
  const netProfit = bankroll - state.startBankroll;
  if (state.sessionStopped || netProfit >= TARGET_PROFIT) {
    state.sessionStopped = true;
    return [];
  }

  // Need at least one previous spin to anchor racetrack neighbors
  if (!spinHistory || spinHistory.length === 0) {
    return [];
  }

  const lastSpin = spinHistory[spinHistory.length - 1];
  const lastWinningNumber = lastSpin.winningNumber;

  // Process win/loss from previous round if bets were placed
  if (state.lastCoveredNumbers.length > 0) {
    const won = state.lastCoveredNumbers.includes(lastWinningNumber);
    if (won) {
      // On win: reset or step back 2 if deep
      if (state.fibIndex <= 2 || netProfit >= 0) {
        state.fibIndex = 0;
      } else {
        state.fibIndex = Math.max(0, state.fibIndex - 2);
      }
    } else {
      // On loss: advance to next Fibonacci step
      if (state.fibIndex < FIBONACCI.length - 1) {
        state.fibIndex += 1;
      }
    }
  }

  // Track wheel offset between last two spins to emulate Dealer Signature
  if (spinHistory.length >= 2) {
    const prevSpin = spinHistory[spinHistory.length - 2];
    const prevIdx = WHEEL.indexOf(prevSpin.winningNumber);
    const currIdx = WHEEL.indexOf(lastSpin.winningNumber);

    if (prevIdx !== -1 && currIdx !== -1) {
      const offset = (currIdx - prevIdx + WHEEL.length) % WHEEL.length;
      state.offsetFrequencies[offset] = (state.offsetFrequencies[offset] || 0) + 1;
    }
  }

  // Determine predicted target number
  let targetNumber = lastWinningNumber;
  let bestOffset = 0;
  let maxCount = 0;

  for (const offset in state.offsetFrequencies) {
    if (state.offsetFrequencies[offset] > maxCount) {
      maxCount = state.offsetFrequencies[offset];
      bestOffset = parseInt(offset, 10);
    }
  }

  const lastIdx = WHEEL.indexOf(lastWinningNumber);
  if (lastIdx !== -1) {
    const targetIdx = (lastIdx + bestOffset) % WHEEL.length;
    targetNumber = WHEEL[targetIdx];
  }

  // Collect 13 numbers: target number + 6 neighbors to left and right
  const targetWheelPos = WHEEL.indexOf(targetNumber);
  const coveredNumbers = [];

  for (let i = -NEIGHBORS_COUNT; i <= NEIGHBORS_COUNT; i++) {
    const neighborIdx = (targetWheelPos + i + WHEEL.length) % WHEEL.length;
    coveredNumbers.push(WHEEL[neighborIdx]);
  }

  state.lastCoveredNumbers = coveredNumbers;

  // Bet sizing calculation
  const multiplier = FIBONACCI[state.fibIndex];
  const baseUnit = config.betLimits.min;
  let chipAmount = baseUnit * multiplier;

  // Clamp straight-up bet within table limits
  chipAmount = Math.max(chipAmount, config.betLimits.min);
  chipAmount = Math.min(chipAmount, config.betLimits.max);

  const totalRequired = chipAmount * coveredNumbers.length;
  if (bankroll < totalRequired) {
    // Insufficient bankroll to place all 13 neighbor bets
    return [];
  }

  // Return array of 13 straight-up number bets
  return coveredNumbers.map(num => ({
    type: 'number',
    value: num,
    amount: chipAmount
  }));
}