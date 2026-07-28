/**
 * Roulette Strategy Name: 8 is Enough (Randomized)
 * Source: Junko Bodie (YouTube Channel: Junko Bodie)
 * Source Video: https://www.youtube.com/watch?v=aEWdp4oB6Mw
 * 
 * THE FULL LOGIC IN DETAILS:
 * - At initialization or upon a full reset, 8 numbers are randomly selected from each of 
 *   the 3 roulette dozens (24 numbers total). These numbers are stored in state and locked
 *   until a full reset occurs.
 *   - Dozen 1 (1-12):  8 randomly selected numbers
 *   - Dozen 2 (13-24): 8 randomly selected numbers
 *   - Dozen 3 (25-36): 8 randomly selected numbers
 * - Initially, all 3 dozens are active (24 numbers covered).
 * - Whenever a number in an active dozen wins:
 *   1. Remove/suspend all bets on that last winning dozen.
 *   2. Reinstate/rebet on the other remaining active dozens.
 * - On losing spins (e.g., 0/00 or numbers outside active sets), active dozens remain unchanged.
 * - A FULL RESET (re-selecting 8 new random numbers per dozen and reactivating all 3 dozens) 
 *   is triggered whenever the bankroll reaches or surpasses a new session peak bankroll.
 * 
 * THE FULL BET PROGRESSION IN DETAILS:
 * - Tracks the session's peak bankroll.
 * - The profit target per winning spin is defined as achieving a new session peak bankroll (+1 base unit).
 * - Calculate the required bet unit per number dynamically on each spin:
 *     deficit = (peakBankroll + baseUnit) - currentBankroll
 *     unitBet = Math.ceil(deficit / (36 - activeNumbersCount))
 * - When a loss occurs, `deficit` increases, automatically increasing bet sizes so a single hit on
 *   any active number recovers all accumulated losses and reaches a new session peak.
 * - When a win occurs, `unitBet` naturally recalibrates back down to the minimal level needed for the new peak.
 * - All bet amounts are clamped within `config.betLimits.min` and `config.betLimits.max`.
 * 
 * THE GOAL:
 * - Secure consistent session profits by narrowing coverage to active dozens after a win while utilizing 
 *   a target-based recovery progression to recoup drawdowns in a single winning spin.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Helper function to randomly select 8 unique numbers from a range [minNum, maxNum]
  function getRandomEight(minNum, maxNum) {
    const nums = [];
    for (let i = minNum; i <= maxNum; i++) {
      nums.push(i);
    }
    // Fisher-Yates shuffle
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    return nums.slice(0, 8).sort((a, b) => a - b);
  }

  // Helper function to generate new sets of random numbers for all 3 dozens
  function generateAllDozenNumbers() {
    return {
      1: getRandomEight(1, 12),
      2: getRandomEight(13, 24),
      3: getRandomEight(25, 36)
    };
  }

  const minLimit = (config && config.betLimits && config.betLimits.min) ? config.betLimits.min : 1;
  const maxLimit = (config && config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;

  // Initial session setup
  if (state.peakBankroll === undefined) {
    state.peakBankroll = bankroll;
    state.activeDozens = [1, 2, 3];
    state.dozenNumbers = generateAllDozenNumbers();
    state.lastBets = [];
  }

  // Full Reset Condition: Triggered when hitting or exceeding session peak bankroll
  if (bankroll >= state.peakBankroll && spinHistory && spinHistory.length > 0) {
    state.peakBankroll = bankroll;
    state.activeDozens = [1, 2, 3];
    state.dozenNumbers = generateAllDozenNumbers(); // Lock in new random numbers for full reset
  }

  // Evaluate previous spin result
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    // Check if winning number was in our last placed bets
    const wasHit = state.lastBets && state.lastBets.some(b => b.value === winningNum);

    if (wasHit) {
      let winDozen = 0;
      if (winningNum >= 1 && winningNum <= 12) winDozen = 1;
      else if (winningNum >= 13 && winningNum <= 24) winDozen = 2;
      else if (winningNum >= 25 && winningNum <= 36) winDozen = 3;

      if (winDozen > 0) {
        // Remove the winning dozen from active set
        state.activeDozens = state.activeDozens.filter(d => d !== winDozen);
        
        // If all dozens were cleared without reaching peak, reset active dozen set
        if (state.activeDozens.length === 0) {
          state.activeDozens = [1, 2, 3];
        }
      }
    }
  }

  // Gather active numbers from persistent state
  let activeNumbers = [];
  for (const dozen of state.activeDozens) {
    if (state.dozenNumbers && state.dozenNumbers[dozen]) {
      activeNumbers = activeNumbers.concat(state.dozenNumbers[dozen]);
    }
  }

  if (activeNumbers.length === 0) return [];

  // Calculate unit bet amount required to reach new session peak profit
  const targetBankroll = state.peakBankroll + minLimit;
  const deficit = targetBankroll - bankroll;
  const winPayoutMultiplier = 36 - activeNumbers.length; // Net return multiplier per unit

  let calculatedUnit = minLimit;
  if (deficit > 0 && winPayoutMultiplier > 0) {
    calculatedUnit = Math.ceil(deficit / winPayoutMultiplier);
  }

  // Clamp bet size to table limits
  let betAmount = Math.max(calculatedUnit, minLimit);
  betAmount = Math.min(betAmount, maxLimit);

  // Build bet objects array
  const bets = activeNumbers.map(num => ({
    type: 'number',
    value: num,
    amount: betAmount
  }));

  // Store bets for next spin check
  state.lastBets = bets;

  return bets;
}