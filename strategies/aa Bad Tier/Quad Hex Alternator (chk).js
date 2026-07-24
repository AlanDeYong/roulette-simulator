/**
 * ==============================================================================
 * ROULETTE STRATEGY: The Quad Hex Alternator ("Breathing Footprint")
 * ==============================================================================
 * 
 * SOURCE:
 * - Channel: The Lucky Felt (Todd Hoover)
 * - Video URL: https://youtu.be/PSQKN9FdVLc
 * 
 * FULL LOGIC & DETAILS:
 * The strategy alternates its betting footprint between a 4-street 12-number "sniper" 
 * (Quad) and a 6-street 18-number "wide net" (Hex) based on street parity (Odd vs. Even).
 * 
 * 1. Street Classification by Parity:
 *    Streets on the layout are categorized by the parity of their Column 1 starting number:
 *    - Odd Streets (6 total):  Street 1 (1-3), Street 7 (7-9), Street 13 (13-15), 
 *                               Street 19 (19-21), Street 25 (25-27), Street 31 (31-33).
 *    - Even Streets (6 total): Street 4 (4-6), Street 10 (10-12), Street 16 (16-18), 
 *                               Street 22 (22-24), Street 28 (28-30), Street 34 (34-36).
 * 
 * 2. Target Parity & Dozen Selection:
 *    - Parity: Set to the parity (odd/even) of the last non-zero winning number.
 *    - Dozen Exclusion: In Quad mode, omit the 2 streets belonging to the dozen 
 *      that just hit (Dozen 1: 1-12, Dozen 2: 13-24, Dozen 3: 25-36).
 *    - Neutral Zero (0 / 00): Retains the previous active parity and dozen targets.
 * 
 * 3. Footprint Alternation (Quad <-> Hex):
 *    - Quad Mode (12 Numbers): Bet 4 streets matching the target parity, leaving out 
 *      the dozen of the last winning number.
 *    - Hex Mode (18 Numbers): If Quad misses, expand to all 6 streets of the target parity.
 * 
 * BET PROGRESSION:
 * - Sequence: [1, 2, 3, 5, 8, 13, 21, 34, ...] (Units per street).
 * - Progression Transitions:
 *   - Start at Quad mode with 1 unit per street.
 *   - If Quad misses -> Expand to Hex mode at the SAME progression level.
 *   - If Hex misses -> Step UP to the next progression level and reset footprint to Quad.
 *   - If ANY bet WINS and session bankroll hits a new peak -> Reset progression level 
 *     to 1 unit and set footprint to Quad (excluding the new winning dozen).
 * 
 * GOAL & STOP CONDITIONS:
 * - Target Profit: +$400 (or custom target based on starting bankroll).
 * - Stop Loss: Protected by minimum bankroll requirements to cover active bets.
 * ==============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Define street starting values by parity and dozen
  const STREET_PARITY = {
    odd: [1, 7, 13, 19, 25, 31],
    even: [4, 10, 16, 22, 28, 34]
  };

  const DOZEN_STREETS = {
    1: [1, 4, 7, 10],
    2: [13, 16, 19, 22],
    3: [25, 28, 31, 34]
  };

  const PROGRESSION_SEQUENCE = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

  // 1. Initialize Strategy State
  if (!state.initialized) {
    state.initialized = true;
    state.initialBankroll = bankroll;
    state.peakBankroll = bankroll;
    state.targetProfit = 400; // Default session profit goal
    state.progressionIndex = 0;
    state.mode = 'quad'; // 'quad' (4 streets) or 'hex' (6 streets)
    state.targetParity = 'odd'; // 'odd' or 'even'
    state.lastDozen = 1;
    state.lastPlacedBets = [];
  }

  // 2. Process Outcome of the Last Spin
  if (spinHistory.length > 0 && state.lastPlacedBets.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;

    // Check if any placed street bet hit
    const won = state.lastPlacedBets.some(streetVal => lastNum >= streetVal && lastNum <= streetVal + 2);

    // Update bankroll high-water mark
    if (bankroll > state.peakBankroll) {
      state.peakBankroll = bankroll;
    }

    // Update target parity and dozen if a non-zero number hit
    if (lastNum >= 1 && lastNum <= 36) {
      state.targetParity = lastNum % 2 !== 0 ? 'odd' : 'even';
      if (lastNum <= 12) state.lastDozen = 1;
      else if (lastNum <= 24) state.lastDozen = 2;
      else state.lastDozen = 3;
    }

    // Progression & State Transitions
    if (won) {
      // On Win: Reset progression if recovered/reached new peak, reset footprint to Quad
      if (bankroll >= state.peakBankroll) {
        state.progressionIndex = 0;
      }
      state.mode = 'quad';
    } else {
      // On Loss:
      if (state.mode === 'quad') {
        // Expand from 4 streets (Quad) to 6 streets (Hex) at current level
        state.mode = 'hex';
      } else {
        // Loss on Hex: Advance progression step and reset footprint to Quad
        state.progressionIndex = Math.min(state.progressionIndex + 1, PROGRESSION_SEQUENCE.length - 1);
        state.mode = 'quad';
      }
    }
  } else if (spinHistory.length > 0) {
    // Initial spin history assessment if starting mid-session
    const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
    if (lastNum >= 1 && lastNum <= 36) {
      state.targetParity = lastNum % 2 !== 0 ? 'odd' : 'even';
      if (lastNum <= 12) state.lastDozen = 1;
      else if (lastNum <= 24) state.lastDozen = 2;
      else state.lastDozen = 3;
    }
  }

  // 3. Stop Conditions Check (Target Profit Reached)
  if (bankroll - state.initialBankroll >= state.targetProfit) {
    return [];
  }

  // 4. Select Target Streets Based on Mode & Parity
  let targetStreets = [];
  const availableParityStreets = STREET_PARITY[state.targetParity];

  if (state.mode === 'quad') {
    // Filter out streets that belong to the last hit dozen
    const omittedStreets = DOZEN_STREETS[state.lastDozen] || [];
    targetStreets = availableParityStreets.filter(st => !omittedStreets.includes(st));
  } else {
    // Hex mode: select all 6 streets of current parity
    targetStreets = [...availableParityStreets];
  }

  // 5. Calculate & Clamp Bet Amount
  const unitMultiplier = PROGRESSION_SEQUENCE[state.progressionIndex];
  const baseUnit = config.betLimits.min; // Use inside bet minimum for street bets
  let betAmount = baseUnit * unitMultiplier;

  // Clamp bet amount to table limits
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // Verify bankroll coverage
  const totalRequired = betAmount * targetStreets.length;
  if (bankroll < totalRequired) {
    return []; // Stop betting if insufficient bankroll
  }

  // 6. Build Return Bet Array
  const bets = targetStreets.map(streetVal => ({
    type: 'street',
    value: streetVal,
    amount: betAmount
  }));

  // Save placed streets for evaluation on next turn
  state.lastPlacedBets = targetStreets;

  return bets;
}