/**
 * Strategy Name: Kinetic Quad-Strike V5 (Hottest Dozen Tracker)
 * 
 * The Full Logic:
 * The strategy targets a single dozen at a time by placing four specific Corner bets within that dozen. 
 * It waits for a 37-spin window to populate, then tracks the frequencies of the dozens within that 
 * rolling window. Before every bet, it targets the "hottest" dozen (highest frequency) and avoids 
 * the coldest.
 * 
 * The Full Bet Progression:
 * The progression uses a "Gear Shift Sequence": 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, etc.
 * - On a loss: Advance one step in the gear shift sequence.
 * - On a win: Check if the current bankroll is higher than the bankroll at the start of the cycle.
 *   - If in profit: Reset the gear shift sequence to step 1 and save the new bankroll high-water mark.
 *   - If NOT in profit (recovering from a deficit): Stay at the current multiplier step.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for at least 37 spins to establish the tracking window
    const windowSize = 37;
    if (spinHistory.length < windowSize) {
        return [];
    }

    // Helper to map a number to its dozen
    function getDozen(num) {
        if (num === 0 || num === '00' || num === -1) return 0;
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    }

    // 2. Track Hot/Cold Dozens over the last 37 spins
    const dozenCounts = { 1: 0, 2: 0, 3: 0 };
    const startIndex = spinHistory.length - windowSize;
    
    for (let i = startIndex; i < spinHistory.length; i++) {
        const d = getDozen(spinHistory[i].winningNumber);
        if (d !== 0) {
            dozenCounts[d]++;
        }
    }

    // Find the hottest dozen
    let hottestDozen = 1;
    let maxCount = -1;
    
    for (let d = 1; d <= 3; d++) {
        if (dozenCounts[d] > maxCount) {
            maxCount = dozenCounts[d];
            hottestDozen = d;
        }
    }

    // 3. Determine base unit and increment constraints
    const baseUnit = config.betLimits.min; 
    const increment = config.incrementMode === 'base' ? baseUnit : config.minIncrementalBet;

    // 4. Initialize or Update State
    if (state.step === undefined) {
        state.step = 1;
        state.cycleStartBankroll = bankroll;
        state.targetDozen = hottestDozen;
    } else {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDozen = getDozen(lastNum);

        // Check if our PREVIOUS targeted dozen hit
        const hitTarget = (lastDozen === state.targetDozen);

        if (hitTarget) {
            if (bankroll > state.cycleStartBankroll) {
                // Cycle profit achieved - Reset Progression
                state.step = 1;
                state.cycleStartBankroll = bankroll;
            } 
            // If hitTarget but NOT in profit, stay at the current step
        } else {
            // Loss - Shift gears up
            state.step++;
        }

        // Shift target for the CURRENT spin to the newly calculated hottest dozen
        state.targetDozen = hottestDozen;
    }

    // 5. Calculate Bet Amount based on Gear Shift Sequence
    // step: 1, 2, 3, 4, 5, 6 -> multiplier: 1, 1, 2, 2, 3, 3
    const multiplier = Math.ceil(state.step / 2);
    let amount = baseUnit + (multiplier - 1) * increment;

    // Clamp to limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 6. Define Corner Bets for each Dozen
    const cornerTargets = {
        1: [1, 2, 7, 8],      // Covers 1-12, overlapping on 2, 5, 8, 11
        2: [13, 14, 19, 20],  // Covers 13-24, overlapping on 14, 17, 20, 23
        3: [25, 26, 31, 32]   // Covers 25-36, overlapping on 26, 29, 32, 35
    };

    const targetCorners = cornerTargets[state.targetDozen];
    const bets = [];

    // 7. Place Bets
    for (let i = 0; i < targetCorners.length; i++) {
        bets.push({ type: 'corner', value: targetCorners[i], amount: amount });
    }

    return bets;
}