/**
 * GOAT MODE ROULETTE STRATEGY
 * 
 * Source:
 * - URL: https://youtu.be/xxhzz870I2w
 * - Channel Name: Bet With Mo
 * 
 * Logic Overview:
 * - This strategy covers combinations of Streets and Splits across 9 progression levels.
 * - Starting at Level 1, bets are placed on Street 1 (1,2,3) and Split 2/3.
 * - On losses, new Streets and Splits are added sequentially up to Level 7 (covering 19 numbers),
 *   while bet amounts double at specific key progression thresholds (Levels 3, 6, 7, 8, 9).
 * - Progression advancement trigger:
 *   - Move up to the next level on a complete loss (0 payout) OR after 2 partial losses
 *     (a spin where a street hits but overall payout is less than total bet).
 * - Win handling:
 *   - If a win pushes bankroll to a new session peak profit, reset progression to Level 1.
 *   - If a win does not reach peak profit, drop down to the lowest level where a full/jackpot
 *     win is sufficient to recover the bankroll back to peak profit.
 * 
 * Bet Progression Levels (Total Bet Units):
 * - Level 1: Street 1, Split 2/3 (1 unit each) -> Total: 2 units
 * - Level 2: + Street 4, Split 5/6 (1 unit each) -> Total: 4 units
 * - Level 3: + Street 7, Split 8/9 (Double all to 2 units each) -> Total: 12 units
 * - Level 4: + Street 10, Split 11/12 (2 units each) -> Total: 16 units
 * - Level 5: + Street 13, Split 14/15 (2 units each) -> Total: 20 units
 * - Level 6: + Street 16, Split 17/18 (Double all to 4 units each) -> Total: 48 units
 * - Level 7: + Street 19, Split 20/21 (Double all to 8 units each) -> Total: 112 units
 * - Level 8: Rebet same numbers, Double all to 16 units each -> Total: 224 units
 * - Level 9: Rebet same numbers, Double all to 32 units each -> Total: 448 units
 * Total bet size progression: [2, 4, 12, 16, 20, 48, 112, 224, 448] units.
 * 
 * Goal:
 * - Reach target session profit peak through rapid recovery steps while maintaining high coverage.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Level Definitions
  const LEVELS = [
    { level: 1, mult: 1,  streets: [1], splits: [[2, 3]] },
    { level: 2, mult: 1,  streets: [1, 4], splits: [[2, 3], [5, 6]] },
    { level: 3, mult: 2,  streets: [1, 4, 7], splits: [[2, 3], [5, 6], [8, 9]] },
    { level: 4, mult: 2,  streets: [1, 4, 7, 10], splits: [[2, 3], [5, 6], [8, 9], [11, 12]] },
    { level: 5, mult: 2,  streets: [1, 4, 7, 10, 13], splits: [[2, 3], [5, 6], [8, 9], [11, 12], [14, 15]] },
    { level: 6, mult: 4,  streets: [1, 4, 7, 10, 13, 16], splits: [[2, 3], [5, 6], [8, 9], [11, 12], [14, 15], [17, 18]] },
    { level: 7, mult: 8,  streets: [1, 4, 7, 10, 13, 16, 19], splits: [[2, 3], [5, 6], [8, 9], [11, 12], [14, 15], [17, 18], [20, 21]] },
    { level: 8, mult: 16, streets: [1, 4, 7, 10, 13, 16, 19], splits: [[2, 3], [5, 6], [8, 9], [11, 12], [14, 15], [17, 18], [20, 21]] },
    { level: 9, mult: 32, streets: [1, 4, 7, 10, 13, 16, 19], splits: [[2, 3], [5, 6], [8, 9], [11, 12], [14, 15], [17, 18], [20, 21]] }
  ];

  // Helper to calculate theoretical full win profit (30x multiplier minus total bet) for level index
  function getLevelWinProfit(levelIdx, baseUnit) {
    const lvl = LEVELS[levelIdx];
    const totalBetsCount = lvl.streets.length + lvl.splits.length;
    const betPerSpot = lvl.mult * baseUnit;
    const totalBet = totalBetsCount * betPerSpot;
    // Full jackpot win hits both street (12x payout) + split (18x payout) = 30x betPerSpot
    const fullPayout = 30 * betPerSpot;
    return fullPayout - totalBet;
  }

  // 2. Initialize State
  if (state.peakBankroll === undefined) {
    state.peakBankroll = bankroll;
    state.level = 1; // 1-indexed (1 to 9)
    state.partialLossCount = 0;
    state.lastTotalBet = 0;
    state.prevBankroll = bankroll;
  }

  // 3. Process Last Spin Result
  if (spinHistory && spinHistory.length > 0 && state.lastTotalBet > 0) {
    const netProfit = bankroll - state.prevBankroll;
    const grossPayout = netProfit + state.lastTotalBet;

    if (bankroll >= state.peakBankroll) {
      // Reached session peak profit -> Reset to Level 1
      state.peakBankroll = bankroll;
      state.level = 1;
      state.partialLossCount = 0;
    } else if (netProfit > 0) {
      // Won, but still below peak bankroll -> Drop down to lowest level capable of reaching peak
      const deficit = state.peakBankroll - bankroll;
      const baseUnit = config.betLimits.min;
      let targetLevel = 1;

      for (let i = 0; i < LEVELS.length; i++) {
        if (getLevelWinProfit(i, baseUnit) >= deficit) {
          targetLevel = i + 1; // 1-based level index
          break;
        }
      }

      state.level = Math.min(targetLevel, state.level); // Move to required level or keep lower
      state.partialLossCount = 0;
    } else {
      // Loss (Complete loss or partial loss)
      if (grossPayout <= 0) {
        // Complete loss -> Advance level immediately
        state.level = Math.min(state.level + 1, 9);
        state.partialLossCount = 0;
      } else {
        // Partial loss -> Advance level only after 2 partial losses
        state.partialLossCount += 1;
        if (state.partialLossCount >= 2) {
          state.level = Math.min(state.level + 1, 9);
          state.partialLossCount = 0;
        }
      }
    }
  }

  // Always update peak bankroll
  state.peakBankroll = Math.max(state.peakBankroll, bankroll);

  // 4. Construct Bets for Current Level
  const currentLvlConfig = LEVELS[state.level - 1];
  const unit = config.betLimits.min;
  let betAmount = unit * currentLvlConfig.mult;

  // Clamp bet amount to limits
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  const bets = [];

  // Add Street bets
  for (const st of currentLvlConfig.streets) {
    bets.push({ type: 'street', value: st, amount: betAmount });
  }

  // Add Split bets
  for (const sp of currentLvlConfig.splits) {
    bets.push({ type: 'split', value: sp, amount: betAmount });
  }

  // Save current turn state for next iteration evaluation
  const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
  state.lastTotalBet = totalBetAmount;
  state.prevBankroll = bankroll;

  return bets;
}