/**
 * Strategy: Kentucky White's Nine Streets
 * * Logic:
 * This is a coverage-based progression strategy that increases board coverage after losses.
 * - Level 1: Bet on 3 random Streets (9 numbers).
 * - Level 2: After a loss, add 3 NEW Streets (total 6) and double the bet per street.
 * - Level 3: After another loss, add 3 NEW Streets (total 9) and double the bet per street again.
 * * Progression & Recovery:
 * - Levels 1 & 2: A single win resets the strategy to Level 1.
 * - Level 3 (9 Streets): Because the investment is high, a single win is often not enough to recover.
 * The system requires TWO wins at this level to reset.
 * - Deep Losses: If a loss occurs at Level 3, the number of streets stays at 9, but the bet amount
 * doubles again to attempt recovery.
 * * Goal:
 * To grind out consistent profits by increasing win probability (coverage) after losses, 
 * leveraging the 73% board coverage at Level 3 to secure the necessary recovery wins.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & HELPERS ---
    
    // Define available street starting numbers (1, 4, 7, ..., 34)
    const allStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    // Helper: Pick N random streets that aren't currently in use
    const pickNewStreets = (count, currentStreets = []) => {
        const available = allStreets.filter(s => !currentStreets.includes(s));
        // Shuffle available streets
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }
        return available.slice(0, count);
    };

    // Helper: Check if a number hit a specific street
    const isHit = (number, streetStart) => number >= streetStart && number < streetStart + 3;

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 1;
        state.currentStreets = pickNewStreets(3);
        state.betPerStreet = config.betLimits.min; // Start at table minimum
        state.winsNeeded = 1; // Wins required to reset
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS RESULT ---
    // Only process if there is history (skip on first spin)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Determine if we won the last round
        // A win occurs if the winning number is inside ANY of our active streets
        const won = state.currentStreets.some(s => isHit(lastNum, s));

        if (won) {
            state.winsNeeded--; // Decrement required wins
            
            if (state.winsNeeded <= 0) {
                // RESET Condition Met: Go back to Level 1
                state.level = 1;
                state.currentStreets = pickNewStreets(3);
                state.betPerStreet = config.betLimits.min;
                state.winsNeeded = 1;
            } else {
                // PARTIAL RECOVERY: Stay at current level/bet until winsNeeded is 0
                // (No changes to state variables needed, just re-bet)
            }
        } else {
            // LOSS Condition
            if (state.level === 1) {
                // Move to Level 2: Add 3 streets, Double bet
                state.level = 2;
                const newStreets = pickNewStreets(3, state.currentStreets);
                state.currentStreets = [...state.currentStreets, ...newStreets];
                state.betPerStreet *= 2;
                state.winsNeeded = 1; // Only 1 win needed to clear Level 2 usually
            } else if (state.level === 2) {
                // Move to Level 3: Add 3 streets (Total 9), Double bet
                state.level = 3;
                const newStreets = pickNewStreets(3, state.currentStreets);
                state.currentStreets = [...state.currentStreets, ...newStreets];
                state.betPerStreet *= 2;
                state.winsNeeded = 2; // Require 2 wins to clear this heavy investment
            } else {
                // Level 3+ (Deep Hole): Max streets reached (9). 
                // Just Double bet to recover faster.
                state.betPerStreet *= 2;
                // Keep winsNeeded at 2 (or higher if you want to be safer, but 2 is standard)
            }
        }
    }

    // --- 4. VALIDATE LIMITS ---
    // Clamp the bet amount per street to the table limits
    if (state.betPerStreet < config.betLimits.min) state.betPerStreet = config.betLimits.min;
    if (state.betPerStreet > config.betLimits.max) state.betPerStreet = config.betLimits.max;

    // Optional: Safety brake for Bankroll
    // If total bet exceeds bankroll, we might return [] or bet what we can. 
    // Here we assume the simulator handles insufficient funds, but we calculate total bet anyway.
    const totalBet = state.betPerStreet * state.currentStreets.length;
    if (totalBet > bankroll) {
        // Not enough money to execute strategy. Stop.
        return [];
    }

    // --- 5. GENERATE BET OBJECTS ---
    return state.currentStreets.map(streetStart => ({
        type: 'street',
        value: streetStart,
        amount: state.betPerStreet
    }));
}