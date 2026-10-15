/**
 * Separate but Together Roulette Strategy (Corrected based on User Feedback)
 * 
 * Source: User corrections
 * 
 * Logic:
 * - Base setup: Place a 1-unit bet on EVERY individual number in the 1st Dozen (1-12) 
 *   and 3rd Dozen (25-36). Total 24 numbers.
 * - On Loss (number hit was not in our active bets): 
 *     - Increase all active bets by 1 unit.
 * - Wait Trigger:
 *     - If the 2nd dozen (13-24) hits twice in a row, suspend betting.
 *     - Resume betting ONLY after a 1st or 3rd dozen hits. 
 *     - Upon resumption, increase the bet amount by 1 unit.
 * - On Win (number hit was one of our active bets):
 *     - If current session profit >= peak session profit: Reset to base state (all 24 
 *       numbers active, 1 unit bet).
 *     - If not at peak profit: Remove the specific winning number from active bets, and 
 *       increase the bet amount for all remaining active numbers by 1 unit.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (typeof state.activeNumbers === 'undefined') {
        state.activeNumbers = [];
        for (let i = 1; i <= 12; i++) state.activeNumbers.push(i);
        for (let i = 25; i <= 36; i++) state.activeNumbers.push(i);
        state.currentBetAmount = 1;
        state.waiting = false;
        state.secondDozenStreak = 0;
        state.peakProfit = 0;
        state.currentProfit = 0;
    }

    // 2. Process Result and Session Profit
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const num = lastResult.winningNumber;
        
        // Check if bets were placed in the previous round
        const placedBetsThisRound = !state.waiting && state.activeNumbers.length > 0;

        if (placedBetsThisRound) {
            // Calculate P/L
            const totalBetPlaced = state.activeNumbers.length * state.currentBetAmount;
            const won = state.activeNumbers.includes(num);
            let wonAmount = won ? (state.currentBetAmount * 36) : 0;
            
            const net = wonAmount - totalBetPlaced;
            state.currentProfit += net;
            
            if (state.currentProfit > state.peakProfit) {
                state.peakProfit = state.currentProfit;
            }

            // Logic updates based on Win/Loss
            if (won) {
                if (state.currentProfit >= state.peakProfit) {
                    // Reset to base state
                    state.activeNumbers = [];
                    for (let i = 1; i <= 12; i++) state.activeNumbers.push(i);
                    for (let i = 25; i <= 36; i++) state.activeNumbers.push(i);
                    state.currentBetAmount = 1;
                    state.secondDozenStreak = 0;
                } else {
                    // Not at peak: remove the specific winning number and increase remaining
                    state.activeNumbers = state.activeNumbers.filter(n => n !== num);
                    state.currentBetAmount += 1;
                    state.secondDozenStreak = 0;
                }
            } else {
                // Loss
                if (num >= 13 && num <= 24) {
                    state.secondDozenStreak += 1;
                    if (state.secondDozenStreak >= 2) {
                        state.waiting = true;
                        // Do NOT increase bet amount here. It freezes until resumption.
                    } else {
                        state.currentBetAmount += 1;
                    }
                } else {
                    state.secondDozenStreak = 0;
                    state.currentBetAmount += 1;
                }
            }
        } else if (state.waiting) {
            // We are waiting. Check if the wait condition ends.
            // Ends if 1st or 3rd dozen hits (1-12 or 25-36)
            if ((num >= 1 && num <= 12) || (num >= 25 && num <= 36)) {
                state.waiting = false;
                state.secondDozenStreak = 0;
                state.currentBetAmount += 1; // Increase upon resuming play
            }
        }
    }

    // Edge Case Fallback: If we somehow remove all numbers without hitting peak profit
    if (state.activeNumbers.length === 0) {
        for (let i = 1; i <= 12; i++) state.activeNumbers.push(i);
        for (let i = 25; i <= 36; i++) state.activeNumbers.push(i);
        state.currentBetAmount = 1;
        state.secondDozenStreak = 0;
    }

    // 3. Generate Bets
    if (state.waiting) return []; // Place no bets while waiting

    let betList = [];
    let amount = state.currentBetAmount;
    
    // Clamp to configured limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    state.activeNumbers.forEach(n => {
        betList.push({ type: 'number', value: n, amount: amount });
    });

    return betList;
}