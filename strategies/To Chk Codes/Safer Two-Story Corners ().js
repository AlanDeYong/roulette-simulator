/**
 * Strategy: Safer Two-Story Corners
 * * Source: CEG Dealer School (YouTube)
 * * The Logic:
 * - This strategy focuses on "Corners" (Inside bets covering 4 numbers).
 * - It uses disjoint (non-overlapping) corners to increase coverage mathematically.
 * - Trigger: Bets are placed every spin. The number of corners increases after losses.
 * * The Progression ("Two Stories"):
 * - Story 1 (Accumulation): Levels 1-3. Uses 1 Base Unit.
 * - Level 1: 1 Corner (Covering 4 numbers).
 * - Level 2: 2 Corners (Covering 8 numbers).
 * - Level 3: 3 Corners (Covering 12 numbers).
 * - Story 2 (Recovery): Levels 4-6. Uses 2 Base Units (Double the stake).
 * - Level 4: 4 Corners (Covering 16 numbers).
 * - Level 5: 5 Corners (Covering 20 numbers).
 * - Level 6: 6 Corners (Covering 24 numbers).
 * * Win/Loss Handling:
 * - Loss: Move to the next Level (add a corner).
 * - Win: Reset immediately to Level 1.
 * - Transition: If Level 3 loses, jump to Level 4 (Story 2) and double the unit size.
 * - Stop Loss: If Level 6 loses, reset to Level 1 to prevent bankroll ruin.
 * * The Goal:
 * - Accumulate small wins in Story 1.
 * - Use Story 2 strictly to recover losses from a bad run in Story 1.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- 1. Strategy Constants & Helpers ---
    
    // Disjoint Corner Sets (Top-left numbers)
    // 1 covers 1,2,4,5
    // 7 covers 7,8,10,11
    // 13 covers 13,14,16,17...
    const DISJOINT_CORNERS = [1, 7, 13, 19, 25, 31];

    // Helper to calculate exact numbers covered by a corner for win checking
    const getCornerNumbers = (topLeft) => [topLeft, topLeft + 1, topLeft + 3, topLeft + 4];

    // --- 2. Initialize State ---
    if (state.level === undefined) state.level = 1;
    if (state.lastCoveredNumbers === undefined) state.lastCoveredNumbers = [];

    // --- 3. Process Previous Spin (Progression Logic) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        // Check if we won the last bet based on state history
        // (We can't rely solely on bankroll diff if other external factors exist, so we check numbers)
        const isWin = state.lastCoveredNumbers.includes(lastNumber);

        if (isWin) {
            // Win Condition: Reset to Level 1 (Base Accumulation)
            state.level = 1;
        } else {
            // Loss Condition: Progress
            if (state.level >= 6) {
                // Stop Loss Triggered: Reset to 1
                state.level = 1;
            } else {
                // Move up a level (add a corner or jump stories)
                state.level++;
            }
        }
    }

    // --- 4. Determine Bet Parameters ---
    
    let cornersCount = 0;
    let baseUnitMultiplier = 1;

    // Map Level to Count and Unit Multiplier
    if (state.level <= 3) {
        // Story 1: Levels 1-3
        cornersCount = state.level; // L1=1 corner, L2=2 corners, L3=3 corners
        baseUnitMultiplier = 1;     // Standard unit
    } else {
        // Story 2: Levels 4-6
        cornersCount = state.level; // L4=4 corners, L5=5 corners, L6=6 corners
        baseUnitMultiplier = 2;     // Double unit for recovery
    }

    // --- 5. Calculate Bet Amount with Limits ---

    // Define Base Unit: Use table minimum for Inside bets
    const tableMin = config.betLimits.min; 
    
    // Calculate raw bet amount per corner
    let betAmount = tableMin * baseUnitMultiplier;

    // CLAMP TO LIMITS (Crucial)
    // 1. Ensure >= Table Min (Inside)
    betAmount = Math.max(betAmount, config.betLimits.min);
    // 2. Ensure <= Table Max
    betAmount = Math.min(betAmount, config.betLimits.max);

    // --- 6. Construct Bets ---
    
    const activeBets = [];
    const nextCoveredNumbers = [];

    // Loop through the disjoint corners list based on the count required for this level
    for (let i = 0; i < cornersCount; i++) {
        // Safety check: ensure we don't exceed available disjoint corners (max 6 on standard board)
        if (i >= DISJOINT_CORNERS.length) break;

        const cornerVal = DISJOINT_CORNERS[i];

        activeBets.push({
            type: 'corner',
            value: cornerVal,
            amount: betAmount
        });

        // Record numbers for next spin's win/loss check
        const covered = getCornerNumbers(cornerVal);
        nextCoveredNumbers.push(...covered);
    }

    // Update state for next turn
    state.lastCoveredNumbers = nextCoveredNumbers;

    return activeBets;
}