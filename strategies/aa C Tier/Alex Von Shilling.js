/**
 * ALEX VON SHILLING'S "JACKPOT" ROULETTE STRATEGY
 * * Source: "WORLD'S BEST ROULETTE SYSTEM!" by The Roulette Master
 * URL: https://www.youtube.com/watch?v=QzBjxZjrO1g (Starts at 18:40)
 * * * --- STRATEGY LOGIC ---
 * * 1. THE BOARD SETUP:
 * This strategy covers a large portion of the board with a mix of Outside, 
 * Corner, and "Jackpot" (Split/Basket) bets.
 * - 1x Column Bet: 2nd Column (Covers 2, 5, 8... 35).
 * - 6x Corner Bets: 1-5, 8-12, 13-17, 20-24, 25-29, 32-36.
 * - 1x Basket Bet: Covers 0, 00, 1, 2, 3 (US) or 0, 1, 2, 3 (EU).
 * - 1x Split Bet: 17 & 20 (The "Jackpot" stabilizer).
 * * * 2. THE PROGRESSION (Aggressive Recovery):
 * - Base Unit: Starts at 1 unit per position (Total 9 units/chips).
 * - ON LOSS: Increase EVERY bet by 2 Units. (e.g., 1 -> 3 -> 5).
 * - ON WIN: 
 * - If Bankroll > Starting Bankroll (Session Profit): RESET to 1 Unit.
 * - If Bankroll <= Starting Bankroll: HOLD current bet level.
 * * * 3. THE GOAL:
 * - Hit a "Jackpot" number (like 17, 20, or Basket numbers) while bets are high 
 * to clear previous losses instantly.
 * - Stop/Reset immediately upon reaching a new bankroll high.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION ---
    // The video uses $5 chips. We'll use minOutside (usually higher than min inside) 
    // to establish a substantial base unit, or fallback to min.
    const BASE_CHIP = config.betLimits.minOutside || 5;

    // Helper to clamp bets to table limits
    const clampBet = (amount) => {
        // Ensure bet is at least the specific minimum for its type 
        // (though we simplify by just checking against max here, as base is usually > min)
        return Math.min(amount, config.betLimits.max);
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.unitLevel = 1; // Tracks the number of units per bet position
        state.startingBankroll = bankroll; // Remember start for session profit check
        state.initialized = true;
    }

    // --- 3. PROGRESSION LOGIC (Process Previous Spin) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Determine if the last spin was a "Win" for us
        // We calculate this manually to determine if we held steady or lost
        // However, the strategy simplifies the decision:
        // 1. Am I in profit overall? -> Reset.
        // 2. Did I lose money on the last spin? -> +2 Units.
        // 3. Did I win money but still down overall? -> Hold.
        
        const isSessionProfit = bankroll > state.startingBankroll;

        if (isSessionProfit) {
            // Condition 1: We recovered all losses and made profit. Reset.
            state.unitLevel = 1;
            // Optional: Update starting bankroll to ratchet up profit locking
            // state.startingBankroll = bankroll; 
        } else {
            // We need to know if the *last spin* was a net win or loss to decide between Hold vs Increase.
            // Since `spinHistory` doesn't strictly give net payout, we infer from bankroll change 
            // if available, or re-calculate hit logic. 
            // But relying on simple logic: If bankroll went DOWN, it's a loss.
            // Note: The simulator updates `bankroll` *before* calling this function for the next bet.
            
            // We need to store previous bankroll to compare
            if (state.previousBankroll) {
                if (bankroll < state.previousBankroll) {
                    // Condition 2: Net Loss on spin -> Increase aggressive
                    state.unitLevel += 2;
                } else {
                    // Condition 3: Net Win (but not session profit) -> Hold
                    // (state.unitLevel stays the same)
                }
            }
        }
    }

    // Update tracker for next turn comparison
    state.previousBankroll = bankroll;

    // --- 4. BET CONSTRUCTION ---
    const currentBetAmount = clampBet(state.unitLevel * BASE_CHIP);
    const bets = [];

    // A. 2nd Column
    bets.push({ type: 'column', value: 2, amount: currentBetAmount });

    // B. Corners (Specific IDs based on top-left number)
    // 1-5 (covers 1,2,4,5), 8-12 (8,9,11,12), 13-17, 20-24, 25-29, 32-36
    const corners = [1, 8, 13, 20, 25, 32];
    corners.forEach(cornerStart => {
        bets.push({ type: 'corner', value: cornerStart, amount: currentBetAmount });
    });

    // C. The "Jackpot" Split (17 & 20)
    // Note: 17 and 20 are covered by corners above (13-17 and 20-24), 
    // but this adds specific weight to the middle of the board.
    bets.push({ type: 'split', value: [17, 20], amount: currentBetAmount });

    // D. The Basket (0, 00, 1, 2, 3)
    // Video calls it "0-2 corner", but clarifies it covers 0, 00, and 2.
    // 'basket' type handles 0,1,2,3 (EU) or 0,00,1,2,3 (US) automatically.
    bets.push({ type: 'basket', value: 0, amount: currentBetAmount });

    return bets;
}