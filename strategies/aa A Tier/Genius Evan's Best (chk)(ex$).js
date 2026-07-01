/**
 * Genius Strategy (Evan's Best Roulette System) - Corrected Target Logic
 * * Source: https://youtu.be/3xK0BF6uhWE (Channel: The Roulette Master)
 * * The Full Logic in details:
 * This strategy observes the wheel without betting until all three dozens (1-12, 13-24, 25-36) 
 * have hit at least once. Once triggered, a betting layout is generated. For each dozen, 
 * it excludes the column segment of the last won number in that dozen. It places straight-up 
 * bets on 0 (and '00'), plus the remaining 8 numbers in each dozen.
 * * The Full Bet Progression in details:
 * - Initial Bet: 1 base unit per active number.
 * - On a Loss: Rebet and double the bet amount on all active numbers (Martingale progression).
 * - On a Win: Rebet with the same bet amount, but remove the specific number that just won.
 * * The Goal:
 * A session target is set to +20 units above the session's starting reference point. 
 * Once this profit is reached, the strategy locks in the profit, updates the reference bankroll, 
 * and immediately regenerates a new layout based on the recent spin history without pausing.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const baseUnit = config.betLimits.min;
  const targetProfitUnits = 20; // Fixed session target of 20 units

  // Helper: Find the last hit column segment for a dozen
  function getExcludedSegment(start, end, segments) {
    for (let i = spinHistory.length - 1; i >= 0; i--) {
      let num = spinHistory[i].winningNumber;
      if (num === 37) num = '00';

      if (num !== '00' && num >= start && num <= end) {
        for (const seg of segments) {
          if (seg.includes(parseInt(num))) return seg;
        }
      }
    }
    return segments[0];
  }

  // Helper: Generate layout based on the last won columns of each dozen
  function generateLayout() {
    const newLayout = [0];
    if (config.tableType === 'american') {
      newLayout.push('00');
    }

    const d1Cols = [[1, 4, 7, 10], [2, 5, 8, 11], [3, 6, 9, 12]];
    const d2Cols = [[13, 16, 19, 22], [14, 17, 20, 23], [15, 18, 21, 24]];
    const d3Cols = [[25, 28, 31, 34], [26, 29, 32, 35], [27, 30, 33, 36]];

    const excluded = [
      ...getExcludedSegment(1, 12, d1Cols),
      ...getExcludedSegment(13, 24, d2Cols),
      ...getExcludedSegment(25, 36, d3Cols)
    ];

    for (let i = 1; i <= 36; i++) {
      if (!excluded.includes(i)) {
        newLayout.push(i);
      }
    }

    return newLayout;
  }

  // Helper: Track which dozens have appeared for the initial warmup
  function updateTrackedDozens() {
    if (spinHistory.length === 0) return;
    let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
    if (lastNum === 37) lastNum = '00';

    if (lastNum !== 0 && lastNum !== '00') {
      if (lastNum >= 1 && lastNum <= 12) state.hitDozens[1] = true;
      if (lastNum >= 13 && lastNum <= 24) state.hitDozens[2] = true;
      if (lastNum >= 25 && lastNum <= 36) state.hitDozens[3] = true;
    }
  }

  // 1. Initialization
  if (!state.sessionActive) {
    state.sessionActive = true;
    state.referenceBankroll = bankroll; // Lock in the starting point
    state.currentBetAmount = baseUnit;
    state.bettingPhase = false;
    state.hitDozens = { 1: false, 2: false, 3: false };
    state.currentLayout = [];
  }

  let resetTriggered = false;

  // 2. Process the previous spin result (Win/Loss logic)
  if (state.bettingPhase && spinHistory.length > 0 && state.currentLayout.length > 0) {
    let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
    if (lastNum === 37) lastNum = '00';

    const isWin = state.currentLayout.some(n => n.toString() === lastNum.toString());

    if (isWin) {
      // Remove winning number from layout
      state.currentLayout = state.currentLayout.filter(n => n.toString() !== lastNum.toString());
    } else {
      // Double bets on loss
      state.currentBetAmount *= 2;
    }
  }

  // 3. Check for Reset Conditions (+20 unit profit reached or layout completely cleared)
  if (state.bettingPhase) {
    const currentSessionProfit = bankroll - state.referenceBankroll;
    
    // Check if we hit the explicit +20 unit target
    if (currentSessionProfit >= targetProfitUnits * baseUnit) {
      state.referenceBankroll = bankroll; // Lock in the new peak for the next +20 session
      resetTriggered = true;
    }

    // Safety fallback: if we somehow clear the entire board layout
    if (state.currentLayout.length === 0) {
      state.referenceBankroll = bankroll;
      resetTriggered = true;
    }
  }

  // 4. Handle Phase Transitions & Layout Generation
  if (!state.bettingPhase) {
    // Initial warmup phase: wait for all 3 dozens (Happens only once per simulation)
    updateTrackedDozens();
    if (state.hitDozens[1] && state.hitDozens[2] && state.hitDozens[3]) {
      state.bettingPhase = true;
      state.currentLayout = generateLayout();
    } else {
      return []; // Spin without betting
    }
  } else if (resetTriggered) {
    // Immediate reset without pausing
    state.currentBetAmount = baseUnit;
    state.currentLayout = generateLayout();
  }

  // 5. Clamp the bet amount to the defined configuration limits
  let amount = state.currentBetAmount;
  amount = Math.max(amount, config.betLimits.min);
  amount = Math.min(amount, config.betLimits.max);
  state.currentBetAmount = amount;

  // 6. Build the final bet objects array
  return state.currentLayout.map(num => ({
    type: 'number',
    value: num === '00' ? '00' : parseInt(num),
    amount: amount
  }));
}