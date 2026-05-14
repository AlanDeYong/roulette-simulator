/**
 * HOT POCKETS ROULETTE STRATEGY
 * * Source: Casino Matchmaker - https://www.youtube.com/watch?v=xV06xoRyztM
 * * The Logic: 
 * This strategy exploits wheel sections by playing "neighbors by 4" (9 numbers total) 
 * around recent winning numbers. Overlapping sections stack bets, creating "Jackpot" numbers 
 * that yield massive profit boosts. 
 * * The Progression:
 * - Stage 1 (1 Target): Bet 1 base unit on the last winning number + 4 neighbors each side.
 * - Stage 2 (2 Targets): After a loss, double the previous bet (2 units) and add 2 units 
 * to the NEW last winning number + neighbors.
 * - Stage 3 (3 Targets): After another loss, double again (4 units) on the first two targets, 
 * and add 4 units to the NEW last winning number + neighbors (Max 27 numbers covered).
 * - Stage 4+ (Recovery): If a loss occurs at Stage 3, stop adding new targets. Keep the 
 * same 3 targets, but add 4 base units to each pocket for every subsequent loss.
 * * The Goal: 
 * Achieve a session profit (current bankroll > bankroll at the start of Stage 1). 
 * In later stages, this often requires hitting two consecutive wins. Once session profit 
 * is reached, the progression entirely resets back to Stage 1.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // Requires at least one spin to determine the first target
    if (spinHistory.length === 0) return [];

    // European Roulette Wheel Order
    const wheel = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

    // Helper: Get number + 4 neighbors on each side
    function getNeighbors(num) {
        const index = wheel.indexOf(num);
        if (index === -1) return [num]; // Fallback if invalid
        let neighbors = [];
        for (let i = -4; i <= 4; i++) {
            let nIndex = (index + i + wheel.length) % wheel.length;
            neighbors.push(wheel[nIndex]);
        }
        return neighbors;
    }

    const lastResult = spinHistory[spinHistory.length - 1].winningNumber;

    // --- STATE INITIALIZATION & TRANSITION ---
    if (!state.initialized) {
        // Start of a brand new progression
        state.referenceBankroll = bankroll;
        state.stage = 1;
        state.targets = [lastResult];
        state.lastBetMap = {};
        state.initialized = true;
    } else {
        // Check if the last spin was a winner for our active bets
        const wonLastSpin = Object.keys(state.lastBetMap || {}).includes(String(lastResult));

        if (wonLastSpin) {
            // Did we hit session profit?
            if (bankroll > state.referenceBankroll) {
                // Goal Achieved: Reset entirely
                state.referenceBankroll = bankroll;
                state.stage = 1;
                state.targets = [lastResult]; 
            } else {
                // We won, but are still in the hole (happens in deep progression).
                // Do not advance stage, do not add targets. Repeat the same bets.
            }
        } else {
            // We lost the last spin. Escalate the progression.
            state.stage++;
            
            // Add a new target pocket for Stages 2 and 3
            if (state.stage === 2 || state.stage === 3) {
                // Avoid pushing duplicates if it happens to land on the exact same center number
                if (!state.targets.includes(lastResult)) {
                    state.targets.push(lastResult);
                }
            }
            // For Stage 4 and beyond, we cap out at 3 targets and just increase the unit size.
        }
    }

    // --- CALCULATE BET SIZES ---
    let unitMultiplier = 1;
    if (state.stage === 1) {
        unitMultiplier = 1;
    } else if (state.stage === 2) {
        unitMultiplier = 2;
    } else {
        // Stage 3: 4 units. Stage 4: 8 units. Stage 5: 12 units.
        unitMultiplier = 4 * (state.stage - 2); 
    }

    const baseUnit = config.betLimits.min;
    const betPerNumber = baseUnit * unitMultiplier;

    // --- ASSEMBLE THE BOARD ---
    let numberBets = {};
    
    // Accumulate bets (this automatically handles "Jackpot" overlapping numbers)
    for (let target of state.targets) {
        let pocket = getNeighbors(target);
        for (let num of pocket) {
            numberBets[num] = (numberBets[num] || 0) + betPerNumber;
        }
    }

    // --- BUILD AND CLAMP FINAL BETS ---
    let bets = [];
    state.lastBetMap = {}; // Reset map to track next spin's hits

    for (let numStr in numberBets) {
        let amount = numberBets[numStr];
        let numVal = parseInt(numStr, 10);

        // Crucial: Clamp to limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({ type: 'number', value: numVal, amount: amount });
        
        // Save to state to evaluate win/loss on next spin
        state.lastBetMap[numStr] = amount;
    }

    return bets;
}