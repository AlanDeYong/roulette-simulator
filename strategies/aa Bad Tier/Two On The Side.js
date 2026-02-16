/**
 * STRATEGY: Two On The Side (Street Progression)
 * * SOURCE: 
 * Common Roulette Strategy (often featured on channels like CEG Dealer School or Roulette Mathematics)
 * * THE LOGIC:
 * - Trigger: Bets are triggered by the previous winning number.
 * - Selection: We bet on the "Streets" (3-number rows) immediately adjacent to the last winning number's street.
 * - If Street 1 hits (1-3): Bet Street 2.
 * - If Street 12 hits (34-36): Bet Street 11.
 * - Otherwise: Bet the Street above AND the Street below.
 * * THE PROGRESSION (Recovery):
 * - Level 1: Start with 2 Streets (based on last number). 1 Unit/street.
 * - WIN: Clear all, Reset to Level 1 based on new winner.
 * - LOSS: Go to Level 2.
 * - Level 2: Keep previous streets. Add 2 NEW adjacent streets based on the loss number. 2 Units/street.
 * - Level 3: Keep previous streets. Add 2 NEW adjacent streets. 4 Units/street.
 * - MAX COVERAGE REACHED: We stop adding streets after Level 3 (max ~6 streets).
 * - Level 4: Maintain streets. 8 Units/street.
 * - Level 5: Maintain streets. 16 Units/street.
 * - Level 6: Maintain streets. 32 Units/street.
 * - LOSS at Level 6: Hard Reset to Level 1 (Stop Loss).
 * * THE GOAL:
 * - Generate consistent small profits by covering ~17-50% of the board.
 * - Survive streaks of "gaps" by expanding coverage up to Level 3.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. Helper Functions ---
    
    // Returns 1-12 for valid numbers, -1 for 0/00
    const getStreetIndex = (num) => {
        if (num === null || num === undefined || num === '0' || num === '00' || num === 0) return -1;
        // Standard roulette: Street 1 is 1-3, Street 12 is 34-36
        return Math.ceil(parseInt(num) / 3);
    };

    // Converts Street Index (1-12) to the starting number required by the bet object (1, 4, 7...)
    const getStreetValue = (index) => {
        return (index - 1) * 3 + 1;
    };

    // Adds adjacent streets to the set, respecting table boundaries
    const addAdjacentStreets = (targetNumber, streetSet) => {
        const idx = getStreetIndex(targetNumber);
        if (idx === -1) return; // Zero hit, no adjacency logic usually (or treat as loss gap)

        // Rule: "Street before and after... unless first/last street"
        if (idx > 1) streetSet.add(idx - 1);  // Add street before
        if (idx < 12) streetSet.add(idx + 1); // Add street after
    };

    // --- 2. Initial Checks ---

    // Need at least 1 history item to determine where to place the first bet
    if (spinHistory.length === 0) {
        return []; 
    }

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;

    // --- 3. State Initialization ---
    
    // Initialize persistent state if it doesn't exist
    if (!state.level) state.level = 1;
    if (!state.activeStreets) state.activeStreets = []; // Array of street indices (1-12)
    // We store the streets we *actually* bet on last turn to determine Win/Loss
    if (!state.lastBetStreets) state.lastBetStreets = []; 

    // --- 4. Logic & Progression ---

    let currentStreets = new Set(state.activeStreets);
    let justReset = false;

    // Determine Result of Previous Spin (if we made a bet)
    if (state.lastBetStreets.length > 0) {
        const lastStreetIdx = getStreetIndex(lastNum);
        const won = state.lastBetStreets.includes(lastStreetIdx);

        if (won) {
            // WIN: Reset everything
            state.level = 1;
            currentStreets.clear();
            addAdjacentStreets(lastNum, currentStreets);
            justReset = true;
        } else {
            // LOSS: Progress
            if (state.level < 6) {
                state.level++;
                
                // Logic: "Add 2 new Streets" only happens when entering Level 2 or Level 3.
                // Level 1 -> Loss -> Level 2 (Add streets)
                // Level 2 -> Loss -> Level 3 (Add streets)
                // Level 3 -> Loss -> Level 4 (Stop adding, just raise stakes)
                if (state.level <= 3) {
                    addAdjacentStreets(lastNum, currentStreets);
                }
            } else {
                // Loss at Level 6 (Table Limit/Stop Loss) -> Reset to 1
                state.level = 1;
                currentStreets.clear();
                addAdjacentStreets(lastNum, currentStreets);
                justReset = true;
            }
        }
    } else {
        // First time running (Calibration spin):
        // Just set up Level 1 based on the observation
        state.level = 1;
        currentStreets.clear();
        addAdjacentStreets(lastNum, currentStreets);
    }

    // --- 5. Bet Calculation ---

    // Define Unit Multipliers for Levels 1-6
    const multipliers = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16, 6: 32 };
    const multiplier = multipliers[state.level] || 1;

    // Calculate base amount respecting limits
    // Streets are "Inside" bets, usually lower min, but user prompt implied config usage.
    // We use config.betLimits.min (Inside) as the base unit.
    let betAmount = config.betLimits.min * multiplier;

    // Clamp to Maximum
    betAmount = Math.min(betAmount, config.betLimits.max);
    
    // Ensure we don't drop below min (redundant if logic is correct, but safe)
    betAmount = Math.max(betAmount, config.betLimits.min);

    // Update State with the streets we are about to bet
    // We convert Set back to Array for storage
    state.activeStreets = Array.from(currentStreets).sort((a, b) => a - b);
    state.lastBetStreets = [...state.activeStreets];

    // --- 6. Construct Bet Objects ---

    const bets = state.activeStreets.map(streetIdx => {
        return {
            type: 'street',
            value: getStreetValue(streetIdx), // e.g., Street 1 -> value 1, Street 2 -> value 4
            amount: betAmount
        };
    });

    return bets;
}