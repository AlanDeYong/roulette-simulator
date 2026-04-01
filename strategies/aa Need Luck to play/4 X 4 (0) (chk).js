/**
 * Strategy: 4x4 Stacking Chips
 * Source: https://www.youtube.com/watch?v=CH2QyauPvo4 (Stacking Chips)
 *
 * The Logic:
 * This strategy targets the middle column of the roulette board, specifically 
 * placing inside bets on splits connecting to 14, 17, 20, and 23, while also 
 * maintaining coverage on the zero (0). 
 *
 * The Progression:
 * This is a ladder progression system. The bet size on all covered positions 
 * is increased by 1 unit (or configured increment) after every spin that results 
 * in a net loss. 
 *
 * The Goal:
 * To grind out a slow, steady profit. The system resets the progression back 
 * to the base unit immediately once the current bankroll exceeds the session's 
 * highest recorded bankroll (locking in the profit).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.highestBankroll = bankroll;
        state.progression = 1;
        state.lastBankroll = bankroll;
        state.initialized = true;
    }

    // 2. Determine Progression based on Profit/Loss
    if (bankroll > state.highestBankroll) {
        // We reached a new high mark (profit). Reset progression.
        state.highestBankroll = bankroll;
        state.progression = 1;
    } else if (spinHistory.length > 0) {
        // Check if the last spin resulted in a net loss of bankroll
        if (bankroll < state.lastBankroll) {
            // Ladder up on a loss
            let increment = config.incrementMode === 'fixed' ? (config.minIncrementalBet || 1) : 1;
            state.progression += increment;
        }
    }

    // Update last bankroll for the next spin's comparison
    state.lastBankroll = bankroll;

    // 3. Calculate Base Unit and Current Bet Amount
    // Using min for Inside bets since we are betting splits and straight-up numbers
    const baseUnit = config.betLimits.min; 
    let amount = baseUnit * state.progression;

    // 4. Clamp Bet Amount to Table Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Define Bets (4x4 Strategy: specific middle column splits + zero)
    const bets = [
        { type: 'split', value: [11, 14], amount: amount },
        { type: 'split', value: [14, 17], amount: amount },
        { type: 'split', value: [17, 20], amount: amount },
        { type: 'split', value: [20, 23], amount: amount },
        { type: 'number', value: 0, amount: amount }
    ];

    // 6. Bankroll Management Check
    // Prevent placing bets if the total required exceeds the remaining bankroll
    const totalBetRequired = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBetRequired > bankroll) {
        return []; 
    }

    return bets;
}