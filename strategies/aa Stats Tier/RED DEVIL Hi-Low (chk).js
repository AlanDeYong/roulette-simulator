/**
 * Roulette Strategy: RED DEVIL Hi-Low
 * 
 * Source:
 * - URL: https://youtu.be/aIMrBD906To
 * - Channel Name: WillVegas
 * 
 * The Full Logic in Details:
 * - The strategy places simultaneous outside bets covering both Dozens and Colors.
 * - Specifically, it bets on 2 distinct Dozens (1st Dozen and 3rd Dozen) and 1 Color (Red).
 * - On a "Push" (a net zero return, such as when a Black number hits in the 1st or 3rd dozen), 
 *   the strategy maintains the exact same bet size for the next spin.
 * - On any absolute net "Loss" (partial or complete, where the total payout is less than the total amount wagered),
 *   the progression level advances.
 * - On a "Win" (net positive return), the progression level remains elevated unless the overall session bankroll
 *   reaches or exceeds its peak historical profit point. When peak profit is achieved or exceeded, the system resets.
 * 
 * The Full Bet Progression in Details:
 * - The base setup wagers 1 unit on the 1st Dozen, 1 unit on the 3rd Dozen, and 1 unit on Red (Total base bet = 3 units).
 * - Progression Mode (d'Alembert style variation): 
 *   - Following a loss, all three individual bets are increased by exactly 1 unit each (+3 units to the total bet size).
 *   - The total bet size progression steps upward smoothly: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, ... up to 90 units.
 *   - Upon reaching or exceeding the highest session bankroll recorded during the run, the progression level collapses 
 *     instantly back to 1 unit per position (3 units total).
 * 
 * The Goal:
 * - Accumulate incremental grinding profits by squeezing steady small wins out of heavy layout coverage, using the safety 
 *   of frequent "pushes" to break up losing streaks without exploding the bet sizes exponentially.
 * 
 * @param {Array} spinHistory - Array of past spin objects. The last result is spinHistory[spinHistory.length - 1].
 * @param {number} bankroll - The current bankroll size.
 * @param {Object} config - Configuration object containing bet limits and structural behaviors.
 * @param {Object} state - Persistent state object carried across spins.
 * @param {Object} utils - Helper utilities.
 * @returns {Array|null} Array of bet tokens or null/empty array.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish structural base configurations and limits
    const baseUnit = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // 2. Initialize persistent state properties
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.progressionLevel = 1; // Start at 1 unit per bet spot
    }

    // 3. Process outcomes from the last spin to update the progression state
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const color = lastSpin.winningColor;

        // Re-evaluate what our layout commitments were for the previous spin
        // Bets were placed on 1st Dozen (1-12), 3rd Dozen (25-36), and Red
        const prevBetPerSpot = baseUnit * state.progressionLevel;
        const totalWagered = prevBetPerSpot * 3;

        let totalWon = 0;

        // Calculate Payout for 1st Dozen (pays 2 to 1, returns 3x the bet)
        if (num >= 1 && num <= 12) {
            totalWon += prevBetPerSpot * 3;
        }
        // Calculate Payout for 3rd Dozen (pays 2 to 1, returns 3x the bet)
        if (num >= 25 && num <= 36) {
            totalWon += prevBetPerSpot * 3;
        }
        // Calculate Payout for Red color (pays 1 to 1, returns 2x the bet)
        if (color === 'red') {
            totalWon += prevBetPerSpot * 2;
        }

        // Determine net performance outcome
        if (totalWon > totalWagered) {
            // It's a net win. Check if we reached a new session peak profit.
            if (bankroll >= state.peakBankroll) {
                state.progressionLevel = 1; // Peak reached -> Reset to base level
                state.peakBankroll = bankroll; // Update historical peak point
            }
            // If it's a win but not yet back to peak profit, progressionLevel stays the same (rebet)
        } else if (totalWon < totalWagered) {
            // It's a net loss -> step up progression by 1 unit per position
            state.progressionLevel += 1;
        }
        // If totalWon === totalWagered, it's a perfect push -> state.progressionLevel remains unchanged
    }

    // Always keep track of the absolute highest point the bankroll achieves
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 4. Calculate individual position bet size and clamp to legal table boundaries
    let spotBetAmount = baseUnit * state.progressionLevel;
    spotBetAmount = Math.max(spotBetAmount, config.betLimits.minOutside);
    spotBetAmount = Math.min(spotBetAmount, maxBet);

    // 5. Construct the final table array allocations
    return [
        { type: 'dozen', value: 1, amount: spotBetAmount }, // 1st Dozen
        { type: 'dozen', value: 3, amount: spotBetAmount }, // 3rd Dozen
        { type: 'red', amount: spotBetAmount }              // Color Red
    ];
}