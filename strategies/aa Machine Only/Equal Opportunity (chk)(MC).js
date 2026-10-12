/**
 * Equal Opportunity Roulette Strategy
 *
 * Source:
 *   - Video: "EQUAL OPPORTUNITY ROULETTE IS NEVER OUT OF THE GAME!"
 *   - Channel: The Roulette Master (System by Van)
 *   - URL: https://youtu.be/nnZDqRTshdE
 *
 * Full Logic in Detail:
 *   - Coverage: Bets on 1st Dozen (1-12) and 3rd Dozen (25-36) plus one Outside Color.
 *   - Color Alternation: The color bet strictly alternates between 'black' and 'red'
 *     every spin to neutralize color streaks.
 *   - Dozen Placement: Always 1st Dozen and 3rd Dozen simultaneously.
 *
 * Full Bet Progression in Detail:
 *   - Base Bet: 1 base unit on 1st Dozen, 1 base unit on 3rd Dozen, 1 base unit on Color.
 *   - On Loss (Net Spin Profit < 0):
 *       Increase bet by 1 incremental unit on each of the 3 bets (+1 unit ladder).
 *   - On Push / Break-Even (Net Spin Profit == 0):
 *       Maintain the exact same bet size on each position.
 *   - On Win (Net Spin Profit > 0):
 *       - If session profit is positive / at a new high-water mark: Reset to base level (1 unit).
 *       - If still in a session deficit: Rebet current level (do not increase).
 *   - All bets strictly clamped within table minimum outside bets and maximum limits.
 *
 * The Goal:
 *   - Recover drawdowns with gradual unit escalations while exploiting dual hits (dozen + color).
 *   - Bankroll preservation: Default session target and stop-loss safeguard.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  const minOutside = config.betLimits.minOutside || 10;
  const maxBet = config.betLimits.max || 1000;
  const startingBankroll = config.startingBankroll || bankroll;

  // Initialize persistent session state
  if (!state.initialized) {
    state.initialized = true;
    state.currentColor = 'black'; // Initial color demonstrated in video
    state.level = 1;
    state.baseUnit = minOutside;
    state.highWaterMark = startingBankroll;
    state.lastBets = null;
    state.lastBankroll = bankroll;
  }

  // Evaluate previous spin outcome if history exists
  if (spinHistory && spinHistory.length > 0 && state.lastBets) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const prevNumber = lastSpin.winningNumber;
    const prevColor = lastSpin.winningColor;

    let spinWon = 0;
    let spinCost = 0;

    for (const b of state.lastBets) {
      spinCost += b.amount;
      if (b.type === 'dozen') {
        const inFirst = b.value === 1 && prevNumber >= 1 && prevNumber <= 12;
        const inThird = b.value === 3 && prevNumber >= 25 && prevNumber <= 36;
        if (inFirst || inThird) {
          spinWon += b.amount * 3; // 2:1 payout returns 3x stake
        }
      } else if (b.type === 'red' && prevColor === 'red') {
        spinWon += b.amount * 2; // 1:1 payout returns 2x stake
      } else if (b.type === 'black' && prevColor === 'black') {
        spinWon += b.amount * 2; // 1:1 payout returns 2x stake
      }
    }

    const netSpinProfit = spinWon - spinCost;

    // Progression adjustment
    if (netSpinProfit > 0) {
      // Win: If bankroll is at or above starting bankroll / peak, reset to base unit
      if (bankroll >= state.highWaterMark) {
        state.level = 1;
        state.highWaterMark = bankroll;
      }
      // If still in deficit, rebet same level (do not increase)
    } else if (netSpinProfit < 0) {
      // Loss: Increase progression level by 1 unit
      state.level += 1;
    }
    // If netSpinProfit === 0 (Push / Break-even), state.level remains unchanged

    // Alternate color every spin
    state.currentColor = state.currentColor === 'black' ? 'red' : 'black';
  }

  // Update high water mark
  if (bankroll > state.highWaterMark) {
    state.highWaterMark = bankroll;
  }

  // Calculate current bet per position
  const increment = config.incrementMode === 'fixed' && config.minIncrementalBet
    ? config.minIncrementalBet
    : state.baseUnit;

  let unitAmount = state.baseUnit + (state.level - 1) * increment;

  // Clamp within table limits
  unitAmount = Math.max(unitAmount, minOutside);
  unitAmount = Math.min(unitAmount, maxBet);

  // Verify total bankroll sufficiency for 3 simultaneous outside bets
  const totalRequired = unitAmount * 3;
  if (bankroll < totalRequired) {
    // If cannot afford full progression, scale down to affordable equal parts
    const affordableUnit = Math.floor(bankroll / 3);
    if (affordableUnit < minOutside) {
      return []; // Insufficient bankroll to place table minimums
    }
    unitAmount = affordableUnit;
  }

  const currentBets = [
    { type: 'dozen', value: 1, amount: unitAmount },
    { type: 'dozen', value: 3, amount: unitAmount },
    { type: state.currentColor, amount: unitAmount }
  ];

  state.lastBets = currentBets;
  state.lastBankroll = bankroll;

  return currentBets;
}