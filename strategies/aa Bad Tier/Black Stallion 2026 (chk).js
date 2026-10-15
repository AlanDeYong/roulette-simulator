/**
 * Strategy: Third Column and Black (26-Number Coverage)
 * Source: The Roulette Master (https://youtu.be/PBTH1gb3AtI)
 *
 * Full Logic in Detail:
 * - Only 2 bets are placed:
 *   1. Black (3 units / e.g. $15)
 *   2. Column 3 (2 units / e.g. $10)
 * - Ratio is strictly 3 : 2 (Total base layout = 5 units / $25).
 * - Total 26 numbers covered:
 *   - 8 Red numbers in Column 3: Win Column (pays 2:1), lose Black -> Net +1 unit profit.
 *   - 14 Black numbers in Col 1 & 2: Win Black (pays 1:1), lose Column -> Net +1 unit profit.
 *   - 4 Black numbers in Column 3 (6, 15, 24, 33): "Jackpot" -> Win both -> Net +7 units profit.
 *   - Red in Col 1 & 2 + Zeros: Complete loss (-5 units).
 *
 * Progression in Detail:
 * - On Loss: Add initial base amount (+3 units to Black, +2 units to Column 3; level increases by +1).
 * - On Win: Rebet at current level until recovering back to or exceeding the previous peak bankroll, then reset to Level 1.
 *
 * The Goal:
 * - Grind steady 26-number coverage wins while hunting the 4 double-win "Jackpot" numbers to quickly wipe out recovery deficits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.multiplier = 1;
    state.peakBankroll = bankroll;
    state.lastBets = null;
  }

  // 2. Evaluate previous spin outcome before updating peak
  if (spinHistory && spinHistory.length > 0 && state.lastBets) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;
    const winningColor = lastSpin.winningColor;

    let winningCol = 0;
    if (winningNum > 0) {
      winningCol = ((winningNum - 1) % 3) + 1;
    }

    const hitBlack = (winningColor === 'black');
    const hitCol3 = (winningCol === 3);

    const isLoss = !hitBlack && !hitCol3;

    if (isLoss) {
      // Complete loss: add base bet (increase multiplier by 1)
      state.multiplier += 1;
    } else {
      // Win (regular win or jackpot hit): reset if recovered to or above peak bankroll
      if (bankroll >= state.peakBankroll) {
        state.multiplier = 1;
      }
    }
  }

  // 3. Update peak bankroll after checking recovery
  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
  }

  // 4. Determine base unit respecting outside table limits (3 : 2 ratio)
  const minOutside = (config && config.betLimits && config.betLimits.minOutside) || 5;
  const maxLimit = (config && config.betLimits && config.betLimits.max) || Infinity;

  // Base unit must allow both 3 * unit and 2 * unit to meet minOutside
  const baseUnit = Math.max(1, Math.ceil(minOutside / 2));
  const mult = Math.max(1, state.multiplier);

  let blackAmount = Math.min(3 * baseUnit * mult, maxLimit);
  let col3Amount = Math.min(2 * baseUnit * mult, maxLimit);

  // Enforce table outside minimums
  blackAmount = Math.max(blackAmount, minOutside);
  col3Amount = Math.max(col3Amount, minOutside);

  // 5. Total required bet & bankroll safety check
  const totalBet = blackAmount + col3Amount;
  if (bankroll < totalBet) {
    return [];
  }

  const bets = [
    { type: 'black', amount: blackAmount },
    { type: 'column', value: 3, amount: col3Amount }
  ];

  state.lastBets = bets;
  return bets;
}