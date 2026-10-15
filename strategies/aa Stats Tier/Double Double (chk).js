/**
 * Strategy: Double Double System
 * Source: "DOUBLE DOUBLE! 2 Roulette Wins on ONE Spin!| Great System" by Mastering The Wheel
 * URL: https://youtu.be/eWq5TWfOQQQ
 *
 * Full Logic in Detail:
 * - Operates two completely independent bet groups simultaneously on every spin:
 *   1. Dozens Group: Bets on the 2 hottest dozens based on recent history (rolling window up to 74 spins).
 *   2. Columns Group: Bets on the 2 hottest columns based on recent history.
 * - Betting is active immediately without entry triggers. Overlapping wins provide a 2-unit profit per spin.
 *
 * Full Bet Progression in Detail:
 * - Each group tracks its own independent 5-level triple Martingale progression:
 *   Level 1: 1 unit on each of 2 positions
 *   Level 2: 3 units on each of 2 positions
 *   Level 3: 9 units on each of 2 positions
 *   Level 4: 27 units on each of 2 positions
 *   Level 5: 81 units on each of 2 positions
 * - Win: Resets that specific group to Level 1.
 * - Loss: Advances that specific group to the next level. If Level 5 loses, that group stops betting.
 *
 * The Goal:
 * - Profit Target: 5% of starting bankroll (approx. 25 units).
 * - Spin Window: Maximum of 25 spins per session.
 * - Stop Loss: 5 consecutive losses on either group at Level 5 or bankroll exhaustion.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const MULTIPLIERS = [1, 3, 9, 27, 81];
  const MAX_LEVELS = MULTIPLIERS.length;
  const ROLLING_WINDOW = 74;
  const MAX_SPINS = 25000;

  // Initialize persistent session state
  if (!state.initialized) {
    state.initialized = true;
    state.startBankroll = bankroll;
    state.spinsPlayed = 0;
    state.targetProfit = (config.startingBankroll || bankroll) * 1000.05;

    state.dozenLevel = 0;
    state.columnLevel = 0;
    state.dozenStopped = false;
    state.columnStopped = false;

    state.lastDozenBets = null;
    state.lastColumnBets = null;
    state.lastHistoryLength = 0;
  }

  // Evaluate previous spin outcome if new spin occurred
  if (spinHistory && spinHistory.length > state.lastHistoryLength) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;
    state.spinsPlayed++;

    // Evaluate Dozens outcome
    if (state.lastDozenBets && !state.dozenStopped) {
      const winningDozen = winningNum >= 1 && winningNum <= 12 ? 1 :
                           winningNum >= 13 && winningNum <= 24 ? 2 :
                           winningNum >= 25 && winningNum <= 36 ? 3 : 0;

      const wonDozen = state.lastDozenBets.includes(winningDozen);
      if (wonDozen) {
        state.dozenLevel = 0;
      } else {
        state.dozenLevel++;
        if (state.dozenLevel >= MAX_LEVELS) {
          state.dozenStopped = true;
        }
      }
    }

    // Evaluate Columns outcome
    if (state.lastColumnBets && !state.columnStopped) {
      const winningColumn = winningNum === 0 ? 0 : ((winningNum - 1) % 3) + 1;
      const wonColumn = state.lastColumnBets.includes(winningColumn);

      if (wonColumn) {
        state.columnLevel = 0;
      } else {
        state.columnLevel++;
        if (state.columnLevel >= MAX_LEVELS) {
          state.columnStopped = true;
        }
      }
    }

    state.lastHistoryLength = spinHistory.length;
  }

  // Session stop conditions
  const currentProfit = bankroll - state.startBankroll;
  if (currentProfit >= state.targetProfit) {
    return [];
  }
  if (state.spinsPlayed >= MAX_SPINS) {
    return [];
  }
  if (state.dozenStopped && state.columnStopped) {
    return [];
  }

  // Determine hottest dozens and columns over rolling window
  const historySlice = (spinHistory || []).slice(-ROLLING_WINDOW);
  const dozenCounts = { 1: 0, 2: 0, 3: 0 };
  const columnCounts = { 1: 0, 2: 0, 3: 0 };

  for (let i = 0; i < historySlice.length; i++) {
    const num = historySlice[i].winningNumber;
    if (num >= 1 && num <= 36) {
      const d = num <= 12 ? 1 : num <= 24 ? 2 : 3;
      const c = ((num - 1) % 3) + 1;
      dozenCounts[d]++;
      columnCounts[c]++;
    }
  }

  const sortedDozens = [1, 2, 3].sort((a, b) => dozenCounts[b] - dozenCounts[a]);
  const activeDozens = [sortedDozens[0], sortedDozens[1]];

  const sortedColumns = [1, 2, 3].sort((a, b) => columnCounts[b] - columnCounts[a]);
  const activeColumns = [sortedColumns[0], sortedColumns[1]];

  const bets = [];
  const minOutside = config.betLimits.minOutside || 1;
  const maxBet = config.betLimits.max || Infinity;

  // Place Dozen Bets
  if (!state.dozenStopped && state.dozenLevel < MAX_LEVELS) {
    const dozenMult = MULTIPLIERS[state.dozenLevel];
    let dozenAmount = minOutside * dozenMult;
    dozenAmount = Math.max(minOutside, Math.min(dozenAmount, maxBet));

    bets.push({ type: 'dozen', value: activeDozens[0], amount: dozenAmount });
    bets.push({ type: 'dozen', value: activeDozens[1], amount: dozenAmount });
    state.lastDozenBets = activeDozens;
  } else {
    state.lastDozenBets = null;
  }

  // Place Column Bets
  if (!state.columnStopped && state.columnLevel < MAX_LEVELS) {
    const colMult = MULTIPLIERS[state.columnLevel];
    let colAmount = minOutside * colMult;
    colAmount = Math.max(minOutside, Math.min(colAmount, maxBet));

    bets.push({ type: 'column', value: activeColumns[0], amount: colAmount });
    bets.push({ type: 'column', value: activeColumns[1], amount: colAmount });
    state.lastColumnBets = activeColumns;
  } else {
    state.lastColumnBets = null;
  }

  // Bankroll safety check
  const totalBetRequired = bets.reduce((sum, b) => sum + b.amount, 0);
  if (totalBetRequired > bankroll) {
    return [];
  }

  return bets;
}