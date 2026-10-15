/**
 * Roulette Strategy: Moving Corners
 * Source: Gamblers University (credit to Roulette Master) - https://youtu.be/yMBhDGlfleo
 * * The Full Logic in details:
 * - The base bet consists of 3 non-overlapping Corner bets and 1 Column bet (the middle column, i.e., 2nd column).
 * - A "session high" bankroll is strictly tracked.
 * - WIN CONDITION (New High): If a spin results in a new session high (bankroll > highestBankroll), the progression resets entirely. We randomly pick 3 new non-overlapping corners.
 * - WIN CONDITION (No New High): If a spin is a win (bankroll > previousBankroll) but does NOT reach the session high, we simply rebet the exact same amounts and same corners to continue climbing.
 * - LOSS CONDITION: If a spin is a loss (bankroll < previousBankroll), the progression advances.
 * * The Full Bet Progression in details:
 * - Initial state (Loss 0): 3 active Corners at 1 base unit each, Column at 1 base unit.
 * - On each Loss, the progression changes as follows:
 * 1. We add 1 additional non-overlapping corner to our active bets, up to a maximum of 5 corners.
 * 2. The Corner bets follow a Martingale progression: the bet size on ALL active corners doubles on each loss (1x, 2x, 4x, 8x, 16x...).
 * 3. The Column bet follows a Fibonacci progression on each loss (1x, 2x, 3x, 5x, 8x, 13x...).
 * * The Goal:
 * - The creator targets a profit of $40 to $50 on a $400 bankroll. This script evaluates a target profit of 50 base units and stops betting when reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Check Win Goal (Stop-Loss/Take-Profit)
    // Target is 50 units of the minimum corner bet based on the video's $50 goal on $1 base units.
    const winGoal = config.startingBankroll + (50000 * config.betLimits.min);
    if (bankroll >= winGoal) {
        return []; // Target reached, stop betting.
    }

    // 2. Initialize State
    if (!state.initialized) {
        state.highestBankroll = bankroll;
        state.previousBankroll = bankroll;
        state.lossCount = 0;
        
        // Setup two pools of perfectly non-overlapping corners (identified by top-left number)
        const poolA = [1, 7, 13, 19, 25, 31];
        const poolB = [2, 8, 14, 20, 26, 32];
        
        // Randomly pick a pool and shuffle it
        state.cornerPool = Math.random() < 0.5 ? poolA : poolB;
        state.cornerPool.sort(() => Math.random() - 0.5); 
        
        state.activeCorners = state.cornerPool.slice(0, 3); // Start with 3 corners
        state.initialized = true;
    }

    // 3. Evaluate Previous Spin
    if (spinHistory.length > 0) {
        if (bankroll > state.highestBankroll) {
            // New session high! Reset progression
            state.highestBankroll = bankroll;
            state.lossCount = 0;
            
            // Re-shuffle and pick 3 new non-overlapping corners
            state.cornerPool.sort(() => Math.random() - 0.5);
            state.activeCorners = state.cornerPool.slice(0, 3);
            
        } else if (bankroll < state.previousBankroll) {
            // Loss, increment progression
            state.lossCount++;
            
            // Add an additional corner if we haven't reached the max of 5
            let targetCount = Math.min(3 + state.lossCount, 5);
            while (state.activeCorners.length < targetCount && state.activeCorners.length < state.cornerPool.length) {
                state.activeCorners.push(state.cornerPool[state.activeCorners.length]);
            }
        }
        // NOTE: If bankroll > previousBankroll but <= highestBankroll, it's a win but no new high.
        // The strategy rules state we "stay here and spin again" (we do not alter lossCount, we rebet exact same).
    }

    // Update previous bankroll for the next evaluation
    state.previousBankroll = bankroll;

    // 4. Calculate Bet Amounts
    const cornerBase = config.betLimits.min;
    const colBase = config.betLimits.minOutside;

    // Corners follow Martingale (doubles every loss)
    let cornerMulti = Math.pow(2, state.lossCount);
    
    // Column follows Fibonacci
    const fib = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];
    let colFibIndex = Math.min(state.lossCount, fib.length - 1);
    let colMulti = fib[colFibIndex];

    let cornerBetAmt = cornerBase * cornerMulti;
    let colBetAmt = colBase * colMulti;

    // 5. CLAMP TO LIMITS (Crucial step to respect config boundaries)
    cornerBetAmt = Math.max(cornerBetAmt, config.betLimits.min);
    cornerBetAmt = Math.min(cornerBetAmt, config.betLimits.max);

    colBetAmt = Math.max(colBetAmt, config.betLimits.minOutside);
    colBetAmt = Math.min(colBetAmt, config.betLimits.max);

    // 6. Construct Bets Array
    let bets = [];
    
    // Middle column bet
    bets.push({ type: 'column', value: 2, amount: colBetAmt });
    
    // Active corner bets
    for (let i = 0; i < state.activeCorners.length; i++) {
        bets.push({ type: 'corner', value: state.activeCorners[i], amount: cornerBetAmt });
    }

    return bets;
}