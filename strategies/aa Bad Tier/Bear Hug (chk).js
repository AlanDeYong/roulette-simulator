/**
 * STRATEGY: The Bear Hug (Corrected Loss Progression)
 * * SOURCE:
 * - Video: "The Martingale Killer? Testing the Bear Hug Roulette Strategy LIVE"
 * - Channel: Stacking Chips
 * - URL: https://www.youtube.com/watch?v=90r1oYjWsVk
 * * * LOGIC:
 * 1. Start at Level 0 (Base Bets).
 * 2. If a spin results in a NET WIN (Payout > Total Bet), RESET to Level 0.
 * 3. If a spin results in a NET LOSS (Payout <= Total Bet), INCREASE Level (add bets/value).
 * * * THE PROGRESSION (Cumulative):
 * - Level 0: 16 Splits (Horizontal pairs around middle column).
 * - Level 1 (After 1 Loss): Add 7 "A" Corners (7-11, 10-14...).
 * - Level 2 (After 2 Losses): Add 7 "B" Corners (8-12, 11-15...).
 * - Level 3 (After 3 Losses): Add 8 Straight Ups on Middle Column (8, 11... 29).
 * - Level 4 (After 4 Losses): Increase Unit Size by +1 (All previous bets play with higher chip value).
 * - Level 5 (After 5 Losses): Double Unit Size (All previous bets play with 2x chip value).
 * * * GOAL:
 * - Survive sequences of losses by increasing coverage.
 * - Reset to minimum risk immediately upon hitting a profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION ---
    const MIN_CHIP = config.betLimits.min; 
    const MAX_LEVEL = 5;

    // --- 2. DEFINE BET DATA ---
    // Level 0: Base Splits (16 bets)
    const baseSplits = [
        [7, 8], [8, 9], [10, 11], [11, 12],
        [13, 14], [14, 15], [16, 17], [17, 18],
        [19, 20], [20, 21], [22, 23], [23, 24],
        [25, 26], [26, 27], [28, 29], [29, 30]
    ];

    // Level 1: Corners A (7 bets)
    // defined by top-left number of the corner
    const cornersA = [7, 10, 13, 16, 19, 22, 25];

    // Level 2: Corners B (7 bets)
    const cornersB = [8, 11, 14, 17, 20, 23, 26];

    // Level 3: Straight Ups (8 bets)
    const straightUps = [8, 11, 14, 17, 20, 23, 26, 29];

    // --- 3. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 0;
    if (state.lastTotalBet === undefined) state.lastTotalBet = 0;

    // --- 4. RESULT PROCESSING ---
    if (spinHistory.length > 0) {
        // If this is the FIRST spin of a new run (history = 0), we skip this block.
        // But if history > 0, we check the result of the PREVIOUS spin.
        
        // Wait, 'spinHistory' contains the result of the spin that just happened?
        // OR is it the history BEFORE the current spin we are about to bet on?
        
        // In this simulator:
        // bet() is called to place bets for the NEXT spin.
        // spinHistory contains all COMPLETED spins.
        // So spinHistory[last] is the result of the bet we placed in the PREVIOUS call.
        
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Determine Net Result
        // Use simulator's calculated totalProfit (Net Profit/Loss for the spin)
        const netProfit = lastSpin.totalProfit;

        if (netProfit > 0) {
            // WIN CONDITION: Reset
            // "If a spin results in a NET WIN... RESET to Level 0."
            state.level = 0;
            
            // Check Session Profit (Bankroll > Initial Bankroll)
            // If the strategy is supposed to "Stop" or "Restart Session" on profit:
            // "it is adding bets after winning and meeting session profit"
            // This implies the user *expects* it to reset to minimum (which Level 0 is).
            // Level 0 = 16 Splits @ Min Chip.
            
            // If the user meant "It is NOT resetting", then my previous fix (using totalProfit) solved it.
            // If the user meant "It is increasing bets even though I won", then my previous fix solved it.
            
        } else {
            // LOSS CONDITION (or Break Even): Progress
            if (state.level < MAX_LEVEL) {
                state.level++;
            }
            // If already at Max Level (5), stay at 5 until Win
        }
    } else {
        // First spin initialization
        state.initialBankroll = bankroll;
        // Optional: Set a target? e.g. +20%
        // state.targetProfit = bankroll * 0.2; 
    }

    // --- 5. CALCULATE BET UNIT SIZE ---
    // Default unit is MIN_CHIP
    let currentUnit = MIN_CHIP;

    if (state.level === 4) {
        // "Increase all bets by 1 unit" -> Base + 1
        // Assuming Base is min chip. If min is 1, this is 2. If min is 5, this is 10.
        currentUnit = MIN_CHIP + MIN_CHIP; 
    } else if (state.level === 5) {
        // "Double up" -> (Base + 1) * 2 or just Double Base?
        // Usually "Double Up" refers to the previous step. 
        // Level 4 was 2 units. Level 5 is 4 units.
        currentUnit = (MIN_CHIP * 2) * 2; 
    }

    // --- 6. CONSTRUCT BETS ---
    let bets = [];

    // Helper to add bets
    const addGroup = (type, values) => {
        values.forEach(val => {
            bets.push({ type: type, value: val, amount: currentUnit });
        });
    };

    // ALWAYS Place Level 0 Bets
    addGroup('split', baseSplits);

    // IF Level >= 1, Add Corners A
    if (state.level >= 1) {
        addGroup('corner', cornersA);
    }

    // IF Level >= 2, Add Corners B
    if (state.level >= 2) {
        addGroup('corner', cornersB);
    }

    // IF Level >= 3, Add Straight Ups
    if (state.level >= 3) {
        addGroup('number', straightUps);
    }

    // --- 7. VALIDATE LIMITS ---
    let totalWager = 0;
    
    // Apply Limits and Sum Total
    bets = bets.map(b => {
        // Ensure Min
        if (b.amount < config.betLimits.min) b.amount = config.betLimits.min;
        // Ensure Max
        if (b.amount > config.betLimits.max) b.amount = config.betLimits.max;
        
        totalWager += b.amount;
        return b;
    });

    // Bankroll Protection
    if (totalWager > bankroll) {
        // Not enough money to place the full strategy bets.
        // Stop betting to prevent partial strategy failure.
        return [];
    }

    // Save total wager for next spin's profit calculation
    state.lastTotalBet = totalWager;

    return bets;
}