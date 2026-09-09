/**
 * 24 + 8 Roulette Strategy
 *
 * Source:
 *   - Video: https://youtu.be/o69wqNWBoZw
 *   - Channel: CEG Dealer School
 *
 * Full Logic:
 *   - Covers 32 out of 37 (European) or 38 (American) numbers on every spin (~84-86% table coverage).
 *   - Bets on two dozens (24 numbers) and 8 straight-up numbers within the remaining unbet dozen (8 numbers).
 *   - Trigger/Selection:
 *     - Identifies the last winning dozen. The two dozens bet are either the two most recent distinct dozens,
 *       or Dozen 1 & Dozen 2 by default.
 *     - In the remaining 3rd dozen (which contains 12 numbers), 8 individual straight-up bets are placed
 *       (leaving only 4 numbers in that dozen + 0/00 uncovered).
 *   - Payout Mechanics:
 *     - Ratio: 10 units on each of the two Dozens, and 1 unit on each of the 8 straight-up numbers.
 *     - If a Dozen hits: pays 2:1 on 10 units -> returns 30 units against a 28-unit total bet (Net: +2 units).
 *     - If a Straight-up hits: pays 35:1 on 1 unit -> returns 36 units against a 28-unit total bet (Net: +8 units).
 *     - Uncovered numbers (miss): 4 numbers in the 3rd dozen plus 0 (and 00 in American roulette).
 *
 * Bet Progression:
 *   - On Win: Maintains current baseline or resets to initial base level if past losses have been recovered.
 *   - On Loss: Increases the multiplier by 1 step (or doubles depending on limits) to recover the 28-unit deficit,
 *     clamping strictly to `config.betLimits.max`.
 *
 * Goal:
 *   - Steady, high-probability bankroll accumulation with a session target profit of +15% of starting bankroll,
 *     with a stop-loss set at 50% of the initial bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.startingBankroll = bankroll;
        state.multiplier = 1;
        state.targetProfit = state.startingBankroll * 0.15;
        state.stopLoss = state.startingBankroll * 0.50;
    }

    // 2. Evaluate Target & Stop-loss conditions
    const currentProfit = bankroll - state.startingBankroll;
    if (currentProfit >= state.targetProfit || bankroll <= state.stopLoss) {
        return []; // Stop session when reaching profit target or stop loss
    }

    // 3. Process Previous Result to Adjust Multiplier
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Check if last spin was a win on our previous bets
        if (state.lastBets && state.lastBets.length > 0) {
            let won = false;
            for (const b of state.lastBets) {
                if (b.type === 'dozen') {
                    const inD1 = b.value === 1 && lastNum >= 1 && lastNum <= 12;
                    const inD2 = b.value === 2 && lastNum >= 13 && lastNum <= 24;
                    const inD3 = b.value === 3 && lastNum >= 25 && lastNum <= 36;
                    if (inD1 || inD2 || inD3) {
                        won = true;
                        break;
                    }
                } else if (b.type === 'number' && b.value === lastNum) {
                    won = true;
                    break;
                }
            }

            if (won) {
                // If in net profit for the cycle, reset to base multiplier
                if (currentProfit >= 0) {
                    state.multiplier = 1;
                }
            } else {
                // Lost spin: increment progression level
                state.multiplier += 1;
            }
        }
    }

    // 4. Determine Active Dozens & Remaining Numbers
    let d1 = 1;
    let d2 = 2;
    let unbetDozen = 3;

    if (spinHistory && spinHistory.length > 0) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        if (lastNum >= 25 && lastNum <= 36) {
            d1 = 2;
            d2 = 3;
            unbetDozen = 1;
        } else if (lastNum >= 13 && lastNum <= 24) {
            d1 = 1;
            d2 = 2;
            unbetDozen = 3;
        } else if (lastNum >= 1 && lastNum <= 12) {
            d1 = 1;
            d2 = 3;
            unbetDozen = 2;
        }
    }

    // Numbers in the unbet dozen (12 numbers total)
    const dozenStart = (unbetDozen - 1) * 12 + 1;
    const dozenNumbers = [];
    for (let i = 0; i < 12; i++) {
        dozenNumbers.push(dozenStart + i);
    }
    // Pick 8 numbers to cover straight up
    const selectedStraightUps = dozenNumbers.slice(0, 8);

    // 5. Calculate Bet Amounts with Limit Constraints
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // Standard 10:1 ratio for Dozen vs Straight-up
    let unitInside = minInside * state.multiplier;
    let unitDozen = Math.max(minOutside, unitInside * 10);

    // Clamp to table limits
    unitInside = Math.min(Math.max(unitInside, minInside), maxBet);
    unitDozen = Math.min(Math.max(unitDozen, minOutside), maxBet);

    // Total required for this spin: 2 dozens + 8 straight-ups
    const totalRequired = (unitDozen * 2) + (unitInside * 8);
    if (bankroll < totalRequired) {
        return []; // Insufficient bankroll to place full coverage
    }

    // 6. Build Bet Array
    const bets = [
        { type: 'dozen', value: d1, amount: unitDozen },
        { type: 'dozen', value: d2, amount: unitDozen }
    ];

    for (const num of selectedStraightUps) {
        bets.push({ type: 'number', value: num, amount: unitInside });
    }

    // Save current bets into state for next round evaluation
    state.lastBets = bets;

    return bets;
}