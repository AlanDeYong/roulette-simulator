/**
 * Tee Time Roulette Strategy
 * 
 * Source:
 * - URL: https://youtu.be/6zzLvnswht0
 * - Channel: Gamblers University (Professor Profit)
 * 
 * Full Logic Details:
 * The Tee Time strategy is a progressive inside-betting system that covers specific 
 * double streets (six-lines), corners, and straight-up numbers on the board.
 * 
 * Coverage Groups:
 * - Group A (Level 1):
 *   - Double Street 1-6 (line value 1) @ 1 unit
 *   - Double Street 10-15 (line value 10) @ 1 unit
 *   - Corner 1-2-4-5 (corner value 1) @ 2 units
 *   - Corner 10-11-13-14 (corner value 10) @ 2 units
 *   - Straight up on 3, 6, 12, 15 @ 1 unit each
 *   (Total: 10 units covering 12 numbers)
 * 
 * - Group B (Added at Level 2):
 *   - Double Street 25-30 (line value 25) @ 1 unit
 *   - Corner 25-26-28-29 (corner value 25) @ 2 units
 *   - Straight up on 27, 30 @ 1 unit each
 *   (Adds 5 units covering 6 more numbers; Total: 15 units covering 18 numbers)
 * 
 * - Group C (Added at Level 3):
 *   - Double Street 16-21 (line value 16) @ 1 unit
 *   - Corner 16-17-19-20 (corner value 16) @ 2 units
 *   - Straight up on 18, 21 @ 1 unit each
 *   (Adds 5 units covering 6 more numbers; Total: 20 units covering 24 numbers)
 * 
 * Progression Details:
 * - Level 1: Group A bets only (Multiplier = 1) -> 10 units
 * - Level 2: Group A + Group B bets (Multiplier = 1) -> 15 units
 * - Level 3: Group A + Group B + Group C bets (Multiplier = 1) -> 20 units
 * - Level 4+: All groups (A, B, C) with Multiplier = (Level - 2)
 *   (Level 4 = 2x, Level 5 = 3x, Level 6 = 4x, etc.)
 * 
 * Win / Loss Transition Rules:
 * - On Loss: Advance to the next level (Level 1 -> 2 -> 3 -> 4 -> ...).
 * - On Win: If current bankroll reaches or exceeds session high bankroll, reset to Level 1.
 *   Otherwise, remain at current level to attempt reaching session high.
 * 
 * Goal:
 * Target profit of $100+ over starting bankroll (or reaching session high).
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Determine base unit from inside bet limits
  const unit = Math.max(1, config.betLimits.min || 1);

  // 2. State Initialization
  if (state.level === undefined) {
    state.level = 1;
    state.sessionHigh = bankroll;
    state.initialBankroll = bankroll;
  }

  // 3. Process Spin Results to adjust Level
  if (spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    
    // Check if previous spin produced a net profit/loss
    if (bankroll > state.sessionHigh) {
      state.sessionHigh = bankroll;
      state.level = 1; // Reset to base level on new session high
    } else if (bankroll < state.lastBankroll) {
      // Loss: advance progression level
      state.level += 1;
    } else {
      // Win without reaching new session high: if very close or recovering, reset to 1
      if (bankroll >= state.sessionHigh - (unit * 2)) {
        state.level = 1;
      }
    }
  }

  // Update last bankroll for next turn comparison
  state.lastBankroll = bankroll;

  // 4. Calculate Bets based on current level
  const currentLevel = state.level;
  let multiplier = 1;

  if (currentLevel >= 4) {
    multiplier = currentLevel - 2;
  }

  const bets = [];

  // Helper function to push clamped inside bets
  function addBet(type, value, units) {
    let rawAmount = units * unit;
    let clampedAmount = Math.max(config.betLimits.min, Math.min(rawAmount, config.betLimits.max));
    
    if (type === 'number') {
      bets.push({ type: 'number', value: value, amount: clampedAmount });
    } else {
      bets.push({ type: type, value: value, amount: clampedAmount });
    }
  }

  // Group A (Active Level 1+)
  addBet('line', 1, 1 * multiplier);
  addBet('line', 10, 1 * multiplier);
  addBet('corner', 1, 2 * multiplier);
  addBet('corner', 10, 2 * multiplier);
  addBet('number', 3, 1 * multiplier);
  addBet('number', 6, 1 * multiplier);
  addBet('number', 12, 1 * multiplier);
  addBet('number', 15, 1 * multiplier);

  // Group B (Active Level 2+)
  if (currentLevel >= 2) {
    addBet('line', 25, 1 * multiplier);
    addBet('corner', 25, 2 * multiplier);
    addBet('number', 27, 1 * multiplier);
    addBet('number', 30, 1 * multiplier);
  }

  // Group C (Active Level 3+)
  if (currentLevel >= 3) {
    addBet('line', 16, 1 * multiplier);
    addBet('corner', 16, 2 * multiplier);
    addBet('number', 18, 1 * multiplier);
    addBet('number', 21, 1 * multiplier);
  }

  return bets;
}