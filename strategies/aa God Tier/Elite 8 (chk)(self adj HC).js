/**
 * Strategy: The "Elite 8" Strategy (Corrected)
 * * Source: 
 * YouTube Channel: WillVegas
 * Video URL: https://www.youtube.com/watch?v=8JvBEQBiuj4
 * Original Concept: Gamblers University
 * * The Logic:
 * This is a "Coverage" strategy targeting 20 numbers (approx 52% of the wheel).
 * It relies on overlapping bets to create "Jackpot Numbers" that pay out heavily.
 * * 1. Corner Bets (5 Total): 
 * - Covers: 1,2,4,5 | 8,9,11,12 | 16,17,19,20 | 26,27,29,30 | 31,32,34,35
 * - Pays: 8:1
 * 2. Split Bets (3 Total - The "Jackpots"):
 * - Covers: 8/11 | 17/20 | 26/29
 * - Pays: 17:1
 * * "Jackpot Numbers" (8, 11, 17, 20, 26, 29) are covered by BOTH a Corner and a Split.
 * If one hits, you win both bets.
 * * The Progression (Negative Progression / Recovery):
 * - Base Unit: Corner bets are 2 units, Split bets are 1 unit.
 * - Win: If Bankroll >= Session Peak Profit, RESET all bets to base units. Otherwise, rebet.
 * - Loss: Increase all corner bets by 1 unit. If corner bet is even after increase, increase split bets by 1 unit. If odd, do not increase split bets.
 * * The Goal:
 * Aim for a session peak profit, then reset immediately to protect gains.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (!state.initialized) {
        state.initialized = true;
        state.sessionStartBankroll = bankroll;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
        
        // Progression tracking (Base units: 2 for corners, 1 for splits)
        state.cornerLevel = 2;
        state.splitLevel = 1;
    }

    // 2. Define Base Unit based on Inside Bet Minimum
    const unit = config.betLimits.min; 

    // 3. Analyze Previous Spin (if history exists)
    if (spinHistory.length > 0) {
        const currentBankroll = bankroll;
        const previousBankroll = state.lastBankroll;
        const wonLastSpin = currentBankroll > previousBankroll;

        // --- PROGRESSION LOGIC ---
        
        // Condition A: We reached a new or equal session peak profit -> RESET
        if (currentBankroll >= state.peakBankroll) {
            state.peakBankroll = currentBankroll; // Update peak profit watermark
            state.cornerLevel = 2;
            state.splitLevel = 1;
        } 
        // Condition B: We Lost -> INCREASE
        else if (!wonLastSpin) {
            // Increase corners by 1 unit
            state.cornerLevel++;
            
            // If each corner bet is even after increase, increase all split bets by 1 unit
            if (state.cornerLevel % 2 === 0) {
                state.splitLevel++;
            }
            // If odd, split bets are not increased
        }
        // Condition C: We Won but have not reached peak profit -> REBET
        else {
            // Do not change levels (rebet)
        }
    }

    // 4. Update Reference Bankroll for next spin
    state.lastBankroll = bankroll;

    // 5. Calculate Bet Amounts (Clamping to Limits)
    const calculateAmount = (level) => {
        let amt = unit * level;
        // Ensure we don't exceed table max
        return Math.min(amt, config.betLimits.max);
    };

    const cornerAmt = calculateAmount(state.cornerLevel);
    const splitAmt = calculateAmount(state.splitLevel);

    // 6. Define Bet Placements
    // Note: Corner values represent the top-left number of the block
    const bets = [
        // --- 5 Corner Bets ---
        { type: 'corner', value: 1, amount: cornerAmt },  // Covers 1, 2, 4, 5
        { type: 'corner', value: 8, amount: cornerAmt },  // Covers 8, 9, 11, 12
        { type: 'corner', value: 16, amount: cornerAmt }, // Covers 16, 17, 19, 20
        { type: 'corner', value: 26, amount: cornerAmt }, // Covers 26, 27, 29, 30
        { type: 'corner', value: 31, amount: cornerAmt }, // Covers 31, 32, 34, 35

        // --- 3 Split Bets (The "Jackpot" Overlaps) ---
        { type: 'split', value: [8, 11], amount: splitAmt },   // Overlaps corner 8
        { type: 'split', value: [17, 20], amount: splitAmt },  // Overlaps corner 16
        { type: 'split', value: [26, 29], amount: splitAmt }   // Overlaps corner 26
    ];

    // 7. Validate Total Bet vs Bankroll (Optional safety check)
    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBet > bankroll) {
        // Not enough money to place full spread - return empty to stop or implement 'all_in' logic
        return []; 
    }

    return bets;
}