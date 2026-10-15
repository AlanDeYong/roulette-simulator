/**
 * Basic 2 Dozen Strategy
 *
 * Source: https://youtu.be/D-fjuQz0njk (WillVegas)
 *
 * The Full Logic in details: 
 * The strategy involves betting on two of the three dozens (e.g., the 1st and 2nd dozen). 
 * By covering 24 numbers, the player has a significantly higher probability of winning on each spin 
 * compared to the remaining 14 (or 13) losing numbers on the board. If the unselected 3rd dozen 
 * or a zero hits, the bets lose.
 *
 * The Full Bet Progression in details:
 * - The initial bet is 1 base unit (the table minimum for outside bets) on each of the two selected dozens.
 * - After a loss: Increase the bet size by exactly 1 increment unit on both dozens.
 * - After a win: Decrease the bet size by exactly 1 increment unit on both dozens, down to the base unit minimum.
 * - This method relies on a slow, grinding D'Alembert-style recovery to handle variance.
 *
 * The Goal:
 * The target profit is highly conservative—$30 to $50 (equivalent to 6 to 10 base units). 
 * The stop-loss is set by standard bankroll depletion, explicitly recommended at around $300 (60 units).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit and increment step safely (handling missing config properties)
    const baseBet = (config.betLimits && config.betLimits.minOutside) ? config.betLimits.minOutside : 1;
    
    let increment = baseBet;
    if (config.incrementMode === 'fixed') {
        // Fallback to 1 if the simulator engine doesn't explicitly provide minIncrementalBet
        increment = (config.minIncrementalBet !== undefined && config.minIncrementalBet !== null) 
            ? config.minIncrementalBet 
            : 1;
    }

    // 2. Initialize State (Includes safety check to purge NaN if it ever gets stuck)
    if (state.currentBet === undefined || isNaN(state.currentBet)) {
        state.currentBet = baseBet;
    }

    // 3. Process previous spin result to update progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        let winningDozen = 0;
        if (num >= 1 && num <= 12) winningDozen = 1;
        else if (num >= 13 && num <= 24) winningDozen = 2;
        else if (num >= 25 && num <= 36) winningDozen = 3;
        
        // Strategy targets the 1st and 2nd dozens
        const isWin = (winningDozen === 1 || winningDozen === 2);
        
        if (isWin) {
            // Decrease by 1 increment after a win, stopping at base bet
            state.currentBet = Math.max(baseBet, state.currentBet - increment);
        } else {
            // Increase by 1 increment after a loss
            state.currentBet += increment;
        }
    }

    // 4. Clamp to limits safely
    let amount = state.currentBet;
    const minBet = (config.betLimits && config.betLimits.minOutside) ? config.betLimits.minOutside : 1;
    const maxBet = (config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;
    
    amount = Math.max(amount, minBet);
    amount = Math.min(amount, maxBet);

    // Bankroll safety check: halt betting if we cannot cover both dozens
    if (amount * 2 > bankroll) {
        return [];
    }

    // 5. Return Bets
    return [
        { type: 'dozen', value: 1, amount: amount },
        { type: 'dozen', value: 2, amount: amount }
    ];
}