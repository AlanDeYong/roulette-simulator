/**
 * Roulette Strategy: 6543 / Countdown Corners (Stage-Specific Reference Bankroll)
 * 
 * SOURCE:
 * - URL: https://youtu.be/roh-5EYFiw8
 * - Channel: Junko Bodie
 * 
 * THE FULL LOGIC IN DETAILS:
 * - Tracks `state.stageRefBankroll` as the bankroll snapshot at the START of each corner stage.
 * - Stage-by-Stage Reference Progression:
 *   - Stage 6 (6 corners): Target = stageRefBankroll + $5. 
 *     -> Upon reaching target: Move to 5 corners & set new stageRefBankroll = current bankroll.
 *   - Stage 5 (5 corners): Target = stageRefBankroll + $10.
 *     -> Upon reaching target: Move to 4 corners & set new stageRefBankroll = current bankroll.
 *   - Stage 4 (4 corners): Target = stageRefBankroll + $20.
 *     -> Upon reaching target: Move to 3 corners & set new stageRefBankroll = current bankroll.
 *   - Stage 3 (3 corners): Target = stageRefBankroll + $40.
 *     -> Upon reaching target: Reset to Stage 6, set new stageRefBankroll = current bankroll, reset unit size to 1.
 * - Monotonic Stage Lock: Corner counts stay locked during drawdowns until the required stage target is reached.
 * - Avoidance Rule:
 *   - Stage 6 (6 corners): Bet all 6 corners of selected set without filtering.
 *   - Stage 5 or less (<= 5 corners): Avoid covering the winning number from the previous spin.
 * 
 * THE FULL BET PROGRESSION IN DETAILS:
 * - Base unit = config.betLimits.min.
 * - Loss 1: Double bet size to 2 units per corner.
 * - Loss 2+: Add +1 unit per corner per loss (3, 4, 5, 6... units).
 * - Win: Bet unit size resets back to 1 ONLY if current bankroll >= state.stageRefBankroll.
 * 
 * THE GOAL:
 * - Step down corner levels by earning incremental profits relative to the bankroll 
 *   when each corner level began.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine base unit for inside bets
  const baseUnit = config.betLimits.min;

  // Junko Bodie's 2 standard non-overlapping Zigzag sets
  const JUNKO_SETS = [
    [2, 7, 14, 19, 26, 31], // Set A
    [1, 8, 13, 20, 25, 32]  // Set B
  ];

  // Helper function: checks if a corner covers a specific number
  function cornerCoversNumber(cornerVal, num) {
    if (num === null || num === undefined) return false;
    const covered = [cornerVal, cornerVal + 1, cornerVal + 3, cornerVal + 4];
    return covered.includes(num);
  }

  // 2. Initialize strategy state
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
    state.stageRefBankroll = bankroll; // Reference bankroll for current stage
    state.stage = 6;                    // Start with 6 corners
    state.units = 1;                    // Current bet units per corner
    state.losses = 0;                   // Consecutive losses counter
    state.activeCorners = [];           // Active corners placed in last spin
  }

  // 3. Process previous spin result
  let lastWinningNum = null;
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    lastWinningNum = lastSpin.winningNumber;

    // Check if any active corner won on the previous spin
    let hit = false;
    if (state.activeCorners && state.activeCorners.length > 0) {
      hit = state.activeCorners.some(corner => cornerCoversNumber(corner, lastWinningNum));
    }

    // Progression Rule: Reset bet unit size ONLY if current bankroll >= current stageRefBankroll
    if (hit) {
      if (bankroll >= state.stageRefBankroll) {
        state.units = 1;
        state.losses = 0;
      }
    } else {
      // Progression on loss
      state.losses += 1;
      state.units = state.losses === 1 ? 2 : state.units + 1;
    }
  }

  // 4. Stage Transitions relative to `stageRefBankroll`
  if (state.stage === 6) {
    // Stage 6 -> Stage 5: Target is +$5 above stageRefBankroll
    if (bankroll >= state.stageRefBankroll + 5) {
      state.stage = 5;
      state.stageRefBankroll = bankroll; // Set NEW reference bankroll for Stage 5
      state.units = 1;                    // Reset unit size on stage shift
      state.losses = 0;
    }
  } else if (state.stage === 5) {
    // Stage 5 -> Stage 4: Target is +$10 above stageRefBankroll
    if (bankroll >= state.stageRefBankroll + 10) {
      state.stage = 4;
      state.stageRefBankroll = bankroll; // Set NEW reference bankroll for Stage 4
      state.units = 1;
      state.losses = 0;
    }
  } else if (state.stage === 4) {
    // Stage 4 -> Stage 3: Target is +$20 above stageRefBankroll
    if (bankroll >= state.stageRefBankroll + 20) {
      state.stage = 3;
      state.stageRefBankroll = bankroll; // Set NEW reference bankroll for Stage 3
      state.units = 1;
      state.losses = 0;
    }
  } else if (state.stage === 3) {
    // Stage 3 -> Full Reset to Stage 6: Target is +$40 above stageRefBankroll
    if (bankroll >= state.stageRefBankroll + 40) {
      state.stage = 6;
      state.stageRefBankroll = bankroll; // Set NEW reference bankroll for Stage 6
      state.units = 1;
      state.losses = 0;
    }
  }

  // 5. Select corners from Junko's sets
  const chosenSetIndex = Math.floor(Math.random() * 2);
  let primarySet = [...JUNKO_SETS[chosenSetIndex]];

  let selectedCorners = [];

  if (state.stage === 6) {
    // STAGE 6: Always bet all 6 corners of selected set (do NOT filter out last winning number)
    selectedCorners = primarySet;
  } else {
    // STAGE 5 OR LESS: Filter out corners that cover the last winning number
    let alternateSet = [...JUNKO_SETS[1 - chosenSetIndex]];
    
    // Randomize order within sets
    primarySet.sort(() => Math.random() - 0.5);
    alternateSet.sort(() => Math.random() - 0.5);

    const pool = [...primarySet, ...alternateSet];

    for (let corner of pool) {
      if (selectedCorners.length >= state.stage) break;

      // Avoid covering the winning number from the previous spin
      if (cornerCoversNumber(corner, lastWinningNum)) continue;

      // Check overlap with already selected corners
      const currentCovered = [corner, corner + 1, corner + 3, corner + 4];
      const overlaps = selectedCorners.some(selected => {
        const selectedCovered = [selected, selected + 1, selected + 3, selected + 4];
        return currentCovered.some(num => selectedCovered.includes(num));
      });

      if (!overlaps) {
        selectedCorners.push(corner);
      }
    }
  }

  // Save active corners for evaluation next spin
  state.activeCorners = selectedCorners;

  // 6. Calculate and clamp bet amounts
  let betAmount = baseUnit * state.units;
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // 7. Construct and return bet objects
  return selectedCorners.map(cornerValue => ({
    type: 'corner',
    value: cornerValue,
    amount: betAmount
  }));
}