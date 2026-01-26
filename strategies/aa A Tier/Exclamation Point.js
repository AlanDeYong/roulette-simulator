/**
 * STRATEGY: The "Exclamation Point" System (Accumulation Variant)
 * * SOURCE: 
 * YouTube: Bet With MO - "BEST ROULETTE STRATEGY | MASSIVE WIN | CASINOS HATE IT"
 * URL: https://youtu.be/qSZUWzoD4XI?si=46B1i6w5J9l8CMEz
 * * * THE LOGIC (CORRECTED):
 * 1. Identify a "Cold Dozen" (the dozen that hasn't hit for the longest time).
 * 2. Target streets within that Dozen using the "Exclamation Point" structure:
 * - 1 Unit on the Street.
 * - 1 Unit on EACH number in that street (Straight Up).
 * * * THE PROGRESSION (Accumulation -> Doubling):
 * - Stage 1: Bet on the 1st Street of the target Dozen.
 * - Stage 2 (Loss): Keep 1st Street, ADD 2nd Street. (2 Streets total).
 * - Stage 3 (Loss): Keep 1st & 2nd, ADD 3rd Street. (3 Streets total).
 * - Stage 4 (Loss): Keep 1st, 2nd, & 3rd, ADD 4th Street. (4 Streets / Full Dozen covered).
 * - Stage 5+ (Loss): Keep all 4 Streets, DOUBLE the unit size (Martingale on the full Dozen saturation).
 * * * THE GOAL:
 * - Hit a number within the covered area. The Straight Up win (35:1) + Street win (11:1) provides massive recovery.
 * - Reset to Stage 1 and find a new Cold Dozen after any win.
 */

function bet(spinHistory, bankroll, config, state) {
    // --- 1. Helper Data ---
    // Start numbers for streets in each Dozen
    // Dozen 1: Streets starting 1, 4, 7, 10
    // Dozen 2: Streets starting 13, 16, 19, 22
    // Dozen 3: Streets starting 25, 28, 31, 34
    const DOZEN_STREETS = {
        1: [1, 4, 7, 10],
        2: [13, 16, 19, 22],
        3: [25, 28, 31, 34]
    };

    // --- 2. State Initialization ---
    if (!state.active) {
        state.active = false;       // Currently betting?
        state.targetDozen = null;   // Which dozen (1, 2, or 3)
        state.stage = 0;            // Progression stage (0 = 1 street, 3 = 4 streets, 4+ = doubling)
    }

    // --- 3. Process Last Spin (Win/Loss Logic) ---
    if (state.active && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Calculate which numbers were covered in the last bet
        const streetStarts = DOZEN_STREETS[state.targetDozen];
        
        // How many streets were we betting on?
        // If stage is 0, we bet on index 0. If stage is 3, we bet on indices 0,1,2,3.
        // Cap usage at 4 streets (index 0-3)
        const streetsToCheck = Math.min(state.stage + 1, 4);
        
        let isWin = false;

        // Check if winning number falls in any of our active streets
        for (let i = 0; i < streetsToCheck; i++) {
            const sStart = streetStarts[i];
            if (lastNum >= sStart && lastNum <= sStart + 2) {
                isWin = true;
                break;
            }
        }

        if (isWin) {
            // WIN: Reset and look for new opportunity
            state.active = false;
            state.targetDozen = null;
            state.stage = 0;
            // We return empty here to force a re-evaluation of the "Cold Dozen" on the next spin
            // or we can proceed immediately. Let's proceed immediately to finding the next target.
        } else {
            // LOSS: Increase Stage
            // Stages 0-3 adds streets. Stage 4+ doubles bets.
            state.stage++;
        }
    }

    // --- 4. Trigger: Find Cold Dozen (If not active) ---
    if (!state.active) {
        if (spinHistory.length < 1) return []; // Need some history

        const lastSeen = { 1: -1, 2: -1, 3: -1 };
        
        // Scan backwards
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const num = spinHistory[i].winningNumber;
            if (num === 0 || num === '00') continue;

            let d = 0;
            if (num <= 12) d = 1;
            else if (num <= 24) d = 2;
            else d = 3;

            // Record the most recent index for this dozen if not found yet
            if (lastSeen[d] === -1) lastSeen[d] = i;
        }

        // Find the dozen with the smallest index (oldest appearance)
        // If a dozen hasn't appeared (-1), it is the coldest.
        let coldDozen = 1;
        let oldestIndex = Infinity;

        // We want the dozen with the smallest `lastSeen` index. 
        // If `lastSeen` is -1, it effectively has index -Infinity (it's the coldest).
        
        [1, 2, 3].forEach(d => {
            let idx = lastSeen[d];
            // If strictly colder (or if checking missing dozens)
            if (idx === -1) {
                coldDozen = d;
                oldestIndex = -1;
            } else if (oldestIndex !== -1 && idx < oldestIndex) {
                coldDozen = d;
                oldestIndex = idx;
            }
        });

        state.targetDozen = coldDozen;
        state.active = true;
        state.stage = 0;
    }

    // --- 5. Construct Bets ---
    const bets = [];
    const streetStarts = DOZEN_STREETS[state.targetDozen];

    // Determine how many streets to bet on (1 to 4)
    const activeStreetCount = Math.min(state.stage + 1, 4);

    // Determine Multiplier
    // Stages 0, 1, 2, 3 = Multiplier 1 (Accumulating streets)
    // Stage 4 = Multiplier 2 (Double)
    // Stage 5 = Multiplier 4
    // Formula: 2 ^ (state.stage - 3) if stage >= 4, else 1
    let multiplier = 1;
    if (state.stage >= 4) {
        multiplier = Math.pow(2, state.stage - 3);
    }

    // Calculate Unit Amount
    const baseUnit = config.betLimits.min; 
    let amount = baseUnit * multiplier;

    // Clamp to Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // Build the objects for every active street
    for (let i = 0; i < activeStreetCount; i++) {
        const sStart = streetStarts[i];

        // 1. Street Bet
        bets.push({
            type: 'street',
            value: sStart,
            amount: amount
        });

        // 2. Straight Up Bets (The Exclamation Points)
        for (let j = 0; j < 3; j++) {
            bets.push({
                type: 'number',
                value: sStart + j,
                amount: amount
            });
        }
    }

    return bets;
}