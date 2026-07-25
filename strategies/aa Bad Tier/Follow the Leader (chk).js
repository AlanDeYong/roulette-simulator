/**
 * Roulette Strategy: Follow the Leader
 * 
 * Source:
 * - Channel: ALL in With Zach
 * - URL: https://youtu.be/vB7DYeO4DnM
 * 
 * Strategy Logic:
 * 1. Trigger / Selection:
 *    - Looks at the last winning number (the "Leader").
 *    - Places straight-up bets covering 5 contiguous wheel numbers centered on the Leader:
 *      - The Leader (Jackpot number): 2 unit bet
 *      - 2 Wheel Neighbors to the left: 1 unit bet each
 *      - 2 Wheel Neighbors to the right: 1 unit bet each
 * 
 * 2. Bet Progression:
 *    - Uses a 3-spin stepped progression.
 *    - Level 1 (Spins 1-3 after reset): 1 unit per neighbor, 2 units on Leader (Total: 6 units per spin).
 *    - Level 2 (Spins 4-6): 2 units per neighbor, 4 units on Leader (Total: 12 units per spin).
 *    - Level 3 (Spins 7-9): 3 units per neighbor, 6 units on Leader (Total: 18 units per spin).
 *    - On Any Win: Reset progression back to Level 1.
 *    - On Loss: Track consecutive losses at the current level. After 3 losses at a level, advance to the next level.
 * 
 * 3. Goal:
 *    - Target Profit: Stop after hitting a target profit (e.g., +$75–$100 over starting bankroll).
 *    - Stop Loss: Stop if bankroll falls below designated threshold or max progression limit is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // If no spin history yet, we cannot identify a "Leader"
  if (!spinHistory || spinHistory.length === 0) {
    return [];
  }

  // Initialize State
  if (state.initialBankroll === undefined) {
    state.initialBankroll = bankroll;
  }
  if (state.multiplier === undefined) state.multiplier = 1;
  if (state.lossesAtLevel === undefined) state.lossesAtLevel = 0;

  const targetProfit = 80000; // $80 profit target (as seen in video)
  if (bankroll >= state.initialBankroll + targetProfit) {
    return []; // Reached profit goal
  }

  // Determine last outcome (Win or Loss) to adjust progression
  if (state.lastBetLeader !== undefined && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    const winningNum = lastResult.winningNumber;

    // Check if winning number was among our placed bets
    const wasWin = state.lastBetNumbers && state.lastBetNumbers.includes(winningNum);

    if (wasWin) {
      // Reset progression on win
      state.multiplier = 1;
      state.lossesAtLevel = 0;
    } else {
      // Increment loss count at current level
      state.lossesAtLevel += 1;
      if (state.lossesAtLevel >= 3) {
        state.multiplier += 1; // Advance to next unit tier
        state.lossesAtLevel = 0;
      }
    }
  }

  // Identify the Leader (last winning number)
  const leader = spinHistory[spinHistory.length - 1].winningNumber;

  // Define Wheel Layouts
  const europeanWheel = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ];
  const americanWheel = [
    0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14
  ];

  const wheel = (config && config.tableType === 'american') ? americanWheel : europeanWheel;

  // Find index of leader on the wheel
  let leaderIdx = wheel.indexOf(leader);
  if (leaderIdx === -1) {
    // Fallback search for string/number conversions
    leaderIdx = wheel.findIndex(n => String(n) === String(leader));
  }
  if (leaderIdx === -1) leaderIdx = 0;

  const wheelLength = wheel.length;

  // Select 5 numbers: Leader + 2 left neighbors + 2 right neighbors
  const getWheelNum = (offset) => wheel[(leaderIdx + offset + wheelLength) % wheelLength];

  const targetNumbers = [
    getWheelNum(-2), // Left 2
    getWheelNum(-1), // Left 1
    leader,          // Center Leader (Jackpot)
    getWheelNum(1),  // Right 1
    getWheelNum(2)   // Right 2
  ];

  // Store for next spin result checking
  state.lastBetLeader = leader;
  state.lastBetNumbers = targetNumbers;

  // Calculate Base Units respecting limits
  const baseUnit = config && config.betLimits ? config.betLimits.min : 1;
  const minBet = config && config.betLimits ? config.betLimits.min : 1;
  const maxBet = config && config.betLimits ? config.betLimits.max : 500;

  const neighborAmount = Math.min(Math.max(baseUnit * state.multiplier, minBet), maxBet);
  const leaderAmount = Math.min(Math.max(baseUnit * 2 * state.multiplier, minBet), maxBet);

  // Construct Bet Objects
  const bets = targetNumbers.map(num => {
    const isLeader = (num === leader);
    return {
      type: 'number',
      value: num,
      amount: isLeader ? leaderAmount : neighborAmount
    };
  });

  return bets;
}