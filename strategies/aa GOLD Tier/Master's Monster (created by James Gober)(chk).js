/**
 * Source: https://youtu.be/x1g6yVQSrrk ("SAFER IS BETTER!")
 * Channel: The Roulette Master
 * Strategy: Master's Monster (created by James Gober)
 *
 * Full Logic in Detail:
 * - Two dozens are bet simultaneously on every spin:
 *   1. The dozen that hit most recently (repeater).
 *   2. The dozen that has gone the longest without hitting (sleeper / cold dozen).
 *   - If zero / double-zero hits, maintain the previously tracked dozens.
 *
 * Full Bet Progression in Detail:
 * - Base Bet: 6x outside min units (e.g., $30 per dozen on a $5 min outside table).
 * - Progression Stages:
 *   1. Stage 0 (Base Level): Bet 1x base amount per dozen (e.g., $30).
 *      - Win: Reset/remain at Base Level.
 *      - Loss: Move to Stage 1.
 *   2. Stage 1 (Single Double): Bet 2x base amount per dozen (e.g., $60).
 *      - Win: Reset immediately to Base Level (Stage 0).
 *      - Loss: Move to Stage 2 (Micro-escalation).
 *   3. Stage 2 (Micro +1 unit): Bet Stage 1 amount + 1 incremental unit (e.g., $61).
 *      - Win: Requires 2 wins (or net cycle profit > 0) to reset to Base Level.
 *      - Loss: Move to Stage 3.
 *   4. Stage 3 (Micro +2 units): Bet Stage 1 amount + 2 incremental units (e.g., $62).
 *      - Win: Requires 2 wins (or net cycle profit > 0) to reset to Base Level.
 *      - Loss: Move to Stage 4.
 *   5. Stage 4 (Secondary Double): Double Stage 3 bet (e.g., $124).
 *      - Win: Requires 2 wins (or net cycle profit > 0) to reset to Base Level.
 *      - Loss: Maintain capped double or clamp to table maximums until 2 wins achieve recovery.
 *
 * The Goal:
 * - Capitalize on steady 2-out-of-3 dozen coverage wins at base level while avoiding destructive Martingale wipeouts
 *   by capping doubles to a single step, followed by low-stress incremental recovery.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.stage = 0;              // 0: Base ($30), 1: Double ($60), 2: $61, 3: $62, 4: $124
    state.stageWins = 0;          // Track consecutive wins in multi-win recovery stages
    state.cycleStartBankroll = bankroll;
    state.lastDozens = [1, 2];    // Default initial dozens if no spin history
  }

  const minOutside = config.betLimits.minOutside || 5;
  const maxBet = config.betLimits.max || 1000;
  const incUnit = config.minIncrementalBet || 1;
  const baseDozenBet = minOutside * 6; // Standard $30 base bet when minOutside = $5

  // Helper: map number 1-36 to dozen (1, 2, 3), 0/00 return null
  function getDozen(num) {
    if (num >= 1 && num <= 12) return 1;
    if (num >= 13 && num <= 24) return 2;
    if (num >= 25 && num <= 36) return 3;
    return null;
  }

  // 2. Evaluate previous spin outcome and progress/reset state
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastWinningNum = lastSpin.winningNumber;
    const lastDozen = getDozen(lastWinningNum);

    const isWin = lastDozen !== null && state.lastDozens.includes(lastDozen);

    if (isWin) {
      if (state.stage === 0) {
        // Flat win at base level
        state.stageWins = 0;
        state.cycleStartBankroll = bankroll;
      } else if (state.stage === 1) {
        // Immediate single-step recovery win resets directly to base
        state.stage = 0;
        state.stageWins = 0;
        state.cycleStartBankroll = bankroll;
      } else {
        // Recovery stages (2, 3, 4): need 2 wins or cycle in profit to reset
        state.stageWins += 1;
        const cycleProfit = bankroll - state.cycleStartBankroll;
        if (state.stageWins >= 2 || cycleProfit >= 0) {
          state.stage = 0;
          state.stageWins = 0;
          state.cycleStartBankroll = bankroll;
        }
      }
    } else {
      // Loss: progress stages
      state.stageWins = 0;
      if (state.stage === 0) {
        state.stage = 1; // Double once ($60)
      } else if (state.stage === 1) {
        state.stage = 2; // Micro step 1 ($61)
      } else if (state.stage === 2) {
        state.stage = 3; // Micro step 2 ($62)
      } else if (state.stage === 3) {
        state.stage = 4; // Double once more ($124)
      }
      // If losing at stage 4, remain at stage 4 until recovery
    }
  }

  // 3. Determine target dozens: (A) Most recent dozen to hit, (B) Longest absent dozen
  let mostRecentDozen = null;
  const dozenLastSeen = { 1: -1, 2: -1, 3: -1 };

  for (let i = spinHistory.length - 1; i >= 0; i--) {
    const doz = getDozen(spinHistory[i].winningNumber);
    if (doz !== null) {
      if (mostRecentDozen === null) {
        mostRecentDozen = doz;
      }
      if (dozenLastSeen[doz] === -1) {
        dozenLastSeen[doz] = i;
      }
    }
  }

  if (mostRecentDozen !== null) {
    // Find dozen with lowest last-seen index (longest absent)
    let longestAbsentDozen = null;
    let oldestIndex = Infinity;

    for (let d = 1; d <= 3; d++) {
      if (d !== mostRecentDozen) {
        if (dozenLastSeen[d] < oldestIndex) {
          oldestIndex = dozenLastSeen[d];
          longestAbsentDozen = d;
        }
      }
    }

    if (longestAbsentDozen !== null) {
      state.lastDozens = [mostRecentDozen, longestAbsentDozen];
    }
  }

  // 4. Calculate stake per dozen based on current stage
  let betPerDozen = baseDozenBet;
  if (state.stage === 1) {
    betPerDozen = baseDozenBet * 2; // e.g. $60
  } else if (state.stage === 2) {
    betPerDozen = (baseDozenBet * 2) + incUnit; // e.g. $61
  } else if (state.stage === 3) {
    betPerDozen = (baseDozenBet * 2) + (incUnit * 2); // e.g. $62
  } else if (state.stage === 4) {
    betPerDozen = ((baseDozenBet * 2) + (incUnit * 2)) * 2; // e.g. $124
  }

  // Clamp bet within table limits
  betPerDozen = Math.max(betPerDozen, minOutside);
  betPerDozen = Math.min(betPerDozen, maxBet);

  const totalRequired = betPerDozen * 2;
  if (bankroll < totalRequired) {
    return []; // Stop betting if bankroll is insufficient
  }

  // 5. Return bet placements
  return [
    { type: 'dozen', value: state.lastDozens[0], amount: betPerDozen },
    { type: 'dozen', value: state.lastDozens[1], amount: betPerDozen }
  ];
}