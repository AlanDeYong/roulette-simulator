/**
 * DOCUMENTATION:
 * - Source: https://youtu.be/kA3WSjR4hqw (Channel: WillVegas)
 * - The Full Logic: The strategy bets on 5 positions (2 Double Streets, 3 Corners) 
 *   covering 24 unique numbers. It relies on high table coverage to generate 
 *   frequent small wins.
 * - The Full Bet Progression: 
 *   - Base Bet: Start with 1 unit on each of the 5 positions (Total 5 units).
 *   - After Win: Reset to base bet (1 unit per position).
 *   - After Loss: Increase the bet amount on each position by 1 unit 
 *     (Aggressive progression to recover losses).
 * - The Goal: Aim for a session profit target (e.g., $100) and stick to a 
 *   strict time limit (15-20 minutes). Stop playing if the limit is reached 
 *   regardless of profit/loss.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) state.level = 1;

    // 2. Determine Win/Loss from last spin
    // We assume a win if the last spin exists and the strategy is running.
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Define coverage: 2 Double Streets (1-6, 31-36), 3 Corners (e.g., 7-8,10-11, 13-14,16-17, 19-20,22-23)
        // For simplicity, we define the standard covered numbers:
        const covered = [1, 2, 3, 4, 5, 6, 31, 32, 33, 34, 35, 36, 7, 8, 10, 11, 13, 14, 16, 17, 19, 20, 22, 23];
        
        if (covered.includes(lastNum)) {
            state.level = 1; // Reset on win
        } else {
            state.level++; // Increase on loss
        }
    }

    // 3. Calculate Bet Amounts
    const baseUnit = config.betLimits.min; // Using inside bet minimum for all
    let amount = baseUnit * state.level;

    // 4. CLAMP TO LIMITS
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Place Bets
    // 2 Double Streets, 3 Corners
    return [
        { type: 'line', value: 1, amount: amount },  // Covers 1-6
        { type: 'line', value: 31, amount: amount }, // Covers 31-36
        { type: 'corner', value: 7, amount: amount },  // Covers 7,8,10,11
        { type: 'corner', value: 13, amount: amount }, // Covers 13,14,16,17
        { type: 'corner', value: 19, amount: amount }  // Covers 19,20,22,23
    ];
}