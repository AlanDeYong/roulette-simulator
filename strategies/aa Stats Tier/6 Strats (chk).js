/**
 * Source: YouTube - "Cruising & Craps" (https://www.youtube.com/watch?v=IjPnyLTO-8g)
 * Modified Workflow:
 * 1. Warm-up: No bets for the first 37 spins (`spinHistory.length < 37`).
 * 2. Strategy Selector: Backtests all 6 strategies across the trailing 37 spins to determine
 *    which strategy would have yielded the highest net profit.
 * 3. Peak-Profit Strategy Switch: Once an active strategy drops below its local peak bankroll
 *    (or triggers profit capture), it re-evaluates the trailing 37 spins to dynamically pick
 *    the best performing strategy next.
 * 4. Limits & Safety: Preserves table clamping and bankroll limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // --- 1. Initialization ---
  if (!state.initialized) {
    state.startBankroll = bankroll;
    state.targetProfit = config.startingBankroll ? config.startingBankroll * 0.20 : 200;
    state.activeStrategy = null;
    state.strategyPeakBankroll = bankroll;
    
    // Sub-strategy internal states
    state.crimson = { colorUnits: 1, colUnits: 1, lastColor: 'red' };
    state.goTo = { multiplier: 1, winStreak: 0 };
    state.hotspots = { multiplier: 1 };
    state.octagon = { corners: [1, 4, 7, 10, 16, 19, 25, 28], multiplier: 1 };
    state.tripod = { lowUnits: 1, colUnits: 1 };

    state.initialized = true;
  }

  // Session stop: target profit reached
  if (bankroll >= state.startBankroll + state.targetProfit) {
    return [];
  }

  // --- 2. Observation Phase: 37 Spins Required ---
  if (spinHistory.length < 37) {
    return [];
  }

  // Helper clamping
  const minInside = config.betLimits.min;
  const minOutside = config.betLimits.minOutside;
  const maxBet = config.betLimits.max;
  const clampInside = (amt) => Math.min(Math.max(amt, minInside), maxBet);
  const clampOutside = (amt) => Math.min(Math.max(amt, minOutside), maxBet);

  // --- 3. Evaluate Strategy PnL over Trailing 37 Spins ---
  function evaluatePast37Spins(history) {
    const window = history.slice(-37);
    const candidateStrategies = ['crimson_rush', 'go_to', 'five_double_streets', 'hotspots', 'octagon_squeeze', 'tripod'];
    let bestStrategy = candidateStrategies[0];
    let maxProfit = -Infinity;

    candidateStrategies.forEach(strat => {
      let simProfit = 0;
      let localState = {
        crimson: { colorUnits: 1, colUnits: 1, lastColor: 'red' },
        goTo: { multiplier: 1, winStreak: 0 },
        hotspots: { multiplier: 1 },
        octagon: { corners: [1, 4, 7, 10, 16, 19, 25, 28], multiplier: 1 },
        tripod: { lowUnits: 1, colUnits: 1 }
      };

      for (let i = 0; i < window.length; i++) {
        const spin = window[i];
        const n = spin.winningNumber;
        const color = spin.winningColor;

        if (strat === 'crimson_rush') {
          const colHit = (n > 0) ? ((n - 1) % 3) + 1 : 0;
          const targetCol = (localState.crimson.lastColor === 'red') ? 3 : 2;
          const wonCol1 = (colHit === 1);
          const wonColTarget = (colHit === targetCol);
          const wonColor = (color === localState.crimson.lastColor);

          // PnL: Color bet pays 1:1, Column pays 2:1
          simProfit += wonColor ? localState.crimson.colorUnits : -localState.crimson.colorUnits;
          simProfit += wonCol1 ? (localState.crimson.colUnits * 2) : -localState.crimson.colUnits;
          simProfit += wonColTarget ? (localState.crimson.colUnits * 2) : -localState.crimson.colUnits;

          // Progression step
          localState.crimson.colorUnits = wonColor ? Math.max(1, localState.crimson.colorUnits - 1) : localState.crimson.colorUnits + 1;
          const wonCols = wonCol1 || wonColTarget;
          localState.crimson.colUnits = wonCols ? Math.max(1, localState.crimson.colUnits - 1) : localState.crimson.colUnits + 1;
          if (color === 'red' || color === 'black') localState.crimson.lastColor = color;
        } 
        else if (strat === 'go_to') {
          const inCol3 = (n > 0 && n % 3 === 0);
          const cornerRoots = [1, 7, 13, 19];
          let cornerHits = 0;
          cornerRoots.forEach(r => {
            if ([r, r+1, r+3, r+4].includes(n)) cornerHits++;
          });

          const m = localState.goTo.multiplier;
          let net = -((4 * m) + (3 * m)); // Total wager
          if (inCol3) net += (3 * m * 3); // Col 3 payout (2:1 + stake)
          if (cornerHits > 0) net += (cornerHits * m * 9); // Corner payout (8:1 + stake)
          simProfit += net;

          if (inCol3 || cornerHits > 0) {
            localState.goTo.winStreak++;
            if (localState.goTo.winStreak >= 2) {
              localState.goTo.multiplier = 1;
              localState.goTo.winStreak = 0;
            }
          } else {
            localState.goTo.multiplier = Math.min(m * 2, 8);
            localState.goTo.winStreak = 0;
          }
        } 
        else if (strat === 'five_double_streets') {
          // 5 lines of 6 numbers: 1-30 covered
          const won = (n >= 1 && n <= 30);
          simProfit += won ? 1 : -5;
        } 
        else if (strat === 'hotspots') {
          const m = localState.hotspots.multiplier;
          const wonLow = (n >= 1 && n <= 18);
          const wonTrio = [0, 1, 2].includes(n);
          const wonStraight = (n === 2);

          let net = -((5 * m) + m + m);
          if (wonLow) net += (5 * m * 2);
          if (wonTrio) net += (m * 12);
          if (wonStraight) net += (m * 36);
          simProfit += net;

          localState.hotspots.multiplier = (wonLow || wonTrio || wonStraight) ? 1 : Math.min(m * 2, 8);
        } 
        else if (strat === 'octagon_squeeze') {
          const m = localState.octagon.multiplier;
          const corners = localState.octagon.corners;
          let hitIdx = -1;
          for (let c = 0; c < corners.length; c++) {
            const root = corners[c];
            if ([root, root+1, root+3, root+4].includes(n)) {
              hitIdx = c;
              break;
            }
          }

          let net = -(corners.length * m);
          if (hitIdx !== -1) {
            net += (m * 9);
            if (corners.length > 6) corners.splice(hitIdx, 1);
            localState.octagon.multiplier = 1;
          } else {
            localState.octagon.multiplier = Math.min(m * 2, 8);
          }
          simProfit += net;
        } 
        else if (strat === 'tripod') {
          const wonLow = (n >= 1 && n <= 18);
          const colHit = (n > 0) ? ((n - 1) % 3) + 1 : 0;
          const wonCol1 = (colHit === 1);
          const wonCol2 = (colHit === 2);

          simProfit += wonLow ? localState.tripod.lowUnits : -localState.tripod.lowUnits;
          simProfit += wonCol1 ? (localState.tripod.colUnits * 2) : -localState.tripod.colUnits;
          simProfit += wonCol2 ? (localState.tripod.colUnits * 2) : -localState.tripod.colUnits;

          localState.tripod.lowUnits = wonLow ? Math.max(1, localState.tripod.lowUnits - 1) : localState.tripod.lowUnits + 1;
          const wonCols = wonCol1 || wonCol2;
          localState.tripod.colUnits = wonCols ? Math.max(1, localState.tripod.colUnits - 1) : localState.tripod.colUnits + 1;
        }
      }

      if (simProfit > maxProfit) {
        maxProfit = simProfit;
        bestStrategy = strat;
      }
    });

    return bestStrategy;
  }

  // --- 4. Strategy Switch & Peak Tracking ---
  // Initial pick on spin 37
  if (!state.activeStrategy) {
    state.activeStrategy = evaluatePast37Spins(spinHistory);
    state.strategyPeakBankroll = bankroll;
  } else {
    // Peak profit check: if bankroll dropped from its peak, switch strategies
    if (bankroll > state.strategyPeakBankroll) {
      state.strategyPeakBankroll = bankroll;
    } else if (bankroll < state.strategyPeakBankroll) {
      // Re-evaluate the trailing 37 spins and pivot
      state.activeStrategy = evaluatePast37Spins(spinHistory);
      state.strategyPeakBankroll = bankroll;
      // Reset progression states
      state.crimson = { colorUnits: 1, colUnits: 1, lastColor: 'red' };
      state.goTo = { multiplier: 1, winStreak: 0 };
      state.hotspots = { multiplier: 1 };
      state.octagon = { corners: [1, 4, 7, 10, 16, 19, 25, 28], multiplier: 1 };
      state.tripod = { lowUnits: 1, colUnits: 1 };
    }
  }

  const lastSpin = spinHistory[spinHistory.length - 1];
  const bets = [];

  // --- 5. Execute Active Strategy ---
  if (state.activeStrategy === 'crimson_rush') {
    if (lastSpin) {
      const wonColor = (lastSpin.winningColor === state.crimson.lastColor);
      state.crimson.colorUnits = wonColor 
        ? Math.max(1, state.crimson.colorUnits - 1) 
        : state.crimson.colorUnits + 1;

      const colHit = (lastSpin.winningNumber > 0) ? ((lastSpin.winningNumber - 1) % 3) + 1 : 0;
      const activeSecondaryCol = (state.crimson.lastColor === 'red') ? 3 : 2;
      const wonCols = (colHit === 1 || colHit === activeSecondaryCol);

      state.crimson.colUnits = wonCols 
        ? Math.max(1, state.crimson.colUnits - 1) 
        : state.crimson.colUnits + 1;

      if (lastSpin.winningColor === 'red' || lastSpin.winningColor === 'black') {
        state.crimson.lastColor = lastSpin.winningColor;
      }
    }

    const colorAmt = clampOutside(minOutside * state.crimson.colorUnits);
    const colAmt = clampOutside(minOutside * state.crimson.colUnits);
    const secondaryCol = (state.crimson.lastColor === 'red') ? 3 : 2;

    bets.push({ type: state.crimson.lastColor, amount: colorAmt });
    bets.push({ type: 'column', value: 1, amount: colAmt });
    bets.push({ type: 'column', value: secondaryCol, amount: colAmt });
  } 
  else if (state.activeStrategy === 'go_to') {
    if (lastSpin) {
      const n = lastSpin.winningNumber;
      const inCol3 = (n > 0 && n % 3 === 0);
      const inCorners = [1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23].includes(n);

      if (inCol3 || inCorners) {
        state.goTo.winStreak += 1;
        if (state.goTo.winStreak >= 2) {
          state.goTo.multiplier = 1;
          state.goTo.winStreak = 0;
        }
      } else {
        state.goTo.multiplier = Math.min(state.goTo.multiplier * 2, 8);
        state.goTo.winStreak = 0;
      }
    }

    const cornerAmt = clampInside(minInside * state.goTo.multiplier);
    const col3Amt = clampOutside(minOutside * 3 * state.goTo.multiplier);

    [1, 7, 13, 19].forEach(r => bets.push({ type: 'corner', value: r, amount: cornerAmt }));
    bets.push({ type: 'column', value: 3, amount: col3Amt });
  } 
  else if (state.activeStrategy === 'five_double_streets') {
    const lineAmt = clampInside(minInside);
    [1, 7, 13, 19, 25].forEach(start => bets.push({ type: 'line', value: start, amount: lineAmt }));
  } 
  else if (state.activeStrategy === 'hotspots') {
    if (lastSpin) {
      const n = lastSpin.winningNumber;
      const won = (n >= 1 && n <= 18) || n === 0;
      state.hotspots.multiplier = won ? 1 : Math.min(state.hotspots.multiplier * 2, 8);
    }

    const lowAmt = clampOutside(minOutside * 5 * state.hotspots.multiplier);
    const insideAmt = clampInside(minInside * state.hotspots.multiplier);

    bets.push({ type: 'low', amount: lowAmt });
    bets.push({ type: 'trio', value: [0, 1, 2], amount: insideAmt });
    bets.push({ type: 'number', value: 2, amount: insideAmt });
  } 
  else if (state.activeStrategy === 'octagon_squeeze') {
    if (lastSpin) {
      const n = lastSpin.winningNumber;
      let hitIndex = -1;
      for (let i = 0; i < state.octagon.corners.length; i++) {
        const root = state.octagon.corners[i];
        if ([root, root + 1, root + 3, root + 4].includes(n)) {
          hitIndex = i;
          break;
        }
      }

      if (hitIndex !== -1) {
        if (state.octagon.corners.length > 6) {
          state.octagon.corners.splice(hitIndex, 1);
        }
        state.octagon.multiplier = 1;
      } else {
        state.octagon.multiplier = Math.min(state.octagon.multiplier * 2, 8);
      }
    }

    const cornerAmt = clampInside(minInside * state.octagon.multiplier);
    state.octagon.corners.forEach(root => bets.push({ type: 'corner', value: root, amount: cornerAmt }));
  } 
  else if (state.activeStrategy === 'tripod') {
    if (lastSpin) {
      const n = lastSpin.winningNumber;
      const wonLow = (n >= 1 && n <= 18);
      state.tripod.lowUnits = wonLow ? Math.max(1, state.tripod.lowUnits - 1) : state.tripod.lowUnits + 1;

      const colHit = (n > 0) ? ((n - 1) % 3) + 1 : 0;
      const wonCols = (colHit === 1 || colHit === 2);
      state.tripod.colUnits = wonCols ? Math.max(1, state.tripod.colUnits - 1) : state.tripod.colUnits + 1;
    }

    const lowAmt = clampOutside(minOutside * state.tripod.lowUnits);
    const colAmt = clampOutside(minOutside * state.tripod.colUnits);

    bets.push({ type: 'low', amount: lowAmt });
    bets.push({ type: 'column', value: 1, amount: colAmt });
    bets.push({ type: 'column', value: 2, amount: colAmt });
  }

  // --- 6. Bankroll Limit Verification ---
  const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
  if (totalWager > bankroll) {
    return [];
  }

  return bets;
}