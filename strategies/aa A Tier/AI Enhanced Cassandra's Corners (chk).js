/**
 * Strategy: AI Enhanced Cassandra's Corners
 * Source: https://youtu.be/9MQpzxnU6pk
 * Channel: The Risk and Reward Lab
 * 
 * Logic Overview:
 * 1. Base Setup:
 *    - Starts by placing 3 Corner Bets (covering one corner in each of the 3 dozens) 
 *      and 1 Outside Column Bet on the 2nd (middle) column (numbers 2, 5, 8... 35).
 *    - Corner base bets: 1 unit per corner (e.g., $2). Initial corners are placed across 1st, 2nd, and 3rd dozens.
 *    - Column base bet: 2 units (e.g., $4).
 * 
 * 2. Progression Rules & Progression Cap:
 *    - On a FULL LOSS (neither any corner nor the column hits):
 *      a) Add 1 new adjacent corner bet to the table (up to a max of 5 total corners).
 *      b) Double the chip amount on each corner bet ($2 -> $4 -> $8 -> $16).
 *      c) Advance the middle column bet using a modified Fibonacci progression multiplier: [1, 1, 2, 3] 
 *         applied to base column bet ($4 -> $4 -> $8 -> $12).
 *    - Progression Cap / Reset Trigger:
 *      - Progression is capped at 4 losses max (or $80 max corner exposure).
 *      - Upon reaching/exceeding 4 consecutive full losses in progression, progression resets and enters Recovery Mode.
 * 
 * 3. Partial Wins / Partial Losses (Same Bet Rule):
 *    - If a spin yields a partial win or partial loss (e.g. only hitting column or only hitting a single non-doubled corner),
 *      keep the same bet layout and amounts without stepping forward or resetting the progression.
 * 
 * 4. Win / Recovery Mode Logic:
 *    - Reset to Base: Reset all bets to 3 corners and base column bet on ANY Full Win (jackpot hit or net profitable hit).
 *    - Recovery Phase: If progression reaches cap (4 full losses), enter Recovery Mode where bets restart at doubled base bet
 *      ($4 per corner, $8 on column). Stay in Recovery Mode until completing 2 wins, then drop back to original $2 base bets.
 * 
 * 5. Goal:
 *    - Maintain steady session profit accumulation while avoiding sudden bankroll blowouts during losing streaks.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Base unit setup using bet limits
  const minInside = config.betLimits.min || 2;
  const minOutside = config.betLimits.minOutside || 5;

  const cornerBaseUnit = minInside; 
  const columnBaseUnit = Math.max(minOutside, cornerBaseUnit * 2);

  // Corner grid choices (top-left number for corner)
  // 1st Dozen: 2 (covers 2,3,5,6)
  // 2nd Dozen: 14 (covers 14,15,17,18) or 20 (covers 20,21,23,24)
  // 3rd Dozen: 26 (covers 26,27,29,30) or 32 (covers 32,33,35,36)
  const defaultCorners = [2, 14, 26, 8, 20]; // Available corners sequence up to 5 max

  // Initialize state
  if (state.progressionLevel === undefined) state.progressionLevel = 0;
  if (state.inRecovery === undefined) state.inRecovery = false;
  if (state.recoveryWins === undefined) state.recoveryWins = 0;
  if (state.lastBets === undefined) state.lastBets = null;
  if (state.initialBankroll === undefined) state.initialBankroll = bankroll;

  // Process previous spin outcome if available
  if (spinHistory && spinHistory.length > 0 && state.lastBets) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const num = lastSpin.winningNumber;

    // Calculate total placed bet and total returned payout
    let totalBet = 0;
    let totalPayout = 0;

    state.lastBets.forEach(b => {
      totalBet += b.amount;
      if (b.type === 'corner') {
        // Corner covers [v, v+1, v+3, v+4]
        const cornerNums = [b.value, b.value + 1, b.value + 3, b.value + 4];
        if (cornerNums.includes(num)) {
          totalPayout += b.amount * 9; // 8 to 1 payout + original bet returned
        }
      } else if (b.type === 'column') {
        // Middle column (col 2): numbers mod 3 === 2 (e.g., 2, 5, 8, ..., 35)
        if (num > 0 && num % 3 === 2 && b.value === 2) {
          totalPayout += b.amount * 3; // 2 to 1 payout + original bet returned
        }
      }
    });

    const netWin = totalPayout - totalBet;

    // Progression & State Adjustments
    if (netWin > 0) {
      // Full / Profitable Win
      if (state.inRecovery) {
        state.recoveryWins++;
        if (state.recoveryWins >= 2) {
          state.inRecovery = false;
          state.recoveryWins = 0;
        }
      }
      state.progressionLevel = 0; // Reset progression on full win
    } else if (netWin < 0 && totalPayout === 0) {
      // Full Loss (0 Payout)
      state.progressionLevel++;
      if (state.progressionLevel >= 4) {
        // Max progression reached (4 losses) -> Trigger Recovery Mode
        state.progressionLevel = 0;
        state.inRecovery = true;
        state.recoveryWins = 0;
      }
    } else {
      // Partial Win / Partial Loss: Repeat exact same bets
    }
  }

  // Determine Bet Scale Factor
  let multiplier = 1;
  let baseCornerUnits = 1;
  let baseColMultiplier = 1;

  if (state.inRecovery) {
    baseCornerUnits = 2; // Doubled base bet during recovery
    baseColMultiplier = 2;
  }

  // Calculate current progression tier settings
  // Step 0: 3 corners (1x), Column (1x)
  // Step 1: 4 corners (2x), Column (1x)
  // Step 2: 5 corners (4x), Column (2x)
  // Step 3: 5 corners (8x), Column (3x)
  const cornerCounts = [3, 4, 5, 5];
  const cornerMultipliers = [1, 2, 4, 8];
  const colFibMultipliers = [1, 1, 2, 3];

  const currentLevel = Math.min(state.progressionLevel, 3);
  const activeCornerCount = cornerCounts[currentLevel];
  const currentCornerMult = cornerMultipliers[currentLevel] * baseCornerUnits;
  const currentColMult = colFibMultipliers[currentLevel] * baseColMultiplier;

  // Build Bets Array
  const bets = [];

  // 1. Corner Bets
  const cornerBetAmount = Math.min(
    Math.max(cornerBaseUnit * currentCornerMult, config.betLimits.min),
    config.betLimits.max
  );

  for (let i = 0; i < activeCornerCount; i++) {
    bets.push({
      type: 'corner',
      value: defaultCorners[i],
      amount: cornerBetAmount
    });
  }

  // 2. Middle Column Bet (Column 2)
  const columnBetAmount = Math.min(
    Math.max(columnBaseUnit * currentColMult, config.betLimits.minOutside),
    config.betLimits.max
  );

  bets.push({
    type: 'column',
    value: 2,
    amount: columnBetAmount
  });

  // Save current bets to state for evaluation on next spin
  state.lastBets = bets;

  return bets;
}