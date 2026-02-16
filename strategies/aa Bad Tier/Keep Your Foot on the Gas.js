/**
 * STRATEGY: "Keep Your Foot on the Gas" (High Coverage / Moving Numbers)
 * * SOURCE:
 * - Channel: ROULETTE JACKPOT
 * - Video: "HIGH COVERAGE LOW BUDGET! I MADE A QUICK $250..."
 * - URL: https://www.youtube.com/watch?v=CnKPl_72eU4
 * * THE LOGIC:
 * This is a fixed-pattern coverage strategy that focuses on the 2nd and 3rd Dozens,
 * weighing the bets heavier towards the higher numbers.
 * * The board coverage (approx 66%) consists of 5 distinct bet zones:
 * 1. Split 11/12 (Safety/Insurance)
 * 2. Double Street (Line) 16-21 (Safety/Push)
 * 3. Double Street (Line) 22-27 (Moderate Profit)
 * 4. Double Street (Line) 28-33 (High Profit)
 * 5. Street 34-36 (Jackpot/Top Profit)
 * * Note: 0 and 13 are explicit "holes" (losses) in this setup.
 * * THE PROGRESSION:
 * The narrator uses a chant "One, One, Two, Three, Four" (and sometimes "Five") to determine units.
 * 1. Base Level: [1, 1, 2, 3, 4] units distributed across the 5 zones respectively.
 * 2. "Gas" Level (Recovery/Aggression): [1, 1, 2, 3, 5] units. The top bet increases to 5 units.
 * * TRIGGER:
 * - Default to Base Level.
 * - If the previous spin was a loss (or if Bankroll is below High Water Mark), 
 * switch to "Gas" Level (5 units on top) to recover quickly.
 * * THE GOAL:
 * Quick hit-and-run profit. The narrator emphasizes speed ("Quick $250").
 * * @param {Array} spinHistory - Array of past spin objects
 * @param {Number} bankroll - Current bankroll amount
 * @param {Object} config - Configuration object with betLimits
 * @param {Object} state - Persistent state object
 * @param {Object} utils - Utility functions
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    
    // Define the base unit size using the Table Minimum for Inside Bets
    const baseUnit = config.betLimits.min;

    // Initialize State
    if (state.highWaterMark === undefined) state.highWaterMark = bankroll;
    if (state.lastBetTotal === undefined) state.lastBetTotal = 0;

    // Update High Water Mark
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
    }

    // --- 2. DETERMINE PROGRESSION LEVEL ---

    // Logic: If we are below our session peak (High Water Mark) OR the last spin was a loss, 
    // we put our "Foot on the Gas" (Aggressive Mode). Otherwise, standard mode.
    
    let useGasMode = false;
    
    if (spinHistory.length > 0) {
        const lastWinAmount = bankroll - (state.lastBankroll || bankroll) + state.lastBetTotal;
        const lastSpinWasLoss = lastWinAmount < state.lastBetTotal;
        
        // If we lost last spin, or we are trailing our best bankroll, increase top bet
        if (lastSpinWasLoss || bankroll < state.highWaterMark) {
            useGasMode = true;
        }
    }
    
    // Store current bankroll for next spin comparison
    state.lastBankroll = bankroll;

    // --- 3. CALCULATE UNITS ---
    
    // The Chant: "One, One, Two, Three, Four (or Five)"
    // Position 1: Split 11/12
    // Position 2: Line 16-21
    // Position 3: Line 22-27
    // Position 4: Line 28-33
    // Position 5: Street 34-36
    
    const units = [
        1,              // Pos 1 (Safety)
        1,              // Pos 2 (Safety)
        2,              // Pos 3 (Mid)
        3,              // Pos 4 (High)
        useGasMode ? 5 : 4  // Pos 5 (Top - The "Gas" variation)
    ];

    // Helper to calculate valid amount respecting table limits
    const getAmount = (numUnits) => {
        let val = numUnits * baseUnit;
        val = Math.max(val, config.betLimits.min); // Clamp Min
        val = Math.min(val, config.betLimits.max); // Clamp Max
        return val;
    };

    // --- 4. CONSTRUCT BETS ---
    
    const bets = [];

    // Bet 1: Split 11-12 (Safety)
    // Note: Use 'split' with an array of two numbers
    bets.push({
        type: 'split',
        value: [11, 12],
        amount: getAmount(units[0])
    });

    // Bet 2: Double Street (Line) 16-21
    // Value is the starting number of the line (16)
    bets.push({
        type: 'line',
        value: 16,
        amount: getAmount(units[1])
    });

    // Bet 3: Double Street (Line) 22-27
    bets.push({
        type: 'line',
        value: 22,
        amount: getAmount(units[2])
    });

    // Bet 4: Double Street (Line) 28-33
    bets.push({
        type: 'line',
        value: 28,
        amount: getAmount(units[3])
    });

    // Bet 5: Street 34-36
    // Value is the starting number of the street (34)
    bets.push({
        type: 'street',
        value: 34,
        amount: getAmount(units[4])
    });

    // --- 5. LOGGING & RETURN ---

    // Calculate total bet for state tracking
    state.lastBetTotal = bets.reduce((sum, b) => sum + b.amount, 0);

    // Stop if bankroll is too low to cover the spread
    if (bankroll < state.lastBetTotal) {
        // console.log("Bankroll too low to continue strategy.");
        return [];
    }

    return bets;
}