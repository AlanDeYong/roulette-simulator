/**
 * Strategy: Dozens Dashboard
 * Source: Casino Gamester (Keith) - https://youtu.be/oKcJJUr2_Rc
 *
 * Full Logic in Detail:
 * 1. History Requirement:
 *    - The strategy relies on looking back exactly 12 spins into the history
 *      (the 12th result back from current spin, i.e., spinHistory[spinHistory.length - 12]).
 *    - If there are fewer than 12 spins recorded, take a free spin (wait).
 *
 * 2. Bet Position Trigger:
 *    - Determine which dozen the 12th previous winning number belongs to:
 *      * 1 - 12  -> Bet 1st Dozen (value: 1)
 *      * 13 - 24 -> Bet 2nd Dozen (value: 2)
 *      * 25 - 36 -> Bet 3rd Dozen (value: 3)
 *      * 0 or 00 (Green) -> Take a free spin (do not bet) and wait for the next spin.
 *
 * 3. Bet Progression:
 *    - Uses a non-Martingale, 8-step unit progression designed for 2:1 dozen payouts:
 *      [1, 1, 2, 3, 4, 6, 9, 14] units.
 *    - Win: Resets progression index back to step 1 (0).
 *    - Loss: Advances to the next step in the progression (up to step 8).
 *    - Cycle Completion / Loss of step 8: Resets progression back to step 1.
 *    - Free spins (zeros): The progression level is frozen until an active bet is placed.
 *
 * 4. Goal & Bankroll Management:
 *    - Target Profit: +25% of starting bankroll (e.g., +$5 on a $20 session bankroll).
 *    - Stop-Loss: Complete 8-step progression exhaustion or insufficient bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.progressionSteps = [1, 1, 2, 3, 4, 6, 9, 14];
        state.stepIndex = 0;
        state.lastBetDozen = null;
        state.lastBetAmount = 0;
        state.initialBankroll = bankroll;
        state.targetProfit = bankroll * 0.25; // 25% profit target
        state.stopTargetReached = false;
        state.initialized = true;
    }

    // 2. Check Target Profit Goal
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        state.stopTargetReached = true;
        return []; // Target reached, cash out / stop betting
    }

    // 3. Process previous bet outcome if one was active
    if (spinHistory && spinHistory.length > 0 && state.lastBetDozen !== null) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        let won = false;
        if (state.lastBetDozen === 1 && lastNum >= 1 && lastNum <= 12) won = true;
        else if (state.lastBetDozen === 2 && lastNum >= 13 && lastNum <= 24) won = true;
        else if (state.lastBetDozen === 3 && lastNum >= 25 && lastNum <= 36) won = true;

        if (won) {
            // Reset to beginning on win
            state.stepIndex = 0;
        } else {
            // Move to next step on loss
            state.stepIndex++;
            if (state.stepIndex >= state.progressionSteps.length) {
                state.stepIndex = 0; // Reset after complete 8-step run
            }
        }

        // Reset tracking
        state.lastBetDozen = null;
        state.lastBetAmount = 0;
    }

    // 4. Ensure at least 12 spins exist to inspect the 12th oldest result
    if (!spinHistory || spinHistory.length < 12) {
        return [];
    }

    // 5. Identify the 12th result back
    const targetSpin = spinHistory[spinHistory.length - 12];
    const targetNumber = targetSpin.winningNumber;

    // Check for Green (0 or 00)
    if (targetNumber === 0 || targetNumber === '0' || targetNumber === '00') {
        return []; // Free spin: wait for next result without advancing progression
    }

    // Map number to dozen
    let targetDozen = null;
    if (targetNumber >= 1 && targetNumber <= 12) {
        targetDozen = 1;
    } else if (targetNumber >= 13 && targetNumber <= 24) {
        targetDozen = 2;
    } else if (targetNumber >= 25 && targetNumber <= 36) {
        targetDozen = 3;
    }

    if (!targetDozen) {
        return [];
    }

    // 6. Calculate Bet Amount based on limits & progression
    const baseUnit = config.betLimits.minOutside;
    const unitMultiplier = state.progressionSteps[state.stepIndex];
    let betAmount = baseUnit * unitMultiplier;

    // Respect limits
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Bankroll check
    if (bankroll < betAmount) {
        return [];
    }

    // 7. Store state for next evaluation
    state.lastBetDozen = targetDozen;
    state.lastBetAmount = betAmount;

    // 8. Return Dozen Bet
    return [
        {
            type: 'dozen',
            value: targetDozen,
            amount: betAmount
        }
    ];
}