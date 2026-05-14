/**
 * Aussie Pete's $250 a day - Full System Blueprint
 * * Source: https://www.youtube.com/watch?v=NkQRnX8En8k (Stacking Chips)
 * * The Logic: 
 * - "Follow the Leader": Always bet on the color that hit on the previous spin.
 * - If the previous spin was Green (0/00), ignore it entirely and bet on the last observed Red/Black.
 * * The Progression (Asymmetrical Ladder):
 * - On a Win: Increase the next bet by 1 base unit.
 * - On a Loss: Increase the next bet by 2 base units.
 * - On a Green: The progression ladder is frozen; repeat the exact same bet size.
 * * The Goal & Capping:
 * - Target is 25 units of profit (e.g., $250 on a $10 base), broken into 5 milestones of 5 units ($50).
 * - Capping: If the ladder dictates a bet larger than what is needed to hit the next milestone, 
 * cap the bet exactly at the amount needed to reach that milestone.
 * - Reset: Once a milestone is hit, the bet size immediately resets back to 1 base unit.
 * - Stop Condition: Cease betting once the final 25-unit profit target is reached or funds run out.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  // 1. Wait for at least one spin to establish a "leader" color
  if (spinHistory.length === 0) return [];

  // 2. Initialize State
  if (!state.initialized) {
    state.startingBankroll = bankroll;
    state.unit = config.betLimits.minOutside; 
    
    // Setup milestones (5 increments, each 5 units apart)
    state.milestones = [
      bankroll + (50 * state.unit),
      bankroll + (100 * state.unit),
      bankroll + (150 * state.unit),
      bankroll + (200 * state.unit),
      bankroll + (250 * state.unit)
    ];
    state.currentMilestoneIndex = 0;
    
    state.ladderValue = state.unit; // Start progression at 1 base unit
    state.lastBet = null;
    state.initialized = true;
  }

  // 3. Process previous spin result (if a bet was placed)
  if (state.lastBet && spinHistory.length > 0) {
    let lastResult = spinHistory[spinHistory.length - 1];
    let won = lastResult.winningColor === state.lastBet.type;
    let green = lastResult.winningColor === 'green';

    // Update the progression ladder based on the mathematical blueprint
    if (won) {
      state.ladderValue += state.unit;
    } else if (!green) {
      // Standard loss on an opposing color
      state.ladderValue += (2 * state.unit);
    }
    // If green, ladderValue remains unchanged

    // Check if a milestone was hit or surpassed
    while (state.currentMilestoneIndex < state.milestones.length && 
           bankroll >= state.milestones[state.currentMilestoneIndex]) {
      state.currentMilestoneIndex++;
      state.ladderValue = state.unit; // Ultimate Defense Mechanism: Reset to base unit
    }
  }

  // 4. Check Exit Conditions
  if (state.currentMilestoneIndex >= state.milestones.length) {
    // Ultimate Goal Reached - Walk Away
    return [];
  }
  if (bankroll < config.betLimits.minOutside) {
    // Bankrupt or insufficient funds for the table minimum
    return [];
  }

  // 5. Determine Target Color (Follow the Leader)
  let targetColor = null;
  // Look backward through history to find the last red or black
  for (let i = spinHistory.length - 1; i >= 0; i--) {
    if (spinHistory[i].winningColor === 'red' || spinHistory[i].winningColor === 'black') {
      targetColor = spinHistory[i].winningColor;
      break;
    }
  }

  // Edge case: If the table has only spun green since we sat down, we wait
  if (!targetColor) return [];

  // 6. Calculate Final Bet Amount (Capping Rule)
  let amountNeeded = state.milestones[state.currentMilestoneIndex] - bankroll;
  let actualBet = state.ladderValue;

  // Protect the bankroll: Cap the bet if it exceeds what's needed for the milestone
  if (actualBet > amountNeeded) {
    actualBet = amountNeeded;
  }

  // 7. Clamp to Limits
  actualBet = Math.max(actualBet, config.betLimits.minOutside); // Ensure table minimum is met
  actualBet = Math.min(actualBet, config.betLimits.max);        // Ensure table maximum isn't exceeded

  // Final safety check: Cannot bet more than current bankroll
  actualBet = Math.min(actualBet, bankroll);

  // 8. Place Bet and Save State
  state.lastBet = { type: targetColor, amount: actualBet };
  
  return [state.lastBet];
}