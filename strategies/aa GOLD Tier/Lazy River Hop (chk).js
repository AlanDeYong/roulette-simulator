/**
 * Strategy: Lazy River Hop
 * Source: Custom strategy designed by Alan Yong (Original concept / Personal Archive)
 *
 * The Full Logic in Detail:
 * - Triggers:
 *   1. The strategy begins with an initial observation spin without placing any bets.
 *   2. When not in an active cycle, the strategy takes the last winning non-zero number
 *      and identifies its three even-money outside characteristics:
 *        - High (19-36) vs Low (1-18)
 *        - Even vs Odd
 *        - Red vs Black
 *   3. It initiates a cycle by placing 1 base unit on each of the three OPPOSITE outside bets:
 *        - If High -> bet 'low'; if Low -> bet 'high'
 *        - If Even -> bet 'odd'; if Odd -> bet 'even'
 *        - If Red  -> bet 'black'; if Black -> bet 'red'
 *
 * The Full Bet Progression in Detail:
 * - Each active bet position is tracked individually with its own bet amount.
 * - Initial bet amount per active position = config.betLimits.minOutside.
 * - After each spin:
 *   - Any bet that WINS is removed from the active set.
 *   - Any bet that LOSES is retained and its bet amount is doubled (Martingale progression).
 *   - Clamping: Bet amounts are clamped to config.betLimits.max to respect table limits.
 * - Reset Condition:
 *   - Once the last remaining bet wins (active set is empty), the cycle is complete.
 *   - The strategy resets and initiates a fresh cycle using the latest spin result.
 *
 * The Goal:
 * - Secure small, consistent unit wins across the three 1:1 outside positions by eliminating
 *   each position one by one as they hit, while recovering losses via targeted doubling.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minBet = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    // Helper to evaluate whether an outside bet won on a given winning number and color
    function isWinningBet(betType, winningNumber, winningColor) {
        if (winningNumber === 0 || winningColor === 'green') return false;

        switch (betType) {
            case 'low':
                return winningNumber >= 1 && winningNumber <= 18;
            case 'high':
                return winningNumber >= 19 && winningNumber <= 36;
            case 'even':
                return winningNumber % 2 === 0;
            case 'odd':
                return winningNumber % 2 !== 0;
            case 'red':
                return winningColor === 'red';
            case 'black':
                return winningColor === 'black';
            default:
                return false;
        }
    }

    // Helper to clamp bets within table limits
    function clampBet(amount) {
        return Math.min(Math.max(amount, minBet), maxBet);
    }

    // 1. Initial State Initialization
    if (!state.activeBets) {
        state.activeBets = {}; // Map of betType -> current amount
    }

    // Must have at least 1 spin in history to observe the first result
    if (!spinHistory || spinHistory.length === 0) {
        return [];
    }

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    const lastColor = lastSpin.winningColor;

    const activeKeys = Object.keys(state.activeBets);

    // 2. Progression Update if bets were active on the previous spin
    if (activeKeys.length > 0) {
        const nextActiveBets = {};

        for (const betType of activeKeys) {
            const currentAmount = state.activeBets[betType];
            const won = isWinningBet(betType, lastNum, lastColor);

            if (!won) {
                // Bet lost: Rebet and double up
                nextActiveBets[betType] = clampBet(currentAmount * 2);
            }
            // If won: bet is removed (omitted from nextActiveBets)
        }

        state.activeBets = nextActiveBets;
    }

    // 3. Trigger / Reset Check: If no active bets, initialize a new 3-bet opposite cycle
    if (Object.keys(state.activeBets).length === 0) {
        // If the last spin was 0/green, wait for a valid number to determine opposites
        if (lastNum === 0 || lastColor === 'green') {
            return [];
        }

        const oppositeLowHigh = (lastNum >= 19) ? 'low' : 'high';
        const oppositeEvenOdd = (lastNum % 2 === 0) ? 'odd' : 'even';
        const oppositeColor   = (lastColor === 'red') ? 'black' : 'red';

        state.activeBets = {
            [oppositeLowHigh]: clampBet(minBet),
            [oppositeEvenOdd]: clampBet(minBet),
            [oppositeColor]:   clampBet(minBet)
        };
    }

    // 4. Construct and return bet array for simulator
    const betsToPlace = [];
    for (const [type, amount] of Object.entries(state.activeBets)) {
        if (bankroll >= amount) {
            betsToPlace.push({ type: type, amount: amount });
        }
    }

    return betsToPlace;
}