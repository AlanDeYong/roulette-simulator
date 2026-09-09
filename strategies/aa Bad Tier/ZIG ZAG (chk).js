/**
 * ============================================================================
 * STRATEGY: ZIG ZAG ROULETTE SYSTEM (CORRECTED LAYOUT & PROGRESSION)
 * ============================================================================
 * Source: "ZIG ZAG - ROULETTE SYSTEM TUTORIAL" by Bet With Mo
 * Video URL: https://youtu.be/zyqbXQBWYxc
 *
 * FULL LOGIC IN DETAIL:
 * 1. Side Selection & Target Setup:
 *    - Starts on the Low side (or alternates side upon hitting a session bankroll peak).
 *    - Low Side Placements:
 *        * Outside: Low (1-18)
 *        * Base Inside: Street 1 (1-3), Street 7 (7-9), Corner 2 (2,3,5,6), Corner 8 (8,9,11,12)
 *        * Additional Inside (from Step 3 onward): Street 13 (13-15), Corner 14 (14,15,17,18)
 *    - High Side Placements:
 *        * Outside: High (19-36)
 *        * Base Inside: Street 28 (28-30), Street 34 (34-36), Corner 26 (26,27,29,30), Corner 32 (32,33,35,36)
 *        * Additional Inside (from Step 3 onward): Street 22 (22-24), Corner 20 (20,21,23,24)
 *
 * 2. Step-by-Step Betting Progression (7 Steps on Consecutive Losses):
 *    - Step 1 (Base):
 *        * Outside: 4 units
 *        * Inside: 1 unit each on 2 base streets and 2 base corners (4 positions total).
 *    - Step 2 (Loss 1):
 *        * Double up all bets -> Outside: 8 units; Base inside: 2 units each.
 *    - Step 3 (Loss 2):
 *        * Rebet previous step, increase outside by 6 units (8 + 6 = 14 units).
 *        * Maintain 2 base streets and 2 base corners at 2 units each.
 *        * Add 2 units each on the additional street and additional corner (now 6 inside positions total).
 *    - Step 4 (Loss 3):
 *        * Increase outside by 6 units (14 + 6 = 20 units).
 *        * Increase all 6 street/corner bets by 1 unit each (3 units each).
 *    - Step 5 (Loss 4):
 *        * Increase outside by 6 units (20 + 6 = 26 units).
 *        * Increase all 6 street/corner bets by 1 unit each (4 units each).
 *    - Step 6 (Loss 5):
 *        * Increase outside by 6 units (26 + 6 = 32 units).
 *        * Increase all 6 street/corner bets by 1 unit each (5 units each).
 *    - Step 7 (Loss 6):
 *        * Double up all bets from Step 6 -> Outside: 64 units; all 6 inside positions: 10 units each.
 *    - Further Losses beyond Step 7: Reset to Step 1.
 *
 * 3. Win / Loss / Push Mechanics:
 *    - On Win reaching or exceeding the session peak bankroll:
 *        * Reset to Step 1.
 *        * Switch side (Low <-> High).
 *    - On Win not reaching the session peak bankroll, or on Push:
 *        * Rebet current step at the exact same amounts on the same side.
 *    - On Loss:
 *        * Advance progression to the next step on the same side.
 *
 * 4. The Goal:
 *    - Progress through recovery steps until hitting an inside win that pushes the bankroll
 *      to a new session peak, then lock in profits, reset progression, and flip sides.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.currentSide = 'low'; // 'low' or 'high'
    state.step = 1;
    state.sessionHigh = bankroll;
    state.lastBankroll = bankroll;
  }

  // 2. Progression unit blueprint across the 7 steps
  const progressionSteps = [
    { outside: 4,  baseInside: 1,  extraInside: 0 },  // Step 1: Base
    { outside: 8,  baseInside: 2,  extraInside: 0 },  // Step 2: Double up all
    { outside: 14, baseInside: 2,  extraInside: 2 },  // Step 3: +6 outside, add extra street & corner @ 2 units
    { outside: 20, baseInside: 3,  extraInside: 3 },  // Step 4: +6 outside, +1 all inside
    { outside: 26, baseInside: 4,  extraInside: 4 },  // Step 5: +6 outside, +1 all inside
    { outside: 32, baseInside: 5,  extraInside: 5 },  // Step 6: +6 outside, +1 all inside
    { outside: 64, baseInside: 10, extraInside: 10 }  // Step 7: Double up all
  ];

  // 3. Process previous spin result if spin history exists
  if (spinHistory && spinHistory.length > 0) {
    const netChange = bankroll - state.lastBankroll;

    if (bankroll > state.sessionHigh) {
      // Reached session's peak profit: reset and switch side
      state.sessionHigh = bankroll;
      state.step = 1;
      state.currentSide = state.currentSide === 'low' ? 'high' : 'low';
    } else if (netChange < 0) {
      // Loss: advance to next progression step on the same side
      if (state.step < progressionSteps.length) {
        state.step += 1;
      } else {
        state.step = 1; // Cap reached, cycle back to step 1
      }
    }
    // Note: On netChange >= 0 (win below peak or push), rebet current step & side
  }

  state.lastBankroll = bankroll;

  // 4. Base unit scaling respecting table limits
  const unit = config.betLimits.min || 1;
  const stepData = progressionSteps[state.step - 1] || progressionSteps[0];

  // Calculate outside bet and clamp to limits
  let outsideAmount = stepData.outside * unit;
  outsideAmount = Math.max(outsideAmount, config.betLimits.minOutside || 1);
  outsideAmount = Math.min(outsideAmount, config.betLimits.max || 500);

  // Calculate inside bets and clamp to limits
  let baseInsideAmount = stepData.baseInside * unit;
  baseInsideAmount = Math.max(baseInsideAmount, config.betLimits.min || 1);
  baseInsideAmount = Math.min(baseInsideAmount, config.betLimits.max || 500);

  let extraInsideAmount = 0;
  if (stepData.extraInside > 0) {
    extraInsideAmount = stepData.extraInside * unit;
    extraInsideAmount = Math.max(extraInsideAmount, config.betLimits.min || 1);
    extraInsideAmount = Math.min(extraInsideAmount, config.betLimits.max || 500);
  }

  // 5. Construct bet array
  const bets = [];

  if (state.currentSide === 'low') {
    // Outside Bet (1-18)
    bets.push({ type: 'low', amount: outsideAmount });

    // Base Inside Bets: Streets 1, 7; Corners 2, 8
    bets.push({ type: 'street', value: 1, amount: baseInsideAmount });
    bets.push({ type: 'street', value: 7, amount: baseInsideAmount });
    bets.push({ type: 'corner', value: 2, amount: baseInsideAmount });
    bets.push({ type: 'corner', value: 8, amount: baseInsideAmount });

    // Additional Inside Bets (Step 3 onward): Street 13, Corner 14
    if (extraInsideAmount > 0) {
      bets.push({ type: 'street', value: 13, amount: extraInsideAmount });
      bets.push({ type: 'corner', value: 14, amount: extraInsideAmount });
    }
  } else {
    // Outside Bet (19-36)
    bets.push({ type: 'high', amount: outsideAmount });

    // Base Inside Bets: Streets 28, 34; Corners 26, 32
    bets.push({ type: 'street', value: 28, amount: baseInsideAmount });
    bets.push({ type: 'street', value: 34, amount: baseInsideAmount });
    bets.push({ type: 'corner', value: 26, amount: baseInsideAmount });
    bets.push({ type: 'corner', value: 32, amount: baseInsideAmount });

    // Additional Inside Bets (Step 3 onward): Street 22, Corner 20
    if (extraInsideAmount > 0) {
      bets.push({ type: 'street', value: 22, amount: extraInsideAmount });
      bets.push({ type: 'corner', value: 20, amount: extraInsideAmount });
    }
  }

  return bets;
}