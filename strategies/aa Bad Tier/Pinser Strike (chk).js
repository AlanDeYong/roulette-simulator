/**
 * ============================================================================
 * Strategy Name: Pinser Strike Strategy (by Ken Dipple)
 * Source:        https://youtu.be/uZT63YrlpUw
 * Channel:       The Roulette Master
 *
 * THE FULL LOGIC IN DETAIL:
 * 1. Base Phase ("The Pincer"):
 *    - The player places two equal outside bets on 1st Dozen (1-12) and 3rd Dozen (25-36),
 *      effectively "pinching" the roulette board and leaving 2nd Dozen (13-24) open.
 *    - If 1st Dozen or 3rd Dozen hits, the payout is 2:1 on that dozen (+2 units), while
 *      the other dozen loses (-1 unit), yielding a net profit of +1 unit per spin.
 *
 * 2. Trigger for "The Strike" (Recovery Phase):
 *    - If the spin lands on the 2nd Dozen (13-24) or a zero (0/00), the Pincer bet loses
 *      both dozen bets (net -2 units).
 *    - This loss immediately triggers "The Strike" recovery mode targeting the 2nd Dozen.
 *
 * THE FULL BET PROGRESSION IN DETAIL:
 * - Pincer Phase:
 *   - Bet 1 unit on Dozen 1 and 1 unit on Dozen 3.
 *   - Upon any win, stay in Pincer Phase and rebet at the base unit.
 *
 * - Strike Phase (Martingale on Dozen 2):
 *   - Bet on 2nd Dozen (value: 2) following a 4-step progression: 1x, 2x, 4x, 8x base units.
 *   - If 2nd Dozen hits at any step: The 2:1 payout covers all preceding losses in the cycle
 *     and yields a profit. Reset immediately back to Pincer Phase at base unit.
 *   - If 2nd Dozen misses: Advance to the next doubling multiplier.
 *   - Stop-Loss / Protection: The recovery progression stops after the 8x attempt (4 steps).
 *     If the 8x bet loses, cut losses and reset immediately back to the base Pincer Phase.
 *
 * THE GOAL:
 * - Grind steady 1-unit profits during the Pincer phase while utilizing high-leverage 2:1
 *   dozen strikes on Dozen 2 (up to 8x) to recover losses, capped to preserve bankroll.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine base unit using outside bet limits
  const baseUnit = config.betLimits.minOutside;
  const maxBet = config.betLimits.max;
  const maxStrikeSteps = 4; // Progression steps: 1x, 2x, 4x, 8x

  // 2. Initialize State
  if (!state.mode) {
    state.mode = 'PINCER';      // 'PINCER' or 'STRIKE'
    state.strikeStep = 0;       // Index in recovery progression (0 to 3: 1x, 2x, 4x, 8x)
  }

  // 3. Process the last spin result (if history exists)
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    if (state.mode === 'PINCER') {
      const isDozen1 = winningNum >= 1 && winningNum <= 12;
      const isDozen3 = winningNum >= 25 && winningNum <= 36;

      if (isDozen1 || isDozen3) {
        // Pincer won: Stay in PINCER mode at base unit
        state.mode = 'PINCER';
        state.strikeStep = 0;
      } else {
        // Pincer lost (2nd Dozen or 0/00 hit): Trigger the Strike on Dozen 2
        state.mode = 'STRIKE';
        state.strikeStep = 0;
      }
    } else if (state.mode === 'STRIKE') {
      const isDozen2 = winningNum >= 13 && winningNum <= 24;

      if (isDozen2) {
        // Strike won: Loss recovered with profit! Reset to PINCER mode
        state.mode = 'PINCER';
        state.strikeStep = 0;
      } else {
        // Strike lost: Advance to the next doubling step
        state.strikeStep += 1;

        // If the 8x step loses (exceeds step index 3), cut losses and reset
        if (state.strikeStep >= maxStrikeSteps) {
          state.mode = 'PINCER';
          state.strikeStep = 0;
        }
      }
    }
  }

  // 4. Construct Bets Based on Current Mode
  const bets = [];

  if (state.mode === 'PINCER') {
    let betAmount = baseUnit;
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, maxBet);

    const totalRequired = betAmount * 2;
    if (bankroll < totalRequired) {
      return []; // Insufficient bankroll to place both pincer wings
    }

    bets.push({ type: 'dozen', value: 1, amount: betAmount });
    bets.push({ type: 'dozen', value: 3, amount: betAmount });
  } else if (state.mode === 'STRIKE') {
    const multiplier = Math.pow(2, state.strikeStep); // 1, 2, 4, 8
    let strikeAmount = baseUnit * multiplier;

    // Respect bet limits
    strikeAmount = Math.max(strikeAmount, config.betLimits.minOutside);
    strikeAmount = Math.min(strikeAmount, maxBet);

    if (bankroll < strikeAmount) {
      // If unable to afford the full step, bet remaining bankroll or reset
      strikeAmount = bankroll >= config.betLimits.minOutside ? Math.floor(bankroll) : 0;
    }

    if (strikeAmount >= config.betLimits.minOutside) {
      bets.push({ type: 'dozen', value: 2, amount: strikeAmount });
    } else {
      // Bankroll cannot meet minimum bet; reset mode
      state.mode = 'PINCER';
      state.strikeStep = 0;
      return [];
    }
  }

  return bets;
}