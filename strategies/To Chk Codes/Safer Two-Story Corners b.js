/**
 * Source: https://www.youtube.com/watch?v=YB9uOTQdhiQ (The Roulette Factory)
 * Strategy Name: Safer Corner Strategy (Two-Story Corners)
 * * The Logic: 
 * Places inside bets on non-overlapping corners. It starts with a single corner. 
 * If a bet loses, it adds another corner to the board. Once 6 corners are covered, 
 * it moves to the "Second Story" (Tier 2), which increases the base unit multiplier.
 * * The Progression: 
 * - 12-Level D'Alembert Style Sequence:
 * Tier 1 (1x Multiplier): 1 to 6 corners.
 * Tier 2 (2x Multiplier): 1 to 6 corners.
 * - On Loss: Move exactly 1 step up the progression ladder.
 * - On Win: Move 1 step down the ladder (peel off a corner/multiplier).
 * - Profit Reset: If the current bankroll hits a new session high, completely 
 * reset the progression to step 0.
 * * The Goal: 
 * Accumulate steady micro-profits while restricting maximum exposure. 
 * Stop-loss is intrinsically tied to avoiding progression past Tier 2 (Step 12).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables on first run
    if (state.progressionIndex === undefined) {
        state.progressionIndex = 0;
        state.sessionHigh = bankroll;
        
        // 6 Non-overlapping corners (Top-left numbers)
        // 1 (1,2,4,5), 7 (7,8,10,11), 13 (13,14,16,17), 
        // 19 (19,20,22,23), 25 (25,26,28,29), 31 (31,32,34,35)
        state.corners = [1, 7, 13, 19, 25, 31];
        
        // Define the 12 progression steps: { cornersToPlay, unitMultiplier }
        state.levels = [
            // Tier 1
            { c: 1, m: 1 }, { c: 2, m: 1 }, { c: 3, m: 1 }, 
            { c: 4, m: 1 }, { c: 5, m: 1 }, { c: 6, m: 1 },
            // Tier 2
            { c: 1, m: 2 }, { c: 2, m: 2 }, { c: 3, m: 2 }, 
            { c: 4, m: 2 }, { c: 5, m: 2 }, { c: 6, m: 2 }
        ];
    }

    // 2. Evaluate previous spin (if history exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Update session high if we are in profit
        if (bankroll > state.sessionHigh) {
            state.sessionHigh = bankroll;
            state.progressionIndex = 0; // Reset on new session high
        } else {
            // Determine if the last spin was a win by checking if it fell in our active corners
            let wonLastSpin = false;
            const activeLevel = state.levels[state.progressionIndex];
            const activeCorners = state.corners.slice(0, activeLevel.c);
            
            for (let startNum of activeCorners) {
                // Reconstruct the 4 numbers in the corner based on the start number
                const cornerNums = [startNum, startNum + 1, startNum + 3, startNum + 4];
                if (cornerNums.includes(lastNumber)) {
                    wonLastSpin = true;
                    break;
                }
            }

            // Progression adjustment
            if (wonLastSpin) {
                // Win but not a new session high: peel off (step back)
                state.progressionIndex = Math.max(0, state.progressionIndex - 1);
            } else {
                // Loss: step forward
                state.progressionIndex = Math.min(state.levels.length - 1, state.progressionIndex + 1);
            }
        }
    }

    // 3. Calculate current bets based on progression state
    const baseUnit = config.betLimits.min; 
    const currentLevel = state.levels[state.progressionIndex];
    let calculatedAmount = baseUnit * currentLevel.m;

    // Apply incremental logic if base mode is enabled in config
    if (config.incrementMode === 'fixed' && currentLevel.m > 1) {
        calculatedAmount = baseUnit + (config.minIncrementalBet * (currentLevel.m - 1));
    }

    // Clamp limits strictly
    let betAmount = Math.max(calculatedAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 4. Construct the bet array
    let bets = [];
    const cornersToBet = state.corners.slice(0, currentLevel.c);
    
    for (let startNum of cornersToBet) {
        bets.push({
            type: 'corner',
            value: startNum,
            amount: betAmount
        });
    }

    return bets;
}