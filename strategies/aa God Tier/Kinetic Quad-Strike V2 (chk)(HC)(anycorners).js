/**
 * Strategy Name: Kinetic Quad-Strike V6 (Floating Pattern Tracker)
 * 
 * The Full Logic:
 * The strategy uses the same core betting pattern: four specific Corner bets covering a 12-number block
 * (a 4x3 section of the board), creating four "jackpot" numbers in the middle overlap.
 * However, the pattern is no longer confined to static dozens. It can slide up and down the felt, 
 * starting at any row (1, 4, 7, 10, 13, 16, 19, 22, or 25). 
 * It tracks these 9 possible 12-number blocks over a 37-spin window and places the corner bets on 
 * the "hottest" block before every spin.
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

    // 2. Track Hot/Cold Blocks over the last 37 spins
    // The 9 possible starting numbers for a 12-number block (4 consecutive rows)
    const startRows = [1, 4, 7, 10, 13, 16, 19, 22, 25];
    const blockCounts = {};
    startRows.forEach(r => blockCounts[r] = 0);

    const startIndex = spinHistory.length - windowSize;
    for (let i = startIndex; i < spinHistory.length; i++) {
        const num = spinHistory[i].winningNumber;
        if (num === 0 || num === '00' || num === -1) continue;
        
        // A number contributes to any 12-number block that contains it
        startRows.forEach(r => {
            if (num >= r && num <= r + 11) {
                blockCounts[r]++;
            }
        });
    }

    // Find the hottest block (start row)
    let hottestBlock = 1;
    let maxCount = -1;
    startRows.forEach(r => {
        if (blockCounts[r] > maxCount) {
            maxCount = blockCounts[r];
            hottestBlock = r;
        }
    });

    // 3. Determine base unit and increment constraints
    const baseUnit = config.betLimits.min; 
    const increment = config.incrementMode === 'base' ? baseUnit : config.minIncrementalBet;

    // 4. Initialize or Update State
    if (state.step === undefined) {
        state.step = 1;
        state.cycleStartBankroll = bankroll;
        state.targetBlock = hottestBlock;
    } else {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Check if our PREVIOUS targeted block hit (covers 12 numbers from the start row)
        const hitTarget = (lastNum >= state.targetBlock && lastNum <= state.targetBlock + 11 && lastNum !== 0);

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

        // Shift target for the CURRENT spin to the newly calculated hottest block
        state.targetBlock = hottestBlock;
    }

    // 5. Calculate Bet Amount based on Gear Shift Sequence
    // step: 1, 2, 3, 4, 5, 6 -> multiplier: 1, 1, 2, 2, 3, 3
    const multiplier = Math.ceil(state.step / 2);
    let amount = baseUnit + (multiplier - 1) * increment;

    // Clamp to limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 6. Define Corner Bets for the targeted sliding block
    // t is the starting number of the 12-number block. 
    // The corners required to cover this 4x3 block always follow the same pattern:
    const t = state.targetBlock;
    const targetCorners = [t, t + 1, t + 6, t + 7];
    
    const bets = [];

    // 7. Place Bets
    for (let i = 0; i < targetCorners.length; i++) {
        bets.push({ type: 'corner', value: targetCorners[i], amount: amount });
    }

    return bets;
}