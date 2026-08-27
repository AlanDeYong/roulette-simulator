/**
 * 6-Story Corners Roulette Strategy
 * 
 * Source: 
 * - YouTube Video: "This Corner Roulette System Never Loses | Survival Test Results, 0 Bankroll Used!"
 * - URL: https://youtu.be/z9JSJrNSGF4
 * - Channel: The Roulette Factory
 * 
 * The Full Logic in Details:
 * - This strategy places non-overlapping corner bets across the roulette layout.
 * - Within each tier (story), the number of corner bets scales dynamically from 2 up to 6 corners 
 *   using a ladder step progression:
 *     - Step 1: 2 Corners
 *     - Step 2: 3 Corners
 *     - Step 3: 4 Corners
 *     - Step 4: 5 Corners
 *     - Step 5: 6 Corners
 * - On each spin, corner positions are selected without overlapping numbers to maximize layout coverage.
 * 
 * The Full Bet Progression in Details:
 * - The strategy spans 6 Stories (Tiers) with 5 Steps each (30 total progression levels).
 * - Story Unit Multipliers (Fibonacci-based):
 *     - Story 1: 1 unit per corner
 *     - Story 2: 2 units per corner
 *     - Story 3: 3 units per corner
 *     - Story 4: 5 units per corner
 *     - Story 5: 8 units per corner
 *     - Story 6: 13 units per corner
 * - Rules for Stepping:
 *     - On a LOSS: Increase step by +1 (e.g., 2 corners -> 3 corners -> ... -> 6 corners).
 *       If you lose at 6 corners (Step 5), advance to the next Story (Tier) and reset to Step 1 (2 corners).
 *     - On a WIN: Ladder down by -1 step (e.g., peel off one corner).
 *       If you win at Step 1 (2 corners) on Story > 1, ladder down to the previous Story at Step 5 (6 corners).
 *     - SESSION HIGH RESET: Whenever total bankroll reaches a new session high profit, the progression 
 *       immediately resets to Story 1, Step 1 (2 corners at 1 unit).
 * 
 * The Goal:
 * - Achieve continuous incremental gains through high layout coverage and controlled laddering, 
 *   resetting to base stakes whenever a new session peak profit is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Initialize State
  if (state.peakBankroll === undefined) {
    state.peakBankroll = bankroll;
  }
  if (state.storyIndex === undefined) {
    state.storyIndex = 0; // 0 to 5 (Stories 1 to 6)
  }
  if (state.stepIndex === undefined) {
    state.stepIndex = 0; // 0 to 4 (2, 3, 4, 5, 6 corners)
  }

  const storyUnits = [1, 2, 3, 5, 8, 13];
  const cornerSteps = [2, 3, 4, 5, 6];

  // 2. Evaluate previous spin if history exists
  if (spinHistory && spinHistory.length > 0) {
    const lastResult = spinHistory[spinHistory.length - 1];
    
    // Check if new session high achieved
    if (bankroll > state.peakBankroll) {
      state.peakBankroll = bankroll;
      state.storyIndex = 0;
      state.stepIndex = 0;
    } else if (state.lastPlacedCorners && state.lastPlacedCorners.length > 0) {
      // Determine if previous spin was a win on any placed corner
      const hit = state.lastPlacedCorners.some(cornerVal => {
        // Corner value is top-left number (e.g. 1 -> [1, 2, 4, 5])
        const covered = [
          cornerVal,
          cornerVal + 1,
          cornerVal + 3,
          cornerVal + 4
        ];
        return covered.includes(lastResult.winningNumber);
      });

      if (hit) {
        // Win: ladder down 1 step
        if (state.stepIndex > 0) {
          state.stepIndex--;
        } else if (state.storyIndex > 0) {
          state.storyIndex--;
          state.stepIndex = cornerSteps.length - 1; // Drop to 6 corners of previous story
        }
      } else {
        // Loss: ladder up 1 step
        if (state.stepIndex < cornerSteps.length - 1) {
          state.stepIndex++;
        } else {
          // Move to next story if available
          if (state.storyIndex < storyUnits.length - 1) {
            state.storyIndex++;
            state.stepIndex = 0;
          }
        }
      }
    }
  }

  // 3. Determine Bet Sizing & Limits
  const baseUnit = config.betLimits.min;
  const multiplier = storyUnits[state.storyIndex];
  let betAmount = baseUnit * multiplier;

  // Clamp bet amount to table limits
  betAmount = Math.max(betAmount, config.betLimits.min);
  betAmount = Math.min(betAmount, config.betLimits.max);

  // 4. Select Non-Overlapping Corners
  // Clean grid of non-overlapping corners across the 3 columns:
  // (1,2,4,5), (7,8,10,11), (13,14,16,17), (19,20,22,23), (25,26,28,29), (31,32,34,35)
  const availableCorners = [1, 7, 13, 19, 25, 31];
  const numCorners = cornerSteps[state.stepIndex];
  const selectedCorners = availableCorners.slice(0, numCorners);

  // Save placed corners in state to evaluate win/loss on next spin
  state.lastPlacedCorners = selectedCorners;

  // 5. Construct Bets Array
  const bets = selectedCorners.map(cornerValue => ({
    type: 'corner',
    value: cornerValue,
    amount: betAmount
  }));

  return bets;
}