/**
 * ============================================================================
 * Strategy: "8 Is Enough" Roulette Strategy (Revised with Recovery)
 * Source  : "I LIKE PROFIT. THIS IS HOW I GET IT. | 8 Is Enough Roulette Strategy!"
 * Channel : Junko Bodie (https://youtu.be/Hi4hP9O18yI)
 *
 * THE FULL LOGIC:
 * 1. Overview & Setup:
 *    - The board is split into the three standard dozens (1-12, 13-24, 25-36).
 *    - In each dozen, exactly 8 numbers are covered straight up, and the remaining
 *      4 numbers are covered by 2 split bets as hedges.
 *    - Across all three dozens, this creates 24 straight-up bets and 6 split bets
 *      (total 30 bet units). Numbers 1-36 are covered; zeros (0/00) remain open.
 *
 * 2. Hit Outcomes:
 *    - Straight-Up Hit: Pays 35:1 (returns 36 units). At base unit, net profit is +6 units.
 *    - Split Hit (Hedge): Pays 17:1 (returns 18 units). Net outcome is -12 units.
 *      Strategically treated as a hedge hit: the split bets are removed from the board,
 *      continuing with only the straight-up numbers.
 *    - Zero / Uncovered Miss: Total loss of active bets.
 *
 * 3. The Bet Progression:
 *    - Progression ladder: [1, 2, 2, 4, 4] unit multipliers.
 *    - The player plays up to 2 spins per multiplier level before escalating if
 *      underwater.
 *    - When a dozen hits during recovery, the won dozen can be taken off the board,
 *      focusing the active bets on the remaining unhit sections to regain lost units.
 *    - Win / Reset Condition: Whenever the current bankroll surpasses the session's
 *      highest bankroll (new session high), the progression resets to Level 1
 *      (1 unit, full 3-dozen straight-ups + splits).
 *
 * 4. The Goal:
 *    - Continuous session high resets (hit-and-run target of +$25 to +$50 in casino play,
 *      or continuous profit harvesting as a core session strategy).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Base unit sizing clamped to table limits
  const unitInside = Math.max(config.betLimits.min, 1);
  const maxLimit = config.betLimits.max || 500;

  // 8 Straight up numbers + 2 hedge splits per dozen
  const DOZENS = {
    1: {
      straight: [1, 2, 4, 5, 7, 8, 10, 11],
      splits: [[3, 6], [9, 12]]
    },
    2: {
      straight: [13, 14, 16, 17, 19, 20, 22, 23],
      splits: [[15, 18], [21, 24]]
    },
    3: {
      straight: [25, 26, 28, 29, 31, 32, 34, 35],
      splits: [[27, 30], [33, 36]]
    }
  };

  const PROGRESSION = [1, 2, 2, 4, 4];

  // Initialize persistent state
  if (state.sessionHighBankroll === undefined) {
    state.sessionHighBankroll = bankroll;
    state.progressionIndex = 0;
    state.spinsAtLevel = 0;
    state.activeDozens = [1, 2, 3];
    state.includeSplits = true;
  }

  // Update state based on previous spin
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    // Check if new session high achieved
    if (bankroll > state.sessionHighBankroll) {
      state.sessionHighBankroll = bankroll;
      state.progressionIndex = 0;
      state.spinsAtLevel = 0;
      state.activeDozens = [1, 2, 3];
      state.includeSplits = true;
    } else {
      // Determine what was hit
      let hitDoz = null;
      let hitSplit = false;

      for (let d = 1; d <= 3; d++) {
        if (DOZENS[d].straight.includes(winningNum)) {
          hitDoz = d;
          break;
        }
        for (const sp of DOZENS[d].splits) {
          if (sp.includes(winningNum)) {
            hitDoz = d;
            hitSplit = true;
            break;
          }
        }
        if (hitDoz) break;
      }

      if (hitSplit) {
        // Drop splits after hedge hit
        state.includeSplits = false;
        state.spinsAtLevel++;
      } else if (hitDoz && state.activeDozens.includes(hitDoz)) {
        // If hit during progression, remove that dozen
        if (state.activeDozens.length > 1 && state.progressionIndex > 0) {
          state.activeDozens = state.activeDozens.filter(d => d !== hitDoz);
        }
        state.spinsAtLevel++;
      } else {
        // Complete miss (e.g. 0, 00, or missing section)
        state.spinsAtLevel++;
      }

      // Step up progression after 2 attempts at current multiplier level
      if (state.spinsAtLevel >= 2) {
        state.spinsAtLevel = 0;
        if (state.progressionIndex < PROGRESSION.length - 1) {
          state.progressionIndex++;
        }
      }
    }
  }

  const multiplier = PROGRESSION[state.progressionIndex];
  const betAmount = Math.min(Math.max(unitInside * multiplier, config.betLimits.min), maxLimit);

  const bets = [];

  // Generate bets for all active dozens
  for (const dozenId of state.activeDozens) {
    const dozenConfig = DOZENS[dozenId];

    // Straight-up bets
    for (const num of dozenConfig.straight) {
      bets.push({
        type: 'number',
        value: num,
        amount: betAmount
      });
    }

    // Hedge split bets (only when active)
    if (state.includeSplits) {
      for (const pair of dozenConfig.splits) {
        bets.push({
          type: 'split',
          value: pair,
          amount: betAmount
        });
      }
    }
  }

  return bets;
}