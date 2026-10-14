/**
 * Strategy: Shifting Targets by Mark Lyon
 * Source: https://youtu.be/cocY8q__gWI
 * Channel: The Roulette Master
 *
 * FULL LOGIC IN DETAIL:
 * 1. Base Level:
 *    - Starts betting 1 base unit on a single dozen (e.g., Dozen 1).
 *    - On a win at the base level, the target shifts cyclically to the next dozen
 *      (1 -> 2 -> 3 -> 1) with 1 base unit.
 *
 * 2. 2-Dozen Recovery Mode:
 *    - Triggered upon any loss.
 *    - The system expands coverage to 2 dozens: it keeps the active dozen and adds
 *      the other non-winning dozen (effectively avoiding the dozen that just hit).
 *    - Level 1 Recovery (1st loss from base):
 *      - Bet size per dozen: (previousBet * 2) + baseUnit.
 *      - Requires 1 win for immediate recovery. If it wins, reset back to base level.
 *    - Level 2+ Recovery (after 2 or more consecutive losses):
 *      - Sizing formula on each loss: (previousBet * 2) + baseUnit per dozen.
 *      - Requires 2 wins to recover and reset.
 *      - Win 1 of 2: Bet size stays the same; the dozen that just won shifts to the
 *        currently open/uncovered dozen.
 *      - Win 2 of 2: Full recovery accomplished; reset back to base level.
 *      - Any loss resets the consecutive win counter to 0 (still requiring 2 wins).
 *
 * FULL BET PROGRESSION IN DETAIL:
 * - Base Unit: config.betLimits.minOutside
 * - Progression formula per dozen on loss: nextBet = (previousBet * 2) + baseUnit
 * - Example ($10 base unit):
 *   - Base: $10 on 1 dozen
 *   - Loss 1 (Level 1): $30 on each of 2 dozens ($60 total). 1 win resets.
 *   - Loss 2 (Level 2): $70 on each of 2 dozens ($140 total). 2 wins needed to reset.
 *   - Loss 3 (Level 3): $150 on each of 2 dozens ($300 total). 2 wins needed.
 *   - Loss 4 (Level 4): $310 on each of 2 dozens ($620 total). 2 wins needed.
 *
 * THE GOAL:
 * - Achieve consistent dozen payouts while utilizing 24-number coverage during recovery.
 * - Quick reset on single-loss hits, and 2-win target shifting to exit drawdowns safely.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const baseUnit = config.betLimits.minOutside;

  // Initialize persistent state on first spin
  if (!state.initialized) {
    state.initialized = true;
    state.mode = 'BASE'; // 'BASE' or 'RECOVERY'
    state.level = 0; // 0 = base, 1 = first recovery, 2+ = multi-loss recovery
    state.currentDozen = 1; // 1, 2, or 3
    state.recoveryDozens = []; // [dozenA, dozenB]
    state.currentBetPerDozen = baseUnit;
    state.winsNeeded = 1;
    state.consecutiveWins = 0;
  }

  // Helper to determine which dozen a number belongs to (1, 2, 3, or 0 for zero)
  function getDozen(number) {
    if (number >= 1 && number <= 12) return 1;
    if (number >= 13 && number <= 24) return 2;
    if (number >= 25 && number <= 36) return 3;
    return 0; // Zero / Double Zero
  }

  // Process outcome of previous spin if history exists
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningDozen = getDozen(lastSpin.winningNumber);

    if (state.mode === 'BASE') {
      const won = winningDozen === state.currentDozen;

      if (won) {
        // Shift target to the next dozen cyclically
        state.currentDozen = (state.currentDozen % 3) + 1;
        state.currentBetPerDozen = baseUnit;
        state.level = 0;
      } else {
        // Enter Recovery Mode
        state.mode = 'RECOVERY';
        state.level = 1;
        state.winsNeeded = 1; // 1 win recovers from a single base loss
        state.consecutiveWins = 0;

        // Choose 2 dozens: keep current dozen, add the other non-hit dozen
        let otherDozens = [1, 2, 3].filter(d => d !== winningDozen);
        if (otherDozens.length === 2) {
          state.recoveryDozens = otherDozens;
        } else {
          // In case 0 hit, pick current dozen and next dozen
          const next = (state.currentDozen % 3) + 1;
          state.recoveryDozens = [state.currentDozen, next];
        }

        // Escalation: (previous * 2) + baseUnit
        state.currentBetPerDozen = (state.currentBetPerDozen * 2) + baseUnit;
      }
    } else if (state.mode === 'RECOVERY') {
      const won = state.recoveryDozens.includes(winningDozen);

      if (won) {
        state.consecutiveWins += 1;

        if (state.consecutiveWins >= state.winsNeeded) {
          // Full recovery achieved, reset to base mode
          state.mode = 'BASE';
          state.level = 0;
          state.currentBetPerDozen = baseUnit;
          state.winsNeeded = 1;
          state.consecutiveWins = 0;
          // Shift to the next dozen
          state.currentDozen = (winningDozen % 3) + 1;
          state.recoveryDozens = [];
        } else {
          // Win 1 of 2 achieved: Keep bet size, shift the dozen that just hit to the open dozen
          const openDozen = [1, 2, 3].find(d => !state.recoveryDozens.includes(d));
          const otherCovered = state.recoveryDozens.find(d => d !== winningDozen);
          state.recoveryDozens = [otherCovered, openDozen];
          // Bet size stays the same for second win attempt
        }
      } else {
        // Lost in recovery
        state.level += 1;
        state.winsNeeded = 2; // Now requires 2 consecutive wins to recover
        state.consecutiveWins = 0;

        // Cover the two dozens that did not just hit
        let nextDozens = [1, 2, 3].filter(d => d !== winningDozen);
        if (nextDozens.length === 2) {
          state.recoveryDozens = nextDozens;
        } else {
          // Zero hit: keep current recovery dozens
          state.recoveryDozens = state.recoveryDozens.slice();
        }

        // Escalate bet: (previous * 2) + baseUnit
        state.currentBetPerDozen = (state.currentBetPerDozen * 2) + baseUnit;
      }
    }
  }

  // Construct bet array
  let bets = [];

  if (state.mode === 'BASE') {
    let amount = state.currentBetPerDozen;
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    if (bankroll >= amount) {
      bets.push({
        type: 'dozen',
        value: state.currentDozen,
        amount: amount
      });
    }
  } else if (state.mode === 'RECOVERY') {
    let amount = state.currentBetPerDozen;
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    const totalRequired = amount * 2;
    if (bankroll >= totalRequired) {
      bets.push({
        type: 'dozen',
        value: state.recoveryDozens[0],
        amount: amount
      });
      bets.push({
        type: 'dozen',
        value: state.recoveryDozens[1],
        amount: amount
      });
    } else if (bankroll >= amount) {
      // Degraded fallback if bankroll can only afford 1 dozen
      bets.push({
        type: 'dozen',
        value: state.recoveryDozens[0],
        amount: amount
      });
    }
  }

  return bets;
}