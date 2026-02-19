
/**
 * Strategy: Double Street Cash Power Roulette System
 * Source: The Roulette Master (YouTube) - Strategy by Mark Ganon
 * Video URL: https://www.youtube.com/watch?v=xz3svGDojZo
 *
 * THE LOGIC:
 * This is a coverage strategy that combines "Double Streets" (Lines) and "Corner" bets to cover
 * a significant portion of the board with tiered payouts.
 *
 * Setup:
 * 1. Select 1 Double Street (Line) in EACH Dozen (3 total lines).
 * 2. Select 2 Corner bets in EACH Dozen (6 total corners).
 *
 * The Video's Base Unit Ratios:
 * - Line Bets: 2 units (Video uses $10)
 * - Corner Bets: 1 unit (Video uses $5)
 * - Total Base Bet: 12 units (Video uses $60)
 *
 * THE PROGRESSION:
 * - This is NOT a Martingale. We do not double on every loss.
 * - Trigger: The bet size increases only after 2 CONSECUTIVE LOSSES.
 * - Progression Step: Increase the total bet by the STARTING amount (Add 1 base unit to corners, 2 base units to lines).
 * - Level 1: 1u Corner / 2u Line
 * - Level 2: 2u Corner / 4u Line (After 2 losses)
 * - Level 3: 3u Corner / 6u Line (After 2 more losses)
 *
 * RESET CONDITION:
 * - The video implies resetting when a significant win occurs or session profit is reached.
 * - In this implementation, we reset to Level 1 immediately upon generating a Net Profit (Green Spin)
 * that puts us back into Session Profit relative to when the strategy started or last reset.
 *
 * WIN/LOSS DEFINITION:
 * - Win: Net Profit > 0.
 * - Break Even: Net Profit == 0 (Does not count towards loss streak).
 * - Partial/Full Loss: Net Profit < 0 (Counts towards loss streak).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. CONFIGURATION & CONSTANTS
    // The strategy relies on a 1:2 ratio (Corner : Line).
    // We use minOutside (usually 5 or 10) for Lines if minInside is too low, 
    // but typically we want the lowest common denominator.
    // Let's rely on config.betLimits.min for the "Corner" unit (1u).
    
    const baseUnit = config.betLimits.min; 
    
    // 2. INITIALIZE STATE
    if (state.level === undefined) state.level = 1;
    if (state.lossStreak === undefined) state.lossStreak = 0;
    if (state.sessionStartBankroll === undefined) state.sessionStartBankroll = bankroll;

    // 3. PROCESS LAST SPIN (If history exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Calculate the result of the previous bet
        // Note: The simulator usually handles payouts, but we need to calculate 'Net Profit'
        // to determine if it was a "Loss" for the streak counter.
        // We look at state.lastTotalBet vs actual payout (bankroll change).
        // Since we don't strictly have "payout" in spinHistory args usually, we infer from bankroll change 
        // OR rely on the strategy logic regarding the specific numbers hit.
        
        // However, robust strategies track their own "lastBetValue".
        let wonAmt = 0;
        let totalBetAmt = state.lastTotalBet || 0;
        
        // Helper to check if a number is covered by a bet (Simplified for this specific static setup)
        // Ideally, we calculate bankroll delta. 
        // Current Bankroll - (Previous Bankroll - Bet) = Payout.
        // Payout - Bet = Net Profit.
        // Since we don't have "Previous Bankroll" strictly passed, we assume:
        // If bankroll > state.previousBankroll, we won something.
        
        const previousBankroll = state.previousBankroll || (bankroll + totalBetAmt); // Approximate logic
        const change = bankroll - previousBankroll; // This is strictly the profit/loss delta
        
        if (change > 0) {
            // WIN or SESSION RECOVERY
            // Strategy: Reset on profit.
            // If we are profitable relative to session start, full reset.
            if (bankroll >= state.sessionStartBankroll) {
                state.level = 1;
                state.lossStreak = 0;
                // Optional: Update session start to lock in profits? 
                // The video suggests locking in profit, so we reset the baseline.
                state.sessionStartBankroll = bankroll;
            } else {
                // We won, but might still be in a hole. 
                // The video is aggressive on resetting bets after good wins.
                // We will reset streak on ANY profit spin, but keep level unless profit is high.
                // Simplified Rule: Reset streak on any win. Reset Level only if Bankroll >= SessionStart.
                state.lossStreak = 0;
                
                // If the win was massive (hit overlap), reset level too
                state.level = 1; 
            }
        } else if (change === 0) {
            // BREAK EVEN
            // Video says: "Break even won't hurt us." -> Do not increment streak.
            // Keep current bets.
        } else {
            // LOSS (Net negative)
            state.lossStreak++;
            
            // TRIGGER: Increase after 2 consecutive losses
            if (state.lossStreak >= 2) {
                state.level++;
                state.lossStreak = 0; // Reset streak to wait for 2 more losses before next hike
            }
        }
    }

    // Update previous bankroll for next spin comparison
    state.previousBankroll = bankroll;

    // 4. DEFINE BET LOCATIONS
    // We need: 1 Line per Dozen, 2 Corners per Dozen.
    // Static placement for consistency (as per typical simulator requirements).
    
    // Dozen 1 (1-12)
    // Line: 1 (Covers 1-6)
    // Corners: 8 (8,9,11,12) and 5 (5,6,8,9) - Overlap is okay/good.
    // Let's try to space them slightly: Corner 2 (2,3,5,6) and Corner 8 (8,9,11,12).
    
    // Dozen 2 (13-24)
    // Line: 13 (Covers 13-18)
    // Corners: 17 (17,18,20,21) and 20 (20,21,23,24).
    
    // Dozen 3 (25-36)
    // Line: 25 (Covers 25-30)
    // Corners: 29 (29,30,32,33) and 32 (32,33,35,36).

    const betsToPlace = [
        // --- DOZEN 1 ---
        { type: 'line', value: 1, weight: 2 },    // Line 1-6
        { type: 'corner', value: 2, weight: 1 },  // Corner 2,3,5,6
        { type: 'corner', value: 8, weight: 1 },  // Corner 8,9,11,12

        // --- DOZEN 2 ---
        { type: 'line', value: 13, weight: 2 },   // Line 13-18
        { type: 'corner', value: 14, weight: 1 }, // Corner 14,15,17,18
        { type: 'corner', value: 20, weight: 1 }, // Corner 20,21,23,24

        // --- DOZEN 3 ---
        { type: 'line', value: 25, weight: 2 },   // Line 25-30
        { type: 'corner', value: 26, weight: 1 }, // Corner 26,27,29,30
        { type: 'corner', value: 32, weight: 1 }, // Corner 32,33,35,36
    ];

    // 5. CALCULATE AND CLAMP AMOUNTS
    const calculatedBets = [];
    let currentTotalBet = 0;

    for (const betDef of betsToPlace) {
        // Calculate raw amount: BaseUnit * Level * Weight (2 for line, 1 for corner)
        let rawAmount = baseUnit * state.level * betDef.weight;

        // Ensure we respect the Maximum Limit
        // Note: We adhere strictly to min limits via 'baseUnit' setup,
        // but must cap at max.
        let amount = Math.min(rawAmount, config.betLimits.max);
        
        // Final sanity check: if amount < min (unlikely given setup), clamp up
        amount = Math.max(amount, config.betLimits.min);

        currentTotalBet += amount;

        calculatedBets.push({
            type: betDef.type,
            value: betDef.value,
            amount: amount
        });
    }

    // 6. SAFETY CHECK: BANKROLL
    // If we can't afford the total bet, stop betting or flatten logic.
    // Standard behavior: Return empty array to stop.
    if (currentTotalBet > bankroll) {
        // console.log("Insufficient funds for Double Street Cash Power strategy.");
        return []; 
    }

    // Store total for next spin comparison
    state.lastTotalBet = currentTotalBet;

    return calculatedBets;

}