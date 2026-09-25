/**
 * ============================================================================
 * ROULETTE STRATEGY: DUAL DOZEN PROGRESSION SYSTEM
 * ============================================================================
 * Source:
 *   - Video URL: https://youtu.be/L9It1DOlpKc
 *   - Channel: Casino Quest / CEG Roulette Strategies
 *
 * Full Logic in Details:
 *   - Coverage: The strategy covers 2 out of the 3 Dozens (24 numbers, ~64.8% on European Roulette).
 *   - Trigger & Selection:
 *     - Tracks the dozen of the most recent winning numbers.
 *     - Bets on the two most recent dozens that appeared. If only one dozen has appeared
 *       or at the start of a session, defaults to Dozen 1 (1-12) and Dozen 2 (13-24).
 *   - Win / Loss Evaluation:
 *     - If the winning number falls in either of the two active dozens, the bet wins (pays 2:1 on that dozen).
 *       Because 1 unit is won on the winning dozen and 1 unit is lost on the other, the net return covers previous step losses plus profit.
 *     - If the winning number falls outside both dozens (the 3rd dozen or 0/00), it counts as a loss.
 *
 * Full Bet Progression:
 *   - Initial Bet: 1 base unit on each of the 2 selected dozens.
 *   - On Win: Reset the progression level back to 1 (base unit).
 *   - On Loss: Advance to the next level in the classic 2-Dozen recovery progression (multiplied by 3):
 *     - Step 1: 1 unit each (Total: 2 units)
 *     - Step 2: 3 units each (Total: 6 units)
 *     - Step 3: 9 units each (Total: 18 units)
 *     - Step 4: 27 units each (Total: 54 units)
 *     - Step 5: 81 units each (Total: 162 units)
 *     - If step exceeds bankroll or max progression limit, reset back to Step 1.
 *
 * The Goal:
 *   - Target Profit: Accumulate steady +1 base unit profit per winning round.
 *   - Stop-Loss / Reset: Resets after 5 consecutive losses or if bet limits are breached.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit for outside bets (Dozens)
    const baseUnit = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // 2. Initialize State
    if (state.progressionIndex === undefined) state.progressionIndex = 0;
    if (!state.activeDozens) state.activeDozens = [1, 2];

    const multiplierSteps = [1, 3, 9, 27, 81];

    // Helper: determine dozen (1, 2, 3) from number
    function getDozen(number) {
        if (number >= 1 && number <= 12) return 1;
        if (number >= 13 && number <= 24) return 2;
        if (number >= 25 && number <= 36) return 3;
        return 0; // 0 or 00
    }

    // 3. Process previous spin if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        const lastDozen = getDozen(lastNumber);

        const won = state.activeDozens.includes(lastDozen);

        if (won) {
            // Reset progression on win
            state.progressionIndex = 0;
        } else {
            // Advance progression on loss
            state.progressionIndex += 1;
            if (state.progressionIndex >= multiplierSteps.length) {
                state.progressionIndex = 0; // Stop-loss reset
            }
        }

        // Dynamically select the two dozens to bet on:
        // Keep the last winning dozen and pair it with the other most recent dozen
        if (lastDozen >= 1 && lastDozen <= 3) {
            const otherDozens = [1, 2, 3].filter(d => d !== lastDozen);
            // Check spin history for the most recent among the other two
            let secondDozen = otherDozens[0];
            for (let i = spinHistory.length - 2; i >= 0; i--) {
                const prevD = getDozen(spinHistory[i].winningNumber);
                if (otherDozens.includes(prevD)) {
                    secondDozen = prevD;
                    break;
                }
            }
            state.activeDozens = [lastDozen, secondDozen];
        }
    }

    // 4. Calculate Bet Amounts
    const currentMultiplier = multiplierSteps[state.progressionIndex];
    let amountPerDozen = baseUnit * currentMultiplier;

    // Clamp bet amounts according to table limits
    amountPerDozen = Math.max(amountPerDozen, config.betLimits.minOutside);
    amountPerDozen = Math.min(amountPerDozen, maxBet);

    // Ensure we do not bet more than the remaining bankroll allows
    if (amountPerDozen * 2 > bankroll) {
        amountPerDozen = Math.floor(bankroll / 2);
    }

    if (amountPerDozen < config.betLimits.minOutside) {
        return []; // Insufficient funds to meet table minimum
    }

    // 5. Return Bet Objects for the two active dozens
    return [
        { type: 'dozen', value: state.activeDozens[0], amount: amountPerDozen },
        { type: 'dozen', value: state.activeDozens[1], amount: amountPerDozen }
    ];
}