/**
 * Strategy: Double Street & Outside Hedge (Martingale Switch)
 * * Source: YouTube / Roulette Strategy
 * * The Logic:
 * This strategy uses a "Romanosky" style hedging approach, covering 27 numbers and leaving 10 open (including zero).
 * It alternates between two modes ("Sides") upon winning:
 * - Side A (Low): 
 * - 20 units on Low (1-18)
 * - 5 units each on Streets 28 (28-30), 31 (31-33), 34 (34-36)
 * - Losing numbers: 19-27 and 0.
 * - Side B (High):
 * - 20 units on High (19-36)
 * - 5 units each on Streets 1 (1-3), 4 (4-6), 7 (7-9)
 * - Losing numbers: 10-18 and 0.
 * * The Progression:
 * - Martingale: On a loss, the bet multiplier is doubled (x2).
 * - Reset: On a win, the multiplier resets to x1.
 * * The Trigger (Switching):
 * - The strategy switches sides (Low <-> High) ONLY after a win (on the reset).
 * - On a loss, it repeats the same side with double the bet.
 * * The Goal:
 * - Generate consistent small profits by covering ~73% of the board, using the progression to recover losses.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. Helper Function to Respect Limits ---
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

    // --- 2. Initialize State ---
    if (!state.initialized) {
        state.currentSide = 'low'; // Start with Low side as requested
        state.multiplier = 1;      // Start with 1x multiplier
        state.initialized = true;
    }

    // --- 3. Process Last Spin (Win/Loss Check) ---
    // We only check for win/loss if there is history.
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let won = false;

        // Determine win based on the side we JUST played
        if (state.currentSide === 'low') {
            // Win if Low (1-18) OR covered streets (28-36)
            if ((lastNum >= 1 && lastNum <= 18) || (lastNum >= 28 && lastNum <= 36)) {
                won = true;
            }
        } else {
            // Win if High (19-36) OR covered streets (1-9)
            if ((lastNum >= 19 && lastNum <= 36) || (lastNum >= 1 && lastNum <= 9)) {
                won = true;
            }
        }

        // Apply Progression Logic
        if (won) {
            // Win: Reset multiplier and Switch Side
            state.multiplier = 1;
            state.currentSide = (state.currentSide === 'low') ? 'high' : 'low';
        } else {
            // Loss: Double multiplier, Stay on same side
            state.multiplier *= 2;
        }
    }

    // --- 4. Define Base Units ---
    // We treat 'config.betLimits.min' as "1 unit".
    // Requirements: 20 units for Outside, 5 units for Inside.
    const baseUnit = config.betLimits.min; 
    
    // Calculate raw amounts
    let rawOutside = 4 * baseUnit * state.multiplier;
    let rawInside = 1 * baseUnit * state.multiplier;

    // --- 5. Clamp to Limits ---
    const amountOutside = clamp(rawOutside, config.betLimits.minOutside, config.betLimits.max);
    const amountInside = clamp(rawInside, config.betLimits.min, config.betLimits.max);

    // --- 6. Construct Bets ---
    const bets = [];

    if (state.currentSide === 'low') {
        // Side A: Low + High Streets
        bets.push({ type: 'low', amount: amountOutside });
        bets.push({ type: 'street', value: 28, amount: amountInside });
        bets.push({ type: 'street', value: 31, amount: amountInside });
        bets.push({ type: 'street', value: 34, amount: amountInside });
    } else {
        // Side B: High + Low Streets
        bets.push({ type: 'high', amount: amountOutside });
        bets.push({ type: 'street', value: 1, amount: amountInside });
        bets.push({ type: 'street', value: 4, amount: amountInside });
        bets.push({ type: 'street', value: 7, amount: amountInside });
    }

    return bets;
}