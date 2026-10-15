/**
 * Strategy Name: MPL (Most Profitable Layout) Roulette Strategy
 * Source: https://youtu.be/9SxxaMzooDw
 * Channel: Bet With Mo
 *
 * Progression Rules (Strict Peak Profit Lock):
 * - On Loss: Advance 1 level up (up to Level 7).
 * - On Win (Below Peak): STAY at current level (do NOT step down or reset).
 * - On Win (Reaches/Exceeds Session Peak Bankroll): RESET to Level 1.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.level === undefined) state.level = 1;
  if (state.prevBankroll === undefined) state.prevBankroll = bankroll;
  if (state.peakBankroll === undefined) state.peakBankroll = bankroll;

  // 2. Evaluate Previous Spin Results
  if (spinHistory && spinHistory.length > 0) {
    const profitLastRound = bankroll - state.prevBankroll;

    if (bankroll > state.peakBankroll) {
      // Reached new peak bankroll -> RESET to Level 1
      state.peakBankroll = bankroll;
      state.level = 1;
    } else if (profitLastRound < 0) {
      // Loss -> Level up
      state.level = Math.min(state.level + 1, 7);
    }
    // On intermediate wins (profitLastRound > 0) below peak: hold current level
  }

  // Record bankroll for next turn evaluation
  state.prevBankroll = bankroll;

  // 3. Bet Multipliers per Level
  const streetMultipliers = { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10, 6: 20, 7: 40 };
  const splitMultipliers  = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5,  6: 10, 7: 20 };

  const currentLevel = state.level;
  const unit = config.betLimits.min || 1;

  let rawStreetBet = unit * streetMultipliers[currentLevel];
  let rawSplitBet  = unit * splitMultipliers[currentLevel];

  const streetAmount = Math.min(Math.max(rawStreetBet, config.betLimits.min), config.betLimits.max);
  const splitAmount  = Math.min(Math.max(rawSplitBet, config.betLimits.min), config.betLimits.max);

  // 4. Board Positions
  const streetValues = [1, 7, 13, 22, 28, 34];
  const splitValues  = [
    [0, 2],
    [4, 5],
    [10, 11],
    [25, 26],
    [31, 32]
  ];

  // 5. Construct Bets
  const bets = [];

  for (const streetVal of streetValues) {
    bets.push({
      type: 'street',
      value: streetVal,
      amount: streetAmount
    });
  }

  for (const splitVal of splitValues) {
    bets.push({
      type: 'split',
      value: splitVal,
      amount: splitAmount
    });
  }

  return bets;
}