/**
 * 18 Hottest Numbers Strategy with System Failure Trigger (7 Misses)
 * 
 * Source:
 * - URL: https://youtu.be/yBl-KhDhyMU
 * - YouTube Channel: Mastering The Wheel
 * 
 * The Full Logic in details:
 * - Target Selection: Dynamically tracks the top 18 "hottest" (most frequently hit) 
 *   roulette numbers evaluated over an adaptive rolling sample window (up to 74 spins).
 * - Cold Start / Spin-without-betting Mod:
 *   - Spins without placing any bets until at least 18 unique numbers appear in the history.
 *   - Dynamically expands the rolling history window from spin 1 up to 74 spins, 
 *     maintaining a rolling cap of 74 spins thereafter.
 * - System Failure Trigger (7 Misses):
 *   - Monitors virtual outcomes in the background by checking incoming spin results against 
 *     the top 18 hot numbers predicted prior to the spin.
 *   - Real betting is engaged ONLY AFTER the virtual strategy experiences 7 consecutive misses.
 * - Active Betting Phase:
 *   - Once triggered, real bets are placed on the current top 18 hottest numbers.
 *   - Deactivates real betting (returns to virtual monitoring) upon hitting 14 real wins, 
 *     reaching the target profit ($25), or suffering a full 7-level Martingale failure.
 * 
 * The Full Bet Progression in details:
 * - 7-Level Martingale doubling progression applied across all 18 straight-up numbers:
 *   - Level 1: 1 unit per number (18 units total)
 *   - Level 2: 2 units per number (36 units total)
 *   - Level 3: 4 units per number (72 units total)
 *   - Level 4: 8 units per number (144 units total)
 *   - Level 5: 16 units per number (288 units total)
 *   - Level 6: 32 units per number (576 units total)
 *   - Level 7: 64 units per number (1152 units total)
 * - Win: Resets progression level back to Level 1. Increments active win count.
 * - Loss: Moves to the next level (up to Level 7).
 * - Loss at Level 7: Reaches maximum cycle risk ($228.60 total cumulative loss at 10c unit base);
 *   deactivates real betting and returns to virtual monitoring mode.
 * 
 * The Goal:
 * - Target Profit: Reach a 10% gain on session bankroll (e.g., $25 profit on ~$230 bankroll) or 14 active wins.
 * - Stop Loss: Controlled by session bankroll or full 7-level Martingale failure.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initial State Setup
  if (state.virtualMisses === undefined) state.virtualMisses = 0;
  if (state.isTriggered === undefined) state.isTriggered = false;
  if (state.progressionLevel === undefined) state.progressionLevel = 1;
  if (state.activeWins === undefined) state.activeWins = 0;
  if (state.startBankroll === undefined) state.startBankroll = bankroll;
  if (state.lastBetNumbers === undefined) state.lastBetNumbers = [];
  if (state.virtualHot18 === undefined) state.virtualHot18 = [];

  const MAX_SAMPLE_WINDOW = 74;  // Cap rolling window at 74 spins
  const TRIGGER_MISSES = 7;      // Virtual trigger threshold (7 consecutive misses)
  const MAX_LEVELS = 7;          // Maximum Martingale progression levels
  const TARGET_WINS = 14;        // Reset trigger after 14 active wins
  const TARGET_PROFIT = 2500;      // Stop win threshold ($25 profit)

  // Session profit check
  if (bankroll - state.startBankroll >= TARGET_PROFIT) {
    return []; // Stop playing upon reaching target profit
  }

  // Need at least 1 spin to begin tracking
  if (!spinHistory || spinHistory.length === 0) {
    return [];
  }

  // 2. Process previous spin outcome
  const lastSpin = spinHistory[spinHistory.length - 1];
  const lastNumber = lastSpin.winningNumber;

  if (!state.isTriggered) {
    // Virtual Monitoring Phase: check against the PREVIOUS virtualHot18 list
    if (state.virtualHot18.length === 18) {
      const virtualHit = state.virtualHot18.includes(lastNumber);
      if (virtualHit) {
        state.virtualMisses = 0;
      } else {
        state.virtualMisses++;
        if (state.virtualMisses >= TRIGGER_MISSES) {
          state.isTriggered = true;
          state.progressionLevel = 1;
          state.activeWins = 0;
        }
      }
    }
  } else {
    // Active Real Betting Phase: check using ACTUAL numbers bet on in previous spin
    if (state.lastBetNumbers.length > 0) {
      const wasHit = state.lastBetNumbers.includes(lastNumber);

      if (wasHit) {
        state.progressionLevel = 1; // Reset progression on win
        state.activeWins++;
        if (state.activeWins >= TARGET_WINS) {
          state.isTriggered = false; // Deactivate trigger after target wins
          state.virtualMisses = 0;
          state.lastBetNumbers = [];
          state.virtualHot18 = [];
          return [];
        }
      } else {
        state.progressionLevel++;
        if (state.progressionLevel > MAX_LEVELS) {
          // Full 7-level Martingale loss: return to virtual monitoring
          state.isTriggered = false;
          state.virtualMisses = 0;
          state.progressionLevel = 1;
          state.lastBetNumbers = [];
          state.virtualHot18 = [];
          return [];
        }
      }
    }
  }

  // 3. Adaptive Rolling Window (Grows up to 74, then capped at 74)
  const currentWindowSize = Math.min(spinHistory.length, MAX_SAMPLE_WINDOW);
  const windowSpins = spinHistory.slice(-currentWindowSize);

  // Frequency tracking for numbers (0-36)
  const frequencyMap = {};
  for (let i = 0; i <= 36; i++) {
    frequencyMap[i] = 0;
  }
  windowSpins.forEach(spin => {
    if (spin.winningNumber >= 0 && spin.winningNumber <= 36) {
      frequencyMap[spin.winningNumber]++;
    }
  });

  // Sort numbers by highest frequency, tie-breaker by recency
  const sortedNumbers = Object.keys(frequencyMap)
    .map(Number)
    .sort((a, b) => {
      if (frequencyMap[b] !== frequencyMap[a]) {
        return frequencyMap[b] - frequencyMap[a];
      }
      return spinHistory.findLastIndex(s => s.winningNumber === b) - 
             spinHistory.findLastIndex(s => s.winningNumber === a);
    });

  // Spin without betting until at least 18 unique numbers appear
  const nonZeroFreqCount = sortedNumbers.filter(n => frequencyMap[n] > 0).length;
  if (spinHistory.length < 18 || nonZeroFreqCount < 18) {
    return []; // Spin without placing bets
  }

  const hottest18 = sortedNumbers.slice(0, 18);

  // Store current selection for next spin's virtual evaluation
  state.virtualHot18 = hottest18;

  // 4. Return Bets if Triggered
  if (state.isTriggered) {
    // Save current active numbers for next spin's win/loss check
    state.lastBetNumbers = hottest18;

    const baseUnit = config.betLimits.min; // Inside bet limit ($1 min)
    const multiplier = Math.pow(2, state.progressionLevel - 1); // Doubling martingale: 1, 2, 4, 8, 16, 32, 64
    
    let betAmount = baseUnit * multiplier;
    
    // Clamp to configured bet limits
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    return hottest18.map(num => ({
      type: 'number',
      value: num,
      amount: betAmount
    }));
  }

  return [];
}