/**
 * Dynamic 5 - Ultimate 9 Street Roulette Strategy
 * 
 * Source:
 * - YouTube Channel: TeKKa Tools & Talk
 * - Video URL: https://youtu.be/c4NP9yHdDiM
 * 
 * Strategy Logic:
 * - Continuously tracks 12 roulette streets (Street 1: 1-3 up to Street 12: 34-36).
 * - Evaluates 5 dynamic 9-street systems:
 *     1. Recent 9 Streets (R9St): Bets the 9 most recently hit streets (omits 3 oldest).
 *     2. Oldest 9 Streets (Old9St): Omits the 3 most recently hit streets.
 *     3. Not Dozen Position (NDP): Omits the same relative position (1-4) across all 3 dozens based on least recent hits.
 *     4. Dancing Streets: Dynamic 2-step omission based on street hit frequency and recency.
 *     5. Dancing Dozen Position (DDP): Dynamic omission based on dozen position frequency.
 * - Virtual Loss Trigger: Waits until a system hits a virtual Loss Level >= 3 (lost 3 times in a row).
 * - Progression:
 *     - Level 1: 1 unit per street (9 units total).
 *     - Level 2: 4 units per street (36 units total) for 1-win recovery.
 *     - Level 3: 16 units per street.
 * - On Win: Resets back to tracking / base level.
 * - Target Goal: +30 to +50 units profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // Street starting numbers: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
  const STREET_STARTS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

  function getStreetIndex(num) {
    if (num <= 0 || num > 36) return -1;
    return Math.floor((num - 1) / 3); // 0 to 11
  }

  // Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.startingBankroll = bankroll;
    state.targetProfit = 50 * (config.betLimits.min || 1);
    state.lossLevels = { r9: 0, old9: 0, ndp: 0, dancingStreets: 0, ddp: 0 };
    state.activeSystem = null;
    state.progressionStep = 0; // 0 = 1x, 1 = 4x, 2 = 16x
    state.multipliers = [1, 4, 16, 64];
    state.lastPredictedStreets = null;
  }

  // Evaluate previous outcome on virtual or real bets
  if (spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastWinningNum = lastSpin.winningNumber;
    const lastStreetIdx = getStreetIndex(lastWinningNum);

    // Update virtual loss tracking if prediction existed
    if (state.lastPredictions) {
      for (const sys of Object.keys(state.lastPredictions)) {
        const predictedStreets = state.lastPredictions[sys];
        const won = lastStreetIdx !== -1 && predictedStreets.includes(lastStreetIdx);
        if (won) {
          state.lossLevels[sys] = 0;
        } else {
          state.lossLevels[sys] += 1;
        }
      }
    }

    // Update real bet progression state
    if (state.activeSystem) {
      const activeStreets = state.lastPredictedStreets || [];
      const won = lastStreetIdx !== -1 && activeStreets.includes(lastStreetIdx);

      if (won) {
        state.activeSystem = null;
        state.progressionStep = 0;
        state.lastPredictedStreets = null;
      } else {
        state.progressionStep += 1;
        if (state.progressionStep >= state.multipliers.length) {
          // Reset on safety stop
          state.activeSystem = null;
          state.progressionStep = 0;
          state.lastPredictedStreets = null;
        }
      }
    }
  }

  // Check profit target / stop conditions
  if (bankroll >= state.startingBankroll + state.targetProfit) {
    return [];
  }

  // Calculate current street recency rankings
  const recentStreetOrder = [];
  for (let i = spinHistory.length - 1; i >= 0; i--) {
    const s = getStreetIndex(spinHistory[i].winningNumber);
    if (s !== -1 && !recentStreetOrder.includes(s)) {
      recentStreetOrder.push(s);
    }
    if (recentStreetOrder.length === 12) break;
  }
  for (let s = 0; s < 12; s++) {
    if (!recentStreetOrder.includes(s)) {
      recentStreetOrder.push(s);
    }
  }

  // System 1: Recent 9 Streets (omit 3 oldest)
  const r9Streets = recentStreetOrder.slice(0, 9);

  // System 2: Oldest 9 Streets (omit 3 newest)
  const old9Streets = recentStreetOrder.slice(3, 12);

  // System 3: Not Dozen Position (NDP)
  // Track recency of relative positions 0, 1, 2, 3 within dozens
  const posRecency = [];
  for (let i = spinHistory.length - 1; i >= 0; i--) {
    const s = getStreetIndex(spinHistory[i].winningNumber);
    if (s !== -1) {
      const pos = s % 4;
      if (!posRecency.includes(pos)) posRecency.push(pos);
    }
    if (posRecency.length === 4) break;
  }
  for (let p = 0; p < 4; p++) {
    if (!posRecency.includes(p)) posRecency.push(p);
  }
  const omitPos = posRecency[posRecency.length - 1]; // omit least recent position
  const ndpStreets = [];
  for (let s = 0; s < 12; s++) {
    if (s % 4 !== omitPos) ndpStreets.push(s);
  }

  // System 4: Dancing Streets (dynamic 2-step transition omission)
  const dancingStreets = [];
  const omitDancing = [recentStreetOrder[11], recentStreetOrder[10], recentStreetOrder[2]];
  for (let s = 0; s < 12; s++) {
    if (!omitDancing.includes(s)) dancingStreets.push(s);
  }

  // System 5: Dancing Dozen Position (DDP)
  const ddpOmitPos = posRecency[0]; // omit most recently triggered position
  const ddpStreets = [];
  for (let s = 0; s < 12; s++) {
    if (s % 4 !== ddpOmitPos) ddpStreets.push(s);
  }

  // Save predictions for virtual loss tracking
  state.lastPredictions = {
    r9: r9Streets,
    old9: old9Streets,
    ndp: ndpStreets,
    dancingStreets: dancingStreets,
    ddp: ddpStreets
  };

  // Determine which system to play
  const systems = ['r9', 'old9', 'ndp', 'dancingStreets', 'ddp'];
  const TRIGGER_LOSS_LEVEL = 3;

  if (!state.activeSystem) {
    // Look for a triggered system with the highest loss level >= 3
    let bestSys = null;
    let maxLL = TRIGGER_LOSS_LEVEL - 1;

    for (const sys of systems) {
      if (state.lossLevels[sys] > maxLL) {
        maxLL = state.lossLevels[sys];
        bestSys = sys;
      }
    }

    if (bestSys) {
      state.activeSystem = bestSys;
      state.progressionStep = 0;
    }
  }

  // Place bet if an active system is engaged
  if (state.activeSystem) {
    const activeStreets = state.lastPredictions[state.activeSystem];
    state.lastPredictedStreets = activeStreets;

    const unit = config.betLimits.min;
    const mult = state.multipliers[state.progressionStep] || 1;
    let streetBet = unit * mult;
    streetBet = Math.max(streetBet, config.betLimits.min);
    streetBet = Math.min(streetBet, config.betLimits.max);

    const totalRequired = streetBet * activeStreets.length;
    if (bankroll < totalRequired) {
      return [];
    }

    return activeStreets.map(streetIdx => ({
      type: 'street',
      value: STREET_STARTS[streetIdx],
      amount: streetBet
    }));
  }

  // In tracking mode without trigger
  return [];
}