/**
 * Roulette Strategy: The 4-3 Strategy (Marty 26)
 * 
 * Source:
 * - Channel: WillVegas
 * - Video URL: https://youtu.be/GUR57rjl6so
 * 
 * Strategy Logic:
 * - Covers 26 out of 37 numbers on European Roulette using a combination of 3 Double Streets (6-line bets)
 *   and 4 Split bets to maintain high table coverage while ensuring every winning hit yields profit.
 * - Bet Placement:
 *   - 3 Double Streets (6-line bets) on rows starting at 7, 16, and 25 (3 base units each).
 *   - 4 Split bets on [4, 5], [14, 15], [31, 32], and [32, 33] (1 base unit each).
 * 
 * Bet Progression (David's Recovery Progression):
 * - Initial Bet Level Multiplier: 1x (Base bet: 13 units total -> 3 units per double street, 1 unit per split).
 * - After a LOSS: Increase progression level multiplier by +2 units (1x -> 3x -> 5x -> 7x...).
 * - After a WIN:
 *   - If current bankroll is in overall session profit (bankroll >= starting bankroll), reset to base level (1x).
 *   - Otherwise, step down -1 unit (decrease multiplier by 1, clamped to a minimum of 1x).
 * 
 * Goal:
 * - Target profit: +$50 above the session starting bankroll (or custom profit target).
 * 
 * @param {Array} spinHistory - Array of past spin objects [{ winningNumber, winningColor }]
 * @param {number} bankroll - Current available bankroll amount
 * @param {Object} config - Simulator config including bet limits and starting bankroll
 * @param {Object} state - State object for persistence across spins
 * @param {Object} utils - Utility helper methods
 * @returns {Array|null} Array of bet objects or null if target reached / no bet
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.targetProfit = 500000; // $50 target profit from video
        state.multiplier = 1;    // Base multiplier level
        state.lastBankroll = bankroll;
        state.initialized = true;
    }

    // 2. Check Target Profit Goal / Stop Condition
    const totalProfit = bankroll - state.initialBankroll;
    if (totalProfit >= state.targetProfit) {
        // Target achieved - stop betting
        return null;
    }

    // 3. Evaluate Previous Spin Result (if history exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Check if last spin hit any of our covered numbers (26 numbers)
        const coveredLine7 = num >= 7 && num <= 12;
        const coveredLine16 = num >= 16 && num <= 21;
        const coveredLine25 = num >= 25 && num <= 30;
        const coveredSplits = [4, 5, 14, 15, 31, 32, 33].includes(num);

        const isWin = coveredLine7 || coveredLine16 || coveredLine25 || coveredSplits;

        if (isWin) {
            // If in session profit, reset to base (1x multiplier)
            if (bankroll >= state.initialBankroll) {
                state.multiplier = 1;
            } else {
                // Otherwise step down -1 unit
                state.multiplier = Math.max(1, state.multiplier - 1);
            }
        } else {
            // On Loss: Increase multiplier by +2 units
            state.multiplier += 2;
        }
    }

    // 4. Determine Base Unit Amount (respecting inside bet limits)
    const baseUnit = Math.max(1, config.betLimits.min);

    // 5. Calculate Bet Amounts
    let splitAmount = baseUnit * state.multiplier;
    let lineAmount = (baseUnit * 3) * state.multiplier;

    // Clamp amounts to defined bet limits
    splitAmount = Math.max(config.betLimits.min, Math.min(splitAmount, config.betLimits.max));
    lineAmount = Math.max(config.betLimits.min, Math.min(lineAmount, config.betLimits.max));

    // 6. Build Bet Array (4 Splits + 3 Double Streets)
    const bets = [
        // 3 Double Streets (6-line bets)
        { type: 'line', value: 7, amount: lineAmount },
        { type: 'line', value: 16, amount: lineAmount },
        { type: 'line', value: 25, amount: lineAmount },

        // 4 Splits
        { type: 'split', value: [4, 5], amount: splitAmount },
        { type: 'split', value: [14, 15], amount: splitAmount },
        { type: 'split', value: [31, 32], amount: splitAmount },
        { type: 'split', value: [32, 33], amount: splitAmount }
    ];

    return bets;
}