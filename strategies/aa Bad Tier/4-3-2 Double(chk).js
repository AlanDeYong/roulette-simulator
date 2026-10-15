/**
 * ============================================================================
 * STRATEGY NAME: 4-3-2 Double Roulette System
 * SOURCE: CEG Dealer School (YouTube: https://youtu.be/bcNChyrvarM)
 * CREATOR: Aircraft Engineer Jesus
 * ============================================================================
 * 
 * 1. THE FULL LOGIC IN DETAIL:
 * ----------------------------------------------------------------------------
 * The "4-3-2 Double" is a positive-progression, high-coverage roulette system 
 * covering 25 numbers out of 37 (or 38), giving an approximate 65-67% win/push rate.
 * Originally structured as a "couple/team" system, it operates seamlessly as a 
 * single unified strategy across three dozen sections:
 *   - "4": 4 non-touching Split bets in Dozen 1 (covers 8 numbers).
 *   - "3": 3 single Street bets in Dozen 2 (covers 9 numbers).
 *   - "2": 2 non-touching Corner bets in Dozen 3 (covers 8 numbers).
 * 
 * Base layout total: 9 units (4 splits + 3 streets + 2 corners).
 * 
 * 2. THE FULL BET PROGRESSION:
 * ----------------------------------------------------------------------------
 * - STEP 1 (Base Level - 9 units total):
 *     * 4 Splits at 1 unit each ($5 x 4 = $20)
 *     * 3 Streets at 1 unit each ($5 x 3 = $15)
 *     * 2 Corners at 1 unit each ($5 x 2 = $10)
 *     * Total: 9 units ($45)
 * 
 *   Step 1 Spin Outcomes:
 *     a) Corner Hit (Pays 8:1):
 *        Returns 9 units ($45). Net profit is $0 (Breakeven push).
 *        Action: Repeat Step 1.
 *     b) Street Hit (Pays 11:1):
 *        Returns 12 units ($60). Net profit is +3 units (+$15).
 *        Action: Advance to Step 2A.
 *     c) Split Hit (Pays 17:1):
 *        Returns 18 units ($90). Net profit is +9 units (+$45).
 *        Action: Advance to Step 2B ("Double Up").
 *     d) Miss / Loss:
 *        Action: Reset / Repeat Step 1.
 * 
 * - STEP 2A (Partial Press - 12 units total):
 *     Triggered after a Street win in Step 1.
 *     * 4 Splits at 1 unit each ($20)
 *     * 3 Streets pressed to 2 units each ($30)
 *     * 2 Corners at 1 unit each ($10)
 *     * Total: 12 units ($60)
 * 
 *   Step 2A Spin Outcomes:
 *     a) Street Hit: Big win (+12 units net). Rack winnings and reset to Step 1.
 *     b) Split Hit: Advance to Step 2B.
 *     c) Corner Hit / Miss: Reset to Step 1.
 * 
 * - STEP 2B ("The Double" - 18 units total):
 *     Triggered after a Split hit in Step 1 or Step 2A.
 *     All board bets are doubled using house profit:
 *     * 4 Splits at 2 units each ($40)
 *     * 3 Streets at 2 units each ($30)
 *     * 2 Corners at 2 units each ($20)
 *     * Total: 18 units ($90)
 * 
 *   Step 2B Spin Outcomes:
 *     a) Corner Hit (Pays 8:1 on 2 units):
 *        Returns 18 units ($90). Exactly pushes the $90 bet!
 *        Action: Repeat Step 2B.
 *     b) Street Hit or Split Hit:
 *        Major profit. Rack winnings and reset back to Step 1.
 *     c) Miss / Loss:
 *        Reset back to Step 1.
 * 
 * 3. THE GOAL:
 * ----------------------------------------------------------------------------
 * - Target Profit: +48 base units (e.g., +$240 profit on a $360 bankroll to reach $600).
 * - Stop-Loss: Bankroll falls below the minimum required for Step 1 (9 base units).
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine base unit using inside bet minimum
  const unit = Math.max(config.betLimits.min || 2, 1);

  // Helper clamp function respecting table maximum and minimums
  function clampInside(amount) {
    return Math.min(Math.max(amount, config.betLimits.min), config.betLimits.max);
  }

  // Define table positions for the 4-3-2 structure
  // 4 non-touching splits in Dozen 1 (1-12) -> covering [1,2], [4,5], [7,8], [10,11]
  const splits = [
    [1, 2],
    [4, 5],
    [7, 8],
    [10, 11]
  ];

  // 3 streets in Dozen 2 (13-24) -> covering 13-15, 16-18, 19-21
  const streets = [13, 16, 19];

  // 2 non-touching corners in Dozen 3 (25-36) -> covering [25,26,28,29] and [32,33,35,36]
  const corners = [25, 32];

  // 2. Initialize Persistent State
  if (!state.initialized) {
    state.initialized = true;
    state.stage = 'STEP_1'; // Stages: 'STEP_1', 'STEP_2A', 'STEP_2B'
    state.startBankroll = bankroll;
    state.targetProfit = unit * 4800; // Target: +48 units (e.g. $240 at $5 base unit)
    state.stopped = false;
  }

  // 3. Check Session Stop / Target Conditions
  if (state.stopped) {
    return [];
  }

  if (bankroll >= state.startBankroll + state.targetProfit) {
    state.stopped = true;
    return [];
  }

  // 4. Evaluate Previous Spin Result to update stage
  if (spinHistory && spinHistory.length > 0 && state.lastStage) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    // Check hit types
    const hitSplit = splits.some(([n1, n2]) => winningNum === n1 || winningNum === n2);
    const hitStreet = streets.some(start => winningNum >= start && winningNum <= start + 2);
    const hitCorner = (
      (winningNum === 25 || winningNum === 26 || winningNum === 28 || winningNum === 29) ||
      (winningNum === 32 || winningNum === 33 || winningNum === 35 || winningNum === 36)
    );

    if (state.lastStage === 'STEP_1') {
      if (hitSplit) {
        state.stage = 'STEP_2B'; // Split win jumps straight to 2B (Double Up)
      } else if (hitStreet) {
        state.stage = 'STEP_2A'; // Street win advances to 2A (Press Streets)
      } else if (hitCorner) {
        state.stage = 'STEP_1';  // Corner win pushes; repeat Step 1
      } else {
        state.stage = 'STEP_1';  // Loss resets to Step 1
      }
    } else if (state.lastStage === 'STEP_2A') {
      if (hitSplit) {
        state.stage = 'STEP_2B'; // Split hit in 2A advances to 2B
      } else if (hitStreet) {
        state.stage = 'STEP_1';  // Street hit wins big; rack profits and reset
      } else {
        state.stage = 'STEP_1';  // Corner hit or loss resets to Step 1
      }
    } else if (state.lastStage === 'STEP_2B') {
      if (hitCorner) {
        state.stage = 'STEP_2B'; // In 2B, doubled corner pays 8:1 on $10 = $90 (exact push); stay in 2B
      } else {
        state.stage = 'STEP_1';  // Win on street/split or loss resets to Step 1
      }
    }
  }

  // 5. Calculate Multipliers based on current stage
  let splitUnits = 1;
  let streetUnits = 1;
  let cornerUnits = 1;

  if (state.stage === 'STEP_2A') {
    splitUnits = 1;
    streetUnits = 2; // Press middle dozen streets
    cornerUnits = 1;
  } else if (state.stage === 'STEP_2B') {
    splitUnits = 2;  // Double everything
    streetUnits = 2;
    cornerUnits = 2;
  }

  const splitBetAmount = clampInside(unit * splitUnits);
  const streetBetAmount = clampInside(unit * streetUnits);
  const cornerBetAmount = clampInside(unit * cornerUnits);

  // Total wager calculation
  const totalRequired = (splitBetAmount * splits.length) + 
                        (streetBetAmount * streets.length) + 
                        (cornerBetAmount * corners.length);

  // Verify bankroll sufficiency; if insufficient for current stage, fallback to STEP_1 or stop
  if (bankroll < totalRequired) {
    if (state.stage !== 'STEP_1') {
      state.stage = 'STEP_1';
      const baseRequired = (clampInside(unit) * splits.length) + 
                           (clampInside(unit) * streets.length) + 
                           (clampInside(unit) * corners.length);
      if (bankroll < baseRequired) {
        state.stopped = true;
        return [];
      }
    } else {
      state.stopped = true;
      return [];
    }
  }

  // Record stage for the upcoming spin
  state.lastStage = state.stage;

  // 6. Build and Return Bets Array
  const bets = [];

  // Add 4 Split bets (Dozen 1)
  splits.forEach(splitVal => {
    bets.push({
      type: 'split',
      value: splitVal,
      amount: (state.stage === 'STEP_2B' ? clampInside(unit * 2) : clampInside(unit))
    });
  });

  // Add 3 Street bets (Dozen 2)
  streets.forEach(streetVal => {
    bets.push({
      type: 'street',
      value: streetVal,
      amount: (state.stage === 'STEP_1' ? clampInside(unit) : clampInside(unit * 2))
    });
  });

  // Add 2 Corner bets (Dozen 3)
  corners.forEach(cornerVal => {
    bets.push({
      type: 'corner',
      value: cornerVal,
      amount: (state.stage === 'STEP_2B' ? clampInside(unit * 2) : clampInside(unit))
    });
  });

  return bets;
}