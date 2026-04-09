/**
 * STRATEGY: "Best Bets" Right-to-Left Street Progression
 * Source: Bet With Mo (https://www.youtube.com/watch?v=TCzYkMhsmh0)
 * channel name: Bet With Mo
 * * * * LOGIC:
 * 1. Observation Phase: The first spin is used only to determine the starting 
 * avoidance column. No bets are placed.
 * 2. Column Avoidance: Identify the column of the last winning number (1, 2, or 3) 
 * and avoid it on the next spin.
 * 3. Starting Position: Always starts from the rightmost street (Street 12: 34, 35, 36).
 * 4. Progression (Loss): Add one additional street to the left on every loss (e.g., 
 * Street 12, then Streets 12+11, then 12+11+10, etc.), up to 8 streets total.
 * 5. Doubling Trigger: Every time 2 streets are added (specifically on the 3rd, 5th, 
 * and 7th street levels), double the bet amount for all active numbers.
 * 6. Reset (Win): Upon any win, reset to 1 street (the rightmost), reset the 
 * multiplier to 1, and update the avoided column to the one that just won.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (state.activeStreetsCount === undefined) {
        state.activeStreetsCount = 1;
        state.multiplier = 1;
        state.avoidColumn = null;
    }

    // 2. Initial Observation Phase: No bets on the very first spin
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

    // 3. Core Strategy Logic
    if (state.avoidColumn === null) {
        // Observation result received: Set initial column to avoid
        state.avoidColumn = lastCol === 0 ? 2 : lastCol; 
        state.activeStreetsCount = 1;
        state.multiplier = 1;
    } else {
        // Evaluate the previous bet result
        const streetOfLastNum = Math.ceil(lastNum / 3);
        
        // Active streets are always calculated from the right (Street 12 downwards)
        let activeStreetIndices = [];
        for (let i = 0; i < state.activeStreetsCount; i++) {
            activeStreetIndices.push(12 - i);
        }

        const wasInActiveColumn = (lastCol !== state.avoidColumn && lastCol !== 0);
        const wasInActiveStreet = activeStreetIndices.includes(streetOfLastNum);
        const isWin = wasInActiveColumn && wasInActiveStreet;

        if (isWin) {
            // RESET: Return to base level (rightmost street) and update avoidance
            state.activeStreetsCount = 1;
            state.multiplier = 1;
            state.avoidColumn = lastCol; 
        } else {
            // PROGRESSION: Add a street and calculate doubling trigger
            state.activeStreetsCount++;
            
            if (state.activeStreetsCount > 8) {
                // Safety reset if max streets (8) reached without a hit
                state.activeStreetsCount = 1;
                state.multiplier = 1;
            } else if (state.activeStreetsCount % 2 === 1) {
                // Double up all bets on levels 3, 5, and 7
                state.multiplier *= 2;
            }
            
            // Update avoided column based on the most recent win (exclude zero)
            if (lastCol !== 0) {
                state.avoidColumn = lastCol;
            }
        }
    }

    // 4. Construct Bet Objects
    const activeColumns = [1, 2, 3].filter(c => c !== state.avoidColumn);
    let bets = [];
    let currentBetAmount = minInside * state.multiplier;

    // Respect table limits
    currentBetAmount = Math.min(Math.max(currentBetAmount, minInside), maxBet);

    // Generate straight-up bets for active streets (starting from 12 and moving left)
    for (let i = 0; i < state.activeStreetsCount; i++) {
        const s = 12 - i;
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