/**
 * Ballistic Determinism Strategy (The Newtonian Drop Zone)
 *
 * Source:
 * Channel: The Lucky Felt
 * URL: https://www.youtube.com/watch?v=tPFN7XHqXdk&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=17
 *
 * The Full Logic in details:
 * This strategy treats roulette not as a random game, but as a physics equation based on the
 * "Dealer Signature" (the consistent rhythm, speed, and force a dealer uses).
 * - A "launch point" is determined before each spin. In a live setting this might be where the
 *   dealer releases the ball, but in this simulation, we use the previous spin's winning number
 *   as the physical launch point (where the ball was last resting).
 * - We bet on a 9-number "drop zone" on the physical wheel.
 * - This drop zone is calculated by taking the launch point and the next 8 consecutive numbers
 *   clockwise on the physical wheel layout (supports both European and American wheel sequences).
 *
 * The Full Bet Progression in details:
 * - Linear / D'Alembert style progression on a group of numbers.
 * - Initial Bet: Place 1 base unit (config.betLimits.min) on each of the 9 drop zone numbers.
 * - On a Win: The bet amount resets completely back to the base unit.
 * - On a Loss: The bet amount on each number increases by 1 increment (defined dynamically by
 *   config.incrementMode and config.minIncrementalBet).
 * - All bet amounts are strictly clamped to config.betLimits.min and config.betLimits.max.
 *
 * The Goal:
 * - To exploit mechanical patterns and consistently predict the ball's landing quadrant.
 * - Profit Target: The video aims for a quick 20% profit on the starting bankroll.
 * - Stop Loss: No strict stop-loss is defined in the strategy; bets increase linearly after losses
 *   until a win occurs, or until table limits are reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;

    if (state.currentBetAmount === undefined) {
        state.currentBetAmount = unit;
        state.lastBetNumbers = null;
    }

    if (!spinHistory || spinHistory.length === 0) {
        return [];
    }

    let launchPoint = spinHistory[spinHistory.length - 1].winningNumber;

    // The simulator uses 37 for the American double-zero pocket.
    if (launchPoint === 37) launchPoint = '00';
    if (launchPoint === '0') launchPoint = 0;

    if (Array.isArray(state.lastBetNumbers) && state.lastBetNumbers.length > 0) {
        const isWin = state.lastBetNumbers.some((n) => n.toString() === launchPoint.toString());

        if (isWin) {
            state.currentBetAmount = unit;
        } else {
            const increment = config.incrementMode === 'base' ? unit : (config.minIncrementalBet || 1);
            state.currentBetAmount += increment;
        }
    }

    let amount = state.currentBetAmount;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);
    state.currentBetAmount = amount;

    const europeanWheel = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
        10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
    ];
    const americanWheel = [
        0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
        '00', 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
    ];

    const wheel = config.tableType === 'american' ? americanWheel : europeanWheel;
    const launchIndex = wheel.indexOf(launchPoint);
    if (launchIndex === -1) {
        state.lastBetNumbers = null;
        return [];
    }

    const dropZoneNumbers = [];
    for (let i = 0; i < 9; i++) {
        const index = (launchIndex + i) % wheel.length;
        dropZoneNumbers.push(wheel[index]);
    }

    const totalBetCost = dropZoneNumbers.length * amount;
    if (bankroll < totalBetCost) {
        return [];
    }

    state.lastBetNumbers = dropZoneNumbers;

    return dropZoneNumbers.map((number) => ({
        type: 'number',
        value: number,
        amount: amount
    }));
}
