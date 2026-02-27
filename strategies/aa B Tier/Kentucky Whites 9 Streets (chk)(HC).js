/**
 * Strategy: Kentucky White's Nine Streets (Hot/Cold Modified)
 * * Logic:
 * - Observes the first 37 spins to determine street frequencies.
 * - Level 1: Bets on the 3 "hottest" streets based on the last 37 spins.
 * - Level 2/3 Progression: On a loss, evaluates the *latest* 37 spins to find 
 * the next hottest available streets, avoiding the coldest, and adds them.
 * - Existing bets are locked in and DO NOT change until a win triggers a reset.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & HELPERS ---
    
    // Define available street starting numbers (1, 4, 7, ..., 34)
    const allStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    // WAIT CONDITION: Need 37 spins to determine hot/cold numbers
    if (spinHistory.length < 37) {
        return [];
    }

    // Helper: Calculate street scores based on the last 37 spins
    const getStreetScores = () => {
        const recentSpins = spinHistory.slice(-37);
        const counts = {};
        
        // Count hits for all numbers in the recent window
        recentSpins.forEach(spin => {
            const n = spin.winningNumber;
            counts[n] = (counts[n] || 0) + 1;
        });

        // Map hits to streets
        return allStreets.map(s => {
            const score = (counts[s] || 0) + (counts[s+1] || 0) + (counts[s+2] || 0);
            return { street: s, score: score };
        });
    };

    // Helper: Pick N streets with the highest hot scores, avoiding exclusions
    const pickBestStreets = (count, currentStreets = []) => {
        const scores = getStreetScores();
        
        // Filter out streets we are already betting on
        const available = scores.filter(s => !currentStreets.includes(s.street));
        
        // Sort descending by score (highest combined hot numbers first).
        // This naturally avoids the streets with the highest combined cold numbers.
        available.sort((a, b) => b.score - a.score);
        
        return available.slice(0, count).map(s => s.street);
    };

    // Helper: Check if a number hit a specific street
    const isHit = (number, streetStart) => number >= streetStart && number < streetStart + 3;

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 1;
        state.currentStreets = pickBestStreets(3); // Pick initial top 3 hottest
        state.betPerStreet = config.betLimits.min;
        state.winsNeeded = 1;
        state.initialized = true;
        
        // Flag to prevent the 37th spin from triggering a premature win/loss check
        state.justInitialized = true; 
    }

    // --- 3. PROCESS PREVIOUS RESULT ---
    // Only process if we actually had bets on the table during the last spin
    if (!state.justInitialized) {
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        const won = state.currentStreets.some(s => isHit(lastNum, s));

        if (won) {
            state.winsNeeded--; 
            
            if (state.winsNeeded <= 0) {
                // RESET Condition Met: Go back to Level 1
                state.level = 1;
                // Re-evaluate hot/cold for a brand new set of 3 streets
                state.currentStreets = pickBestStreets(3); 
                state.betPerStreet = config.betLimits.min;
                state.winsNeeded = 1;
            } else {
                // PARTIAL RECOVERY: Re-bet existing setup
            }
        } else {
            // LOSS Condition
            if (state.level === 1) {
                state.level = 2;
                // Check latest 37, add 3 new hot streets, keep old ones
                const newStreets = pickBestStreets(3, state.currentStreets);
                state.currentStreets = [...state.currentStreets, ...newStreets];
                state.betPerStreet *= 2;
                state.winsNeeded = 1; 
            } else if (state.level === 2) {
                state.level = 3;
                // Check latest 37, add 3 new hot streets, keep old ones
                const newStreets = pickBestStreets(3, state.currentStreets);
                state.currentStreets = [...state.currentStreets, ...newStreets];
                state.betPerStreet *= 2;
                state.winsNeeded = 2; 
            } else {
                // Level 3+ (Deep Hole)
                state.betPerStreet *= 2;
            }
        }
    } else {
        // Clear the flag so normal processing resumes on the next spin
        state.justInitialized = false;
    }

    // --- 4. VALIDATE LIMITS ---
    if (state.betPerStreet < config.betLimits.min) state.betPerStreet = config.betLimits.min;
    if (state.betPerStreet > config.betLimits.max) state.betPerStreet = config.betLimits.max;

    const totalBet = state.betPerStreet * state.currentStreets.length;
    if (totalBet > bankroll) {
        return []; // Insufficient funds
    }

    // --- 5. GENERATE BET OBJECTS ---
    return state.currentStreets.map(streetStart => ({
        type: 'street',
        value: streetStart,
        amount: state.betPerStreet
    }));
}