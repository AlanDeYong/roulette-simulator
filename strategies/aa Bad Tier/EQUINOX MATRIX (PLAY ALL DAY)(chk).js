/**
 * ============================================================================
 * ROULETTE STRATEGY: THE EQUINOX MATRIX (PLAY ALL DAY)
 * ============================================================================
 * Source:
 * - Channel: Mastering The Wheel
 * - Video URL: https://youtu.be/i6nxU44SH_U
 * - Video Title: "Another GREAT Roulette System Makes EASY MONEY!"
 *
 * The Full Logic in Detail:
 * -------------------------
 * 1. Independent Tracking:
 *    The system monitors all three 1:1 even-money outside bet groups independently:
 *    - Group 1 (Color): Red vs. Black
 *    - Group 2 (Parity): Even vs. Odd
 *    - Group 3 (Range): Low (1-18) vs. High (19-36)
 *
 * 2. The Trigger:
 *    Before placing any money on the board, the system waits for a trigger of 
 *    4 consecutive occurrences of one side (representing 4 consecutive misses 
 *    for the opposing side):
 *    - 4 consecutive Reds   -> Trigger bet on BLACK
 *    - 4 consecutive Blacks -> Trigger bet on RED
 *    - 4 consecutive Evens  -> Trigger bet on ODD
 *    - 4 consecutive Odds   -> Trigger bet on EVEN
 *    - 4 consecutive Highs  -> Trigger bet on LOW
 *    - 4 consecutive Lows   -> Trigger bet on HIGH
 *    Zero (0 / 00) is neither Red nor Black, neither Even nor Odd, and neither 
 *    High nor Low; it breaks consecutive trigger streaks.
 *
 * The Full Bet Progression in Detail:
 * -----------------------------------
 * - Total system levels: 10 (4 observation/trigger spins + 6 betting spins).
 * - Betting levels per group: 6 levels structured as (2^k - 1) units:
 *   - Level 1: 1 unit
 *   - Level 2: 3 units  (Net profit on win: +2 units)
 *   - Level 3: 7 units  (Net profit on win: +3 units)
 *   - Level 4: 15 units (Net profit on win: +4 units)
 *   - Level 5: 31 units (Net profit on win: +5 units)
 *   - Level 6: 63 units (Net profit on win: +6 units)
 *   Total capital per group: 120 units.
 * - On Win: The winning bet group resets back to Level 0 (inactive), waiting 
 *   for a new 4-in-a-row trigger.
 * - On Loss: The bet group increases to the next progression tier 
 *   (1 -> 3 -> 7 -> 15 -> 31 -> 63). If Level 6 loses, the group resets.
 *
 * The Goal & Exit Conditions:
 * ---------------------------
 * - Target Profit: +5% of the starting bankroll (in and out quickly).
 * - Spin Window: Max 54 spins of play (representing 20% of the 268-spin statistical 
 *   cycle before a run of 10 is expected to appear).
 * - Stop condition: Cease betting once the +5% profit target is reached or 
 *   the 54-spin window expires.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.initialized) {
    state.initialBankroll = bankroll;
    state.targetProfit = state.initialBankroll * 500; // 5% stop win target
    state.maxSpins = 5400000;                              // 54-spin safety window
    state.spinsTracked = 0;
    state.stopped = false;
    state.lastProcessedIndex = -1;

    // Track state for all 3 independent even-money groups
    state.groups = {
      color: {
        activeBet: null, // 'red' or 'black'
        level: 0,        // 1 to 6 when active, 0 when waiting
        streakSide: null,// 'red' or 'black'
        streakCount: 0
      },
      parity: {
        activeBet: null, // 'even' or 'odd'
        level: 0,
        streakSide: null,// 'even' or 'odd'
        streakCount: 0
      },
      range: {
        activeBet: null, // 'low' or 'high'
        level: 0,
        streakSide: null,// 'low' or 'high'
        streakCount: 0
      }
    };

    state.initialized = true;
  }

  // 2. Check Stop Conditions
  if (state.stopped) return [];

  const currentProfit = bankroll - state.initialBankroll;
  if (currentProfit >= state.targetProfit) {
    state.stopped = true;
    return [];
  }

  if (state.spinsTracked >= state.maxSpins) {
    state.stopped = true;
    return [];
  }

  // 3. Process New Spins from spinHistory
  while (state.lastProcessedIndex < spinHistory.length - 1) {
    state.lastProcessedIndex++;
    state.spinsTracked++;

    const spin = spinHistory[state.lastProcessedIndex];
    const num = spin.winningNumber;
    const color = spin.winningColor ? spin.winningColor.toLowerCase() : null;

    // Determine outcomes for each category
    const isZero = (num === 0 || num === '0' || num === '00');
    const spinColor = isZero ? null : (color === 'red' || color === 'black' ? color : (num ? getNumberColor(num) : null));
    const spinParity = isZero ? null : (num % 2 === 0 ? 'even' : 'odd');
    const spinRange = isZero ? null : (num >= 1 && num <= 18 ? 'low' : 'high');

    // Update Color Group
    updateGroup(state.groups.color, spinColor, {
      sideA: 'red',
      sideB: 'black',
      oppositeOf: (side) => (side === 'red' ? 'black' : 'red')
    });

    // Update Parity Group
    updateGroup(state.groups.parity, spinParity, {
      sideA: 'even',
      sideB: 'odd',
      oppositeOf: (side) => (side === 'even' ? 'odd' : 'even')
    });

    // Update Range Group
    updateGroup(state.groups.range, spinRange, {
      sideA: 'low',
      sideB: 'high',
      oppositeOf: (side) => (side === 'low' ? 'high' : 'low')
    });

    // Re-check profit after processing
    if (bankroll - state.initialBankroll >= state.targetProfit || state.spinsTracked >= state.maxSpins) {
      state.stopped = true;
      return [];
    }
  }

  // 4. Calculate Progression Unit and Multipliers
  // Multiplier sequence: 1, 3, 7, 15, 31, 63
  const multipliers = [1, 3, 7, 15, 31, 63];
  const baseUnit = config.betLimits.minOutside || 5;

  // 5. Construct Bets for Active Groups
  const bets = [];
  const groupKeys = ['color', 'parity', 'range'];

  for (let i = 0; i < groupKeys.length; i++) {
    const grp = state.groups[groupKeys[i]];
    if (grp.activeBet && grp.level >= 1 && grp.level <= 6) {
      const units = multipliers[grp.level - 1];
      let amount = baseUnit * units;

      // Clamp bet to table limits
      amount = Math.max(amount, config.betLimits.minOutside);
      amount = Math.min(amount, config.betLimits.max);

      bets.push({
        type: grp.activeBet,
        amount: amount
      });
    }
  }

  return bets;

  // --------------------------------------------------------------------------
  // Helper: Update a bet group state with the latest spin outcome
  // --------------------------------------------------------------------------
  function updateGroup(groupState, outcome, def) {
    // A. If an active bet was on the table, resolve its result
    if (groupState.activeBet) {
      if (outcome && outcome === groupState.activeBet) {
        // WIN: Reset back to Level 0
        groupState.activeBet = null;
        groupState.level = 0;
      } else {
        // LOSS: Step up the progression
        groupState.level++;
        if (groupState.level > 6) {
          // Busted 6 levels: reset progression
          groupState.activeBet = null;
          groupState.level = 0;
        }
      }
    }

    // B. Update consecutive streak tracking for triggers
    if (!outcome) {
      // 0 / Green breaks all streaks
      groupState.streakSide = null;
      groupState.streakCount = 0;
    } else {
      if (groupState.streakSide === outcome) {
        groupState.streakCount++;
      } else {
        groupState.streakSide = outcome;
        groupState.streakCount = 1;
      }
    }

    // C. If currently inactive, evaluate if the 4-miss trigger condition is met
    if (!groupState.activeBet && groupState.streakCount >= 4) {
      // 4 in a row of streakSide triggers a bet on the OPPOSITE side
      groupState.activeBet = def.oppositeOf(groupState.streakSide);
      groupState.level = 1;
    }
  }

  // --------------------------------------------------------------------------
  // Helper: Roulette standard color fallback
  // --------------------------------------------------------------------------
  function getNumberColor(n) {
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    return redNumbers.includes(Number(n)) ? 'red' : 'black';
  }
}