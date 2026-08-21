/**
 * ============================================================================
 * ROULETTE STRATEGY: The 12/21 Equalizer
 * ============================================================================
 * Source: https://youtu.be/BGOkz8Ccj10
 * Channel: The Lucky Felt (Todd Hoover)
 * 
 * THE FULL LOGIC IN DETAIL:
 * 1. Base Strategy (12-Number Core):
 *    - Start by selecting any Dozen (1st, 2nd, or 3rd Dozen).
 *    - Bet a base unit amount on that selected Dozen.
 *    - If a Dozen hits 3 times in a row, switch to a different Dozen to avoid
 *      chasing cold/hot streaks.
 * 
 * 2. Equalizer Mode (21-Number Trap):
 *    - When a Dozen bet loses, escalate into Stage 2 Equalizer mode.
 *    - Double the Dozen bet amount at the current progression level.
 *    - Concurrently, place street bets on 3 streets of another dozen (covering
 *      9 additional numbers, making 21 numbers covered in total).
 *    - STREET SELECTION (Updated): Select 3 streets from the target dozen, 
 *      explicitly excluding/avoiding the specific street that won on the most 
 *      recent spin if it falls within that dozen.
 *    - The street bet amounts equal 1/2 of the dozen bet amount divided among 
 *      the 3 streets (i.e. Street Bet = Dozen Bet / 2 / 3 per street).
 * 
 * THE FULL BET PROGRESSION IN DETAIL:
 * - Uses a Fibonacci-style progression on total bet level across misses/losses:
 *   Progression Levels (Base Dozen Bet Units): [1, 2, 3, 5, 8, 13, ...]
 * - Upon a loss in Stage 1, move to Stage 2 with increased bet size.
 * - Upon a loss in Stage 2, move up to the next Fibonacci level in Stage 1/2.
 * - Upon a successful win, evaluate session profit target or step down the
 *   progression ladder towards the base unit level.
 * 
 * THE GOAL:
 * - Target Profit: +20% of starting bankroll (e.g., +$400 on $2,000 bankroll).
 * - Stop Loss: Protected by table max limit or total bankroll depletion.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (!state.initialized) {
    state.initialized = true;
    state.fibSequence = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
    state.fibIndex = 0;
    state.stage = 1; // Stage 1 = Dozen only (12 nums), Stage 2 = Dozen + 3 Streets (21 nums)
    state.selectedDozen = 1; // 1, 2, or 3
    state.consecutiveDozenHits = 0;
    state.startingBankroll = bankroll;
    state.targetProfit = bankroll * 0.20; // 20% profit target
  }

  // Check Target Profit
  const currentProfit = bankroll - state.startingBankroll;
  if (currentProfit >= state.targetProfit) {
    return null;
  }

  // Helper to determine the starting number of a street (1, 4, 7... 34)
  function getStreetStart(winningNumber) {
    if (winningNumber < 1 || winningNumber > 36) return null;
    return Math.floor((winningNumber - 1) / 3) * 3 + 1;
  }

  // 2. Process History & Update State Logic
  if (spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const num = lastSpin.winningNumber;
    
    // Determine last winning dozen
    let lastDozen = 0;
    if (num >= 1 && num <= 12) lastDozen = 1;
    else if (num >= 13 && num <= 24) lastDozen = 2;
    else if (num >= 25 && num <= 36) lastDozen = 3;

    // Check if previous bet won on Dozen
    const wonDozen = (lastDozen === state.selectedDozen && state.selectedDozen !== 0);

    if (wonDozen) {
      state.consecutiveDozenHits++;
      
      // Step down progression on win
      if (state.fibIndex > 0) {
        state.fibIndex = Math.max(0, state.fibIndex - 1);
      }
      state.stage = 1;

      // Switch dozen if hit 3 times in a row
      if (state.consecutiveDozenHits >= 3) {
        state.selectedDozen = (state.selectedDozen % 3) + 1;
        state.consecutiveDozenHits = 0;
      }
    } else {
      // Loss or Miss
      state.consecutiveDozenHits = 0;
      
      if (state.stage === 1) {
        // Switch to Stage 2 (Equalizer)
        state.stage = 2;
      } else {
        // Already in Stage 2 and lost -> advance Fibonacci sequence
        if (state.fibIndex < state.fibSequence.length - 1) {
          state.fibIndex++;
        }
        // Rotate target dozen on loss
        state.selectedDozen = (state.selectedDozen % 3) + 1;
        state.stage = 1;
      }
    }
  }

  // 3. Calculate Base Units with Limits
  const baseOutsideUnit = Math.max(config.betLimits.minOutside, 5);
  const multiplier = state.fibSequence[state.fibIndex];

  // 4. Construct Bets
  const bets = [];

  if (state.stage === 1) {
    // Stage 1: Single Dozen Bet
    let dozenBetAmount = baseOutsideUnit * multiplier;
    dozenBetAmount = Math.min(dozenBetAmount, config.betLimits.max);
    dozenBetAmount = Math.max(dozenBetAmount, config.betLimits.minOutside);

    bets.push({
      type: 'dozen',
      value: state.selectedDozen,
      amount: dozenBetAmount
    });
  } else {
    // Stage 2: Equalizer Mode (Dozen + 3 Street Bets)
    let dozenBetAmount = baseOutsideUnit * multiplier * 2;
    dozenBetAmount = Math.min(dozenBetAmount, config.betLimits.max);
    dozenBetAmount = Math.max(dozenBetAmount, config.betLimits.minOutside);

    bets.push({
      type: 'dozen',
      value: state.selectedDozen,
      amount: dozenBetAmount
    });

    // Pick a second dozen for the street bets
    const streetDozen = (state.selectedDozen % 3) + 1;
    const startStreetNum = (streetDozen - 1) * 12 + 1;
    const allStreetsInDozen = [
      startStreetNum,
      startStreetNum + 3,
      startStreetNum + 6,
      startStreetNum + 9
    ];

    // Determine the street that just won to exclude it
    let excludedStreet = null;
    if (spinHistory.length > 0) {
      const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
      excludedStreet = getStreetStart(lastNum);
    }

    // Select the 3 streets, filtering out the excluded street if present
    let selectedStreets = allStreetsInDozen.filter(s => s !== excludedStreet);
    
    // If last number was 0 or outside this dozen, take the first 3 streets
    if (selectedStreets.length > 3) {
      selectedStreets = selectedStreets.slice(0, 3);
    }

    // Calculate street bet amount
    let streetBetAmount = Math.floor((dozenBetAmount / 2) / 3);
    streetBetAmount = Math.max(streetBetAmount, config.betLimits.min);
    streetBetAmount = Math.min(streetBetAmount, config.betLimits.max);

    // Place the 3 street bets
    for (const streetStart of selectedStreets) {
      bets.push({
        type: 'street',
        value: streetStart,
        amount: streetBetAmount
      });
    }
  }

  return bets;
}