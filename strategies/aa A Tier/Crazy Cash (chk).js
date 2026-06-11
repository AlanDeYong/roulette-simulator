/**
 * Roulette Strategy: Crazy Cash (Advanced Interior Street Shifts)
 * 
 * * Source:
 * - Channel: The Roulette Master
 * - Video URL: https://youtu.be/fVZYrGsuGJk
 * 
 * * Full Logic & Shifting Rules:
 * - We start by covering 5 distinct double streets (six-line bets) with 2 units each.
 * - Initial state covers six-lines starting at 1, 7, 13, 19, and 25 (covering numbers 1-30).
 * - On a LOSS (Hitting 0, 00, or any un-bet number):
 *   - Double up the bet amounts of all active positions on the board (Martingale).
 * - On a WIN:
 *   1. Check if our current bankroll reaches or exceeds the Session Peak Profit. If yes, RESET to base setup.
 *   2. Check if we have already completed 3 modifications/replacements. If yes, RESET to base setup.
 *   3. Otherwise, perform an internal street swap:
 *      - Remove the winning double street ('line') from the active bets.
 *      - Identify which of the two interior 3-number streets ('street') inside that double street did NOT win.
 *      - Place a new 'street' bet on that specific losing half, using exactly HALF the amount of the removed double street bet.
 *      - Increment the shift/replacement counter.
 * 
 * * Full Bet Progression Details:
 * - Initial base bet: 2 units per double street position.
 * - Loss progression: Double all current bet sizes from their previous individual amounts.
 * - Win modifier: The replacement single street gets injected at half the amount of the parent double street it replaces.
 * 
 * * Goal / Reset Triggers:
 * - Session Peak Profit achieved -> Total Reset back to baseline 5 double streets.
 * - 3 cumulative double street replacements reached -> Total Reset back to baseline 5 double streets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minInsideBet = config.betLimits.min;
    const maxBetAllowed = config.betLimits.max;
    const baseUnit = 2;

    // Helper function to handle full state resets back to standard 5 double streets
    function resetToBaseline() {
        state.peakProfit = Math.max(state.peakProfit || bankroll, bankroll);
        state.shiftCount = 0;
        state.activeBets = [
            { type: 'line', value: 1, amount: baseUnit },
            { type: 'line', value: 7, amount: baseUnit },
            { type: 'line', value: 13, amount: baseUnit },
            { type: 'line', value: 19, amount: baseUnit },
            { type: 'line', value: 25, amount: baseUnit }
        ];
    }

    // 1. Initialize Persistent State Variables
    if (!state.isInitialized) {
        state.initialBankroll = bankroll;
        state.peakProfit = bankroll;
        resetToBaseline();
        state.isInitialized = true;
    }

    // Update historical peak profit if bankroll hits a new high
    if (bankroll > state.peakProfit) {
        state.peakProfit = bankroll;
    }

    // 2. Process Session History if available
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastWinningNum = lastResult.winningNumber;

        // Check if any of our active bets won
        let winningBetIndex = -1;
        for (let i = 0; i < state.activeBets.length; i++) {
            const b = state.activeBets[i];
            if (b.type === 'line') {
                if (lastWinningNum >= b.value && lastWinningNum <= (b.value + 5)) {
                    winningBetIndex = i;
                    break;
                }
            } else if (b.type === 'street') {
                if (lastWinningNum >= b.value && lastWinningNum <= (b.value + 2)) {
                    winningBetIndex = i;
                    break;
                }
            }
        }

        if (winningBetIndex !== -1) {
            // --- WIN EVENT ---
            const winningBet = state.activeBets[winningBetIndex];

            // Trigger Reset Conditions
            if (bankroll >= state.peakProfit || state.shiftCount >= 3) {
                resetToBaseline();
            } 
            // Execute Advanced Street Isolation Shift (Only applies if a 'line' won)
            else if (winningBet.type === 'line') {
                const parentLineValue = winningBet.value;
                const removedAmount = winningBet.amount;
                const halfAmount = Math.max(Math.floor(removedAmount / 2), minInsideBet);

                // A double street starting at N contains street N (N, N+1, N+2) and street N+3 (N+3, N+4, N+5)
                const lowerStreet = parentLineValue;
                const upperStreet = parentLineValue + 3;
                
                // Identify the specific 3-number street that did NOT contain the winning number
                let losingStreetValue = lowerStreet;
                if (lastWinningNum >= lowerStreet && lastWinningNum <= (lowerStreet + 2)) {
                    losingStreetValue = upperStreet; // Lower won, so upper is the losing street
                }

                // Remove the winning double street bet
                state.activeBets.splice(winningBetIndex, 1);

                // Add the half-unit bet on the companion street that didn't win
                state.activeBets.push({
                    type: 'street',
                    value: losingStreetValue,
                    amount: halfAmount
                });

                state.shiftCount++;
            }
            // Note: If a previously shifted single 'street' bet wins, configuration remains flat
        } else {
            // --- LOSS EVENT ---
            // Martingale: Double the stakes of all current layout selections
            for (let i = 0; i < state.activeBets.length; i++) {
                state.activeBets[i].amount *= 2;
            }
        }
    }

    // 3. Clamp and Format Final Output Array
    for (let i = 0; i < state.activeBets.length; i++) {
        state.activeBets[i].amount = Math.max(state.activeBets[i].amount, minInsideBet);
        state.activeBets[i].amount = Math.min(state.activeBets[i].amount, maxBetAllowed);
    }

    return state.activeBets;
}