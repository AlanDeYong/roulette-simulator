/**
 * Strategy: Progressive Makarov Biarritz
 * Source: Ninja Gamblers (http://www.youtube.com/watch?v=a9rxAvSZ6jk)
 *
 * Full Logic in Detail:
 * - The strategy focuses on betting a single straight-up number across a 37-spin cycle.
 * - At the start of a cycle, a target number is selected based on the most recent
 *   spin in history (or default 0 if starting fresh).
 * - The player continues placing straight-up bets on this exact number each spin.
 *
 * Full Bet Progression in Detail:
 * - Base Bet: 1 minimum inside unit (config.betLimits.min).
 * - Progression: Linear increase by +1 unit for each loss in the cycle:
 *     Spin 1: 1 unit
 *     Spin 2: 2 units
 *     Spin 3: 3 units
 *     ...
 *     Spin n: n units (up to spin 37: 37 units)
 * - On Win: When the target number hits, the cycle immediately resets to Step 1
 *   (1 unit) and a new target number is selected from the latest spin.
 * - On Loss at Spin 37 (Stop-Loss): If 37 consecutive misses occur, the cycle
 *   terminates and resets to Step 1 to protect the bankroll.
 *
 * The Goal:
 * - Exploit straight-up 35:1 payouts where hits later in the cycle yield larger
 *   escalated profits, while enforcing a strict 37-spin maximum stop-loss.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize persistent state across spins
  if (state.cycleStep === undefined) {
    state.cycleStep = 1;
    state.targetNumber = null;
    state.lastBetPlaced = null;
  }

  const baseUnit = config.betLimits.min;
  const maxCycleSpins = 37;

  // 2. Evaluate outcome of previous spin if active
  if (spinHistory && spinHistory.length > 0 && state.lastBetPlaced !== null) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const hitTarget = lastSpin.winningNumber === state.targetNumber;

    if (hitTarget) {
      // Won: reset cycle progression and select new target
      state.cycleStep = 1;
      state.targetNumber = null;
    } else {
      // Lost: advance progression or trigger stop-loss
      state.cycleStep += 1;
      if (state.cycleStep > maxCycleSpins) {
        // Stop-loss reached after 37 consecutive misses
        state.cycleStep = 1;
        state.targetNumber = null;
      }
    }
  }

  // 3. Select target number if starting a fresh cycle
  if (state.targetNumber === null) {
    if (spinHistory && spinHistory.length > 0) {
      state.targetNumber = spinHistory[spinHistory.length - 1].winningNumber;
    } else {
      state.targetNumber = 0;
    }
  }

  // 4. Calculate progression bet sizing
  const currentMultiplier = state.cycleStep;
  let betAmount = baseUnit * currentMultiplier;

  // Clamp within configured table limits
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // 5. Verify bankroll sufficiency
  if (bankroll < config.betLimits.min) {
    state.lastBetPlaced = null;
    return [];
  }

  if (betAmount > bankroll) {
    betAmount = bankroll;
  }

  // 6. Record and return straight-up bet
  state.lastBetPlaced = {
    type: 'number',
    value: state.targetNumber,
    amount: betAmount
  };

  return [state.lastBetPlaced];
}