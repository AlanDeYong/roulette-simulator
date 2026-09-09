/**
 * ============================================================================
 * STRATEGY: Ziegler Roulette (Dynamic Coldest Dozen / Double Street Variant)
 * ============================================================================
 * Source:
 *   - Video: "THE NEW HOLY GRAIL?" (https://youtu.be/gwhfeFjzS5k)
 *   - Channel: The Roulette Master (System submitted by Joe Ziegler)
 * 
 * The Full Logic in Detail:
 *   - Spin without betting until all 3 unique dozens (1-12, 13-24, 25-36)
 *     have hit at least once.
 *   - Identify the dozen that has not hit for the longest time (coldest dozen).
 *   - Within that coldest dozen, identify the double street (six line) that
 *     has not hit for the longest time:
 *       * Dozen 1: Line 1 (1-6) or Line 7 (7-12)
 *       * Dozen 2: Line 13 (13-18) or Line 19 (19-24)
 *       * Dozen 3: Line 25 (25-30) or Line 31 (31-36)
 *   - Begin betting using this coldest double street at Stage 1.
 * 
 * The Full Bet Progression in Detail:
 *   - Loss Progression (Expands up to 5 double streets, picking coldest lines first):
 *       * Stage 1 Loss -> Stage 2: Add 2nd double street. Same unit amount.
 *       * Stage 2 Loss -> Stage 3: Add 3rd double street. DOUBLE the unit amount.
 *       * Stage 3 Loss -> Stage 4: Add 4th double street. DOUBLE the unit amount.
 *       * Stage 4 Loss -> Stage 5: Add 5th double street. Do NOT double;
 *         increase each line bet by 1 incremental unit.
 *       * Loss at Stage 5: Remain at 5 double streets, increase each line
 *         by 1 incremental unit.
 * 
 *   - Win Rules:
 *       * If bankroll reaches or exceeds session peak profit, FULL RESET back
 *         to waiting for the 3-dozen trigger.
 *       * If < 5 double streets: Repeat current bets to build toward session peak.
 *       * At 5 double streets: Pull 1 double street off (drop to 4 lines)
 *         at the same unit size.
 * 
 * The Goal:
 *   - Exploit lagging sectors while retaining Ziegler coverage and recovery.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const ALL_LINES = [1, 7, 13, 19, 25, 31];
  const minInside = config.betLimits.min;
  const maxBet = config.betLimits.max;

  const baseUnit = Math.max(minInside, 10);
  const incUnit = config.incrementMode === 'base'
    ? baseUnit
    : (config.minIncrementalBet || baseUnit);

  // Helper: Determine dozen (1, 2, 3) or 0 for zero
  function getDozen(num) {
    if (num >= 1 && num <= 12) return 1;
    if (num >= 13 && num <= 24) return 2;
    if (num >= 25 && num <= 36) return 3;
    return 0;
  }

  // Helper: Find last appearance index of a condition in spinHistory
  function getLastSeenSpin(filterFn) {
    for (let i = spinHistory.length - 1; i >= 0; i--) {
      if (filterFn(spinHistory[i].winningNumber)) return i;
    }
    return -1;
  }

  // Helper: Rank double streets by how long ago they hit (coldest first)
  function getColdestLines(candidateLines) {
    return [...candidateLines].sort((a, b) => {
      const lastA = getLastSeenSpin(n => n >= a && n <= a + 5);
      const lastB = getLastSeenSpin(n => n >= b && n <= b + 5);
      return lastA - lastB; // Smallest index = hit longest ago
    });
  }

  // 1. Initialize State
  if (state.peakBankroll === undefined) {
    state.peakBankroll = bankroll;
  }
  if (state.stage === undefined) {
    state.stage = 0; // 0 = waiting for trigger
    state.activeLines = [];
    state.unitAmount = baseUnit;
  }

  // 2. Trigger Evaluation (Stage 0)
  if (state.stage === 0) {
    const d1Last = getLastSeenSpin(n => getDozen(n) === 1);
    const d2Last = getLastSeenSpin(n => getDozen(n) === 2);
    const d3Last = getLastSeenSpin(n => getDozen(n) === 3);

    // Check if all 3 unique dozens have hit at least once
    if (d1Last !== -1 && d2Last !== -1 && d3Last !== -1) {
      // Find the dozen that has not hit for the longest time
      const dozenAges = [
        { dozen: 1, last: d1Last, lines: [1, 7] },
        { dozen: 2, last: d2Last, lines: [13, 19] },
        { dozen: 3, last: d3Last, lines: [25, 31] }
      ];
      dozenAges.sort((a, b) => a.last - b.last);
      const coldestDozen = dozenAges[0];

      // Within that dozen, pick the double street not hit for the longest time
      const rankedLinesInDozen = getColdestLines(coldestDozen.lines);
      const startingLine = rankedLinesInDozen[0];

      // Activate Stage 1
      state.stage = 1;
      state.unitAmount = baseUnit;
      state.activeLines = [startingLine];
    } else {
      // Wait for condition to be met
      return [];
    }
  } else if (spinHistory && spinHistory.length > 0) {
    // 3. Process Result of Active Stage
    const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
    const won = state.activeLines.some(line => lastNum >= line && lastNum <= line + 5);

    if (won) {
      if (bankroll >= state.peakBankroll) {
        state.peakBankroll = bankroll;
        // Reset back to waiting for 3 unique dozens trigger
        state.stage = 0;
        state.activeLines = [];
        state.unitAmount = baseUnit;
        return [];
      } else {
        // Win without new peak
        if (state.stage === 5) {
          // At 5 lines, pull 1 double street off
          state.stage = 4;
          state.activeLines = state.activeLines.slice(0, 4);
        }
        // If stage < 5: repeat same bet
      }
    } else {
      // Loss: Advance progression and expand coverage using next coldest lines
      const remainingLines = getColdestLines(
        ALL_LINES.filter(l => !state.activeLines.includes(l))
      );

      if (state.stage === 1) {
        state.stage = 2;
        if (remainingLines.length > 0) state.activeLines.push(remainingLines[0]);
      } else if (state.stage === 2) {
        state.stage = 3;
        if (remainingLines.length > 0) state.activeLines.push(remainingLines[0]);
        state.unitAmount = state.unitAmount * 2; // Double
      } else if (state.stage === 3) {
        state.stage = 4;
        if (remainingLines.length > 0) state.activeLines.push(remainingLines[0]);
        state.unitAmount = state.unitAmount * 2; // Double (last time)
      } else if (state.stage === 4) {
        state.stage = 5;
        if (remainingLines.length > 0) state.activeLines.push(remainingLines[0]);
        state.unitAmount = state.unitAmount + incUnit; // Incremental addition
      } else if (state.stage === 5) {
        state.unitAmount = state.unitAmount + incUnit;
      }
    }
  }

  // Update session peak
  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
  }

  if (state.stage === 0 || state.activeLines.length === 0) {
    return [];
  }

  // 4. Clamp Bet Amount
  let betPerLine = Math.max(state.unitAmount, minInside);
  betPerLine = Math.min(betPerLine, maxBet);

  // 5. Generate Bets
  return state.activeLines.map(startNum => ({
    type: 'line',
    value: startNum,
    amount: betPerLine
  }));
}