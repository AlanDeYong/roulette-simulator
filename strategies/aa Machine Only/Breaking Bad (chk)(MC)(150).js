/**
 * Strategy Name: Breaking Bad Roulette System
 * Source: https://youtu.be/Rk2zFaQRW3w (The Roulette Master)
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize Strategy Constants & State
    const baseUnit = config.betLimits.min;
    
    if (!state.isInitialized) {
        state.initialBankroll = bankroll;
        state.phase = 'MOVING_CORNERS'; // 'MOVING_CORNERS' or 'HOUSE_BREAKER'
        state.level = 1; 
        state.hbBets = []; 
        // Randomly choose starting side
        state.currentDirection = Math.random() < 0.5 ? 'LEFT_TO_RIGHT' : 'RIGHT_TO_LEFT';
        // Randomly choose corner pattern (A or B) to vary the layout
        state.pattern = Math.random() < 0.5 ? 'A' : 'B';
        state.isInitialized = true;
    }

    // Unified Reset function to flip direction, pick new pattern, and reset levels
    const triggerReset = () => {
        state.phase = 'MOVING_CORNERS';
        state.level = 1;
        state.hbBets = [];
        state.currentDirection = state.currentDirection === 'LEFT_TO_RIGHT' ? 'RIGHT_TO_LEFT' : 'LEFT_TO_RIGHT';
        state.pattern = Math.random() < 0.5 ? 'A' : 'B';
    };

    // Helper to check if a specific roulette number is covered by a corner bet
    function cornerCoversNumber(cornerVal, num) {
        if (num === 0 || num === '00') return false;
        const val = parseInt(cornerVal);
        return [val, val + 1, val + 3, val + 4].includes(num);
    }

    // Define the two valid zigzag patterns that bypass the middle of the dozens
    // Pattern A uses 32/25 on the right side. Pattern B uses 31/26 on the right side.
    const patternA = [1, 8, 13, 20, 25, 32];
    const patternB = [2, 7, 14, 19, 26, 31];
    
    // Evaluate the sequence used in the PREVIOUS spin to check for wins correctly
    let previousBaseCorners = state.pattern === 'A' ? patternA : patternB;
    let previousSequence = state.currentDirection === 'LEFT_TO_RIGHT' 
        ? previousBaseCorners 
        : [...previousBaseCorners].reverse();

    // 2. Process the Last Spin Outcome to Mutate State
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;

        // Condition Check: If we are in profit, reset to baseline instantly
        if (bankroll > state.initialBankroll) {
            state.initialBankroll = bankroll; // update session profit threshold
            triggerReset();
        } else {
            if (state.phase === 'MOVING_CORNERS') {
                // Use the previous sequence to verify if the last spin was a hit
                let activeCount = state.level === 1 ? 2 : Math.min(state.level + 1, 6);
                let currentCorners = previousSequence.slice(0, activeCount);
                let hitIdx = currentCorners.findIndex(c => cornerCoversNumber(c, winNum));

                if (hitIdx !== -1) {
                    // Win achieved
                    if (state.level >= 5) {
                        // Max level reached (6+ corners) -> Transition into House Breaker Recovery Mode
                        state.phase = 'HOUSE_BREAKER';
                        
                        // Capture the current 6 corners with their units
                        let initialMultiplier = 8 * Math.pow(2, state.level - 5);
                        state.hbBets = currentCorners.map(c => ({ value: c, units: initialMultiplier }));
                        
                        // Apply the first House Breaker operation: remove the winning corner
                        const winningCornerVal = currentCorners[hitIdx];
                        state.hbBets = state.hbBets.filter(b => b.value !== winningCornerVal);
                        
                        // Increase all remaining active positions by 1 base unit
                        state.hbBets.forEach(b => {
                            b.units += 1;
                        });
                    } else {
                        // Win at lower tier before transition -> Reset
                        triggerReset();
                    }
                } else {
                    // Loss registered -> Advance progression tier
                    state.level++;
                }
            } else if (state.phase === 'HOUSE_BREAKER') {
                // House Breaker Logic Processing
                let hitIdx = state.hbBets.findIndex(b => cornerCoversNumber(b.value, winNum));
                
                if (hitIdx !== -1) {
                    // Win inside House Breaker phase
                    const winningCornerVal = state.hbBets[hitIdx].value;
                    
                    // Remove the successful winning corner from layout
                    state.hbBets = state.hbBets.filter(b => b.value !== winningCornerVal);
                    
                    // Add 1 progression unit incrementally to all remaining positions
                    state.hbBets.forEach(b => {
                        b.units += 1;
                    });

                    // Safe fallback: if all remaining positions are cleared out but somehow not in profit
                    if (state.hbBets.length === 0) {
                        triggerReset();
                    }
                }
            }
        }
    }

    // 3. Construct and Format the Active Bets List for the UPCOMING spin
    // Re-evaluate sequence dynamically after all state mutations (like resets/flips) have occurred
    let currentBaseCorners = state.pattern === 'A' ? patternA : patternB;
    let activeCornersSequence = state.currentDirection === 'LEFT_TO_RIGHT' 
        ? currentBaseCorners 
        : [...currentBaseCorners].reverse();

    let finalBets = [];

    if (state.phase === 'MOVING_CORNERS') {
        let activeCount = state.level === 1 ? 2 : Math.min(state.level + 1, 6);
        let activeCorners = activeCornersSequence.slice(0, activeCount);
        
        // Define multiplier mappings matching the sequence tiers
        let multiplier = 1;
        if (state.level === 3) multiplier = 2;  // 4 corners doubled
        if (state.level === 4) multiplier = 4;  // 5 corners doubled again
        if (state.level >= 5) multiplier = 8 * Math.pow(2, state.level - 5);  // 6 corners continuously doubled

        let betAmount = baseUnit * multiplier;
        // Enforce boundary parameters from table configurations
        betAmount = Math.max(betAmount, config.betLimits.min);
        betAmount = Math.min(betAmount, config.betLimits.max);

        activeCorners.forEach(c => {
            finalBets.push({
                type: 'corner',
                value: c,
                amount: betAmount
            });
        });
    } else if (state.phase === 'HOUSE_BREAKER') {
        state.hbBets.forEach(b => {
            let betAmount = baseUnit * b.units;
            betAmount = Math.max(betAmount, config.betLimits.min);
            betAmount = Math.min(betAmount, config.betLimits.max);

            finalBets.push({
                type: 'corner',
                value: b.value,
                amount: betAmount
            });
        });
    }

    return finalBets.length > 0 ? finalBets : [];
}