/**
 * -------------------------------------------------------------------------------------
 * ROULETTE STRATEGY: The Libra Equilibrium (24-Number Perfectly Balanced System)
 * -------------------------------------------------------------------------------------
 * Source:
 *   - YouTube Channel: The Lucky Felt (Todd Hoover)
 *   - Video URL: https://youtu.be/3KbAlqd59HI
 *   - Video Title: "The Perfectly Balanced 24-Number Roulette System"
 *
 * Strategy Overview & Board Layout:
 *   This strategy covers an unbroken block of 24 numbers spanning from 7 through 30
 *   (~64% board coverage), creating identical flat returns regardless of which winning
 *   pocket hits:
 *     1. Left Scale:  1 unit on Line (Double Street) 7-12   [Pays 5:1]
 *     2. Center:      2 units on 2nd Dozen (Numbers 13-24)  [Pays 2:1]
 *     3. Right Scale: 1 unit on Line (Double Street) 25-30  [Pays 5:1]
 *   Total Base Bet: 4 units (1 + 2 + 1).
 *   Any win across the 24 numbers returns exactly 6 units, securing a net +2 units profit.
 *
 * Progression Logic ("Harmonious Escalation" with Todd's Safety Modification):
 *   - Level 1 (1x multiplier - 4 units total):
 *       Play a 2-spin cycle at base level.
 *       If both spins win, reset cycle and bank steady profit (+2 units per hit).
 *       If a loss occurs during the 2 spins at Level 1, advance to Level 2.
 *   - Level 2 (3x multiplier - 12 units total: 3 units Line 7, 6 units Dozen 2, 3 units Line 25):
 *       Play 1 spin.
 *       If Win: Immediately recover previous losses and reset back to Level 1.
 *       If Loss: Advance to Level 3.
 *   - Level 3 (9x multiplier - 36 units total: 9 units Line 7, 18 units Dozen 2, 9 units Line 25):
 *       Play 1 spin (only reached if Level 2 misses).
 *       If Win: Recovers losses; reset back to Level 1.
 *       If Loss: Hard stop-loss for the cycle; accept the loss and reset to Level 1.
 *
 * Goal / Session Stop:
 *   - Session Profit Target: +400 units (or 20% of bankroll).
 *   - Stop Loss: If bankroll falls below the minimum required for the next bet.
 * -------------------------------------------------------------------------------------
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.level = 1;         // 1 = 1x (Base), 2 = 3x (Triple), 3 = 9x (Triple again)
        state.level1Spins = 0;   // Count spins played at Level 1 (up to 2)
        state.level1Loss = false;// Track if any loss occurred during Level 1 cycle
        state.targetUnits = 4000;  // Target +40 base units (e.g. +$400 with $10 unit)
    }

    // 2. Determine Base Unit respecting inside & outside table limits
    // Line bet requires at least config.betLimits.min
    // Dozen bet (2 units) requires at least config.betLimits.minOutside
    const minUnitInside = config.betLimits.min || 1;
    const minUnitOutside = Math.ceil((config.betLimits.minOutside || 5) / 2);
    const baseUnit = Math.max(minUnitInside, minUnitOutside);

    // 3. Process Previous Spin Result (if history exists)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        const isWin = (winNum >= 7 && winNum <= 30);

        if (state.level === 1) {
            state.level1Spins++;
            if (!isWin) {
                state.level1Loss = true;
            }

            // Completed 2-spin block at Level 1
            if (state.level1Spins >= 2) {
                if (state.level1Loss) {
                    // Escalate to Level 2 (Triple)
                    state.level = 2;
                } else {
                    // Won both spins; stay/reset at Level 1
                    state.level = 1;
                }
                state.level1Spins = 0;
                state.level1Loss = false;
            }
        } else if (state.level === 2) {
            if (isWin) {
                // Recovered losses on Level 2; reset to Level 1
                state.level = 1;
                state.level1Spins = 0;
                state.level1Loss = false;
            } else {
                // Missed Level 2; take the safety step to Level 3
                state.level = 3;
            }
        } else if (state.level === 3) {
            // Level 3 is played for exactly 1 spin: win or loss, cycle resets
            state.level = 1;
            state.level1Spins = 0;
            state.level1Loss = false;
        }
    }

    // 4. Session Target / Stop Condition Check
    const targetProfit = state.targetUnits * (baseUnit * 4);
    if (bankroll >= state.initialBankroll + targetProfit) {
        return []; // Target reached, session complete
    }

    // 5. Calculate Progression Multiplier
    let multiplier = 1;
    if (state.level === 2) multiplier = 3;
    if (state.level === 3) multiplier = 9;

    // Unit distribution: 1u on Line 7, 2u on Dozen 2, 1u on Line 25
    let line1Amount = baseUnit * multiplier;
    let dozenAmount = baseUnit * 2 * multiplier;
    let line2Amount = baseUnit * multiplier;

    // 6. Clamp Bet Amounts to Table Limits
    const maxLimit = config.betLimits.max || 500;

    line1Amount = Math.max(line1Amount, config.betLimits.min || 1);
    line1Amount = Math.min(line1Amount, maxLimit);

    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside || 5);
    dozenAmount = Math.min(dozenAmount, maxLimit);

    line2Amount = Math.max(line2Amount, config.betLimits.min || 1);
    line2Amount = Math.min(line2Amount, maxLimit);

    const totalRequired = line1Amount + dozenAmount + line2Amount;
    if (bankroll < totalRequired) {
        return []; // Insufficient bankroll to place the required progression
    }

    // 7. Return Bet Configuration
    return [
        { type: 'line', value: 7, amount: line1Amount },      // Covers 7-12 (Double Street)
        { type: 'dozen', value: 2, amount: dozenAmount },     // Covers 13-24 (2nd Dozen)
        { type: 'line', value: 25, amount: line2Amount }      // Covers 25-30 (Double Street)
    ];
}