/**
 * SAFER HOT POCKETS ROULETTE STRATEGY
 * * Source: Adapted from Casino Matchmaker - https://www.youtube.com/watch?v=xV06xoRyztM
 * * The Logic: 
 * Plays "neighbors by 4" (9 numbers total) around recent winning numbers. Overlapping 
 * sections stack bets. This variant drastically reduces volatility by using a linear, 
 * flat-betting approach for initial stages rather than aggressive doubling.
 * * The Progression:
 * - Stage 1 (1 Target): Bet 1 base unit on the last winning number + 4 neighbors each side.
 * - Stage 2 (2 Targets): After a loss, DO NOT DOUBLE. Bet 1 base unit on the first target, 
 * and 1 base unit on the NEW last winning number + neighbors.
 * - Stage 3 (3 Targets): After another loss, DO NOT DOUBLE. Bet 1 base unit on all three targets.
 * - Stage 4+ (Recovery): Stop adding targets. Keep the same 3 target pockets, but add exactly 
 * 1 base unit to ALL bets for every subsequent loss (e.g., 2 units each, then 3 units each).
 * * The Goal: 
 * Achieve a session profit (current bankroll > bankroll at the start of Stage 1). 
 * Once session profit is reached, the progression entirely resets back to Stage 1.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    if (spinHistory.length === 0) return [];

    // European Roulette Wheel Order
    const wheel = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

    // Helper: Get number + 4 neighbors on each side
    function getNeighbors(num) {
        const index = wheel.indexOf(num);
        if (index === -1) return [num]; 
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
        state.referenceBankroll = bankroll;
        state.stage = 1;
        state.targets = [lastResult];
        state.lastBetMap = {};
        state.initialized = true;
    } else {
        const wonLastSpin = Object.keys(state.lastBetMap || {}).includes(String(lastResult));

        if (wonLastSpin) {
            // Check for Session Profit Reset
            if (bankroll > state.referenceBankroll) {
                state.referenceBankroll = bankroll;
                state.stage = 1;
                state.targets = [lastResult]; 
            }
        } else {
            // Lost spin: Escalate stage
            state.stage++;
            
            // Add a new target pocket for Stages 2 and 3 only
            if (state.stage === 2 || state.stage === 3) {
                if (!state.targets.includes(lastResult)) {
                    state.targets.push(lastResult);
                }
            }
        }
    }

    // --- CALCULATE BET SIZES (SAFER LINEAR LOGIC) ---
    // Stages 1-3 use 1 unit per target. 
    // Stage 4 uses 2 units. Stage 5 uses 3 units, etc.
    const unitMultiplier = Math.max(1, state.stage - 2); 
    
    const baseUnit = config.betLimits.min;
    const betPerNumber = baseUnit * unitMultiplier;

    // --- ASSEMBLE THE BOARD ---
    let numberBets = {};
    
    for (let target of state.targets) {
        let pocket = getNeighbors(target);
        for (let num of pocket) {
            numberBets[num] = (numberBets[num] || 0) + betPerNumber;
        }
    }

    // --- BUILD AND CLAMP FINAL BETS ---
    let bets = [];
    state.lastBetMap = {}; 

    for (let numStr in numberBets) {
        let amount = numberBets[numStr];
        let numVal = parseInt(numStr, 10);

        // Clamp to limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({ type: 'number', value: numVal, amount: amount });
        
        // Track for next spin
        state.lastBetMap[numStr] = amount;
    }

    return bets;
}