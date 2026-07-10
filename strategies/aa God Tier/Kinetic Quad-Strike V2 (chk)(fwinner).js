/**
 * Strategy Name: Kinetic Quad-Strike V3 (Follow Last Dozen)
 * 
 * The Full Logic:
 * The strategy targets a single dozen at a time by placing four specific Corner bets within that dozen. 
 * The 4 corners are placed so that they cover all 12 numbers in the dozen. Furthermore, the overlap 
 * causes the four numbers in the middle column of that dozen to become "jackpot numbers" (covered by 
 * two corner bets simultaneously). If a jackpot number hits, you win on two corners for a massive payout.
 * The strategy waits for the first spin to determine the initial dozen. After every spin, it shifts 
 * the target to follow the dozen that just hit.
 * 
 * The Full Bet Progression:
 * The progression uses a "Gear Shift Sequence": 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, etc.
 * - On a loss: Advance one step in the gear shift sequence.
 * - On a win: Check if the current bankroll is higher than the bankroll at the start of the cycle.
 *   - If in profit: Reset the gear shift sequence to step 1 and save the new bankroll high-water mark.
 *   - If NOT in profit (recovering from a deficit): Stay at the current multiplier step.
 * 
 * The Goal:
 * To systematically suffocate a dozen and catch double-paying "jackpot" numbers, accumulating steady 
 * cyclical profits until a session target (the author targets +20% of bankroll) is achieved.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Wait for at least one spin to determine the first dozen
    if (spinHistory.length === 0) return [];

    // 1. Determine base unit and increment constraints
    const baseUnit = config.betLimits.min; 
    const increment = config.incrementMode === 'base' ? baseUnit : config.minIncrementalBet;

    // Helper to map a number to its dozen
    function getDozen(num) {
        if (num === 0 || num === '00' || num === -1) return 0;
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    }

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    const lastDozen = getDozen(lastNum);

    // 2. Initialize or Update State
    if (state.step === undefined) {
        state.step = 1;
        state.cycleStartBankroll = bankroll;
        // Default to dozen 1 if the very first spin was a zero
        state.targetDozen = lastDozen !== 0 ? lastDozen : 1; 
    } else {
        const hitTarget = lastDozen === state.targetDozen;

        if (hitTarget) {
            if (bankroll > state.cycleStartBankroll) {
                // Cycle profit achieved - Reset Progression
                state.step = 1;
                state.cycleStartBankroll = bankroll;
            } 
            // If hitTarget but NOT in profit, we stay at the current step
        } else {
            // Loss - Shift gears up
            state.step++;
        }

        // Shift the target dozen to follow the one that just hit
        if (lastDozen !== 0) {
            state.targetDozen = lastDozen;
        }
    }

    // 3. Calculate Bet Amount based on Gear Shift Sequence
    // step: 1, 2, 3, 4, 5, 6 -> multiplier: 1, 1, 2, 2, 3, 3
    const multiplier = Math.ceil(state.step / 2);
    let amount = baseUnit + (multiplier - 1) * increment;

    // Clamp to limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 4. Define Corner Bets for each Dozen
    // The values are the top-left numbers of the 4-number corner blocks.
    const cornerTargets = {
        1: [1, 2, 7, 8],      // Covers 1-12, overlapping on 2, 5, 8, 11
        2: [13, 14, 19, 20],  // Covers 13-24, overlapping on 14, 17, 20, 23
        3: [25, 26, 31, 32]   // Covers 25-36, overlapping on 26, 29, 32, 35
    };

    const targetCorners = cornerTargets[state.targetDozen];
    const bets = [];

    // 5. Place Bets
    for (let i = 0; i < targetCorners.length; i++) {
        bets.push({ type: 'corner', value: targetCorners[i], amount: amount });
    }

    return bets;
}