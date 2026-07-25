/**
 * Roulette Strategy: Reverse Safety Net
 *
 * Source:
 *   - Video: "You'll Always Win With This Strat, You're Due || Reverse Saftey Net"
 *   - Channel: CEG Dealer School
 *   - URL: https://youtu.be/zzbFEYL1lmU
 *
 * The Full Logic in Details:
 *   The "Reverse Safety Net" is a negative progression strategy designed around
 *   expanding board coverage as a losing streak continues. It begins with a single,
 *   high-payout Straight Up bet. Upon each loss, it steps down to a broader coverage
 *   bet type (Straight Up -> Split -> Street -> Corner -> Line -> Dozen -> Even Money)
 *   while increasing the wager size to recover cumulative losses and achieve net profit.
 *
 * The Full Bet Progression in Details (Sequence per $500 cycle):
 *   - Step 1 (Initial Bet): $10 Straight Up on 19 (Inside bet, 35:1 payout).
 *   - Step 2 (1st Loss):    $15 Split on [19, 22] (Inside bet, 17:1 payout).
 *   - Step 3 (2nd Loss):    $20 Street on 19 (Covers 19, 20, 21, Inside bet, 11:1 payout).
 *   - Step 4 (3rd Loss):    $25 Corner on 19 (Covers 19, 20, 22, 23, Inside bet, 8:1 payout).
 *   - Step 5 (4th Loss):    $30 Double Street / Line on 19 (Covers 19-24, Inside bet, 5:1 payout).
 *   - Step 6 (5th Loss):    $100 Dozen on 2nd Dozen (Covers 13-24, Outside multiplier, 2:1 payout).
 *   - Step 7 (6th Loss):    $300 Even-Money Bet on Red (Outside bet, 1:1 payout).
 *
 * Progression Mechanics:
 *   - On WIN at any step: Reset progression back to Step 1.
 *   - On LOSS at Step 7: Total sequence loss is $500 ($10+$15+$20+$25+$30+$100+$300).
 *     The sequence fails and resets to Step 1 for the next cycle.
 *
 * Goal & Stop-Loss:
 *   - Target Profit: +$200 profit over starting bankroll.
 *   - Stop-Loss: Complete loss of $500 sequence buy-in or depletion of total bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.step = 1;
    state.initialBankroll = bankroll;
    state.targetProfit = 200000;
    state.targetNumber = 19; // Anchor number for inside bets
  }

  // 2. Check Target Profit Goal
  if (bankroll - state.initialBankroll >= state.targetProfit) {
    return []; // Stop betting once profit target is reached
  }

  // 3. Evaluate Last Spin Outcome (if history exists)
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    const lastColor = lastSpin.winningColor;
    const lastStep = state.step;

    let won = false;

    switch (lastStep) {
      case 1: // Straight Up on targetNumber (19)
        won = (lastNum === state.targetNumber);
        break;
      case 2: // Split [19, 22]
        won = (lastNum === state.targetNumber || lastNum === state.targetNumber + 3);
        break;
      case 3: // Street 19-21
        won = (lastNum >= state.targetNumber && lastNum <= state.targetNumber + 2);
        break;
      case 4: // Corner 19, 20, 22, 23
        won = [state.targetNumber, state.targetNumber + 1, state.targetNumber + 3, state.targetNumber + 4].includes(lastNum);
        break;
      case 5: // Line / Double Street 19-24
        won = (lastNum >= state.targetNumber && lastNum <= state.targetNumber + 5);
        break;
      case 6: // 2nd Dozen (13-24)
        won = (lastNum >= 13 && lastNum <= 24);
        break;
      case 7: // Red
        won = (lastColor === 'red');
        break;
    }

    if (won) {
      state.step = 1; // Reset to Step 1 on win
    } else {
      state.step++; // Advance to next step on loss
      if (state.step > 7) {
        state.step = 1; // Completed full $500 sequence loss, reset to Step 1
      }
    }
  }

  // 4. Define Bet Configurations per Step
  const stepConfigs = {
    1: { category: 'inside',  type: 'number', value: state.targetNumber, amount: 10 },
    2: { category: 'inside',  type: 'split',  value: [state.targetNumber, state.targetNumber + 3], amount: 15 },
    3: { category: 'inside',  type: 'street', value: state.targetNumber, amount: 20 },
    4: { category: 'inside',  type: 'corner', value: state.targetNumber, amount: 25 },
    5: { category: 'inside',  type: 'line',   value: state.targetNumber, amount: 30 },
    6: { category: 'outside', type: 'dozen',  value: 2, amount: 100 },
    7: { category: 'outside', type: 'red',    value: null, amount: 300 }
  };

  const current = stepConfigs[state.step];
  if (!current) {
    state.step = 1;
    return [];
  }

  // 5. Respect Bet Limits & Clamp Amounts
  const minLimit = current.category === 'outside'
    ? config.betLimits.minOutside
    : config.betLimits.min;
  const maxLimit = config.betLimits.max;

  let finalAmount = Math.max(current.amount, minLimit);
  finalAmount = Math.min(finalAmount, maxLimit);

  // Insufficient bankroll check
  if (bankroll < finalAmount) {
    finalAmount = bankroll;
  }

  if (finalAmount <= 0) {
    return [];
  }

  // 6. Return Array of Bet Objects
  const betObj = {
    type: current.type,
    amount: finalAmount
  };

  if (current.value !== null && current.value !== undefined) {
    betObj.value = current.value;
  }

  return [betObj];
}