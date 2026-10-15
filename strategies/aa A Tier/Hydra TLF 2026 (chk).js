/**
 * Strategy: The Hydra Strategy (with Helix Progression & Phantom Head Decapitation)
 * Source: https://youtu.be/M6fOC3-CMGI (Channel: The Lucky Felt - Todd Hoover)
 *
 * Full Logic in Detail:
 * - The strategy exclusively bets on Double Streets (6-number line bets: 1, 7, 13, 19, 25, 31).
 * - Phase 1 (Expansion): Starts with 1 randomly selected Double Street and expands by randomly adding
 *   1 new unbet Double Street on each loss up to 4 Double Streets (covering 24 numbers / two-thirds of the board).
 *   Selected Double Streets are maintained throughout the progression until a reset occurs.
 * - Phase 2 (Regression & Decapitation): If Step 4 loses, instead of doubling, the strategy
 *   regresses the bet per Double Street to 7 units (Step 5) and then 5 units (Step 6).
 *   Whenever a heavy Double Street hits during Phase 2, it is "decapitated": the heavy bet
 *   is removed and replaced with a 1-unit "Phantom Head" bet while the remaining unhit heavy
 *   Double Streets stay active.
 *
 * Full Bet Progression in Detail (let U = config.betLimits.min):
 * - Step 1: 1 Double Street @ 1U (Total: 1U). Win -> Reset to Step 1. Loss -> Step 2.
 * - Step 2: 2 Double Streets @ 2U each (Total: 4U). Win -> Reset to Step 1. Loss -> Step 3.
 * - Step 3: 3 Double Streets @ 4U each (Total: 12U). Win -> Reset to Step 1. Loss -> Step 4.
 * - Step 4: 4 Double Streets @ 8U each (Total: 32U). Win -> Reset to Step 1 (accepts -1U net on cycle). Loss -> Step 5.
 * - Step 5 (Phase 2 - 7U Level): All 4 Double Streets @ 7U each (Total: 28U).
 *   - Hit on a 7U street: Decapitate that street to a 1U Phantom Head. Stay on Step 5 for remaining heavy streets.
 *     If all 4 streets are decapitated (or cycle returns to net profit), reset to Step 1.
 *   - Miss (or hit only on a 1U Phantom Head): Regress remaining heavy streets to Step 6.
 * - Step 6 (Phase 2 - 5U Level): Remaining heavy Double Streets @ 5U each + any 1U Phantom Heads.
 *   - Hit on a 5U street: Decapitate that street to a 1U Phantom Head. Stay on Step 6 for remaining heavy streets.
 *     If all 4 streets are decapitated (or cycle returns to net profit), reset to Step 1.
 *   - Miss (or hit only on a 1U Phantom Head): Cycle ends ("Never chase a dead Hydra"). Reset to Step 1.
 *
 * The Goal:
 * - Designed to grind 20% session profit while capping maximum exposure at 32 units on any spin.
 */
function bet(spinHistory, bankroll, config, state, utils) {
  const unit = config.betLimits.min;
  const allLines = [1, 7, 13, 19, 25, 31];

  // Helper: check if a winning number falls within a Double Street (line)
  function isLineHit(lineStart, winningNumber) {
    return winningNumber >= lineStart && winningNumber <= lineStart + 5;
  }

  // Helper: randomly pick next available Double Street not yet in active list
  function pickNextLine(activeLines) {
    const candidates = allLines.filter(l => !activeLines.includes(l));
    if (candidates.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
  }

  // Helper: reset state to Step 1
  function resetCycle() {
    state.step = 1;
    const firstLine = pickNextLine([]);
    state.activeLines = [firstLine];
    state.phantomLines = [];
    state.cycleStartBankroll = bankroll;
  }

  // Initialize state on first spin
  if (!state.initialized) {
    state.initialized = true;
    resetCycle();
  } else if (spinHistory.length > 0) {
    const lastSpin = spinHistory[spinHistory.length - 1];
    const winNum = lastSpin.winningNumber;

    if (state.step <= 4) {
      // Phase 1 evaluation: check if any active line hit
      const hit = state.activeLines.some(line => isLineHit(line, winNum));
      if (hit) {
        // Win on Steps 1-4 resets the cycle immediately
        resetCycle();
      } else {
        // Loss on Steps 1-4
        if (state.step < 4) {
          state.step += 1;
          const nextLine = pickNextLine(state.activeLines);
          if (nextLine !== undefined) {
            state.activeLines.push(nextLine);
          }
        } else {
          // Lost Step 4 -> Transition to Phase 2 (Step 5: 7-unit regression)
          state.step = 5;
          state.phantomLines = [];
        }
      }
    } else if (state.step === 5 || state.step === 6) {
      // Phase 2 evaluation: distinguish between hitting a heavy line vs missing / hitting phantom
      const hitHeavyIndex = state.activeLines.findIndex(line => isLineHit(line, winNum));

      if (hitHeavyIndex !== -1) {
        // Decapitate the winning heavy street: move it to phantomLines (1 unit)
        const decapitatedLine = state.activeLines.splice(hitHeavyIndex, 1)[0];
        state.phantomLines.push(decapitatedLine);

        // If all heavy streets have been decapitated or cycle recovered profit, reset to Step 1
        if (state.activeLines.length === 0 || bankroll >= state.cycleStartBankroll) {
          resetCycle();
        }
      } else {
        // Missed heavy streets (either total miss or only hit a 1-unit Phantom Head)
        if (state.step === 5) {
          // Regress from 7-unit level to 5-unit level
          state.step = 6;
        } else {
          // Lost at Step 6 -> "Never chase a dead Hydra", reset to Step 1
          resetCycle();
        }
      }
    }
  }

  // Determine unit multiplier for active heavy streets based on current step
  const stepMultipliers = {
    1: 1, // 1 line @ 1U = 1U
    2: 2, // 2 lines @ 2U = 4U
    3: 4, // 3 lines @ 4U = 12U
    4: 8, // 4 lines @ 8U = 32U
    5: 7, // Phase 2 regression level 1: 7U per heavy line
    6: 5  // Phase 2 regression level 2: 5U per heavy line
  };

  const heavyMultiplier = stepMultipliers[state.step] || 1;
  let heavyAmount = unit * heavyMultiplier;
  heavyAmount = Math.max(heavyAmount, config.betLimits.min);
  heavyAmount = Math.min(heavyAmount, config.betLimits.max);

  let phantomAmount = unit * 1;
  phantomAmount = Math.max(phantomAmount, config.betLimits.min);
  phantomAmount = Math.min(phantomAmount, config.betLimits.max);

  const bets = [];
  let totalBetCost = 0;

  // Place heavy Double Street bets
  for (const line of state.activeLines) {
    bets.push({ type: 'line', value: line, amount: heavyAmount });
    totalBetCost += heavyAmount;
  }

  // Place 1-unit Phantom Head bets (active during Phase 2)
  for (const pLine of state.phantomLines) {
    bets.push({ type: 'line', value: pLine, amount: phantomAmount });
    totalBetCost += phantomAmount;
  }

  // Verify bankroll can cover the total bet
  if (totalBetCost > bankroll) {
    return [];
  }

  return bets;
}