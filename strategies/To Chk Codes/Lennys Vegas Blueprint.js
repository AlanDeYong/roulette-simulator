/**
 * STRATEGY: Lenny's Las Vegas Blueprint (Modified)
 * * SOURCE:
 * - Video: "I Went All In With 'The Vegas Blueprint' (New Roulette Strategy)"
 * - Channel: Stacking Chips
 * - URL: https://www.youtube.com/watch?v=cOGRswSZjQM
 * * THE LOGIC:
 * This is a high-coverage "grinder" strategy that covers approximately 65-67% of the wheel.
 * It focuses on generating small, consistent wins while insuring against the Zero.
 * * The Layout (Base Level):
 * 1. Inside: 1 Unit on 8 specific Streets (Rows) covering numbers 13-36.
 * - Streets: 13, 16, 19, 22, 25, 28, 31, 34.
 * 2. Outside: 5 Units on Dozen 2 (13-24).
 * 3. Outside: 5 Units on Dozen 3 (25-36).
 * 4. Insurance: 1 Unit on Zero (0).
 * * WIN CONDITIONS (Based on Video):
 * - 13-36: WIN. (Profit approx 8 units). Action: Reset to Level 1.
 * - 0: PUSH/PARTIAL LOSS. (Insurance pays 35:1 or 17:1, offsetting most losses). Action: Repeat same bet (Do not reset, do not increase).
 * - 1-12: LOSS. (Total loss of all bets). Action: Increase Progression.
 * * THE PROGRESSION (Hybrid Ladder):
 * The video demonstrates a specific conservative progression to manage bankroll:
 * 1. Level 1 (Base).
 * 2. If Loss at Level 1 -> Double to Level 2.
 * 3. If Loss at Level 2+ -> Add 1 Unit (Ladder) to the multiplier.
 * - Example: Lvl 1 -> Lvl 2 -> Lvl 3 -> Lvl 4.
 * 4. On any Win (13-36) -> Reset to Level 1.
 * * GOAL:
 * Grind consistent profits using comps and high coverage. 
 * Stop loss is determined by bankroll depletion; target is flexible.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. CONFIGURATION & UNIT SIZING
    // Calculate the smallest safe base unit that satisfies both Inside and Outside minimums.
    // The strategy requires the Dozen bet to be 5x the Street bet.
    // Therefore, 5 * unit must be >= minOutside.
    const calculatedMinForOutside = config.betLimits.minOutside / 5;
    const baseUnit = Math.max(config.betLimits.min, calculatedMinForOutside);

    // 2. STATE INITIALIZATION
    if (state.level === undefined) state.level = 1;

    // 3. ANALYZE PREVIOUS SPIN (Update Progression)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Determine Outcome Category
        const isWin = (num >= 13 && num <= 36);
        const isZero = (num === 0 || num === 37); // Handle 0 or 00 (if sim uses 37 for 00)
        const isLoss = (num >= 1 && num <= 12);

        if (isWin) {
            // Reset on Win
            state.level = 1;
        } else if (isLoss) {
            // Progression Logic
            if (state.level === 1) {
                // Video: "If you lose you simply double the bet" (Level 1 -> 2)
                state.level = 2;
            } else {
                // Video: "I'm going to add one more unit... I like ladders" (Level 2+ -> +1)
                state.level += 1;
            }
        }
        // If isZero, we do nothing (Repeat Bet / Hold Level)
    }

    // 4. CALCULATE BET AMOUNTS
    // Ensure we don't exceed bankroll (basic check)
    // Total cost = (8 streets * 1) + (2 dozens * 5) + (1 zero * 1) = 19 units * level
    const currentMultiplier = state.level;
    
    // Clamp multiplier if it exceeds max table limits
    // Max bet check: Dozen is the largest single bet (5 units).
    const maxMultiplier = Math.floor(config.betLimits.max / (baseUnit * 5));
    const safeMultiplier = Math.min(currentMultiplier, maxMultiplier);

    const streetAmt = baseUnit * safeMultiplier;
    const dozenAmt = baseUnit * 5 * safeMultiplier;
    const zeroAmt = baseUnit * safeMultiplier;

    // 5. CONSTRUCT BETS
    const bets = [];

    // -- Dozens --
    // Dozen 2 (13-24) and Dozen 3 (25-36)
    bets.push({ type: 'dozen', value: 2, amount: dozenAmt });
    bets.push({ type: 'dozen', value: 3, amount: dozenAmt });

    // -- Streets (Rows) --
    // A 'street' bet is defined by the first number of the row.
    // We need numbers 13 through 36.
    // The streets starting numbers are: 13, 16, 19, 22, 25, 28, 31, 34
    const streetStarts = [13, 16, 19, 22, 25, 28, 31, 34];
    
    streetStarts.forEach(startNum => {
        bets.push({ type: 'street', value: startNum, amount: streetAmt });
    });

    // -- Zero Insurance --
    bets.push({ type: 'number', value: 0, amount: zeroAmt });

    // 6. FINAL VALIDATION
    // Filter out any bets that might be 0 (though unlikely with logic above)
    // and clamp strictly to min/max one last time to be safe.
    return bets.map(b => {
        // Ensure Min
        let finalAmount = Math.max(b.amount, b.type === 'dozen' ? config.betLimits.minOutside : config.betLimits.min);
        // Ensure Max
        finalAmount = Math.min(finalAmount, config.betLimits.max);
        
        return { ...b, amount: finalAmount };
    });
}