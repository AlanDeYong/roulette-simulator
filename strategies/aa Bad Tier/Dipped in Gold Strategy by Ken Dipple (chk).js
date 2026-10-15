/**
 * Dipped in Gold Strategy by Ken Dipple (2x Street Ratio Version)
 * 
 * Source: 
 *   - Video: "(WON $800) GOING VIRAL-DIPPED IN GOLD!"
 *   - Channel: The Roulette Master (https://youtu.be/Ehs9MViKC84)
 * 
 * Full Strategy Logic:
 *   - Covered Numbers: Covers 31 total numbers out of 37/38 on the wheel.
 *     1. Straight Up Bets: Base amount on numbers 6, 7, 8, and 9 (4 single numbers).
 *     2. Street Bets: Base street amount = 2x base number bet (on streets starting at 10, 13, 16, 19, 22, 25, 28, 31, 34).
 *   - Proportional Base Setup:
 *     - If number bet = $1, street bet = $2 (Total Base Bet = $22).
 *     - If number bet = $5, street bet = $10 (Total Base Bet = $110).
 * 
 * Full Bet Progression:
 *   - Initial Bet: Level 1 (Street bet = 2 * baseNumberBet, Number bet = baseNumberBet).
 *   - On Loss (numbers 0, 00, 1, 2, 3, 4, 5): 
 *     - Increase EACH street bet by 1 base street unit (2 * baseNumberBet).
 *     - The straight-up bets on 6, 7, 8, 9 remain fixed at their base amount.
 *   - On Win:
 *     - If the spin results in a win and the bankroll recovers to net session profit 
 *       (bankroll >= starting bankroll or bankroll >= highest peak bankroll), reset progression to Level 1.
 *     - If not yet in profit, hold the current street bet amount and spin again.
 * 
 * Goal:
 *   - Target profit: Scaled session goal ~$40 - $200 depending on base unit.
 * 
 * @param {Array} spinHistory - Array of past spin objects [{ winningNumber, winningColor }]
 * @param {number} bankroll - Current bankroll amount
 * @param {Object} config - Environment configuration object with bet limits
 * @param {Object} state - Persistent state object between spins
 * @param {Object} utils - Utility functions provided by simulator
 * @returns {Array} Array of bet objects
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.peakBankroll = bankroll;
        state.level = 1; // Multiplier level for street bets
    }

    // Update peak bankroll
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Process Previous Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Check if last spin was a loss (0, 00 / 37, 1, 2, 3, 4, 5)
        const isLoss = (lastNum === 0 || lastNum === 37 || (lastNum >= 1 && lastNum <= 5));

        if (isLoss) {
            // Increase street bet level by 1 on loss
            state.level += 1;
        } else {
            // On win, check if we recovered back into net session profit
            if (bankroll >= state.initialBankroll) {
                state.level = 1; // Reset to base level
            }
        }
    }

    // 3. Define Base Bet Amounts respecting config limits
    const minInside = config.betLimits.min || 1;
    const maxBet = config.betLimits.max || 500;

    // Base unit for single numbers
    const baseNumberBet = Math.max(1, minInside);
    
    // Base unit for street bets is ALWAYS 2 times the base number bet
    const baseStreetBet = baseNumberBet * 2;

    // Calculate current bet amounts based on progression level
    let streetAmount = baseStreetBet * state.level;
    let numberAmount = baseNumberBet;

    // Clamp amounts to table limits
    streetAmount = Math.min(Math.max(streetAmount, minInside), maxBet);
    numberAmount = Math.min(Math.max(numberAmount, minInside), maxBet);

    // 4. Construct Bets
    const bets = [];

    // Straight Up Bets on 6, 7, 8, 9
    const straightNumbers = [6, 7, 8, 9];
    for (let num of straightNumbers) {
        bets.push({
            type: 'number',
            value: num,
            amount: numberAmount
        });
    }

    // Street Bets on 10, 13, 16, 19, 22, 25, 28, 31, 34
    const streetStartNumbers = [10, 13, 16, 19, 22, 25, 28, 31, 34];
    for (let streetVal of streetStartNumbers) {
        bets.push({
            type: 'street',
            value: streetVal,
            amount: streetAmount
        });
    }

    return bets;
}