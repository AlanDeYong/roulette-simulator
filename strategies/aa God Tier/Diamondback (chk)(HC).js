/**
 * Source: "The 'Diamondback' Strategy: Venomous 8:1 Payouts" by The Lucky Felt 
 * URL: https://www.youtube.com/watch?v=ybcOF6BhMhw
 *
 * The Logic:
 * - OBSERVATION PHASE: Waits for the first 37 spins. Identifies the "hottest" numbers 
 * and maps them to 5 DISTINCT, NON-OVERLAPPING Corner bets.
 * - Base unit starts at the table minimum for inside bets.
 * * The Progression ("Feeding the Loser"):
 * - On a LOSS (no corners hit): Increase the bet amount by 1 unit on ALL 5 corners.
 * - On a WIN (one corner hits, but not yet in session profit):
 * - Winning corner's bet size remains the SAME.
 * - The other 4 losing corners' bet sizes INCREASE by 1 unit.
 * * The Goal:
 * - Clear the ledger. When bankroll > sessionStartBankroll, a RESET occurs.
 * - ON RESET: Clears bets, analyzes the last 37 spins for new hot numbers, maps them 
 * to 5 non-overlapping corners, and restarts at base units.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Observation Phase Check
    if (spinHistory.length < 37) {
        return [];
    }

    // 2. Establish limits and increments
    const minBet = config.betLimits.min || 2; 
    const increment = config.incrementMode === 'base' ? minBet : (config.minIncrementalBet || 1);

    // Helper: Get the 4 specific numbers covered by a corner (given its top-left number)
    const getNumbersForCorner = (topLeft) => {
        return [topLeft, topLeft + 1, topLeft + 3, topLeft + 4];
    };

    // Helper: Find valid top-left numbers for a corner bet that covers number 'n'
    const getValidCornersFor = (n) => {
        let corners = [];
        if (n === 0 || n === '00') return corners;
        
        let col = (n % 3 === 0) ? 3 : n % 3;
        let row = Math.ceil(n / 3);

        if (col <= 2 && row < 12) corners.push(n);         // Top-Left
        if (col >= 2 && row < 12) corners.push(n - 1);     // Top-Right
        if (col <= 2 && row > 1)  corners.push(n - 3);     // Bottom-Left
        if (col >= 2 && row > 1)  corners.push(n - 4);     // Bottom-Right

        return corners;
    };

    // Helper: Analyze the last 37 spins to find hot, non-overlapping corners
    const calculateHotCorners = () => {
        let recentSpins = spinHistory.slice(-37);
        let counts = {};
        for (let i = 1; i <= 36; i++) counts[i] = 0;
        
        recentSpins.forEach(spin => {
            let n = spin.winningNumber;
            if (n !== 0 && n !== '00') {
                counts[n] = (counts[n] || 0) + 1;
            }
        });

        // Sort numbers descending by frequency. Break ties by higher number value
        let sortedNumbers = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a] || b - a);

        let selectedCorners = [];
        let coveredNumbers = new Set(); // Tracks all individual numbers currently covered
        
        // Map the hottest numbers to 5 distinct, non-overlapping corners
        for (let n of sortedNumbers) {
            let possibleCorners = getValidCornersFor(n);
            
            // Find a valid corner where NONE of its 4 numbers are already covered
            let unusedCorner = possibleCorners.find(c => {
                let cornerNums = getNumbersForCorner(c);
                return cornerNums.every(num => !coveredNumbers.has(num));
            });
            
            if (unusedCorner) {
                selectedCorners.push(unusedCorner);
                getNumbersForCorner(unusedCorner).forEach(num => coveredNumbers.add(num));
            }
            if (selectedCorners.length === 5) break; 
        }

        // Fallback: If we couldn't find 5 non-overlapping corners based purely on hot numbers,
        // iterate through all valid board corners to fill the remaining slots safely.
        if (selectedCorners.length < 5) {
            let allValidCorners = [];
            // Generate all valid top-left corner numbers (Columns 1 & 2, Rows 1-11)
            for(let i = 1; i <= 32; i++) {
                if (i % 3 !== 0) allValidCorners.push(i);
            }

            for (let c of allValidCorners) {
                let cNums = getNumbersForCorner(c);
                if (cNums.every(num => !coveredNumbers.has(num))) {
                    selectedCorners.push(c);
                    cNums.forEach(num => coveredNumbers.add(num));
                }
                if (selectedCorners.length === 5) break;
            }
        }

        return selectedCorners.map(val => ({ value: val, amount: minBet }));
    };

    // 3. State Initialization & Reset Logic
    if (!state.sessionStartBankroll || bankroll > state.sessionStartBankroll) {
        // RESET CONDITION MET (or initial start)
        state.sessionStartBankroll = bankroll;
        state.corners = calculateHotCorners();
    } else {
        // 4. Progression Execution (Processing the last spin's results)
        const lastNumber = spinHistory[spinHistory.length - 1].winningNumber;

        let winningCornerIndex = -1;
        state.corners.forEach((c, index) => {
            let cornerNums = getNumbersForCorner(c.value);
            if (cornerNums.includes(lastNumber)) {
                winningCornerIndex = index;
            }
        });

        // Execute "Diamondback" Progression
        if (winningCornerIndex !== -1) {
            // WIN - Winning corner stays, losers increase
            state.corners.forEach((c, index) => {
                if (index !== winningCornerIndex) {
                    c.amount += increment;
                }
            });
        } else {
            // LOSS - Feed all losers
            state.corners.forEach(c => c.amount += increment);
        }
    }

    // 5. Construct and clamp the bet array
    let betsToPlace = [];

    state.corners.forEach(c => {
        // Enforce table minimums and maximums
        let finalAmount = Math.max(c.amount, config.betLimits.min);
        finalAmount = Math.min(finalAmount, config.betLimits.max);

        betsToPlace.push({
            type: 'corner',
            value: c.value,
            amount: finalAmount
        });
    });

    return betsToPlace;
}