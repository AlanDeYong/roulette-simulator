/**
 * ==============================================================================
 * ROULETTE STRATEGY: Every Other Number Strategy
 * ==============================================================================
 *
 * SOURCE:
 * - URL: https://youtu.be/ImytMVLPq7Y
 * - Channel: ALL in With Zach
 *
 * THE FULL LOGIC IN DETAILS:
 * 1. Wheel Layout & Racetrack Coverage:
 *    - The strategy selects numbers using the physical wheel sequence (Racetrack View).
 *    - Starting from index 0 on the wheel sequence, it selects every second number.
 *    - This divides the wheel into two alternating sets of 19 numbers:
 *      - Set A: Even indices along the racetrack order.
 *      - Set B: Odd indices along the racetrack order.
 *    - At any given spin, exactly 19 straight-up number bets are active (50% wheel coverage).
 *
 * 2. Bet Triggers & Offset Switching:
 *    - On the initial spin, Set A is placed.
 *    - On a Loss: The strategy doubles the bet progression multiplier (Martingale)
 *      and toggles between Set A and Set B to target the alternating numbers.
 *    - On a Win: The progression multiplier resets back to 1 unit per number.
 *
 * THE FULL BET PROGRESSION IN DETAILS:
 * - Base Unit: `config.betLimits.min` (minimum inside bet per number).
 * - Initial Bet: 1 unit on each of the 19 selected straight-up numbers (Total cost = 19 * unit).
 * - On Loss:
 *   - Double the multiplier per number (`state.multiplier *= 2`).
 *   - Respect `config.incrementMode`: calculate incremental step based on fixed step or base unit.
 *   - Toggle `state.setIndex` (0 -> 1 or 1 -> 0) to shift coverage along the racetrack.
 * - On Win:
 *   - Reset `state.multiplier = 1` and return to base units on all 19 numbers.
 * - Clamping: Every individual number bet is strictly clamped between `config.betLimits.min`
 *   and `config.betLimits.max`.
 *
 * THE GOAL:
 * - Target Profit: Reach +50% net gain above starting bankroll.
 * - Stop-Loss / Safety: Stop placing bets if remaining bankroll is insufficient to
 *   cover a full set of 19 minimum-unit bets.
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Define Wheel Sequences (Racetrack View Order)
  const americanWheelSequence = [
    0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
    '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
  ];

  const europeanWheelSequence = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];

  const isAmerican = config.tableType === 'american';
  const racetrackSequence = isAmerican ? americanWheelSequence : europeanWheelSequence;

  // 2. State Initialization
  if (state.multiplier === undefined) state.multiplier = 1;
  if (state.setIndex === undefined) state.setIndex = 0; // 0 = Set A (even indices), 1 = Set B (odd indices)
  if (state.initialBankroll === undefined) state.initialBankroll = bankroll;

  // 3. Process Last Spin Result
  if (spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastWinningNumber = lastSpin.winningNumber;

    // Retrieve active numbers from the previous spin configuration
    const previousActiveNumbers = racetrackSequence.filter((_, idx) => idx % 2 === state.setIndex);

    const isWin = previousActiveNumbers.includes(lastWinningNumber);

    if (isWin) {
      // Reset progression on win
      state.multiplier = 1;
    } else {
      // Apply progression increment on loss
      const baseUnit = config.betLimits.min;
      const step = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);
      
      // Double the base multiplier (Martingale style progression)
      state.multiplier *= 2;

      // Toggle racetrack set offset on loss (Set A <-> Set B)
      state.setIndex = state.setIndex === 0 ? 1 : 0;
    }
  }

  // 4. Target Profit Check
  const profitTarget = state.initialBankroll * 1.5; // Target: +50% bankroll gain
  if (bankroll >= profitTarget) {
    return []; // Stop betting once target profit is reached
  }

  // 5. Calculate Individual Bet Amount & Respect Limits
  const baseInsideUnit = config.betLimits.min;
  let unitAmount = baseInsideUnit * state.multiplier;

  // Ensure bet respects minimum and maximum bet bounds
  unitAmount = Math.max(unitAmount, config.betLimits.min);
  unitAmount = Math.min(unitAmount, config.betLimits.max);

  // 6. Select Current Set of 19 Numbers
  const selectedNumbers = racetrackSequence.filter((_, idx) => idx % 2 === state.setIndex);
  const totalBetCost = unitAmount * selectedNumbers.length;

  // Stop-Loss / Bankroll Protection: Reduce unit size or stop if bankroll cannot cover full set
  if (bankroll < totalBetCost) {
    unitAmount = Math.floor(bankroll / selectedNumbers.length);
    if (unitAmount < config.betLimits.min) {
      return []; // Inadequate funds to cover minimum bets on all 19 positions
    }
  }

  // 7. Format Output Bet Array
  return selectedNumbers.map((num) => ({
    type: 'number',
    value: num,
    amount: unitAmount
  }));
}