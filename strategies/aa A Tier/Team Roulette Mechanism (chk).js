/**
 * Strategy: Team Roulette Mechanism
 * Source: https://youtu.be/sZzYb7nn_B8
 * Channel: The Roulette Master
 *
 * Full Logic in Detail:
 * 1. Phase 1 (Color Trend & Chop Tracking):
 *    - Operates on Red/Black even-money outside bets.
 *    - Selects bet target based on recent 2 color outcomes:
 *      * If last 2 colors are identical (e.g. Red-Red) -> Bet the same color (Follow Streak).
 *      * If last 2 colors alternated (e.g. Red-Black) -> Bet the alternating color (Follow Chop).
 *    - Bet sizing: d'Alembert progression (+1 unit on loss, -1 unit on win, minimum 1 base unit).
 *
 * 2. Phase 2 (32-Number Second Dozen Exploitation):
 *    - Triggers whenever a spin lands in the 2nd Dozen (13-24), EXCEPT 17 and 20.
 *      (17 and 20 do not trigger because both are inherently covered in both setups).
 *    - Covers 32 numbers across the wheel:
 *      * 1st Dozen: 6x base unit
 *      * 3rd Dozen: 6x base unit
 *      * Zero (and 00 if American): 0.5x base unit each
 *      * Straight-up bets on second dozen numbers (0.5x base unit each):
 *        - If the trigger number was covered in "Best Idea Ever" (15, 22, 24):
 *          Plays "28 is Great" layout: straight bets on [14, 17, 18, 19, 20].
 *        - If the trigger number was covered in "28 is Great" (14, 18, 19):
 *          Plays "Best Idea Ever" layout: straight bets on [15, 17, 20, 22, 24].
 *        - If covered in neither (13, 16, 21, 23): Defaults to "Best Idea Ever".
 *    - Once triggered, Phase 2 stays active until a win occurs.
 *    - On a Phase 2 loss, Phase 2 multiplier increases by +1x (re-betting at doubled/scaled amounts).
 *    - On a Phase 2 win, Phase 2 resets to inactive until the next valid trigger.
 *
 * The Goal:
 * - Bankroll: 200 units ($2,000 with $10 units).
 * - Target Profit: +20 to +30 units ($200 to $300 profit).
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.phase1UnitLevel = 1;
    state.lastPhase1BetColor = 'black';
    state.phase2Active = false;
    state.phase2Multiplier = 1;
    state.phase2Layout = 'bestIdeaEver'; // 'bestIdeaEver' or '28isGreat'
  }

  const baseUnit = config.betLimits.minOutside || 10;
  const insideUnit = Math.max(config.betLimits.min || 1, Math.floor(baseUnit / 2));
  const isAmerican = config.tableType === 'american';

  // Evaluate previous spin outcome to update progressions
  if (spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNumber = lastSpin.winningNumber;
    const lastColor = lastSpin.winningColor;

    // --- Update Phase 1 Progression (d'Alembert) ---
    if (lastColor === state.lastPhase1BetColor) {
      // Phase 1 Won: decrease by 1 unit
      state.phase1UnitLevel = Math.max(1, state.phase1UnitLevel - 1);
    } else {
      // Phase 1 Lost: increase by 1 unit
      state.phase1UnitLevel += 1;
    }

    // --- Update Phase 2 State ---
    if (state.phase2Active) {
      // Determine if Phase 2 won
      const wonDozen1 = lastNumber >= 1 && lastNumber <= 12;
      const wonDozen3 = lastNumber >= 25 && lastNumber <= 36;
      const wonZero = lastNumber === 0 || (isAmerican && lastNumber === 37);
      
      let wonInside = false;
      if (state.phase2Layout === 'bestIdeaEver') {
        wonInside = [15, 17, 20, 22, 24].includes(lastNumber);
      } else {
        wonInside = [14, 17, 18, 19, 20].includes(lastNumber);
      }

      if (wonDozen1 || wonDozen3 || wonZero || wonInside) {
        // Phase 2 won -> deactivate and reset multiplier
        state.phase2Active = false;
        state.phase2Multiplier = 1;
      } else {
        // Phase 2 lost -> escalate progression
        state.phase2Multiplier += 1;
      }
    }

    // --- Check Phase 2 Trigger ---
    // Triggers on 2nd Dozen (13-24), excluding 17 and 20
    if (!state.phase2Active && lastNumber >= 13 && lastNumber <= 24 && lastNumber !== 17 && lastNumber !== 20) {
      state.phase2Active = true;
      state.phase2Multiplier = 1;

      // Select system based on the trigger number
      if ([15, 22, 24].includes(lastNumber)) {
        state.phase2Layout = '28isGreat';
      } else if ([14, 18, 19].includes(lastNumber)) {
        state.phase2Layout = 'bestIdeaEver';
      } else {
        // Numbers 13, 16, 21, 23 (neutral)
        state.phase2Layout = 'bestIdeaEver';
      }
    }
  }

  // --- Determine Phase 1 Color Choice ---
  let nextColor = 'black';
  if (spinHistory.length >= 2) {
    const c1 = spinHistory[spinHistory.length - 2].winningColor;
    const c2 = spinHistory[spinHistory.length - 1].winningColor;

    if (c1 === c2 && (c2 === 'red' || c2 === 'black')) {
      // Same color twice -> Follow streak
      nextColor = c2;
    } else if (c1 !== c2 && (c1 === 'red' || c1 === 'black') && (c2 === 'red' || c2 === 'black')) {
      // Alternating color -> Follow chop
      nextColor = c2 === 'red' ? 'black' : 'red';
    } else if (c2 === 'red' || c2 === 'black') {
      nextColor = c2;
    }
  } else if (spinHistory.length === 1) {
    const lastColor = spinHistory[0].winningColor;
    if (lastColor === 'red' || lastColor === 'black') {
      nextColor = lastColor;
    }
  }
  state.lastPhase1BetColor = nextColor;

  const bets = [];

  // --- Place Phase 1 Bet ---
  let p1Amount = state.phase1UnitLevel * baseUnit;
  p1Amount = Math.max(p1Amount, config.betLimits.minOutside);
  p1Amount = Math.min(p1Amount, config.betLimits.max);

  bets.push({ type: nextColor, amount: p1Amount });

  // --- Place Phase 2 Bets (if active) ---
  if (state.phase2Active) {
    const mult = state.phase2Multiplier;

    // Dozens (6 units each * multiplier)
    let dozenBetAmount = 6 * baseUnit * mult;
    dozenBetAmount = Math.max(dozenBetAmount, config.betLimits.minOutside);
    dozenBetAmount = Math.min(dozenBetAmount, config.betLimits.max);

    bets.push({ type: 'dozen', value: 1, amount: dozenBetAmount });
    bets.push({ type: 'dozen', value: 3, amount: dozenBetAmount });

    // Straight bets (0.5 units each * multiplier)
    let straightAmount = insideUnit * mult;
    straightAmount = Math.max(straightAmount, config.betLimits.min);
    straightAmount = Math.min(straightAmount, config.betLimits.max);

    // Green Zeroes
    bets.push({ type: 'number', value: 0, amount: straightAmount });
    if (isAmerican) {
      bets.push({ type: 'number', value: 37, amount: straightAmount });
    }

    // 2nd Dozen Specific Numbers
    const numbersToCover = state.phase2Layout === 'bestIdeaEver'
      ? [15, 17, 20, 22, 24]
      : [14, 17, 18, 19, 20];

    for (const num of numbersToCover) {
      bets.push({ type: 'number', value: num, amount: straightAmount });
    }
  }

  // Verify total bet does not exceed available bankroll
  const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
  if (totalBetAmount > bankroll) {
    return [];
  }

  return bets;
}