/**
 * Strategy: Kicked Out of the Casino
 * Source: The Roulette Master TV (https://www.youtube.com/watch?v=eSSQKxJUifo)
 *
 * THE LOGIC:
 * A high-coverage system designed to grind small wins while covering the majority of the board.
 * It combines a heavy attack on the 3rd Column with coverage bets on the 1st/2nd Columns.
 *
 * Base Betting Structure ($44 Total):
 * 1. Third Column: $5 (Direct column bet)
 * 2. Third Column Splits: $25 total ($5 x 5 bets). Covers pairs within the column:
 * [6,9], [12,15], [18,21], [24,27], [30,33].
 * (Note: Video mentions "all splits except 3 and 36", but math ($44 total) dictates 5 splits max.
 * We use alternating splits to maximize spread).
 * 3. Zero: $2 (Insurance)
 * 4. Corners: $12 total ($2 x 6 bets). Covers the bottom/middle to hedge the column bet:
 * [1,2,4,5], [7,8,10,11], [13,14,16,17], [19,20,22,23], [25,26,28,29], [31,32,34,35].
 *
 * THE PROGRESSION:
 * - Status Quo: If the session profit is positive (>= 0), maintain the base bet.
 * - Drawdown Trigger: If the bankroll drops below the starting bankroll by increments of $100.
 * - Multiplier:
 * - Down $0 - $99: 1x (Base)
 * - Down $100 - $199: 2x
 * - Down $200 - $299: 4x
 * - Down $300+: 8x (Doubles every $100 drop)
 * - Reset: Once the bankroll returns to positive session profit, reset to 1x.
 *
 * THE GOAL:
 * - Generate consistent small profits.
 * - Recover from strings of losses using the aggressive doubling progression.
 * - Stop Loss: Implied by bankroll depletion, but recommended to stop if multiplier hits table limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    
    // Define the distinct bet amounts based on the strategy's ratio
    // The video uses a $44 base: $5 (Outside/Splits) and $2 (Inside/Corners).
    // We derive a unit size relative to the user's config.betLimits.
    
    // We treat $1 as the absolute base unit.
    // 3rd Column: 5 units
    // Splits: 5 units
    // Corners: 2 units
    // Zero: 2 units
    
    const baseColUnit = 5;
    const baseSplitUnit = 5;
    const baseCornerUnit = 2;
    const baseZeroUnit = 2;

    // Track starting bankroll to calculate drawdown
    if (state.startingBankroll === undefined) {
        state.startingBankroll = bankroll;
    }

    // --- 2. PROGRESSION LOGIC ---

    const currentProfit = bankroll - state.startingBankroll;
    let multiplier = 1;

    if (currentProfit >= 0) {
        // We are in profit (or break-even), stay at base level
        multiplier = 1;
    } else {
        // We are in a loss. Calculate how many $100 increments we are down.
        // Note: The strategy assumes a $2000 bankroll context. If the user's config
        // has a vastly different bankroll, this hardcoded $100 might need scaling.
        // We will stick to the literal video rules of "$100 drops".
        
        const lossAmount = Math.abs(currentProfit);
        const levelsDown = Math.floor(lossAmount / 100);
        
        if (levelsDown >= 1) {
            // Level 1 (Down 100) = 2x
            // Level 2 (Down 200) = 4x
            // Level 3 (Down 300) = 8x
            multiplier = Math.pow(2, levelsDown);
        }
    }

    // --- 3. HELPER: SAFE BET CREATION ---
    
    // Helper to ensure we don't breach table limits
    const createBet = (type, value, baseUnits) => {
        let amount = baseUnits * multiplier;

        // Scale if the user has a high minimum limit
        if (amount < config.betLimits.min) amount = config.betLimits.min;
        
        // Clamp to maximum
        if (amount > config.betLimits.max) amount = config.betLimits.max;

        return { type, value, amount };
    };

    const bets = [];

    // --- 4. BET PLACEMENT ---

    // A. The Third Column Bet
    // The third column covers numbers 3, 6, 9... 36.
    // Standard roulette column mapping: Column 1 (1,4..), Column 2 (2,5..), Column 3 (3,6..)
    bets.push(createBet('column', 3, baseColUnit));

    // B. The Third Column Splits
    // Covers pairs within the 3rd column to boost payouts on hits.
    // Video logic: 5 splits ($25 total).
    const splitPairs = [
        [6, 9],
        [12, 15],
        [18, 21],
        [24, 27],
        [30, 33]
    ];
    
    splitPairs.forEach(pair => {
        bets.push(createBet('split', pair, baseSplitUnit));
    });

    // C. The Zero Insurance
    bets.push(createBet('number', 0, baseZeroUnit));

    // D. The Corner Bets (Hedging)
    // These cover the 1st and 2nd columns specifically.
    // Logic: 6 bets ($12 total).
    const corners = [
        [1, 2, 4, 5],       // Top Low
        [7, 8, 10, 11],
        [13, 14, 16, 17],
        [19, 20, 22, 23],
        [25, 26, 28, 29],
        [31, 32, 34, 35]    // Bottom High
    ];

    // Note: The strategy relies on standard US/EU numbering layout.
    // Corner bets are defined by their top-left number in some APIs, 
    // or the array of numbers. We use the array for clarity.
    corners.forEach(cornerArray => {
        // Depending on simulator API, 'corner' might take the top-left number (e.g. 1) 
        // or the specific array. We return the array to be explicit, or standard format 
        // usually accepts the lowest number. 
        // Here we assume the simulator handles array values for 'corner' or 'split'.
        bets.push(createBet('corner', cornerArray, baseCornerUnit));
    });

    // --- 5. LOGGING FOR DEBUGGING (Optional) ---
    // Only log if the multiplier changes significantly to avoid spam
    if (state.lastMultiplier !== multiplier) {
        console.log(`[KickedOut] Profit: ${currentProfit}, Multiplier adjusted to: ${multiplier}x`);
        state.lastMultiplier = multiplier;
    }

    return bets;
}