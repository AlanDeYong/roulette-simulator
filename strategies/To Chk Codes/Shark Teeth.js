
/**
 * Strategy: Shark Teeth
 * Source: "TOP ROULETTE STRATEGY | WIN HUGE JACKPOTS AT THE CASINO" by Bet With MO
 * URL: https://www.youtube.com/watch?v=hL0DBki2Y4k
 *
 * THE LOGIC:
 * This is a "Cover" strategy that targets a specific 12-number section (Dozen area)
 * but uses a cluster of Inside Bets rather than the Dozen bet itself to maximize payout potential.
 *
 * The "Shark Teeth" Pattern (6 units total base bet):
 * 1. Double Street (Line): Covers 6 numbers (e.g., 1-6).
 * 2. Two Straight Ups: On the 3rd and 6th number of that line (e.g., 3 and 6).
 * 3. Two Streets: On the following two rows (e.g., 7-9 and 10-12).
 * 4. One Split: On the last numbers of those streets (e.g., 9 and 12).
 *
 * THE PROGRESSION (Negative Progression / "Ladder Up"):
 * - ON WIN: Reset bet size to 1 unit. Switch to the next Dozen area (1 -> 2 -> 3 -> 1).
 * - ON LOSS (or "Small Loss"): Stay on the SAME Dozen area. Increase the bet unit by +1 (Ladder up).
 * - Note: The video describes "Small Losses" (where you hit a covered number but don't profit enough)
 * identically to total losses: Increase bet by 1 unit to recover.
 *
 * THE GOAL:
 * - Quick profit accumulation via high coverage (17 numbers covered per spin).
 * - Stop Loss: Recommended to stop if bet unit reaches significantly high levels (e.g., 10x base)
 * or if bankroll drops by 30%.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const baseUnit = config.betLimits.min; // Use minimum inside bet as base unit
    const maxBet = config.betLimits.max;

    // Define the 3 Patterns (Dozen 1, Dozen 2, Dozen 3 equivalents)
    const patterns = [
        // Pattern 0 (Focus on Dozen 1 Area)
        [
            { type: 'line', value: 1 },         // Covers 1-6
            { type: 'number', value: 3 },       // Straight 3
            { type: 'number', value: 6 },       // Straight 6
            { type: 'street', value: 7 },       // Covers 7-9
            { type: 'street', value: 10 },      // Covers 10-12
            { type: 'split', value: [9, 12] }   // Split 9 & 12
        ],
        // Pattern 1 (Focus on Dozen 2 Area)
        [
            { type: 'line', value: 13 },        // Covers 13-18
            { type: 'number', value: 15 },      // Straight 15
            { type: 'number', value: 18 },      // Straight 18
            { type: 'street', value: 19 },      // Covers 19-21
            { type: 'street', value: 22 },      // Covers 22-24
            { type: 'split', value: [21, 24] }  // Split 21 & 24
        ],
        // Pattern 2 (Focus on Dozen 3 Area)
        [
            { type: 'line', value: 25 },        // Covers 25-30
            { type: 'number', value: 27 },      // Straight 27
            { type: 'number', value: 30 },      // Straight 30
            { type: 'street', value: 31 },      // Covers 31-33
            { type: 'street', value: 34 },      // Covers 34-36
            { type: 'split', value: [33, 36] }  // Split 33 & 36
        ]
    ];

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.unitLevel = 1;       // Start at 1 unit
        state.patternIndex = 0;    // Start at Dozen 1 pattern
        state.lastBankroll = bankroll;
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS RESULT (If any) ---
    if (spinHistory.length > 0) {
        const currentBankroll = bankroll;
        const lastBankroll = state.lastBankroll;
        const profit = currentBankroll - lastBankroll;

        if (profit > 0) {
            // WIN: Reset progression, switch pattern
            state.unitLevel = 1;
            state.patternIndex = (state.patternIndex + 1) % 3; // Cycle 0->1->2->0
        } else {
            // LOSS (Total Loss OR Small Loss/Partial Hit): Ladder Up
            // The video strategy is aggressive: increase on any result that isn't a clear profit clearing the table
            state.unitLevel += 1;
            // Stay on the same patternIndex to fight for recovery
        }
    }

    // Update last bankroll for next spin comparison
    state.lastBankroll = bankroll;

    // --- 4. SAFETY CHECKS (Optional Stop Loss/Safety) ---
    // If unit level gets absurdly high (e.g., > 20 units), reset to avoid table limit issues or bust
    // This is a safety valve not explicitly in video but necessary for simulation stability
    if (state.unitLevel > 20) {
        state.unitLevel = 1;
    }

    // --- 5. GENERATE BETS ---
    const activePattern = patterns[state.patternIndex];
    const bets = [];

    for (const betDef of activePattern) {
        // Calculate amount: Base * Level
        let amount = baseUnit * state.unitLevel;

        // Clamp to Config Limits
        // Ensure at least min (though baseUnit handles this)
        amount = Math.max(amount, config.betLimits.min);
        // Ensure at most max
        amount = Math.min(amount, config.betLimits.max);

        bets.push({
            type: betDef.type,
            value: betDef.value,
            amount: amount
        });
    }

    return bets;

}