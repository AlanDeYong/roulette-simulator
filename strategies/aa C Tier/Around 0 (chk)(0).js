/**
 * Greatest 0/00 Roulette Strategy (European Wheel Adaptation)
 * 
 * Source: https://www.youtube.com/watch?v=iYFpWeX6JMg (Channel: WillVegas)
 * 
 * The Logic:
 * This strategy aims to cover the "greens" (0) and their surrounding neighborhoods.
 * Since a European wheel only has a single 0, we use the number directly opposite 
 * the 0 on the wheel (which is 5) as our second "anchor". 
 * - Base Level: Bet on 0 and 5, plus the 2 numbers immediately to the left and right 
 *   of each anchor. This covers 10 numbers total.
 *   - Around 0: [26, 3, 0, 32, 15]
 *   - Around 5: [23, 10, 5, 24, 16]
 * - Expansion: After 2 consecutive losses, we expand the neighborhood by 1 number 
 *   on each side. This covers 14 numbers total.
 *   - Expanded 0: [35, 26, 3, 0, 32, 15, 19]
 *   - Expanded 5: [8, 23, 10, 5, 24, 16, 33]
 * 
 * The Progression:
 * - Start with a base bet of 1 unit (config.betLimits.min).
 * - On a win, reset to the Base Level (10 numbers) and 1 unit bet.
 * - Every TWO consecutive losses, double the bet amount.
 *   - Loss 1: Base bet (1x)
 *   - Loss 2: Double bet (2x) AND Expand to 14 numbers
 *   - Loss 3: Double bet (2x) on 14 numbers
 *   - Loss 4: Quadruple bet (4x) on 14 numbers
 *   - etc...
 * 
 * The Goal:
 * Target a short-term profit of $50-$100 and then reset or walk away. 
 * The recommended bankroll is $500 for this strategy.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (typeof state.consecutiveLosses === 'undefined') {
        state.consecutiveLosses = 0;
        state.lastBetNumbers = [];
    }

    // 2. Evaluate Previous Spin Results
    if (spinHistory.length > 0 && state.lastBetNumbers.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const wasWin = state.lastBetNumbers.includes(lastSpin.winningNumber);

        if (wasWin) {
            state.consecutiveLosses = 0; // Reset progression on win
        } else {
            state.consecutiveLosses++;   // Advance loss progression
        }
    }

    // 3. Define Number Sets (European Wheel Layout)
    const baseNumbers = [
        26, 3, 0, 32, 15,   // Neighbors of 0 (2 distance)
        23, 10, 5, 24, 16   // Neighbors of 5 (2 distance)
    ];

    const expandedNumbers = [
        35, 26, 3, 0, 32, 15, 19,  // Neighbors of 0 (3 distance)
        8, 23, 10, 5, 24, 16, 33   // Neighbors of 5 (3 distance)
    ];

    // 4. Determine Current Numbers and Bet Amount
    // Expand to 14 numbers only if we have 2 or more consecutive losses
    const currentNumbers = state.consecutiveLosses >= 2 ? expandedNumbers : baseNumbers;
    
    // Double the bet multiplier every 2 consecutive losses
    const multiplier = Math.pow(2, Math.floor(state.consecutiveLosses / 2));
    
    // Calculate raw amount
    let amount = config.betLimits.min * multiplier;

    // 5. Clamp to Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // Ensure we don't bet more than our bankroll can handle
    const totalRequiredBankroll = amount * currentNumbers.length;
    if (totalRequiredBankroll > bankroll) {
        // Fallback: Bet whatever is left evenly, or stop betting if totally broke
        amount = Math.floor(bankroll / currentNumbers.length);
        if (amount < config.betLimits.min) {
            return []; // Not enough bankroll to cover the spread at minimum limits
        }
    }

    // 6. Save current numbers to state for the next spin's evaluation
    state.lastBetNumbers = currentNumbers;

    // 7. Construct and Return Bets
    const bets = currentNumbers.map(num => ({
        type: 'number',
        value: num,
        amount: amount
    }));

    return bets;
}