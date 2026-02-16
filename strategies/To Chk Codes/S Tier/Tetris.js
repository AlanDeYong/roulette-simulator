<<<<<<< HEAD
/**
 * Strategy: The Tetris Protocol
 * Source: The Lucky Felt (YouTube) - https://www.youtube.com/watch?v=20WOpWL4-u0
 *
 * Logic:
 * This strategy mimics the game Tetris by "dropping blocks" (placing bets) onto the felt
 * to build a "wall of wins." It combines board coverage expansion with a negative progression.
 *
 * The Wall (Bet Sequence):
 * 1. Double Street (Line) - Covers 6 numbers (e.g., 1-6)
 * 2. Corner - Covers 4 numbers (e.g., 7, 8, 10, 11)
 * 3. Street - Covers 3 numbers (e.g., 13-15)
 * 4. Split - Covers 2 numbers (e.g., 17 & 20)
 * 5. Straight Up - Covers 1 number (e.g., 23)
 *
 * Progression Rules:
 * 1. Start with Bet 1 (Double Street) at 1 unit.
 * 2. On Loss:
 * - If the "Wall" is not fully built (fewer than 5 bets active): Add the next bet in the sequence.
 * - If the "Wall" IS fully built (all 5 bets active): Increase the unit size for ALL bets by +1.
 * 3. On Win (but Bankroll <= Session High):
 * - Repeat the exact same bets and unit sizes. Do not regress or progress.
 * 4. On Win (Bankroll > Session High):
 * - RESET everything. Clear the board.
 * - Set new Session High to current bankroll.
 * - Start over with just Bet 1 at 1 unit.
 *
 * Goal:
 * Achieve a new session high bankroll (typically targeting +20% overall).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    const baseUnit = config.betLimits.min; // Inside bets use min limit
    
    // Define the "Tetris Blocks" (The fixed sequence of bets)
    // We arrange them to be somewhat adjacent but covering different numbers ("Building a wall")
    const betSequence = [
        { type: 'line', value: 1 },         // Covers 1-6
        { type: 'corner', value: 7 },       // Covers 7, 8, 10, 11
        { type: 'street', value: 13 },      // Covers 13-15
        { type: 'split', value: [17, 20] }, // Covers 17, 20
        { type: 'number', value: 23 }       // Covers 23
    ];

    // 2. Initialize State
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll; // Track the highest point (or starting point)
        state.activeBetsCount = 1;    // How many blocks are on the board (1 to 5)
        state.unitLevel = 1;          // The multiplier for all bets
    }

    // 3. Process Last Spin (if any)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Check for Reset Condition (New High)
        if (bankroll > state.sessionHigh) {
            // SUCCESS: We breached the high water mark. Reset.
            state.sessionHigh = bankroll;
            state.activeBetsCount = 1;
            state.unitLevel = 1;
            // console.log(`[Tetris] New High: ${bankroll}. Resetting.`);
        } else {
            // RECOVERY MODE
            // Determine if the last spin was a win or loss for *us*
            // Since we don't have the exact payout of the last specific bet in 'spinHistory' easily without recalculating,
            // we infer logic based on bankroll movement relative to the *previous* bankroll.
            // However, a standard simplification for this strategy:
            // "If we didn't hit a new high, did we at least win something?"
            // The video logic is strict: Only reset on session high.
            // On LOSS: Expand or Inflate.
            // On WIN (below high): Repeat.
            
            // To detect a "Loss" vs "Win" without previous bankroll stored:
            // We can look at the bet coverage. 
            // Simpler approach: If bankroll went DOWN, it's a loss. If UP, it's a win.
            // We need to store previous bankroll in state to know this direction.
        }
    }

    // Determine direction based on stored previous bankroll (for accurate Win/Loss detection)
    if (state.lastBankroll !== undefined) {
        if (bankroll > state.sessionHigh) {
            // Handled above in initialization check, but reiterated here for logic flow
            // Reset already happened or will happen naturally by setting vars
        } else if (bankroll > state.lastBankroll) {
            // WIN (but not high): Repeat (Do nothing to state)
            // console.log(`[Tetris] Win (Below High). Repeating bets.`);
        } else if (bankroll < state.lastBankroll) {
            // LOSS: Expand or Inflate
            if (state.activeBetsCount < betSequence.length) {
                // Expand: Add another block
                state.activeBetsCount++;
                // console.log(`[Tetris] Loss. Expanding to ${state.activeBetsCount} blocks.`);
            } else {
                // Inflate: Wall is full, increase height (units)
                state.unitLevel++;
                // console.log(`[Tetris] Wall Full. Inflating to Unit Level ${state.unitLevel}.`);
            }
        }
    }

    // Store current bankroll for next comparison
    state.lastBankroll = bankroll;

    // 4. Construct Bets
    const bets = [];

    // Loop through the active number of blocks
    for (let i = 0; i < state.activeBetsCount; i++) {
        const betDef = betSequence[i];
        
        // Calculate Amount
        // Formula: Base Unit * Global Unit Level
        let amount = baseUnit * state.unitLevel;

        // Clamp to Limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({
            type: betDef.type,
            value: betDef.value,
            amount: amount
        });
    }

    return bets;
=======
/**
 * Strategy: The Tetris Protocol
 * Source: The Lucky Felt (YouTube) - https://www.youtube.com/watch?v=20WOpWL4-u0
 *
 * Logic:
 * This strategy mimics the game Tetris by "dropping blocks" (placing bets) onto the felt
 * to build a "wall of wins." It combines board coverage expansion with a negative progression.
 *
 * The Wall (Bet Sequence):
 * 1. Double Street (Line) - Covers 6 numbers (e.g., 1-6)
 * 2. Corner - Covers 4 numbers (e.g., 7, 8, 10, 11)
 * 3. Street - Covers 3 numbers (e.g., 13-15)
 * 4. Split - Covers 2 numbers (e.g., 17 & 20)
 * 5. Straight Up - Covers 1 number (e.g., 23)
 *
 * Progression Rules:
 * 1. Start with Bet 1 (Double Street) at 1 unit.
 * 2. On Loss:
 * - If the "Wall" is not fully built (fewer than 5 bets active): Add the next bet in the sequence.
 * - If the "Wall" IS fully built (all 5 bets active): Increase the unit size for ALL bets by +1.
 * 3. On Win (but Bankroll <= Session High):
 * - Repeat the exact same bets and unit sizes. Do not regress or progress.
 * 4. On Win (Bankroll > Session High):
 * - RESET everything. Clear the board.
 * - Set new Session High to current bankroll.
 * - Start over with just Bet 1 at 1 unit.
 *
 * Goal:
 * Achieve a new session high bankroll (typically targeting +20% overall).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    const baseUnit = config.betLimits.min; // Inside bets use min limit
    
    // Define the "Tetris Blocks" (The fixed sequence of bets)
    // We arrange them to be somewhat adjacent but covering different numbers ("Building a wall")
    const betSequence = [
        { type: 'line', value: 1 },         // Covers 1-6
        { type: 'corner', value: 7 },       // Covers 7, 8, 10, 11
        { type: 'street', value: 13 },      // Covers 13-15
        { type: 'split', value: [17, 20] }, // Covers 17, 20
        { type: 'number', value: 23 }       // Covers 23
    ];

    // 2. Initialize State
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll; // Track the highest point (or starting point)
        state.activeBetsCount = 1;    // How many blocks are on the board (1 to 5)
        state.unitLevel = 1;          // The multiplier for all bets
    }

    // 3. Process Last Spin (if any)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Check for Reset Condition (New High)
        if (bankroll > state.sessionHigh) {
            // SUCCESS: We breached the high water mark. Reset.
            state.sessionHigh = bankroll;
            state.activeBetsCount = 1;
            state.unitLevel = 1;
            // console.log(`[Tetris] New High: ${bankroll}. Resetting.`);
        } else {
            // RECOVERY MODE
            // Determine if the last spin was a win or loss for *us*
            // Since we don't have the exact payout of the last specific bet in 'spinHistory' easily without recalculating,
            // we infer logic based on bankroll movement relative to the *previous* bankroll.
            // However, a standard simplification for this strategy:
            // "If we didn't hit a new high, did we at least win something?"
            // The video logic is strict: Only reset on session high.
            // On LOSS: Expand or Inflate.
            // On WIN (below high): Repeat.
            
            // To detect a "Loss" vs "Win" without previous bankroll stored:
            // We can look at the bet coverage. 
            // Simpler approach: If bankroll went DOWN, it's a loss. If UP, it's a win.
            // We need to store previous bankroll in state to know this direction.
        }
    }

    // Determine direction based on stored previous bankroll (for accurate Win/Loss detection)
    if (state.lastBankroll !== undefined) {
        if (bankroll > state.sessionHigh) {
            // Handled above in initialization check, but reiterated here for logic flow
            // Reset already happened or will happen naturally by setting vars
        } else if (bankroll > state.lastBankroll) {
            // WIN (but not high): Repeat (Do nothing to state)
            // console.log(`[Tetris] Win (Below High). Repeating bets.`);
        } else if (bankroll < state.lastBankroll) {
            // LOSS: Expand or Inflate
            if (state.activeBetsCount < betSequence.length) {
                // Expand: Add another block
                state.activeBetsCount++;
                // console.log(`[Tetris] Loss. Expanding to ${state.activeBetsCount} blocks.`);
            } else {
                // Inflate: Wall is full, increase height (units)
                state.unitLevel++;
                // console.log(`[Tetris] Wall Full. Inflating to Unit Level ${state.unitLevel}.`);
            }
        }
    }

    // Store current bankroll for next comparison
    state.lastBankroll = bankroll;

    // 4. Construct Bets
    const bets = [];

    // Loop through the active number of blocks
    for (let i = 0; i < state.activeBetsCount; i++) {
        const betDef = betSequence[i];
        
        // Calculate Amount
        // Formula: Base Unit * Global Unit Level
        let amount = baseUnit * state.unitLevel;

        // Clamp to Limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({
            type: betDef.type,
            value: betDef.value,
            amount: amount
        });
    }

    return bets;
>>>>>>> origin/main
}