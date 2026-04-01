/*
 * STRATEGY: Red 2 Column
 * SOURCE: https://www.youtube.com/watch?v=ZN2ppglkCGA (WillVegas)
 * * THE LOGIC: 
 * - Place equal bets on Red, Column 1, and Column 3.
 * - This covers all red numbers and the columns with the most red numbers, actively avoiding the center column.
 * * THE PROGRESSION:
 * - On any net loss for the spin (total payout < total bet amount), increase the bet on all three positions by 1 unit.
 * - On a win or a push (total payout >= total bet amount), keep the bets at the exact same current level.
 * * THE GOAL:
 * - Achieve a session profit of 10 base units (mimicking the $10 profit target from the video).
 * - Once the target profit is reached, reset the progression back to the base bet.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit using the outside limit
    const unit = config.betLimits.minOutside;

    // 2. Initialize State
    if (state.currentLevel === undefined) {
        state.currentLevel = 1; 
        state.sessionStartBankroll = bankroll;
    }

    // 3. Evaluate Previous Spin Result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Reconstruct the previous bets to calculate total bet vs total payout
        const prevTotalBet = state.currentLevel * unit * 3;
        let totalPayout = 0;
        
        // Payout for Red (1:1)
        if (lastSpin.winningColor === 'red') {
            totalPayout += (state.currentLevel * unit) * 2; // Payout + returned bet
        }
        
        // Payout for Column 1 (2:1)
        const col1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
        if (col1.includes(lastSpin.winningNumber)) {
            totalPayout += (state.currentLevel * unit) * 3; // Payout + returned bet
        }
        
        // Payout for Column 3 (2:1)
        const col3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
        if (col3.includes(lastSpin.winningNumber)) {
            totalPayout += (state.currentLevel * unit) * 3; // Payout + returned bet
        }

        // Progression Trigger: Did we suffer a net loss?
        if (totalPayout < prevTotalBet) {
            const increment = config.incrementMode === 'base' ? 1 : (config.minIncrementalBet || 1);
            state.currentLevel += increment;
        } 
        // Note: If totalPayout >= prevTotalBet (Push or Win), we stay put (currentLevel remains unchanged).
    }

    // 4. Check Goal Condition
    const profitTarget = unit * 10;
    if (bankroll >= state.sessionStartBankroll + profitTarget) {
        // Goal achieved! Reset the session
        state.currentLevel = 1;
        state.sessionStartBankroll = bankroll; // Set new watermark
    }

    // 5. Calculate and Clamp Bet Amounts
    let amount = state.currentLevel * unit;
    amount = Math.max(amount, config.betLimits.minOutside); 
    amount = Math.min(amount, config.betLimits.max);        

    // 6. Return Bet Array
    return [
        { type: 'red', amount: amount },
        { type: 'column', value: 1, amount: amount },
        { type: 'column', value: 3, amount: amount }
    ];
}