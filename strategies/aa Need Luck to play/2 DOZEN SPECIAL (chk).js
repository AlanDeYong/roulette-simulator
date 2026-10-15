/**
 * ============================================================================
 * Strategy: TWO DOZEN SPECIAL
 * Source: https://youtu.be/4vdHp7TEOcs
 * Channel: Roulette Strategy Lab (Created by Will Vegas)
 * ============================================================================
 * 
 * THE FULL LOGIC IN DETAIL:
 * -------------------------
 * The "Two Dozen Special" is a hybrid coverage strategy that pairs two dozen
 * bets with three split bets inside the second dozen to create a high-frequency
 * winning system with "jackpot" overlays:
 * 
 * 1. Second Dozen Anchor:
 *    - Always bets on the 2nd Dozen (13-24).
 * 2. Follow-the-Leader Outer Dozen:
 *    - Simultaneously bets either the 1st Dozen (1-12) or the 3rd Dozen (25-36).
 *    - Starts on the 1st Dozen.
 *    - If a loss occurs because the ball landed in the opposite uncovered outer
 *      dozen, the bet moves to that winning dozen ("Follow the Leader").
 * 3. Middle Dozen Splits:
 *    - Places three vertical split bets within the 2nd Dozen:
 *      Split [15, 18], Split [17, 20], and Split [19, 22].
 *    - When the ball lands on one of these splits, the player wins both the
 *      dozen payout (2:1) and the split payout (17:1), producing a "jackpot" win.
 * 
 * THE FULL BET PROGRESSION IN DETAIL:
 * -----------------------------------
 * - Base Unit Ratio:
 *   - Outer Dozen (1st or 3rd): 6 units
 *   - Anchor Dozen (2nd Dozen): 8 units
 *   - 3 Split Bets: 1 unit each (3 units total)
 *   - Total Base Bet: 17 units
 * 
 * - After a Loss:
 *   - Double all bets (Martingale progression: 1x -> 2x -> 4x -> 8x -> 16x...).
 *   - If the winning number was in the non-covered outer dozen, switch the outer
 *     dozen bet to match the winning dozen (Dozen 1 or Dozen 3).
 * 
 * - After a Win:
 *   - If the cycle profit is recovered (current bankroll >= cycle starting bankroll),
 *     reset the progression multiplier back to 1.
 *   - If still in a net deficit for the current recovery cycle, repeat the current
 *     bet size until cycle recovery is achieved.
 * 
 * THE GOAL:
 * ---------
 * - Target Profit: +50 units (Will Vegas walk-away threshold: $50 on $1 base units).
 * - Stop Condition: Stop or lock in profit when target profit is achieved or bankroll
 *   cannot cover the next progression step.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.cycleStartBankroll = bankroll;
        state.progressionMultiplier = 1;
        state.activeOuterDozen = 1; // Starts on 1st Dozen (1), alternates with 3rd Dozen (3)
        state.targetProfit = 50000;    // Standard $50 target highlighted by Will Vegas / RSL
    }

    // 2. Check Win Target
    const sessionProfit = bankroll - state.initialBankroll;
    if (sessionProfit >= state.targetProfit) {
        // Target achieved; lock in profit and cease betting
        return [];
    }

    // 3. Process Previous Spin Result (if any)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Determine which dozen the winning number landed in
        let winningDozen = 0;
        if (num >= 1 && num <= 12) winningDozen = 1;
        else if (num >= 13 && num <= 24) winningDozen = 2;
        else if (num >= 25 && num <= 36) winningDozen = 3;

        // Check if the previous spin was a net win for the cycle
        if (bankroll >= state.cycleStartBankroll) {
            // Cycle fully recovered / won: reset progression
            state.progressionMultiplier = 1;
            state.cycleStartBankroll = bankroll;
        } else {
            // If the spin was an outright loss (hit uncovered dozen or zero)
            const wasUncoveredDozen = (winningDozen === 1 || winningDozen === 3) && winningDozen !== state.activeOuterDozen;
            const isZero = num === 0 || num === '00';

            if (wasUncoveredDozen || isZero) {
                // Double progression on loss
                state.progressionMultiplier *= 2;

                // Follow the leader: shift outer dozen to the one that just hit
                if (wasUncoveredDozen) {
                    state.activeOuterDozen = winningDozen;
                }
            }
            // If it hit 2nd dozen or covered outer dozen but net bankroll is still below cycle start,
            // maintain the current progression level (rebet and spin) to continue clawing back.
        }
    }

    // 4. Calculate Base Unit Scalers respecting Table Limits
    // Minimum base unit for splits is config.betLimits.min
    // Minimum base unit for dozens must satisfy 6 * unit >= minOutside and 8 * unit >= minOutside
    const minInside = (config.betLimits && config.betLimits.min) ? config.betLimits.min : 1;
    const minOutside = (config.betLimits && config.betLimits.minOutside) ? config.betLimits.minOutside : 5;
    const maxBet = (config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;

    // Unit size calculation ensuring dozen bets at 1x meet minimum outside bet
    const splitUnit = minInside;
    const dozenUnit = Math.max(1, Math.ceil(minOutside / 6));

    // Calculate raw amounts based on progression multiplier
    let outerDozenAmount = 6 * dozenUnit * state.progressionMultiplier;
    let anchorDozenAmount = 8 * dozenUnit * state.progressionMultiplier;
    let splitAmount = 1 * splitUnit * state.progressionMultiplier;

    // 5. Clamp to Table Limits
    outerDozenAmount = Math.max(minOutside, Math.min(outerDozenAmount, maxBet));
    anchorDozenAmount = Math.max(minOutside, Math.min(anchorDozenAmount, maxBet));
    splitAmount = Math.max(minInside, Math.min(splitAmount, maxBet));

    // Total required for this bet setup
    const totalRequired = outerDozenAmount + anchorDozenAmount + (splitAmount * 3);
    if (bankroll < totalRequired) {
        // Insufficient bankroll to place the full progression step
        return [];
    }

    // 6. Return Bet Array
    return [
        // Alternating Follow-The-Leader Outer Dozen (Dozen 1 or 3)
        {
            type: 'dozen',
            value: state.activeOuterDozen,
            amount: outerDozenAmount
        },
        // Anchor 2nd Dozen
        {
            type: 'dozen',
            value: 2,
            amount: anchorDozenAmount
        },
        // Three Middle-Dozen Split Bets
        {
            type: 'split',
            value: [15, 18],
            amount: splitAmount
        },
        {
            type: 'split',
            value: [17, 20],
            amount: splitAmount
        },
        {
            type: 'split',
            value: [19, 22],
            amount: splitAmount
        }
    ];
}