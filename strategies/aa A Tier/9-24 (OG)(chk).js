/**
 * Roulette Strategy Implementation
 * 
 * Source: https://youtu.be/AKAZsZE5CF8
 * Channel Name: The Lucky Felt
 * 
 * The Full Logic in details:
 * - 1st Spin: Spin without betting (observation spin).
 * - Initial / Normal Bet Phase (Street Betting):
 *   - Target the dozen that just won in the previous spin (lock this in as the active target dozen).
 *   - Place a 1-unit bet on all 3 streets within that targeted dozen, EXCEPT the specific street that just won.
 * 
 * The Full Bet Progression in details:
 * - On First Loss:
 *   - Switch from street bets to placing 4 units each on the OTHER 2 dozens (relative to the dozen you were actively targeting).
 * - On Subsequent Losses:
 *   - Rebet and increase each of the 2 outside dozens by +4 units each per loss step (4 -> 8 -> 12 -> 16 units...).
 * - On Win:
 *   - Do NOT reset progression until reaching or exceeding the session's peak profit.
 *   - If the current bankroll >= session peak profit, reset state/progression back to base level and target the newly winning dozen.
 * 
 * The Goal:
 * - Target Profit: Maximize returns while recovering losses on outside dozens until a new session peak profit is reached.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Set Base Units & Limits
  const minInside = config.betLimits.min || 2;
  const minOutside = config.betLimits.minOutside || 5;
  const maxBet = config.betLimits.max || 500;

  // 2. Initialize State Parameters
  if (state.phase === undefined) {
    state.phase = 'WAIT';          // 'WAIT', 'STREETS', 'DOZENS'
    state.dozenStep = 1;           // Multiplier for dozen progression (+4 units per loss)
    state.targetDozen = null;      // The dozen currently being targeted for bets
    state.initialBankroll = bankroll;
    state.lastBankroll = bankroll;
    state.peakBankroll = bankroll;
  }

  // Track session peak profit
  if (bankroll > state.peakBankroll) {
    state.peakBankroll = bankroll;
  }

  // 1st Spin: No bets placed, observe initial result
  if (spinHistory.length === 0) {
    state.phase = 'WAIT';
    state.lastBankroll = bankroll;
    return [];
  }

  const lastSpin = spinHistory[spinHistory.length - 1];
  const lastNum = lastSpin.winningNumber;
  const netProfit = bankroll - state.lastBankroll;
  state.lastBankroll = bankroll;

  // Helper functions
  function getDozen(num) {
    if (num >= 1 && num <= 12) return 1;
    if (num >= 13 && num <= 24) return 2;
    if (num >= 25 && num <= 36) return 3;
    return null;
  }

  function getStreetStart(num) {
    if (num < 1 || num > 36) return null;
    return Math.floor((num - 1) / 3) * 3 + 1;
  }

  const currentDozen = getDozen(lastNum);

  // 3. Process Progression & State Transitions 
  if (state.phase !== 'WAIT') {
    if (netProfit > 0) {
      // On Win: Check if peak bankroll achieved before resetting progression
      if (bankroll >= state.peakBankroll) {
        state.phase = 'STREETS';
        state.dozenStep = 1;
        state.targetDozen = currentDozen; // Target the newly winning dozen
      }
      // If win but NOT at peak profit, maintain current state/progression step ("rebet")
    } else if (netProfit < 0) {
      // On Loss: Switch to or scale up Dozen progression
      if (state.phase === 'STREETS') {
        state.phase = 'DOZENS';
        state.dozenStep = 1; // Base 4 units each on the other two dozens
      } else if (state.phase === 'DOZENS') {
        state.dozenStep += 1; // Increase each dozen by +4 units
      }
      // Note: state.targetDozen remains unchanged so we bet on the correct "other" dozens
    }
  } else if (state.phase === 'WAIT') {
    state.phase = 'STREETS';
    state.targetDozen = currentDozen;
  }

  // Ignore 0 / 00 for target placement calculations
  if (state.targetDozen === null) {
    return [];
  }

  // 4. Build Bet Output Based on Active Phase
  if (state.phase === 'STREETS') {
    // Dozen street mapping
    const dozenStreets = {
      1: [1, 4, 7, 10],
      2: [13, 16, 19, 22],
      3: [25, 28, 31, 34]
    };

    const winningStreetStart = getStreetStart(lastNum);
    // Filter out the specific street that just won
    const targetStreets = dozenStreets[state.targetDozen].filter(street => street !== winningStreetStart);

    let streetBetAmount = Math.max(minInside, Math.min(maxBet, minInside));

    return targetStreets.map(streetValue => ({
      type: 'street',
      value: streetValue,
      amount: streetBetAmount
    }));

  } else if (state.phase === 'DOZENS') {
    // Bet on the OTHER 2 dozens relative to the dozen we were targeting
    const allDozens = [1, 2, 3];
    const otherDozens = allDozens.filter(d => d !== state.targetDozen);

    // Calculate progression: 4 units * step (+4 units per loss step)
    let dozenBetAmount = minOutside * 4 * state.dozenStep;
    dozenBetAmount = Math.max(minOutside, Math.min(maxBet, dozenBetAmount));

    return otherDozens.map(dozenValue => ({
      type: 'dozen',
      value: dozenValue,
      amount: dozenBetAmount
    }));
  }

  return [];
}