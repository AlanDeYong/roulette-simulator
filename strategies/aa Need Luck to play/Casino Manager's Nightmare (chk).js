/**
 * ============================================================================
 * STRATEGY: Casino Manager's Nightmare (Modified)
 * ============================================================================
 * Source: 
 *   - Video: "(INSANE RESULTS) #1 BEST NEW SYSTEM I WILL BE USING IN VEGAS NEXT WEEK!"
 *   - URL: https://youtu.be/IS1cxe9L5C0
 *   - YouTube Channel: The Roulette Master (System submitted by Paulie)
 *
 * MODIFICATIONS APPLIED:
 * 1. Wait Trigger:
 *    - Spin without betting until at least 9 UNIQUE numbers have appeared in the
 *      spin history.
 * 2. Exclusion of 9 Unique Numbers:
 *    - Do not bet on any of those 9 unique numbers (taken from the most recent
 *      unique hits).
 * 3. 2nd Dozen Red Exclusion:
 *    - In the 2nd Dozen (13-24), avoid betting on ALL red numbers (14, 16, 18,
 *      19, 21, 23).
 *    - Only the black numbers in the 2nd Dozen (13, 15, 17, 20, 22, 24) are eligible.
 * 4. Progression & Rules (Unchanged):
 *    - Win 1: Remove the winning number from the active pool; maintain bet size.
 *    - Win 2 (Two consecutive wins): Reset progression multiplier to 1x, reset
 *      consecutive win counter, and re-evaluate active pool against the 9 most
 *      recent unique hits.
 *    - Loss: Double bet multiplier (Martingale), reset consecutive win counter.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.multiplier === undefined) state.multiplier = 1;
  if (state.consecutiveWins === undefined) state.consecutiveWins = 0;
  if (!state.activeNumbers) state.activeNumbers = null;
  if (state.initialBankroll === undefined) state.initialBankroll = bankroll;

  const baseUnit = config.betLimits.min;
  const targetProfit = 200000 * baseUnit;

  if (bankroll <= 0 || (bankroll - state.initialBankroll) >= targetProfit) {
    return [];
  }

  // 2. Extract Unique Recent Numbers
  // Traverse backwards to collect the 9 most recent unique winning numbers
  const recentUniqueNumbers = [];
  const seenNumbers = new Set();

  for (let i = spinHistory.length - 1; i >= 0; i--) {
    const rawNum = spinHistory[i].winningNumber;
    const numKey = typeof rawNum === 'string' ? rawNum : Number(rawNum);
    if (!seenNumbers.has(numKey)) {
      seenNumbers.add(numKey);
      recentUniqueNumbers.push(numKey);
      if (recentUniqueNumbers.length === 9) break;
    }
  }

  // Trigger Condition: Must have at least 9 unique numbers before placing any bets
  if (recentUniqueNumbers.length < 9) {
    return [];
  }

  // 3. Define Base Pool
  // 1st Dozen (1-12) + 3rd Dozen (25-36) + Zeros + Black numbers in 2nd Dozen (13, 15, 17, 20, 22, 24)
  // (Red numbers in 2nd Dozen: 14, 16, 18, 19, 21, 23 are excluded)
  const isAmerican = config.tableType === 'american';
  const baseNumbers = [
    0,
    ...(isAmerican ? ['00'] : []),
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    13, 15, 17, 20, 22, 24,
    25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36
  ];

  function rebuildActiveNumbers() {
    const excludedSet = new Set(recentUniqueNumbers);
    return baseNumbers.filter(num => {
      const matchKey = typeof num === 'string' ? num : Number(num);
      return !excludedSet.has(matchKey);
    });
  }

  // 4. Process Last Spin Outcome (if we were actively betting)
  if (state.activeNumbers && state.activeNumbers.length > 0 && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastWinningNum = typeof lastSpin.winningNumber === 'string'
      ? lastSpin.winningNumber
      : Number(lastSpin.winningNumber);

    const wasHit = state.activeNumbers.some(n => {
      return (typeof n === 'string' ? n : Number(n)) === lastWinningNum;
    });

    if (wasHit) {
      // WIN
      state.consecutiveWins += 1;

      if (state.consecutiveWins >= 2) {
        // Two consecutive wins achieved: Reset progression & rebuild pool
        state.multiplier = 1;
        state.consecutiveWins = 0;
        state.activeNumbers = rebuildActiveNumbers();
      } else {
        // First win: Remove winning number from active pool, maintain current bet level
        state.activeNumbers = state.activeNumbers.filter(n => {
          return (typeof n === 'string' ? n : Number(n)) !== lastWinningNum;
        });
      }
    } else {
      // LOSS
      state.consecutiveWins = 0;
      state.multiplier *= 2; // Martingale doubling after loss
    }
  } else {
    // Initial bet placement once trigger is met
    state.multiplier = 1;
    state.consecutiveWins = 0;
    state.activeNumbers = rebuildActiveNumbers();
  }

  // Safeguard: Ensure active numbers pool is populated
  if (!state.activeNumbers || state.activeNumbers.length === 0) {
    state.activeNumbers = rebuildActiveNumbers();
  }

  // 5. Calculate and Clamp Bet Amounts
  let betAmount = baseUnit * state.multiplier;
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // 6. Check Bankroll and Return Bets
  const totalCost = betAmount * state.activeNumbers.length;
  if (totalCost > bankroll) {
    betAmount = Math.floor(bankroll / state.activeNumbers.length);
    if (betAmount < config.betLimits.min) {
      return [];
    }
  }

  return state.activeNumbers.map(num => ({
    type: 'number',
    value: num,
    amount: betAmount
  }));
}