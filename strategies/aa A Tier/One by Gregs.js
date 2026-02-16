/**
 * Strategy: "The One" by Greg
 * * The Logic:
 * - Initializes with 7 specific corner bets that cover a large portion of the board.
 * - Creates "Jackpot" zones on numbers 17 and 20 by overlapping corners.
 * * The Progression (Win):
 * - "The Removal Rule": If a corner bet wins, remove that specific bet for the next spin to lock in profit.
 * - "The Reset Point": If the player wins while at the "5-corner stage" (5 or fewer active corners),
 * the strategy resets back to the full 7-corner setup.
 * - Multiplier is reset to 1 after any win.
 * * The Progression (Loss):
 * - "Loss Recovery": If a spin loses (no corner hit), the bet amount on ALL currently active corners
 * is doubled (Martingale) to recover previous losses.
 * * The Goal:
 * - Generate frequent small wins via corner coverage.
 * - Hit "Jackpots" (17 or 20) for large payouts.
 * - Survive drawdown using the removal method to reduce table exposure while ahead.
 */

function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & DEFINITIONS ---

    // The 7 Corners defined in "The One"
    // Value represents the top-left (start) number of the corner
    const CORNERS = [
        { value: 2,  numbers: [2, 3, 5, 6] },
        { value: 7,  numbers: [7, 8, 10, 11] },
        { value: 13, numbers: [13, 14, 16, 17] }, // Overlaps 17
        { value: 17, numbers: [17, 18, 20, 21] }, // Overlaps 17 & 20
        { value: 19, numbers: [19, 20, 22, 23] }, // Overlaps 20
        { value: 26, numbers: [26, 27, 29, 30] },
        { value: 32, numbers: [31, 32, 34, 35] }
    ];

    const ALL_CORNER_VALUES = CORNERS.map(c => c.value);

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.activeCorners = [...ALL_CORNER_VALUES]; // Start with all 7 corners
        state.multiplier = 1; 
        state.lastSpinCount = 0; 
        state.initialized = true; 
    }

    // --- 3. PROCESS PREVIOUS SPIN RESULTS ---
    if (spinHistory.length > state.lastSpinCount) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        let winningNumber = parseInt(lastSpin.winningNumber, 10);
        if (isNaN(winningNumber)) winningNumber = -1; // Treat as loss if invalid

        // Find which of our ACTIVE corners hit
        const hittingCorners = CORNERS.filter(c => 
            state.activeCorners.includes(c.value) && 
            c.numbers.includes(winningNumber)
        );

        const isWin = hittingCorners.length > 0;

        if (isWin) {
            // WIN LOGIC 
            // Check Reset Rule: "If you win at the 5-corner stage, reset to full"
            if (state.activeCorners.length <= 5) {
                state.activeCorners = [...ALL_CORNER_VALUES];
            } else {
                // Removal Rule: Remove the specific corner(s) that won
                const hittingValues = hittingCorners.map(c => c.value);
                state.activeCorners = state.activeCorners.filter(val => !hittingValues.includes(val));
                
                // Safety: If somehow we drop below 1, reset
                if (state.activeCorners.length === 0) {
                    state.activeCorners = [...ALL_CORNER_VALUES];
                }
            }
            // Reset progression on win
            state.multiplier = 1;

        } else {
            // LOSS LOGIC: Double the bet
            state.multiplier *= 2;
        }

        // Update processed count
        state.lastSpinCount = spinHistory.length;
    }

    // --- 4. CALCULATE BET AMOUNTS ---
    const minBet = config.betLimits.min; 
    const maxBet = config.betLimits.max; 

    // Calculate raw amount 
    let rawAmount = minBet * state.multiplier; 

    // CLAMP TO LIMITS
    let finalAmount = Math.max(rawAmount, minBet); 
    finalAmount = Math.min(finalAmount, maxBet); 

    // --- 5. GENERATE BETS ---
    const bets = state.activeCorners.map(cornerValue => ({ 
        type: 'corner', 
        value: cornerValue, 
        amount: finalAmount 
    })); 

    return bets; 
}