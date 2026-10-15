/**
 * Roulette Strategy: Lazy River
 * 
 * Source:
 * - YouTube Channel: Casino Gamester
 * - Video URL: https://youtu.be/WfuicOTpVnM
 * 
 * Strategy Logic:
 * - The "Lazy River" strategy systematically "floats" across all 6 even-money outside bets
 *   in sequential order across the roulette table layout:
 *     1. Low (1-18)
 *     2. Even
 *     3. Red
 *     4. Black
 *     5. Odd
 *     6. High (19-36)
 * - The player stays on the current river station until a win is secured.
 * - Upon winning, the progression multiplier resets to 1 base unit, and the active bet moves to the next station in the river sequence (wrapping back to Low after High).
 * 
 * Bet Progression:
 * - Base Bet: 1 unit on the active outside bet position (using config.betLimits.minOutside).
 * - On Win: Reset multiplier to 1, advance river station index by 1.
 * - On Loss: Remain on the same outside bet station and double the bet size (Martingale progression: 1 -> 2 -> 4 -> 8 -> 16...).
 * - Clamping: Bet sizes are strictly clamped between `config.betLimits.minOutside` and `config.betLimits.max`.
 * 
 * Session Goal:
 * - Target Profit: +25% profit over starting bankroll.
 * - Stop Condition: Cease betting when target profit is achieved or bankroll is depleted below table minimums.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Session Setup & Target Profit Definition (+25% gain)
    if (!state.initialBankroll) {
        state.initialBankroll = bankroll;
    }
    const targetProfit = state.initialBankroll * 0.25;
    if (bankroll >= state.initialBankroll + targetProfit) {
        return []; // Target reached, cash out
    }

    // 2. Define River Sequence of Even-Money Outside Bets
    const RIVER_POSITIONS = ['low', 'even', 'red', 'black', 'odd', 'high'];

    // 3. Initialize Strategy State
    if (state.riverIndex === undefined) {
        state.riverIndex = 0; // Start at 'low' (1-18)
        state.multiplier = 1;
        state.lastBetType = null;
    }

    // Helper: Determine if a spin result won an outside bet
    function isWinningBet(betType, winningNumber, winningColor) {
        if (winningNumber === 0 || winningNumber === '00' || winningColor === 'green') {
            return false;
        }
        switch (betType) {
            case 'red':
                return winningColor === 'red';
            case 'black':
                return winningColor === 'black';
            case 'even':
                return winningNumber % 2 === 0;
            case 'odd':
                return winningNumber % 2 !== 0;
            case 'low':
                return winningNumber >= 1 && winningNumber <= 18;
            case 'high':
                return winningNumber >= 19 && winningNumber <= 36;
            default:
                return false;
        }
    }

    // 4. Update State Based on the Last Spin Outcome
    if (spinHistory && spinHistory.length > 0 && state.lastBetType) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const won = isWinningBet(state.lastBetType, lastSpin.winningNumber, lastSpin.winningColor);

        if (won) {
            // Win: Reset progression multiplier and float to the next river station
            state.multiplier = 1;
            state.riverIndex = (state.riverIndex + 1) % RIVER_POSITIONS.length;
        } else {
            // Loss: Martingale doubling on the same station
            state.multiplier *= 2;
        }
    }

    // 5. Calculate & Clamp Bet Amount
    const baseUnit = config.betLimits.minOutside;
    let betAmount = baseUnit * state.multiplier;

    // Respect limits
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Stop if bankroll cannot cover the minimum bet
    if (bankroll < config.betLimits.minOutside) {
        return [];
    }

    // Ensure we don't exceed current available bankroll
    betAmount = Math.min(betAmount, bankroll);

    // 6. Place Bet on Current Active River Station
    const currentBetType = RIVER_POSITIONS[state.riverIndex];
    state.lastBetType = currentBetType;

    return [
        {
            type: currentBetType,
            amount: betAmount
        }
    ];
}