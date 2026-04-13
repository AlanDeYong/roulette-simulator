/**
 * Strategy: The "Elite 8" Strategy
 * * Source: 
 * YouTube Channel: WillVegas
 * Video URL: https://www.youtube.com/watch?v=8JvBEQBiuj4
 * Original Concept: Gamblers University
 * * The Logic:
 * This is a "Coverage" strategy targeting 20 numbers (approx 52% of the wheel).
 * It relies on overlapping bets to create "Jackpot Numbers" that pay out heavily.
 * * 1. Corner Bets (5 Total): 
 * - Covers: 1,2,4,5 | 8,9,11,12 | 17,18,20,21 | 26,27,29,30 | 32,33,35,36
 * - Pays: 8:1
 * 2. Split Bets (3 Total - The "Jackpots"):
 * - Covers: 8/11 | 17/20 | 26/29
 * - Pays: 17:1
 * * "Jackpot Numbers" (8, 11, 17, 20, 26, 29) are covered by BOTH a Corner and a Split.
 * If one hits, you win both bets.
 * * The Progression (Negative Progression / Recovery):
 * - Base Unit: Defined by table minimum (e.g., $1 or $2).
 * - Win (Recovered): If Bankroll >= Session Start Bankroll, RESET all bets to 1 unit.
 * - Win (Not Recovered): If a win occurs but bankroll < Session Start, MAINTAIN current bet levels (do not increase or decrease).
 * - Loss:
 * - Every Loss: Increase Corner Bets by 1 unit.
 * - Every 2nd Loss (Alternating): Increase Split Bets by 1 unit.
 * * The Goal:
 * Aim for a session profit (Bankroll > Start), then reset immediately to protect gains.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (!state.initialized) {
        state.initialized = true;
        state.sessionStartBankroll = bankroll;
        state.lastBankroll = bankroll;
        
        // Progression tracking
        state.cornerLevel = 1;
        state.splitLevel = 1;
        state.consecutiveLossCount = 0; // Tracks losses to determine split increases
    }

    // 2. Define Base Unit based on Inside Bet Minimum
    const unit = config.betLimits.min; 

    // 3. Analyze Previous Spin (if history exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const currentBankroll = bankroll;
        const previousBankroll = state.lastBankroll;
        const wonLastSpin = currentBankroll > previousBankroll;

        // --- PROGRESSION LOGIC ---
        
        // Condition A: We are in profit or fully recovered -> RESET
        if (currentBankroll >= state.sessionStartBankroll) {
            state.cornerLevel = 1;
            state.splitLevel = 1;
            state.consecutiveLossCount = 0;
        } 
        // Condition B: We Lost -> INCREASE
        else if (!wonLastSpin) {
            state.consecutiveLossCount++;
            
            // Always increase corners on a loss
            state.cornerLevel++;
            
            // Increase splits only on every 2nd loss (2, 4, 6...)
            if (state.consecutiveLossCount % 2 === 0) {
                state.splitLevel++;
            }
        }
        // Condition C: We Won but are not yet recovered -> STAY PUT
        else {
            // Do not change levels
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
        { type: 'corner', value: 17, amount: cornerAmt }, // Covers 17, 18, 20, 21
        { type: 'corner', value: 26, amount: cornerAmt }, // Covers 26, 27, 29, 30
        { type: 'corner', value: 32, amount: cornerAmt }, // Covers 32, 33, 35, 36

        // --- 3 Split Bets (The "Jackpot" Overlaps) ---
        { type: 'split', value: [8, 11], amount: splitAmt },   // Overlaps corner 8
        { type: 'split', value: [17, 20], amount: splitAmt },  // Overlaps corner 17
        { type: 'split', value: [26, 29], amount: splitAmt }   // Overlaps corner 26
    ];

    // 7. Validate Total Bet vs Bankroll (Optional safety check)
    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBet > bankroll) {
        // Not enough money to place full spread - return empty to stop or implement 'all_in' logic
        // Returning empty array stops the simulator usually
        return []; 
    }

    return bets;
}