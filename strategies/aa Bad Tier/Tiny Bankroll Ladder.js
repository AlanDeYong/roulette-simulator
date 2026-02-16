/**
 * STRATEGY: "The Tiny Bankroll Ladder" (Roulette Jackpot)
 * * SOURCE:
 * - Channel: ROULETTE JACKPOT
 * - Video: "ANOTHER TINY $45 BANKROLL..." (https://www.youtube.com/watch?v=-38_8cbz1DY)
 * * LOGIC:
 * - This is a low-budget, high-variance strategy designed for small bankrolls ($45-$50).
 * - Base Bet Structure (5 Units Total per spin):
 * 1. One Double Street (Line) bet (covers 6 numbers).
 * 2. Four Straight Up (Number) bets (covers 4 specific numbers).
 * - Total Coverage: 10 numbers (approx 27%).
 * - Placement: The host moves these bets around the board randomly ("go somewhere else on the board") after wins or losses.
 * * PROGRESSION ("The Ladder"):
 * - The strategy uses a specific recovery ladder based on consecutive losses.
 * - Trigger: "Two losses in a row means we get the ladder one time."
 * - Logic:
 * - 0 or 1 Loss: Flat bet (Level 1).
 * - 2+ Consecutive Losses: Increase bet level (Level 2, Level 3, etc.).
 * - Win: "Go back down the ladder." If a win occurs, reduce the level by 1 (or reset to 1 if the win is substantial/covers losses).
 * * GOAL:
 * - "Hit and Run." Target a quick $20-$25 profit (approx 50% of bankroll) and stop.
 * - Designed for "Gas money" or "Lunch money."
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPER FUNCTIONS ---
    
    // Define available Double Street (Line) starting numbers (Rows: 1-6, 4-9, etc.)
    const lineStarts = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31];

    // Helper: Get a random integer between min and max (inclusive)
    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Helper: Get random item from array
    const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 1;              // Current progression level (multiplier)
        state.consecutiveLosses = 0;  // Track losses for the "Ladder" trigger
        state.lastBankroll = bankroll; // To calculate win/loss from previous spin
        state.targetBankroll = bankroll + 25; // Target: +$25 profit
        state.initialized = true;
    }

    // --- 3. CHECK PREVIOUS RESULT (PROGRESSION LOGIC) ---
    if (spinHistory.length > 0) {
        const currentBankroll = bankroll;
        const wonLastSpin = currentBankroll > state.lastBankroll;

        if (wonLastSpin) {
            // WIN LOGIC: "Go back down the ladder"
            state.consecutiveLosses = 0;
            if (state.level > 1) {
                state.level--; 
            }
        } else {
            // LOSS LOGIC
            state.consecutiveLosses++;
            
            // "Two losses in a row means we get the ladder one time"
            // If we hit 2 losses, we go up. If we keep losing, we keep going up (risky, but per video implication of "laddering")
            if (state.consecutiveLosses >= 2) {
                state.level++;
            }
        }
        
        // Update snapshot for next spin
        state.lastBankroll = currentBankroll;
    }

    // --- 4. STOP CONDITIONS ---
    // Stop if we hit the target profit (Hit and Run)
    if (bankroll >= state.targetBankroll) {
        // Ideally, we stop here. Returning empty array stops betting.
        // console.log("Target reached! Stopping.");
        return []; 
    }

    // --- 5. CALCULATE BET SIZES ---
    // Determine the unit size based on limits
    const baseUnit = config.betLimits.min; 
    
    // Apply the "Level" multiplier
    let unitAmount = baseUnit * state.level;

    // CLAMP: Respect Table Limits
    // Ensure we don't bet less than min (redundant but safe) or more than max
    unitAmount = Math.max(unitAmount, config.betLimits.min);
    unitAmount = Math.min(unitAmount, config.betLimits.max);

    // --- 6. GENERATE BETS ---
    const bets = [];

    // A. Place 1 Double Street (Line) Bet
    const selectedLineStart = getRandomItem(lineStarts);
    bets.push({
        type: 'line',
        value: selectedLineStart,
        amount: unitAmount
    });

    // B. Place 4 Straight Up (Number) Bets
    // The video host places these somewhat randomly ("scattered coverage").
    // We will pick 4 unique numbers. Ideally, exclude the numbers covered by the line to maximize board coverage,
    // though the host sometimes overlaps. We'll allow overlap to mimic his chaotic style, or keep unique for efficiency.
    // Let's keep them unique for better efficiency.
    
    const coveredByLine = [
        selectedLineStart, selectedLineStart+1, selectedLineStart+2,
        selectedLineStart+3, selectedLineStart+4, selectedLineStart+5
    ];

    let numbersPicked = 0;
    const pickedNumbers = [];

    while (numbersPicked < 4) {
        const randNum = getRandomInt(0, 36);
        
        // Ensure we don't pick the same number twice
        if (!pickedNumbers.includes(randNum)) {
            bets.push({
                type: 'number',
                value: randNum,
                amount: unitAmount
            });
            pickedNumbers.push(randNum);
            numbersPicked++;
        }
    }

    return bets;
}