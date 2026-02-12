/**
 * Strategy: The "15-Unit Grinder" (Roulette Jackpot 2026)
 * * Source: 
 * - Video: "OUR BEST ROULETTE STRATEGY SO FAR OF 2026"
 * - Channel: ROULETTE JACKPOT
 * - URL: https://www.youtube.com/watch?v=cRTXAstqy6M
 * * The Logic:
 * This is a high-coverage "Grind" strategy designed for short sessions.
 * It uses a fixed ratio of 15 units per "Set" to cover a large portion of the board.
 * * Bet Setup (15 Units Total Base):
 * 1. Main Bet (11 Units): Placed on a single Dozen (Pays 2:1).
 * 2. Safety Bet (1 Unit): Placed on a 6-Line (Double Street) outside the Dozen (Pays 5:1).
 * - Note: A hit here results in a net loss of -9 units (Return 6, Cost 15), but prevents a total wipeout.
 * 3. Pot Shot Bets (3 Units): 3 Single numbers placed randomly on remaining uncovered areas (Pays 35:1).
 * * The Progression (Ladder System):
 * - Win (Main Dozen or Single Number): Reset to Base Tier (1).
 * - Total Loss (Nothing hits): Increase Tier immediately (1 -> 2 -> 3...).
 * - Safety Hit (Line Bet hits):
 * - If 1st Safety: Hold current Tier.
 * - If 2nd Safety in a row: Increase Tier (Ladder up) to break the stagnation.
 * * The Goal:
 * - Quick hit-and-run profit (e.g., +20 to +50 units) then stop or reset.
 * - Video demonstrates a "Ladder" recovery to recoup losses quickly.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Unit Calculation
    // We need to establish a base unit that respects the table minimums.
    // The Dozen bet (11 units) must be >= minOutside.
    // The Single bets (1 unit) must be >= min.
    
    const minChip = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    
    // Calculate the smallest valid unit size to satisfy the 11:1 ratio constraints
    // If minOutside is 5 and min is 1: 11 units must be >= 5. So unit 1 is fine (11 > 5).
    // If minOutside is 10 and min is 1: unit must be at least 0.91, rounded up to 1.
    const calculatedUnit = Math.max(minChip, Math.ceil(minOutside / 11));
    const MAX_BET = config.betLimits.max;

    // 2. State Initialization
    if (!state.tier) state.tier = 1;
    if (!state.safetyStreak) state.safetyStreak = 0;
    if (!state.currentDozen) state.currentDozen = 1; // Start with Dozen 1 (1-12)

    // 3. Process Last Spin (Meta-Cognitive logic)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Retrieve what we bet last time from state (or assume based on logic if not stored)
        // Ideally, we check the actual profit. 
        // Since we don't have the exact previous bet object in 'spinHistory', we infer from the logic.
        // A simpler way in this specific function structure is to look at the bankroll change if we tracked it,
        // but for pure logic, we check if the number was in our winning zones.
        
        const lastDozenHit = getDozen(lastNumber) === state.currentDozen;
        
        // We need to know where our safety line and singles were. 
        // For simplicity in this simulation, we assume:
        // - Win: Dozen hit OR Single Hit
        // - Safety: Line Hit
        // - Loss: Nothing Hit
        
        // Note: Exact hit detection requires storing the specific numbers chosen in 'state'.
        // Let's retrieve them.
        const prevTargetDozen = state.lastBetDozen || 1;
        const prevSafetyLineStart = state.lastSafetyLineStart || 0; 
        const prevSingles = state.lastSingles || [];

        let outcome = 'loss'; // Default
        
        if (lastDozenHit) {
            outcome = 'win';
        } else if (isNumberInLine(lastNumber, prevSafetyLineStart)) {
            outcome = 'safety';
        } else if (prevSingles.includes(lastNumber)) {
            outcome = 'win'; // Big win
        }

        // Apply Progression Rules
        if (outcome === 'win') {
            state.tier = 1;
            state.safetyStreak = 0;
            // Rotate dozen on win for variety, or stay. Video implies moving around.
            state.currentDozen = (state.currentDozen % 3) + 1; 
        } else if (outcome === 'safety') {
            state.safetyStreak++;
            if (state.safetyStreak >= 2) {
                // Video: "When two safeties come out in a row we advance"
                state.tier++;
                state.safetyStreak = 0; // Reset streak after advancing
            }
            // Else stay on current tier
        } else {
            // Total Loss
            state.tier++;
            state.safetyStreak = 0;
        }
    }

    // 4. Construct Bets
    // Ratio: 11 (Dozen) : 1 (Safety Line) : 1 (Single) : 1 (Single) : 1 (Single)
    // Total Units: 15
    
    const currentUnit = calculatedUnit * state.tier;
    
    // Check Max Bet limit for the Dozen (the largest bet)
    if (currentUnit * 11 > MAX_BET) {
        // Cap the tier if we hit table limits to prevent rejection
        // This effectively flattens the progression at the table max
        const maxUnit = Math.floor(MAX_BET / 11);
        if (currentUnit > maxUnit) {
             // We can't bet this high. We proceed with max allowed or reset. 
             // Logic: clamp to max allowed.
        }
    }

    const bets = [];

    // A. Main Bet: 11 Units on Dozen
    // Ensure amount is clamped
    let dozenAmount = currentUnit * 11;
    dozenAmount = Math.max(dozenAmount, minOutside);
    dozenAmount = Math.min(dozenAmount, MAX_BET);
    
    bets.push({
        type: 'dozen',
        value: state.currentDozen,
        amount: dozenAmount
    });

    // B. Safety Bet: 1 Unit on a 6-Line (Double Street)
    // Find a line NOT in the current Dozen.
    // Dozen 1: 1-12. Dozen 2: 13-24. Dozen 3: 25-36.
    let safetyLineStart;
    if (state.currentDozen === 1) safetyLineStart = 13; // Covers 13-18
    else if (state.currentDozen === 2) safetyLineStart = 25; // Covers 25-30
    else safetyLineStart = 1; // Covers 1-6
    
    let singleUnitAmount = Math.max(currentUnit, minChip);
    singleUnitAmount = Math.min(singleUnitAmount, MAX_BET);

    bets.push({
        type: 'line',
        value: safetyLineStart,
        amount: singleUnitAmount
    });

    // C. Pot Shot Bets: 3 Single Units
    // Pick 3 random numbers that are NOT in the Dozen and NOT in the Safety Line
    const excludedNumbers = [];
    
    // Exclude Dozen numbers
    const dozenStart = (state.currentDozen - 1) * 12 + 1;
    for(let i=0; i<12; i++) excludedNumbers.push(dozenStart + i);
    
    // Exclude Safety Line numbers
    for(let i=0; i<6; i++) excludedNumbers.push(safetyLineStart + i);

    // Pick 3 unique randoms
    const chosenSingles = [];
    while(chosenSingles.length < 3) {
        // Random 0-36
        const rand = Math.floor(Math.random() * 37);
        if (!excludedNumbers.includes(rand) && !chosenSingles.includes(rand)) {
            chosenSingles.push(rand);
            bets.push({
                type: 'number',
                value: rand,
                amount: singleUnitAmount
            });
        }
    }

    // 5. Store State for Next Loop (Verification)
    state.lastBetDozen = state.currentDozen;
    state.lastSafetyLineStart = safetyLineStart;
    state.lastSingles = chosenSingles;

    return bets;
}

// --- Helper Functions ---

function getDozen(number) {
    if (number === 0) return 0;
    if (number <= 12) return 1;
    if (number <= 24) return 2;
    return 3;
}

function isNumberInLine(number, lineStart) {
    // A line bet covers lineStart to lineStart + 5
    // e.g., Line 1 covers 1,2,3,4,5,6
    return number >= lineStart && number < lineStart + 6;
}