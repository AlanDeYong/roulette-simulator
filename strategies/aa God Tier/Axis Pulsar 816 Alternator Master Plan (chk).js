/*
 * Strategy: Axis Pulsar 816 Alternator Master Plan
 * Source: The Lucky Felt (https://youtu.be/rRCZ-6rc3aU)
 *
 * Full Logic:
 * The strategy avoids static betting by breathing with the variance of the wheel. It alternates between 
 * a tight 8-number "Sniper" bet and a wider 16-number "Wide Net" footprint based on recent hits.
 * - Initial Bet (Sniper): Look at the last winning number. Target its Column. We place straight-up bets 
 *   on all 12 numbers in that column, EXCEPT the 4 numbers that overlap with the last winning number's Dozen. 
 *   (Total: 8 bets).
 * 
 * Full Bet Progression:
 * - On Win (Sniper): Stay at the 8-number Sniper level. If you reach an overall session profit, reset the 
 *   multiplier to 1. If not, maintain the current multiplier.
 * - On Loss (Sniper): Expand to the "Wide Net" (16 bets). Target BOTH the Column and Dozen of the NEW 
 *   winning number. Filter out the overlapping intersection for both. Keep the SAME multiplier unit size.
 * - On Win (Wide Net): You cast a wide net and won, but might still be in a session deficit. Use the 
 *   "Smart Clutch" recovery calculation: Deficit / 28 (rounded up) = Next Multiplier. Revert back to the 
 *   tight 8-number Sniper bet using this newly calculated multiplier.
 * - On Loss (Wide Net): Revert back to the tight 8-number Sniper bet, but INCREASE the progression multiplier by +1.
 * - Ghost Spin: If a Zero (0 or 00) hits, treat it as a ghost spin. Do not adjust the bet location or 
 *   progression. Repeat the exact same bet array and accept the loss.
 * 
 * Goal: 
 * A 20% gain on bankroll (achieved with a stated 87.6% Monte Carlo win rate). Protect bankroll via Smart Clutch.
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Wait for the first spin to establish an anchor
  if (spinHistory.length === 0) return [];

  // Helper Functions
  const getCol = (n) => n % 3 === 0 ? 3 : n % 3;
  const getDoz = (n) => Math.ceil(n / 12);
  const getColumnNumbers = (c) => Array.from({length: 36}, (_, i) => i + 1).filter(n => getCol(n) === c);
  const getDozenNumbers = (d) => Array.from({length: 36}, (_, i) => i + 1).filter(n => getDoz(n) === d);

  const unitValue = config.betLimits.min;

  // Initialize State
  if (!state.initialized) {
    state.mode = 'sniper'; // 'sniper' (8 numbers) or 'widenet' (16 numbers)
    state.multiplier = 1;
    state.sessionStartBankroll = bankroll;
    state.lastBetArray = [];
    state.initialized = true;
  }

  const lastSpin = spinHistory[spinHistory.length - 1];
  const lastNum = lastSpin.winningNumber;

  // Ghost Spin: If zero hits, repeat exactly what we did last time without advancing progression
  if (lastNum === 0 || lastNum === '00') {
    return state.lastBetArray || [];
  }

  // Determine if the last spin was a win
  let wonLastSpin = false;
  if (state.lastBetArray && state.lastBetArray.length > 0) {
    wonLastSpin = state.lastBetArray.some(b => b.value === lastNum);
  }

  // State Machine Logic
  if (state.lastBetArray && state.lastBetArray.length > 0) {
    if (state.mode === 'sniper') {
      if (wonLastSpin) {
        // Won Sniper
        if (bankroll >= state.sessionStartBankroll) {
          state.multiplier = 1;
          state.sessionStartBankroll = bankroll; // Lock in new high
        }
      } else {
        // Lost Sniper: Widen the net, multiplier stays the same
        state.mode = 'widenet';
      }
    } else if (state.mode === 'widenet') {
      if (wonLastSpin) {
        // Won Widenet: Contract to Sniper, engage Smart Clutch to recalculate multiplier
        state.mode = 'sniper';
        let currentDeficit = state.sessionStartBankroll - bankroll;
        
        if (currentDeficit > 0) {
          let unitsDown = currentDeficit / unitValue;
          // A 1-unit bet on 8 numbers nets 28 units of profit on a win (pays 35 + 1 back - 8 spent = +28)
          state.multiplier = Math.max(1, Math.ceil(unitsDown / 28)); 
        } else {
          state.multiplier = 1;
          state.sessionStartBankroll = bankroll;
        }
      } else {
        // Lost Widenet: Contract to Sniper, increment progression multiplier
        state.mode = 'sniper';
        state.multiplier += 1;
      }
    }
  }

  // Calculate new target footprint based on the NEW winning number
  let colIndex = getCol(lastNum);
  let dozIndex = getDoz(lastNum);
  let targetNumbers = [];

  if (state.mode === 'sniper') {
    // 8 Numbers: The winning column, excluding numbers intersecting with the winning dozen
    let colNums = getColumnNumbers(colIndex);
    targetNumbers = colNums.filter(n => getDoz(n) !== dozIndex);
  } else {
    // 16 Numbers: The winning column AND winning dozen, excluding their intersection
    let colNums = getColumnNumbers(colIndex);
    let dozNums = getDozenNumbers(dozIndex);
    
    let validColNums = colNums.filter(n => getDoz(n) !== dozIndex);
    let validDozNums = dozNums.filter(n => getCol(n) !== colIndex);
    
    targetNumbers = [...validColNums, ...validDozNums];
  }

  // Calculate clamped bet amount
  let betAmount = unitValue * state.multiplier;
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // Generate bets
  let bets = targetNumbers.map(n => ({ 
    type: 'number', 
    value: n, 
    amount: betAmount 
  }));

  // Persist for next evaluation
  state.lastBetArray = bets;

  return bets;
}