/**
 * SOURCE: https://www.youtube.com/watch?v=HlwrXu4i-og (Viper Roulette)
 * * THE LOGIC:
 * This strategy, called "High-Rise Streets," focuses on "Street" bets (covering 3 numbers each). 
 * It starts by betting on 3 specific streets. As the session progresses and losses occur, 
 * the coverage increases from 3 streets up to a maximum of 9 streets to increase the win 
 * probability (reaching up to 97.63% coverage per the source).
 * * THE PROGRESSION:
 * Uses a modified D'Alembert/Ladder approach. 
 * - After a LOSS: Increase the coverage by adding 1 street (if below the max of 9).
 * - After a WIN: Decrease the coverage by removing 1 street (if above the min of 3).
 * This ensures that as the "risk" of a losing streak grows, the "safety net" (coverage) 
 * also grows.
 * * THE GOAL: 
 * Reach a $100 profit from a small initial risk/drawdown.
 */

function bet(spinHistory, bankroll, config, state) {
    // 1. Initialize State
    if (state.currentLevel === undefined) {
        state.currentLevel = 3; // Start with 3 streets
        state.initialBankroll = bankroll;
        state.targetProfit = 1000;
    }

    // 2. Define the Streets to cover (Standard sequence)
    // These values represent the starting number of the street (1, 4, 7, 10, 13, 16, 19, 22, 25)
    const streetValues = [1, 4, 7, 10, 13, 16, 19, 22, 25];

    // 3. Process Last Result and Adjust Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastBets = state.lastBets || [];
        
        // Determine if we won
        const wonLastRound = lastBets.some(b => {
            const num = lastSpin.winningNumber;
            return num >= b.value && num <= (b.value + 2);
        });

        if (wonLastRound) {
            // Decrease coverage on win (Min 3)
            state.currentLevel = Math.max(3, state.currentLevel - 1);
        } else {
            // Increase coverage on loss (Max 9)
            state.currentLevel = Math.min(9, state.currentLevel + 1);
        }
    }

    // 4. Check Stop Conditions
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= state.targetProfit) {
        return null; // Stop betting once target is reached
    }

    // 5. Build Bet Array
    const bets = [];
    const unitAmount = config.betLimits.min; // Minimum for "Street" (Inside) bets

    for (let i = 0; i < state.currentLevel; i++) {
        let amount = unitAmount;
        
        // Clamp to limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({
            type: 'street',
            value: streetValues[i],
            amount: amount
        });
    }

    // Save state of bets to check win next round
    state.lastBets = bets;

    return bets;
}