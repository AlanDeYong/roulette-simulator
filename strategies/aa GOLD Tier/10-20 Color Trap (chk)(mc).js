/**
 * Strategy: The 10/20 Color Trap
 * Source: YouTube - The Lucky Felt (Todd Hoover)
 * Video URL: https://youtu.be/_ZpS-cMMabc
 *
 * FULL LOGIC DETAILS:
 * The 10/20 Color Trap exploits the mathematical asymmetry on roulette wheels:
 * - There are 10 Red Odd numbers: [1, 3, 5, 7, 9, 19, 21, 23, 25, 27]
 * - There are 10 Black Even numbers: [2, 4, 6, 8, 10, 20, 22, 24, 26, 28]
 *
 * The strategy alternates between a 10-chip "Sniper" footprint (betting only 10 numbers)
 * and a 20-chip "Wide Net" footprint (betting all 20 numbers: Red Odds + Black Evens).
 *
 * - Active Group Trigger:
 *   - On initial start: Default to Red Odds (or determined by last spin color if available).
 *   - After any win or loss: If the last spin landed on Red, active group becomes Red Odds.
 *     If Black, active group becomes Black Evens. (If Green zero, active group stays unchanged).
 *
 * FULL BET PROGRESSION DETAILS:
 * Progression Steps: [1x (10), 1x (20), 2x (10), 3x (20), 5x (10), 10x (20)]
 * - Level 0: 1 unit per number on 10 numbers (Primary Active Group) -> Total 10 units
 * - Level 1: 1 unit per number on 20 numbers (Red Odds + Black Evens) -> Total 20 units
 * - Level 2: 2 units per number on 10 numbers (Primary Active Group) -> Total 20 units
 * - Level 3: 3 units per number on 20 numbers (Red Odds + Black Evens) -> Total 60 units
 * - Level 4: 5 units per number on 10 numbers (Primary Active Group) -> Total 50 units
 * - Level 5: 10 units per number on 20 numbers (Red Odds + Black Evens) -> Total 200 units
 *
 * - Progression Rule:
 *   - On WIN: Reset progression back to Level 0. Update primary active group.
 *   - On LOSS: Advance to next level in the progression array. If max level is exceeded, reset to Level 0.
 *
 * THE GOAL:
 * - Target Profit: +100 units session profit (or as configured).
 * - Stop Loss: When bankroll is depleted or max table limit is hit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Define sets based on roulette color asymmetry
  const RED_ODDS = [1, 3, 5, 7, 9, 19, 21, 23, 25, 27];
  const BLACK_EVENS = [2, 4, 6, 8, 10, 20, 22, 24, 26, 28];

  // 2. Progression Multipliers & Footprint Types
  const PROGRESSION = [
    { multiplier: 1, coverage: 'sniper' },   // Level 0: 10 numbers
    { multiplier: 1, coverage: 'widenet' },  // Level 1: 20 numbers
    { multiplier: 2, coverage: 'sniper' },   // Level 2: 10 numbers
    { multiplier: 3, coverage: 'widenet' },  // Level 3: 20 numbers
    { multiplier: 5, coverage: 'sniper' },   // Level 4: 10 numbers
    { multiplier: 10, coverage: 'widenet' }  // Level 5: 20 numbers
  ];

  // 3. Initialize state variables
  if (state.level === undefined) state.level = 0;
  if (state.activeGroup === undefined) state.activeGroup = 'red_odds';
  if (state.initialBankroll === undefined) state.initialBankroll = bankroll;

  // Target profit check (+100 units)
  const targetProfit = 100 * (config.betLimits.min || 1);
  if (bankroll >= state.initialBankroll + targetProfit) {
    // Target reached, reset progression or stop betting
    state.level = 0;
  }

  // 4. Update state from spin history
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;
    const winningColor = lastSpin.winningColor;

    // Determine current target numbers from last state to evaluate hit/miss
    const prevStep = PROGRESSION[state.level] || PROGRESSION[0];
    let prevActiveNumbers = [];
    if (prevStep.coverage === 'sniper') {
      prevActiveNumbers = (state.activeGroup === 'red_odds') ? RED_ODDS : BLACK_EVENS;
    } else {
      prevActiveNumbers = RED_ODDS.concat(BLACK_EVENS);
    }

    const isWin = prevActiveNumbers.includes(winningNum);

    if (isWin) {
      // Reset progression level on win
      state.level = 0;
    } else {
      // Advance progression level on loss
      state.level = state.level + 1;
      if (state.level >= PROGRESSION.length) {
        state.level = 0; // Reset after reaching max step
      }
    }

    // Update active group based on last winning color
    if (winningColor === 'red') {
      state.activeGroup = 'red_odds';
    } else if (winningColor === 'black') {
      state.activeGroup = 'black_evens';
    }
    // If green (0/00), activeGroup stays the same as previous
  }

  // 5. Determine current step settings
  const currentStep = PROGRESSION[state.level];
  const unit = config.betLimits.min || 1;
  let rawAmount = unit * currentStep.multiplier;

  // Clamp bet amount per number to limits
  const amountPerNumber = Math.min(
    Math.max(rawAmount, config.betLimits.min),
    config.betLimits.max
  );

  // 6. Select numbers to bet on
  let numbersToBet = [];
  if (currentStep.coverage === 'sniper') {
    numbersToBet = (state.activeGroup === 'red_odds') ? RED_ODDS : BLACK_EVENS;
  } else {
    // Wide net covers all 20 asymmetrical numbers
    numbersToBet = RED_ODDS.concat(BLACK_EVENS);
  }

  // 7. Check total bet cost against available bankroll
  const totalBetCost = amountPerNumber * numbersToBet.length;
  if (bankroll < totalBetCost) {
    // If bankroll is insufficient for current progression step, fall back to level 0
    state.level = 0;
    const fallbackStep = PROGRESSION[0];
    const fallbackAmount = Math.max(unit * fallbackStep.multiplier, config.betLimits.min);
    numbersToBet = (state.activeGroup === 'red_odds') ? RED_ODDS : BLACK_EVENS;
    if (bankroll < fallbackAmount * numbersToBet.length) {
      return []; // Stop betting if bankroll cannot cover minimum
    }
  }

  // 8. Construct return array of bet objects
  const bets = numbersToBet.map(num => ({
    type: 'number',
    value: num,
    amount: amountPerNumber
  }));

  return bets;
}