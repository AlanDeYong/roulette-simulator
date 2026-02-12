/**
 * Strategy: "Street Fighter" Mixed Dozen Coverage
 * * The Logic:
 * 1. Bet Vehicle: All bets are STREET bets (Inside bet, 3 numbers, pays 11:1).
 * We do NOT place outside Dozen bets or Double Streets.
 * 2. Target Selection (calculated on Reset):
 * - Target A (Recent): Identify the most recently hit Dozen that was NOT the result of the immediate last spin.
 * -> Cover this entire Dozen with 4 Street bets.
 * - Target B (Cold): Identify the Dozen that has not hit for the longest time.
 * -> Cover 3 random Streets within this Dozen.
 * - Total Bets: 7 Streets (covering 21 numbers).
 * * The Progression:
 * - Flat Bet Phase: On loss, "Rebet" (keep same numbers and amount) for up to 3 tries.
 * - Ladder Phase: After 3 consecutive losses, increase the bet size by +1 Unit.
 * - Reset: On ANY Win, reset to Unit 1 and recalculate targets (pick new dozens/streets).
 * * The Goal:
 * - Leverage the high hit rate of covering ~56% of the board (21/37 numbers) with Inside bets.
 * - Recover losses by increasing unit size after a block of 3 failures.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. Configuration & Helpers ---
    const MAX_TRIES = 3; 
    const BET_TYPE = 'street';

    // Helper: Map Dozen ID (1,2,3) to its Street starting numbers
    const DOZEN_STREETS = {
        1: [1, 4, 7, 10],
        2: [13, 16, 19, 22],
        3: [25, 28, 31, 34]
    };

    // Helper: Determine which Dozen a number belongs to (0 returns null)
    function getDozen(num) {
        if (num === 0 || num === 37) return null;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    }

    // Helper: Analyze history to find our targets
    function getTargets(history) {
        if (history.length < 2) return null; // Need some history

        const lastSpin = history[history.length - 1];
        const lastDozen = getDozen(lastSpin.winningNumber);

        // 1. Find "Most Recently Hit Dozen (NOT last spin)"
        let recentDozen = null;
        // Iterate backwards from the spin *before* the last one
        for (let i = history.length - 2; i >= 0; i--) {
            const d = getDozen(history[i].winningNumber);
            if (d !== null && d !== lastDozen) {
                recentDozen = d;
                break;
            }
        }
        // Fallback: If no distinct recent dozen found, pick randomly from available non-last
        if (!recentDozen) {
            const candidates = [1, 2, 3].filter(d => d !== lastDozen);
            recentDozen = candidates[Math.floor(Math.random() * candidates.length)] || 1;
        }

        // 2. Find "Dozen Not Hit For Longest Time" (Coldest)
        // Track last index of each dozen
        const lastSeen = { 1: -1, 2: -1, 3: -1 };
        for (let i = 0; i < history.length; i++) {
            const d = getDozen(history[i].winningNumber);
            if (d) lastSeen[d] = i;
        }
        
        // The one with the smallest index (or -1) is the coldest
        let coldestDozen = 1;
        let minIndex = Infinity;
        
        for (let d = 1; d <= 3; d++) {
            if (lastSeen[d] < minIndex) {
                minIndex = lastSeen[d];
                coldestDozen = d;
            }
        }

        return { recent: recentDozen, cold: coldestDozen };
    }

    // --- 2. State Management ---
    
    // Check for Win/Reset Condition from previous spin
    let shouldReset = false;
    if (spinHistory.length > 0 && state.activeStreets) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        // Did we win? Check if lastNum is in any of our active streets
        // A street at S covers [S, S+1, S+2]
        const won = state.activeStreets.some(start => lastNum >= start && lastNum <= start + 2);
        
        if (won) {
            shouldReset = true;
        } else {
            // Loss Logic
            state.tries++;
            if (state.tries >= MAX_TRIES) {
                state.unit++;   // Increase bet size
                state.tries = 0; // Reset tries counter for the new level
                // We keep the same streets (Rebet)
            }
        }
    } else {
        shouldReset = true; // First spin
    }

    // Perform Reset if needed (New Targets)
    if (shouldReset) {
        const targets = getTargets(spinHistory);
        
        if (!targets) {
            // Not enough history to calculate logic yet
            return []; 
        }

        // Select Streets
        // A. Recent Dozen: All 4 streets
        const streetsA = [...DOZEN_STREETS[targets.recent]];
        
        // B. Cold Dozen: 3 random streets
        const poolB = [...DOZEN_STREETS[targets.cold]];
        // Shuffle and take 3
        for (let i = poolB.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [poolB[i], poolB[j]] = [poolB[j], poolB[i]];
        }
        const streetsB = poolB.slice(0, 3);

        // Combine unique streets (in case Recent == Cold, though logic implies distinct usually)
        // If Recent == Cold, we essentially just bet 4 streets on that dozen.
        // But usually we want 7 bets. The prompt implies two distinct actions. 
        // If they overlap, we simply have the list of unique streets.
        const combined = new Set([...streetsA, ...streetsB]);

        state.activeStreets = Array.from(combined);
        state.unit = 1;
        state.tries = 0;
    }

    // --- 3. Construct Bets ---
    
    // Calculate Amount
    const baseVal = config.betLimits.min; // Inside bet minimum
    let amount = baseVal * state.unit;
    
    // Clamp to Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // Generate Bet Objects
    return state.activeStreets.map(streetStart => ({
        type: BET_TYPE,
        value: streetStart,
        amount: amount
    }));
}