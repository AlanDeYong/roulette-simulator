/**
 * Roulette Strategy: Crazy 8
 * 
 * Source:
 * - Video URL: https://youtu.be/5_9rsG87AwI
 * - Channel Name: Casino Matchmaker
 * 
 * Strategy Overview & Full Logic:
 * - Table Coverage:
 *   The "Crazy 8" strategy utilizes 9 overlapping Six-Line (Line) bets to cover 30 of 37 numbers 
 *   (European roulette: 0 to 36).
 *   Line bets placed (values represent starting number of the line):
 *     - Line 4  (covers 4-9)   : 2 base units ($4)
 *     - Line 7  (covers 7-12)  : 1 base unit  ($2)
 *     - Line 10 (covers 10-15) : 2 base units ($4)
 *     - Line 13 (covers 13-18) : 1 base unit  ($2)
 *     - Line 16 (covers 16-21) : 2 base units ($4)
 *     - Line 19 (covers 19-24) : 1 base unit  ($2)
 *     - Line 22 (covers 22-27) : 2 base units ($4)
 *     - Line 25 (covers 25-30) : 1 base unit  ($2)
 *     - Line 28 (covers 28-33) : 2 base units ($4)
 *   Total Base Bet: 14 units ($28 total when 1 unit = $2).
 * 
 * Outcome Categories per Spin (at base level):
 * - Win (24 numbers: 7 through 30): Returns $36 (+$8 net profit).
 * - Partial Loss (6 numbers: 4, 5, 6, 31, 32, 33): Returns $24 (-$4 net loss).
 * - Complete Whack (7 numbers: 0, 1, 2, 3, 34, 35, 36): Returns $0 (-$28 net loss).
 * 
 * Bet Progression Rules:
 * - Level starts at 1.
 * - On Win (numbers 7 to 30): Decrease progression level by 1 unit (down to minimum Level 1).
 * - On Partial Loss (numbers 4, 5, 6, 31, 32, 33): Increase progression level by +1 unit.
 * - On Complete Whack (numbers 0, 1, 2, 3, 34, 35, 36): Increase progression level by +2 units.
 * 
 * Goal / Milestone Reset:
 * - Tracks cumulative net profit. Every time net profit reaches a new $20 milestone 
 *   (or overall profit target), the progression level resets back to Level 1.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State variables on first run
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
    state.level = 1;
    state.lastMilestone = 0;
  }

  // 2. Determine base chip unit from inside bet minimum limits
  const unit = config.betLimits.min || 2;

  // 3. Update progression level based on previous spin result (if history exists)
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const num = lastSpin.winningNumber;

    // Check net profit to evaluate milestone target ($20 profit increments)
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit - state.lastMilestone >= 20) {
      state.level = 1;
      state.lastMilestone = Math.floor(currentProfit / 20) * 20;
    } else {
      // Evaluate spin outcome category
      if ((num >= 0 && num <= 3) || (num >= 34 && num <= 36)) {
        // Complete Whack (-28 base loss): Increase +2 levels
        state.level += 2;
      } else if ((num >= 4 && num <= 6) || (num >= 31 && num <= 33)) {
        // Partial Loss (-4 base loss): Increase +1 level
        state.level += 1;
      } else if (num >= 7 && num <= 30) {
        // Winning Spin (+8 base win): Decrease -1 level (min 1)
        state.level = Math.max(1, state.level - 1);
      }
    }
  }

  // 4. Define line bet configuration template (line start number, multiplier units)
  const lineTemplates = [
    { value: 4,  units: 2 },
    { value: 7,  units: 1 },
    { value: 10, units: 2 },
    { value: 13, units: 1 },
    { value: 16, units: 2 },
    { value: 19, units: 1 },
    { value: 22, units: 2 },
    { value: 25, units: 1 },
    { value: 28, units: 2 }
  ];

  // 5. Build and clamp bets according to config limits
  const bets = [];
  for (const item of lineTemplates) {
    let betAmount = unit * item.units * state.level;

    // Respect minimum and maximum bet limits
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    bets.push({
      type: 'line',
      value: item.value,
      amount: betAmount
    });
  }

  return bets;
}