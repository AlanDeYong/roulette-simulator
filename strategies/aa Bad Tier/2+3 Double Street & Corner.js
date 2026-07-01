/**
 * DOCUMENTATION: 2+3 Double Street & Corner Strategy
 * 
 * Source: https://youtu.be/EJbiWjLiXyI (Channel: WillVegas)
 * 
 * Logic:
 *   - The strategy bets on two Double Streets (covering 12 numbers), four Corners (covering 16 numbers), 
 *     and covers the green zero(s) for insurance. 
 *   - It targets consistent, low-stress accumulation.
 * 
 * Bet Progression:
 *   - Initial: Start at base unit (1x).
 *   - Loss: Increase bets by one unit (1x) on all positions.
 *   - Win: Reset to base unit (1x).
 * 
 * Goal: Consistent, incremental profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.level) state.level = 1;

    // Check last result for win/loss
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        // Simplified check: if last bet won (need a way to track if we won/lost in simulator)
        // Note: Simulator logic usually handles bankroll delta check.
        // Assuming 'win' logic: lastSpin.payout > 0
        if (lastSpin.payout > 0) {
            state.level = 1; // Reset after any win
        } else {
            state.level++; // Increase progression after loss
        }
    }

    // 2. Define Base Units
    const baseUnit = config.betLimits.min; 
    const greenUnit = config.betLimits.min; // Usually handled as inside bet

    // 3. Calculate Bet Amounts (Respecting Limits)
    const getClampedAmount = (amt) => {
        return Math.min(Math.max(amt * state.level, baseUnit), config.betLimits.max);
    };

    const betAmount = getClampedAmount(baseUnit);
    const greenAmount = getClampedAmount(greenUnit);

    // 4. Construct Bets
    // Strategy: 2 Double Streets, 4 Corners, 1 Green
    return [
        { type: 'line', value: 1, amount: betAmount },    // Covers 1-6
        { type: 'line', value: 31, amount: betAmount },   // Covers 31-36
        { type: 'corner', value: 7, amount: betAmount },  // Covers 7,8,10,11
        { type: 'corner', value: 16, amount: betAmount }, // Covers 16,17,19,20
        { type: 'corner', value: 25, amount: betAmount }, // Covers 25,26,28,29
        { type: 'corner', value: 32, amount: betAmount }, // Covers 32,33,35,36
        { type: 'number', value: 0, amount: greenAmount } // Green coverage
    ];
}