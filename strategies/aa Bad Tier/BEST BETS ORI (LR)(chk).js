/**
 * STRATEGY: "Best Bets" Alternating Street Progression
 * Source: Bet With Mo (https://www.youtube.com/watch?v=TCzYkMhsmh0)
 * * * LOGIC:
 * 1. Observation Phase: The first spin is used only to determine the starting 
 * avoidance column. No bets are placed.
 * 2. Column Avoidance: Avoid the column of the last winning number (1, 2, or 3).
 * 3. Base Level Reset: Upon any win, reset to 1 street and the base multiplier. 
 * The starting position toggles between the left (Street 1) and right (Street 12).
 * 4. Expansion: On each loss, add one additional street. 
 * - If starting from left: expand rightward (Street 1, then 1+2, then 1+2+3).
 * - If starting from right: expand leftward (Street 12, then 12+11, then 12+11+10).
 * 5. Progression: Every time 2 streets are added (specifically when reaching 
 * the 3rd, 5th, and 7th street levels), double the bet amount for all active numbers.
 * 6. Limits: Expand up to a maximum of 8 streets.
 * * * GOAL:
 * Capture profit by avoiding the most recent winning column while scaling 
 * coverage across the board using an aggressive doubling progression.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (state.activeStreetsCount === undefined) {
        state.activeStreetsCount = 1;
        state.multiplier = 1;
        state.avoidColumn = null;
        // Start from the LEFT (false) as per requirement
        state.startFromRight = false; 
    }

    // 2. Initial Observation Phase
    if (spinHistory.length === 0) {
        return []; 
    }

    const minInside = config.betLimits.min;
    const maxBet = config.betLimits.max;

    // Helper: Identify column (1, 2, or 3)
    const getColumn = (num) => {
        if (num === 0) return 0;
        return num % 3 === 0 ? 3 : (num % 3 === 2 ? 2 : 1);
    };

    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNum = lastResult.winningNumber;
    const lastCol = getColumn(lastNum);

    // 3. Evaluation and Progression Logic
    if (state.avoidColumn === null) {
        // First spin observed: Set initial column to avoid and prepare for first bet
        state.avoidColumn = lastCol === 0 ? 2 : lastCol; 
        state.activeStreetsCount = 1;
        state.multiplier = 1;
    } else {
        // Evaluate if the previous bet resulted in a win
        const streetOfLastNum = Math.ceil(lastNum / 3);
        
        // Determine which specific streets were active in the previous spin
        let activeStreetIndices = [];
        for (let i = 0; i < state.activeStreetsCount; i++) {
            activeStreetIndices.push(state.startFromRight ? (12 - i) : (1 + i));
        }

        const wasInActiveColumn = (lastCol !== state.avoidColumn && lastCol !== 0);
        const wasInActiveStreet = activeStreetIndices.includes(streetOfLastNum);
        const isWin = wasInActiveColumn && wasInActiveStreet;

        if (isWin) {
            // RESET: Return to 1 street, update avoidance, and TOGGLE start side
            state.activeStreetsCount = 1;
            state.multiplier = 1;
            state.avoidColumn = lastCol;
            state.startFromRight = !state.startFromRight; // Alternate starting side
        } else {
            // PROGRESSION: Add a street
            state.activeStreetsCount++;
            
            if (state.activeStreetsCount > 8) {
                // Safety reset if max streets reached without a hit
                state.activeStreetsCount = 1;
                state.multiplier = 1;
                state.startFromRight = !state.startFromRight; // Toggle side even on bust
            } else if (state.activeStreetsCount === 3 || state.activeStreetsCount === 5 || state.activeStreetsCount === 7) {
                // Double up when the 3rd, 5th, and 7th streets are added
                state.multiplier *= 2;
            }
            
            // Always avoid the most recent winning column (unless zero)
            if (lastCol !== 0) state.avoidColumn = lastCol;
        }
    }

    // 4. Construct Bet Array
    const activeColumns = [1, 2, 3].filter(c => c !== state.avoidColumn);
    let bets = [];
    let currentBetAmount = minInside * state.multiplier;

    // Clamp bet amount to table limits
    currentBetAmount = Math.min(Math.max(currentBetAmount, minInside), maxBet);

    // Build bets based on current expansion direction
    for (let i = 0; i < state.activeStreetsCount; i++) {
        // If startFromRight is true: 12, 11, 10...
        // If startFromRight is false: 1, 2, 3...
        const s = state.startFromRight ? (12 - i) : (1 + i);
        const streetNumbers = [(s * 3) - 2, (s * 3) - 1, (s * 3)];
        
        streetNumbers.forEach(num => {
            if (activeColumns.includes(getColumn(num))) {
                bets.push({
                    type: 'number',
                    value: num,
                    amount: currentBetAmount
                });
            }
        });
    }

    // 5. Bankroll Verification
    const totalCost = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalCost > bankroll) {
        return []; 
    }

    return bets;
}