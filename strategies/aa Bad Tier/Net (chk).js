/**
 * Roulette Strategy: The Net (Corrected Progression Logic)
 * * Source:
 * - YouTube Channel: The Roulette Master
 * - Video URL: https://youtu.be/hAtzFIy2J9w
 * * Overview & Strategy Logic:
 * This script implements "The Net" strategy by Michael Kingsley.
 * It uses a specific multi-tier inside layout covering 24 distinct numbers across 
 * streets, double-streets (line bets), and split bets.
 * * Initial Bet Placements (15 units total):
 * - 2 Street Bets: 4, 31
 * - 4 Line Bets: 7, 13, 19, 25
 * - 9 Split Bets: 5/8, 11/14, 17/20, 23/26, 29/32, 9/12, 15/18, 21/24, 27/30
 * * Outcomes & Betting Progressions:
 * We determine the outcome of a spin purely by looking at the net change in the bankroll:
 * - Total Loss (Net change <= -Total Bet): Completely missed all coverage.
 * Action: Rebet and DOUBLE UP all bets (x2 the current level).
 * - Partial Loss (Net change < 0 but > -Total Bet): Hit a covered number but payout 
 * was less than the initial layout cost (e.g., hitting just a line bet).
 * Action: Rebet and INCREASE all bets linearly by 1 unit level (+1).
 * - Win (Net change > 0): 
 * Action: 
 * - If the new bankroll sets a session high (peak profit), RESET back to 1 unit.
 * - If we had a win but are still below the peak profit, drop BACK 1 level.
 * * The Goal:
 * Safely recover from losses using a step-down approach on partial wins and reset 
 * on session highs, while doubling down dynamically on absolute misses.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Layout Positions
    const streets = [4, 31];
    const lines = [7, 13, 19, 25];
    const splits = [
        [5, 8], [11, 14], [17, 20], [23, 26], [29, 32],
        [9, 12], [15, 18], [21, 24], [27, 30]
    ];

    // 2. Initialize State
    if (!state.isInitialized) {
        state.maxBankroll = bankroll;
        state.currentLevel = 1; 
        state.lastBankroll = bankroll;
        state.lastTotalBet = 0;
        state.isInitialized = true;
    }

    // Update peak session profit benchmark dynamically
    if (bankroll > state.maxBankroll) {
        state.maxBankroll = bankroll;
    }

    // 3. Process Progression Logic using actual Net Bankroll Delta
    if (spinHistory && spinHistory.length > 0 && state.lastTotalBet > 0) {
        // Calculate exactly how much money we won or lost on the last spin
        const netChange = bankroll - state.lastBankroll;

        if (netChange > 0) {
            // TRUE WIN: Spin resulted in an overall positive profit
            if (bankroll >= state.maxBankroll) {
                // We reached or exceeded the session high
                state.currentLevel = 1;
            } else {
                // We won, but haven't reached the session high yet
                state.currentLevel = Math.max(1, state.currentLevel - 1);
            }
        } else if (netChange < 0) {
            // LOSS: Could be partial or total
            if (netChange <= -state.lastTotalBet) {
                // TOTAL LOSS: The amount lost is equal to (or worse than) the total bet amount
                state.currentLevel = state.currentLevel * 2;
            } else {
                // PARTIAL LOSS: We hit something, but not enough to cover the total bet
                state.currentLevel += 1;
            }
        } else {
            // Break even (treated as a partial loss step up for safety)
            state.currentLevel += 1;
        }
    }

    // 4. Build and Clamp Bets
    const finalBets = [];
    const baseUnit = config.betLimits.min; 
    let currentBetAmount = baseUnit * state.currentLevel;

    // Enforce Table Max/Min Limits
    currentBetAmount = Math.max(currentBetAmount, config.betLimits.min);
    currentBetAmount = Math.min(currentBetAmount, config.betLimits.max);

    // Populate Streets
    for (const val of streets) {
        finalBets.push({ type: 'street', value: val, amount: currentBetAmount });
    }

    // Populate Double Streets (Lines)
    for (const val of lines) {
        finalBets.push({ type: 'line', value: val, amount: currentBetAmount });
    }

    // Populate Splits
    for (const val of splits) {
        finalBets.push({ type: 'split', value: val, amount: currentBetAmount });
    }

    // 5. Update Bankroll Tracking State for the Next Spin
    state.lastBankroll = bankroll;
    state.lastTotalBet = finalBets.reduce((sum, bet) => sum + bet.amount, 0);

    return finalBets;
}