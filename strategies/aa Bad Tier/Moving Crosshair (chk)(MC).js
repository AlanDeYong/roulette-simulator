/**
 * Strategy: Axis 8 Crossfire (Moving Crosshair)
 * Source: https://youtu.be/Nhk6tABSd6g (The Lucky Felt)
 * 
 * The Full Logic:
 * The strategy uses a "moving crosshair" that targets the active quadrant of the wheel 
 * based on the most recent winning number. It bets exactly 8 straight-up numbers per spin.
 * The center of the crosshair is the last winning number. The strategy alternates its attack 
 * axis (between Column and Dozen) every single spin to hunt momentum.
 * - If Axis is "Column": Bets the 8 numbers in the last winning number's Column, 
 *   omitting the 4 numbers that fall in its Dozen.
 * - If Axis is "Dozen": Bets the 8 numbers in the last winning number's Dozen, 
 *   omitting the 4 numbers that fall in its Column.
 * If 0 hits, the previous bet is simply repeated without moving the crosshair.
 * 
 * The Full Bet Progression:
 * Utilizes a mathematically locked 12-step recovery progression. The base unit is multiplied by:
 * [1, 1, 1, 2, 2, 3, 4, 5, 6, 8, 10, 12]
 * - On a win: The progression resets to step 1.
 * - On a loss: The progression advances to the next step.
 * - If 0 hits: The progression pauses and does not advance.
 * If the 12th step is lost, the progression resets to absorb the hit and prevent total ruin.
 * 
 * The Goal:
 * The creator explicitly mandates a strict target profit of +20% of the session bankroll. 
 * Once the bankroll reaches 120% of the initial starting amount, betting is halted.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Wait for the first spin to establish the crosshair center
  if (spinHistory.length === 0) return [];

  // 2. Initialize State
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
    state.targetBankroll = bankroll * 10.20;
    state.multipliers = [1, 1, 1, 2, 2, 3, 4, 5, 6, 8, 10, 12];
    state.progIndex = 0;
    state.axis = 'column'; // Start with a column attack
    state.lastBets = [];
  }

  // 3. Check Goal
  if (bankroll >= state.targetBankroll) {
    return []; // 20% goal reached, stop betting
  }

  const lastSpin = spinHistory[spinHistory.length - 1];

  // 4. Handle Zero
  if (lastSpin.winningNumber === 0) {
    // If a zero hits, repeat the exact same bets without advancing progression
    return state.lastBets.length > 0 ? state.lastBets : [];
  }

  // 5. Evaluate Previous Bet Win/Loss
  if (state.lastBets.length > 0) {
    const won = state.lastBets.some(b => b.value === lastSpin.winningNumber);
    if (won) {
      state.progIndex = 0; // Reset progression on win
    } else {
      state.progIndex++; // Advance progression on loss
      if (state.progIndex >= state.multipliers.length) {
        state.progIndex = 0; // Reset if the 12-step limit is breached
      }
    }
  }

  // 6. Toggle Axis for the Moving Crosshair
  state.axis = state.axis === 'column' ? 'dozen' : 'column';

  // 7. Determine Geometry based on the last winning number
  const centerNum = lastSpin.winningNumber;
  const centerCol = (centerNum - 1) % 3 + 1;
  const centerDoz = Math.ceil(centerNum / 12);
  
  const targetNumbers = [];

  for (let i = 1; i <= 36; i++) {
    const iCol = (i - 1) % 3 + 1;
    const iDoz = Math.ceil(i / 12);

    if (state.axis === 'column') {
      // Bet the center's Column, omitting the center's Dozen
      if (iCol === centerCol && iDoz !== centerDoz) {
        targetNumbers.push(i);
      }
    } else {
      // Bet the center's Dozen, omitting the center's Column
      if (iDoz === centerDoz && iCol !== centerCol) {
        targetNumbers.push(i);
      }
    }
  }

  // 8. Calculate Bet Amount
  let baseUnit = config.betLimits.min;
  let amount = baseUnit * state.multipliers[state.progIndex];

  // Clamp to table limits
  amount = Math.max(amount, config.betLimits.min);
  amount = Math.min(amount, config.betLimits.max);

  // 9. Construct Bets
  const bets = targetNumbers.map(num => ({
    type: 'number',
    value: num,
    amount: amount
  }));

  // 10. Persist and Return
  state.lastBets = bets;
  return bets;
}