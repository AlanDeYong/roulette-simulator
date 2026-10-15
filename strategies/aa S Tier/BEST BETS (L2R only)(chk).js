/**
 * STRATEGY: "Best Bets" Straight Number Street Progression
 * Source: Bet With Mo (https://www.youtube.com/watch?v=TCzYkMhsmh0)
 * * LOGIC:
 * 1. Initial Spin: The very first spin is used to observe which column wins. No bets are placed.
 * 2. Column Avoidance: Identify the column of the last winning number and avoid it.
 * 3. Positioning: Place Straight Up bets on the numbers in the OTHER 2 columns within the active streets.
 * 4. Progression (Loss): 
 * - Start with Street 1 (numbers 1-3).
 * - Add one additional street (moving left to right, up to 8 streets total) after every loss.
 * - Double the bet amount for all active numbers every time 2 new streets have been added (specifically on streets 3, 5, and 7).
 * 5. Reset (Win): On any win, reset to 1 street, reset the bet multiplier, and "switch sides" by avoiding the column that just won.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.activeStreets === undefined) {
        state.activeStreets = 1;
        state.multiplier = 1;
        state.avoidColumn = null;
    }

    // 2. OBSERVATION PHASE: No bets on the very first spin
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

    const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
    const lastCol = getColumn(lastNum);

    // 3. CORE LOGIC
    if (state.avoidColumn === null) {
        // First spin result received. Set initial avoidance and prepare for the next spin.
        state.avoidColumn = lastCol === 0 ? 2 : lastCol; 
        state.activeStreets = 1;
        state.multiplier = 1;
    } else {
        // Evaluate the result of the previous bet
        const streetOfLastNum = Math.ceil(lastNum / 3);
        const wasInActiveColumn = (lastCol !== state.avoidColumn && lastCol !== 0);
        const wasInActiveStreet = (streetOfLastNum <= state.activeStreets);
        const isWin = wasInActiveColumn && wasInActiveStreet;

        if (isWin) {
            // RESET: Return to base level and update avoidance
            state.activeStreets = 1;
            state.multiplier = 1;
            state.avoidColumn = lastCol; 
        } else {
            // PROGRESSION: Add street and check for double-up trigger
            state.activeStreets++;
            
            if (state.activeStreets > 8) {
                // Safety reset if max streets reached
                state.activeStreets = 1;
                state.multiplier = 1;
            } else if (state.activeStreets % 2 === 1) {
                // Double up on the 3rd, 5th, and 7th streets
                state.multiplier *= 2;
            }
            
            // Update avoidance to the most recent winning column
            if (lastCol !== 0) state.avoidColumn = lastCol;
        }
    }

    // 4. CONSTRUCT BET ARRAY
    const activeColumns = [1, 2, 3].filter(c => c !== state.avoidColumn);
    let bets = [];
    let currentBetAmount = minInside * state.multiplier;

    // Ensure bet amount respects table limits
    currentBetAmount = Math.min(Math.max(currentBetAmount, minInside), maxBet);

    // Iterate through active streets and apply straight bets to active columns
    for (let s = 1; s <= state.activeStreets; s++) {
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

    // 5. FINAL BANKROLL CHECK
    const totalCost = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalCost > bankroll) {
        return []; // Insufficient funds to maintain progression
    }

    return bets;
}