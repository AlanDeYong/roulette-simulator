/**
 * Strategy: Double Street Dynasty
 * 
 * Source:
 * - YouTube Video: https://youtu.be/vODEPJ2skgI
 * - Channel: Roulette Strategy Lab (Terry), credited to "The Roulette Master"
 * 
 * The Full Logic in Details:
 * - The strategy covers 8 overlapping "double street" (six-line) bets in the center of the board:
 *   Lines starting at 7, 10, 13, 16, 19, 22, 25, and 28.
 *   These cover numbers 7 through 33, leaving only low numbers (0, 00, 1-6) and high numbers (34-36) uncovered.
 * - Because the lines overlap sequentially, interior numbers (10 to 30) are covered by multiple double streets,
 *   yielding overlapping 5:1 payouts on winning hits. Outer numbers (7-9 and 31-33) are covered by a single line.
 * 
 * The Full Bet Progression in Details:
 * - Start with 1 base unit on each of the 8 double streets (8 units total).
 * - Track the session peak bankroll (high-water mark).
 * - After each spin:
 *   - If the current bankroll meets or exceeds the previous peak bankroll (new session profit),
 *     reset the bet size back to 1 unit and update the peak bankroll.
 *   - If a spin results in a loss or the bankroll remains below the session peak,
 *     increase the bet size by 1 unit per double street (e.g., 1 -> 2 -> 3 units).
 *   - Once any subsequent win recovers the bankroll to a new session peak, immediately reset to 1 unit.
 * 
 * The Goal:
 * - Target Profit: Target a designated profit (e.g., $100 or user-configured session target).
 * - Stop Loss: Stop if the bankroll cannot cover the minimum required bet for all 8 positions.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.peakBankroll = bankroll;
        state.units = 1;
        state.targetProfit = 10000; // Target highlighted in video (78.12% walkaway rate)
        state.stopBankroll = bankroll + state.targetProfit;
    }

    // 2. Check Target Profit Goal
    if (bankroll >= state.stopBankroll) {
        return []; // Target achieved, walk away
    }

    // 3. Update Progression Based on Last Spin
    if (spinHistory && spinHistory.length > 0) {
        if (bankroll >= state.peakBankroll) {
            // Reached new session high / peak profit: reset progression
            state.peakBankroll = bankroll;
            state.units = 1;
        } else {
            // Not in new session profit: increment progression by 1 unit
            state.units += 1;
        }
    }

    // 4. Determine Base Unit and Bet Sizing
    // Line bets are inside bets; respect config.betLimits.min
    const baseUnit = config.betLimits.min;
    let unitAmount = baseUnit * state.units;

    // Respect incrementMode if specified
    if (config.incrementMode === 'fixed' && config.minIncrementalBet) {
        unitAmount = baseUnit + (state.units - 1) * config.minIncrementalBet;
    }

    // Clamp individual bet to table limits
    unitAmount = Math.max(unitAmount, config.betLimits.min);
    unitAmount = Math.min(unitAmount, config.betLimits.max);

    // 5. Check Bankroll Sufficiency
    const lineStartNumbers = [7, 10, 13, 16, 19, 22, 25, 28];
    const totalRequired = unitAmount * lineStartNumbers.length;

    if (bankroll < totalRequired) {
        // Can't afford the full progression; attempt minimum base bet or stop
        unitAmount = config.betLimits.min;
        if (bankroll < unitAmount * lineStartNumbers.length) {
            return []; // Bankroll depleted
        }
    }

    // 6. Construct and Return the 8 Double Street Bets
    return lineStartNumbers.map(startNum => ({
        type: 'line',
        value: startNum,
        amount: unitAmount
    }));
}