/**
 * Roulette Strategy: The Splits
 * Source: Junko Bodie (YouTube)
 * 
 * Logic:
 * - Observation Period: Does not place any bets for the first 10 spins to collect initial spin data.
 * - Selection: On reset (and after spin 10), analyzes the past 10 spins to pick 1 cold column per dozen:
 *   - Dozen 1: Coldest column in Dozen 1 (numbers 1-12).
 *   - Dozen 2: Coldest column in Dozen 2 (numbers 13-24), excluding Dozen 1's column.
 *   - Dozen 3: Remaining column for Dozen 3 (numbers 25-36).
 * - Lock Placement: Split placements are stored in state and remain fixed across spins until a FULL RESET.
 * - Wins & Resets:
 *   - When a dozen wins, it is removed from active play for subsequent spins.
 *   - A FULL RESET occurs when a session peak bankroll is reached/surpassed or all active dozens win.
 *   - Upon a full reset, all 3 dozens are reactivated and new split placements are selected from the last 10 spins.
 * 
 * Bet Progression:
 * - Progression Unit = Math.ceil((Peak Bankroll + Base Unit - Current Bankroll) / (18 - 2 * Active Dozens)).
 * - On loss, increases unit to cover accumulated losses and target new peak profit upon the next hit.
 * 
 * Goal:
 * - Achieve continuous session peak profits leveraging 17:1 split bet payouts and systematic dozen reduction.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initial 10-spin observation period: Spin without betting
  if (!spinHistory || spinHistory.length < 10) {
    return [];
  }

  const baseUnit = config.betLimits.min || 2;

  // Helper: Evaluates past 10 spins to select and lock split placements for all 3 dozens
  function updateAssignments() {
    const recentSpins = spinHistory.slice(-10);
    const counts = {
      1: { 1: 0, 2: 0, 3: 0 },
      2: { 1: 0, 2: 0, 3: 0 },
      3: { 1: 0, 2: 0, 3: 0 }
    };

    recentSpins.forEach(spin => {
      const num = spin.winningNumber;
      if (num >= 1 && num <= 36) {
        const doz = Math.ceil(num / 12);
        const col = ((num - 1) % 3) + 1;
        counts[doz][col]++;
      }
    });

    const col1 = [1, 2, 3].sort((a, b) => counts[1][a] - counts[1][b])[0];
    const rem2 = [1, 2, 3].filter(c => c !== col1);
    const col2 = rem2.sort((a, b) => counts[2][a] - counts[2][b])[0];
    const col3 = [1, 2, 3].find(c => c !== col1 && c !== col2);

    const cols = { 1: col1, 2: col2, 3: col3 };
    state.assignments = {};

    [1, 2, 3].forEach(doz => {
      const col = cols[doz];
      const n1 = (doz - 1) * 12 + col;
      const n2 = n1 + 3;
      const n3 = n1 + 6;
      const n4 = n1 + 9;
      state.assignments[doz] = [
        [n1, n2],
        [n3, n4]
      ];
    });
  }

  // 2. State Initialization
  if (!state.initialized) {
    state.initialized = true;
    state.peakBankroll = bankroll;
    state.activeDozens = [1, 2, 3];
    state.lastPlacedBets = [];
    updateAssignments();
  }

  // 3. Evaluate Result of Last Spin
  if (state.lastPlacedBets && state.lastPlacedBets.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;

    if (lastNum >= 1 && lastNum <= 36) {
      const lastDozen = Math.ceil(lastNum / 12);
      const hit = state.lastPlacedBets.some(b =>
        Array.isArray(b.value) && b.value.includes(lastNum)
      );

      if (hit) {
        // Remove winning dozen from active playing set
        state.activeDozens = state.activeDozens.filter(d => d !== lastDozen);
      }
    }
  }

  // 4. Reset Logic Check
  const isPeakReached = bankroll >= state.peakBankroll;
  const allDozensWon = state.activeDozens.length === 0;

  if (isPeakReached || allDozensWon) {
    if (bankroll > state.peakBankroll) {
      state.peakBankroll = bankroll;
    }
    state.activeDozens = [1, 2, 3];
    updateAssignments(); // Look at past 10 spins ONLY during reset
  }

  // Safety fallback
  if (!state.activeDozens || state.activeDozens.length === 0) {
    state.activeDozens = [1, 2, 3];
    updateAssignments();
  }

  // 5. Calculate Progression Bet Amount
  const numActiveDozens = state.activeDozens.length;
  const targetProfit = baseUnit;
  const targetBankroll = state.peakBankroll + targetProfit;
  const deficit = Math.max(0, targetBankroll - bankroll);

  const netMultiplier = 18 - (2 * numActiveDozens);
  let calculatedUnit = netMultiplier > 0 ? Math.ceil(deficit / netMultiplier) : baseUnit;

  // Clamp bet size to table limits
  let unit = Math.max(calculatedUnit, baseUnit);
  unit = Math.min(unit, config.betLimits.max);

  // 6. Build Bet Array using locked assignments
  const bets = [];
  state.activeDozens.forEach(doz => {
    const splitPairs = state.assignments[doz];
    if (splitPairs) {
      splitPairs.forEach(pair => {
        bets.push({ type: 'split', value: pair, amount: unit });
      });
    }
  });

  state.lastPlacedBets = bets;
  return bets;
}