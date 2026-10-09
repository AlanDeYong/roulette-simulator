/**
 * Strategy: Walking the Dog Roulette
 * Source: Roulette Strategy Lab (https://youtu.be/T57TV5QShRw) - Originally via Makeshift Shows
 * 
 * Logic & Entry Rules:
 * - Sequentially rotates an uncovered 12-number section ("The Dog") across a 6-step cycle:
 *     Step 0: Uncovered Dozen 1 -> Bet Dozen 2 & Dozen 3
 *     Step 1: Uncovered Dozen 2 -> Bet Dozen 1 & Dozen 3
 *     Step 2: Uncovered Dozen 3 -> Bet Dozen 1 & Dozen 2
 *     Step 3: Uncovered Column 1 -> Bet Column 2 & Column 3
 *     Step 4: Uncovered Column 2 -> Bet Column 1 & Column 3
 *     Step 5: Uncovered Column 3 -> Bet Column 1 & Column 2
 * - Always hedges the zero pocket (Straight-up 0 on European, Split [0, 00] on American tables).
 * - Base betting ratio is 5 units on outside bet A, 5 units on outside bet B, and 1 unit on zero hedge (11 units total).
 * 
 * Bet Progression:
 * - On Loss: Triple the bet sizing (Multiplier * 3: 1x -> 3x -> 9x -> 27x).
 * - On Win: If bankroll recovers to or exceeds the cycle's starting benchmark, reset multiplier to 1x.
 * - The "Dog" position advances by 1 position every single spin regardless of outcome.
 * 
 * The Goal:
 * - Target Profit: +$50 (or +50 base units). Stop betting once target is reached or bankroll is insufficient.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize persistent state
  if (!state.initialized) {
    state.initialized = true;
    state.startBankroll = bankroll;
    state.targetProfit = 5000; // Standard $50 walk-away goal from the video
    state.highestBankroll = bankroll;
    state.cycleBenchmark = bankroll;
    state.multiplier = 1;
    state.dogPosition = 0; // 0..2 for Dozens 1..3, 3..5 for Columns 1..3
    state.lastBankroll = bankroll;
  }

  // 2. Goal & Stop-Condition Checks
  const netProfit = bankroll - state.startBankroll;
  if (netProfit >= state.targetProfit) {
    return []; // Reached target profit; walk away
  }

  // 3. Evaluate previous spin outcome and handle progression
  if (spinHistory && spinHistory.length > 0) {
    const lastWon = bankroll > state.lastBankroll;

    if (lastWon) {
      // If we recovered past the benchmark or made a new profit high, reset progression
      if (bankroll >= state.cycleBenchmark) {
        state.multiplier = 1;
        state.cycleBenchmark = bankroll;
      }
    } else {
      // On loss: Triple the bet size
      state.multiplier *= 3;
    }

    // Always walk the dog to the next position (0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 0)
    state.dogPosition = (state.dogPosition + 1) % 6;
  }

  // 4. Determine Unit Sizing
  const minInside = config.betLimits ? config.betLimits.min : 1;
  const minOutside = config.betLimits ? config.betLimits.minOutside : 5;
  const maxBet = config.betLimits ? config.betLimits.max : Infinity;

  // Hedge unit (1 unit) & Outside units (5 units)
  const hedgeUnit = minInside;
  const outsideUnit = Math.max(minOutside, hedgeUnit * 5);

  let hedgeAmount = hedgeUnit * state.multiplier;
  let outsideAmount = outsideUnit * state.multiplier;

  // Clamp amounts to table limits
  hedgeAmount = Math.max(minInside, Math.min(hedgeAmount, maxBet));
  outsideAmount = Math.max(minOutside, Math.min(outsideAmount, maxBet));

  // Total bet required for this round: 2 outside bets + 1 hedge bet
  const totalRequired = (outsideAmount * 2) + hedgeAmount;
  if (bankroll < totalRequired) {
    return []; // Insufficient bankroll to place the required progression
  }

  // Update tracking bankroll before returning bets
  state.lastBankroll = bankroll;

  // 5. Build Bet Placements based on "The Dog" position
  const bets = [];
  const isAmerican = config.tableType === 'american';

  // Zero Hedge: Split 0/00 if American, straight-up 0 if European
  if (isAmerican) {
    // American double-zero split [0, 37] or basket
    bets.push({ type: 'split', value: [0, 37], amount: hedgeAmount });
  } else {
    bets.push({ type: 'number', value: 0, amount: hedgeAmount });
  }

  // 12-Number Group Bets (2 active out of 3)
  switch (state.dogPosition) {
    case 0: // Dog on Dozen 1 -> Cover Dozens 2 & 3
      bets.push({ type: 'dozen', value: 2, amount: outsideAmount });
      bets.push({ type: 'dozen', value: 3, amount: outsideAmount });
      break;
    case 1: // Dog on Dozen 2 -> Cover Dozens 1 & 3
      bets.push({ type: 'dozen', value: 1, amount: outsideAmount });
      bets.push({ type: 'dozen', value: 3, amount: outsideAmount });
      break;
    case 2: // Dog on Dozen 3 -> Cover Dozens 1 & 2
      bets.push({ type: 'dozen', value: 1, amount: outsideAmount });
      bets.push({ type: 'dozen', value: 2, amount: outsideAmount });
      break;
    case 3: // Dog on Column 1 -> Cover Columns 2 & 3
      bets.push({ type: 'column', value: 2, amount: outsideAmount });
      bets.push({ type: 'column', value: 3, amount: outsideAmount });
      break;
    case 4: // Dog on Column 2 -> Cover Columns 1 & 3
      bets.push({ type: 'column', value: 1, amount: outsideAmount });
      bets.push({ type: 'column', value: 3, amount: outsideAmount });
      break;
    case 5: // Dog on Column 3 -> Cover Columns 1 & 2
      bets.push({ type: 'column', value: 1, amount: outsideAmount });
      bets.push({ type: 'column', value: 2, amount: outsideAmount });
      break;
  }

  return bets;
}