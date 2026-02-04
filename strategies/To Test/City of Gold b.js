/**
 * Strategy: City of Gold Roulette System
 * Source: YouTube Channel "The Roulette Master"
 * Video URL: https://www.youtube.com/watch?v=QmbXJvLzvsY (Starts at 16:03)
 * * THE LOGIC:
 * This strategy is a "Grind" system that prioritizes bankroll preservation over rapid aggressive growth.
 * It covers nearly 66% of the table by betting on two Dozens simultaneously.
 * - Bet Selection: Always bet on the 1st Dozen and the 2nd Dozen.
 * * THE PROGRESSION (The "Safety Ladder"):
 * Unlike standard Martingales that double immediately, this uses a "Two-Step" ladder to slow down risk.
 * 1. Base Bet: 1 Unit on each Dozen.
 * 2. On Loss: Move UP the ladder one step.
 * 3. On Win: Move DOWN the ladder one step (unless at base).
 * * The Ladder Levels:
 * - Step 0: 1 Unit  (Base)
 * - Step 1: 3 Units (Tier 1 - 1st Attempt) -> Formula: (Previous * 2) + 1 Unit
 * - Step 2: 3 Units (Tier 1 - 2nd Attempt) -> Repeat the bet to save bankroll
 * - Step 3: 7 Units (Tier 2 - 1st Attempt) -> Formula: (Previous * 2) + 1 Unit
 * - Step 4: 7 Units (Tier 2 - 2nd Attempt)
 * - Step 5: 15 Units (Tier 3 - 1st Attempt)
 * - Step 6: 15 Units (Tier 3 - 2nd Attempt)
 * ...and so on.
 * * THE GOAL:
 * To recover losses slowly ("grinding") by moving down the ladder one step at a time, 
 * rather than trying to wipe out all losses in a single "Jackpot" spin.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const BASE_UNIT = config.betLimits.minOutside; 

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.ladderIndex = 0;       // Position on the progression ladder
        state.previousBankroll = bankroll;
        state.initialized = true;
    }

    // --- 3. CALCULATE LADDER AMOUNT (Helper Logic) ---
    // We need a way to determine the bet amount based on the linear ladderIndex.
    // Index Mapping:
    // 0       -> Tier 0 (1 unit)
    // 1, 2    -> Tier 1 (3 units)
    // 3, 4    -> Tier 2 (7 units)
    // 5, 6    -> Tier 3 (15 units)
    // Logic: Tier increases every 2 steps after index 0.
    const getAmountForIndex = (index) => {
        if (index === 0) return BASE_UNIT;

        // Calculate which "Tier" we are in. 
        // (Index 1,2 = Tier 1), (Index 3,4 = Tier 2), etc.
        const tier = Math.ceil(index / 2);

        // Calculate amount for that Tier: Amount = (Previous * 2) + Unit
        // Iteratively build it up from base
        let amount = BASE_UNIT;
        for (let i = 0; i < tier; i++) {
            amount = (amount * 2) + BASE_UNIT;
        }
        return amount;
    };

    // --- 4. PROCESS HISTORY (Progression Logic) ---
    if (spinHistory.length > 0) {
        const lastSpinProfit = bankroll - state.previousBankroll;
        
        if (lastSpinProfit > 0) {
            // WIN: Move DOWN the ladder 1 step
            state.ladderIndex--;
            // Clamp to 0 (cannot go below base)
            if (state.ladderIndex < 0) state.ladderIndex = 0;
        } else {
            // LOSS: Move UP the ladder 1 step
            state.ladderIndex++;
        }
    }

    // Update bankroll tracking
    state.previousBankroll = bankroll;

    // --- 5. DETERMINE CURRENT BET AMOUNT ---
    let currentBetAmount = getAmountForIndex(state.ladderIndex);

    // --- 6. CLAMP TO LIMITS (Crucial) ---
    // Ensure we don't bet less than table minimum
    currentBetAmount = Math.max(currentBetAmount, config.betLimits.minOutside);
    // Ensure we don't bet more than table maximum
    currentBetAmount = Math.min(currentBetAmount, config.betLimits.max);

    // --- 7. PLACE BETS ---
    // Strategy is always 1st Dozen and 2nd Dozen
    const bets = [
        { type: 'dozen', value: 1, amount: currentBetAmount },
        { type: 'dozen', value: 2, amount: currentBetAmount }
    ];

    return bets;
}