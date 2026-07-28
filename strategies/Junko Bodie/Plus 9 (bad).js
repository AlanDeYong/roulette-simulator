/**
 * ============================================================================
 * ROULETTE STRATEGY: PLUS 9 STRATEGY
 * ============================================================================
 * 
 * Source:
 * - URL: https://youtu.be/U2lZM-FeigU
 * - YouTube Channel: Junko Bodie
 * 
 * The Full Logic in Detail:
 * - The "Plus 9 Strategy" is a street-betting system designed to net exactly a 
 *   +9 unit profit upon completing any cycle step.
 * - Streets start at numbers 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34.
 * - **Step 1 (First Spin)**: Place 1 base unit on 3 streets. (Total bet = 3 units).
 *   - If Win: Returns 12 units. Net profit = +9 units. Reset cycle.
 *   - If Loss: Proceed to Step 2.
 * - **Step 2 (Second Spin)**: Place 2 base units on 6 streets. (Total bet = 12 units).
 *   - If Win: Returns 24 units. Total spent (3 + 12 = 15 units). Net profit = +9 units. Reset cycle.
 *   - If Loss: Proceed to Step 3.
 * - **Step 3 (Third Spin)**: Place 8 base units on 9 streets ("Double-Double"). (Total bet = 72 units).
 *   - If Win: Returns 96 units. Total spent (3 + 12 + 72 = 87 units). Net profit = +9 units. Reset cycle.
 *   - If Loss: Reset cycle to Step 1 (or enter recovery).
 * 
 * The Full Bet Progression in Detail:
 * - Step 1: 3 streets covered @ 1 unit each  (Total: 3 units)
 * - Step 2: 6 streets covered @ 2 units each (Total: 12 units)
 * - Step 3: 9 streets covered @ 8 units each (Total: 72 units)
 * 
 * The Goal:
 * - Net +9 units profit per cycle and reset to build short-term session profits.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // Available street starting numbers on European/American boards
  const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

  // Base inside unit (using config.betLimits.min)
  const baseUnit = (config.betLimits && config.betLimits.min) ? config.betLimits.min : 2;
  const maxBet = (config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;

  // Initialize persistent state variables
  if (state.step === undefined) state.step = 1;
  if (state.activeStreets === undefined) state.activeStreets = [];
  if (state.unitMultiplier === undefined) state.unitMultiplier = 1;

  // Evaluate previous spin result if spin history exists
  if (spinHistory && spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNum = lastSpin.winningNumber;

    // Check if the winning number fell inside any of our placed street bets
    const isWin = state.activeStreets.some(streetStart => {
      return winningNum >= streetStart && winningNum <= streetStart + 2;
    });

    if (isWin) {
      // Win achieved! Reset cycle to Step 1
      state.step = 1;
    } else {
      // Loss occurred! Advance step sequence
      state.step = state.step >= 3 ? 1 : state.step + 1;
    }
  }

  // Determine betting parameters based on progression step
  let numStreetsToBet = 3;
  let multiplier = 1;

  if (state.step === 1) {
    numStreetsToBet = 3;
    multiplier = 1;
  } else if (state.step === 2) {
    numStreetsToBet = 6;
    multiplier = 2;
  } else if (state.step === 3) {
    numStreetsToBet = 9;
    multiplier = 8;
  }

  // Select target streets
  const selectedStreets = ALL_STREETS.slice(0, numStreetsToBet);
  state.activeStreets = selectedStreets;
  state.unitMultiplier = multiplier;

  // Calculate per-street bet amount and apply limits
  let betPerStreet = baseUnit * multiplier;
  betPerStreet = Math.max(betPerStreet, config.betLimits.min);
  betPerStreet = Math.min(betPerStreet, maxBet);

  // Check overall bankroll limit
  const totalBetAmount = betPerStreet * selectedStreets.length;
  if (bankroll < totalBetAmount) {
    // If bankroll is insufficient for full progression, adjust or return null
    if (bankroll < config.betLimits.min * selectedStreets.length) {
      return null;
    }
  }

  // Build array of street bet objects
  const bets = selectedStreets.map(streetStart => ({
    type: 'street',
    value: streetStart,
    amount: betPerStreet
  }));

  return bets;
}