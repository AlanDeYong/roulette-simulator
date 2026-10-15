/**
 * ROULETTE STRATEGY: Larry's Connect 4 (Dynamic Dozen Variant)
 * 
 * SOURCE:
 * - Video URL: https://youtu.be/Y5NRYcUd7jE
 * - Channel: The Roulette Master
 * 
 * FULL LOGIC:
 * "Larry's Connect 4" combines 2 Double Street (Six Line) bets within a single dozen 
 * alongside 2 Column bets (Columns 2 and 3) to achieve high board coverage while 
 * creating high-payout overlapping "Jackpot" zones.
 * 
 * Bet Placement Breakdown (Base Unit Ratios):
 * - 2 Double Streets (Six Line bets covering a full dozen): 1 unit each.
 * - 2 Columns (Columns 2 and 3): 2 units each.
 * - Dynamic Position: Upon initial start or after resetting progression, the 2 Double 
 *   Street bets move randomly to cover one of the 3 Dozens (1-12, 13-24, or 25-36).
 * 
 * Outcome Distribution:
 * - Jackpot Win (+6 units net): Number hits both an active Double Street AND Column 2 or 3.
 * - Break Even (0 units net): Number hits Column 2/3 outside active Double Streets OR hits 
 *   an active Double Street in Column 1.
 * - Total Loss (-6 units net): Number hits uncovered Column 1 or Green Zero (0 / 00).
 * 
 * BET PROGRESSION:
 * - Base Level: Multiplier = 1.
 * - On Jackpot Win: Reset multiplier level to 1 and randomly pick a new Dozen for Double Streets.
 * - On Break Even: Retain current multiplier level and current bets.
 * - On Total Loss: Double the bet multiplier level (Martingale progression: 1 -> 2 -> 4 -> 8...).
 * 
 * GOAL:
 * - Session Target Profit: $200 (or +40 base units).
 * - Stop-Loss: Complete bankroll protection / max multiplier safety cap.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Helper to pick a random dozen (1, 2, or 3)
  function getRandomDozen() {
    return Math.floor(Math.random() * 3) + 1;
  }

  // 1. Initialize State
  if (state.multiplier === undefined) {
    state.multiplier = 1;
    state.initialBankroll = bankroll;
    state.targetProfit = 200;
    state.activeDozen = getRandomDozen();
  }

  // 2. Evaluate Last Spin Result & Adjust Progression
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const num = lastSpin.winningNumber;

    // Active double street number range based on current active dozen
    const startNum = (state.activeDozen - 1) * 12 + 1;
    const endNum = startNum + 11;
    const isDoubleStreetHit = num >= startNum && num <= endNum;

    const col = num > 0 ? ((num - 1) % 3) + 1 : 0;
    const isColumnHit = col === 2 || col === 3;

    if (isDoubleStreetHit && isColumnHit) {
      // Jackpot Win: Reset progression and move Double Streets to a random dozen
      state.multiplier = 1;
      state.activeDozen = getRandomDozen();
    } else if (!isDoubleStreetHit && !isColumnHit) {
      // Total Loss: Double multiplier progression
      state.multiplier *= 2;
    }
    // Break Even: Keep current multiplier and dozen placement
  }

  // Target Profit Check: Reset placement and progression upon reaching target
  if (bankroll >= state.initialBankroll + state.targetProfit) {
    state.multiplier = 1;
    state.activeDozen = getRandomDozen();
  }

  // 3. Calculate Unit Sizes & Respect Config Bet Limits
  const insideMin = config.betLimits.min || 2;
  const outsideMin = config.betLimits.minOutside || 5;
  const maxLimit = config.betLimits.max || 500;

  let doubleStreetBet = Math.max(insideMin, Math.ceil(outsideMin / 2)) * state.multiplier;
  let columnBet = Math.max(outsideMin, insideMin * 2) * state.multiplier;

  doubleStreetBet = Math.min(doubleStreetBet, maxLimit);
  columnBet = Math.min(columnBet, maxLimit);

  // Determine line bet values for the selected dozen
  const line1Value = (state.activeDozen - 1) * 12 + 1;
  const line2Value = line1Value + 6;

  // 4. Return Bets
  return [
    { type: 'line', value: line1Value, amount: doubleStreetBet },
    { type: 'line', value: line2Value, amount: doubleStreetBet },
    { type: 'column', value: 2, amount: columnBet },
    { type: 'column', value: 3, amount: columnBet }
  ];
}