/**
 * ============================================================================
 * ROULETTE STRATEGY: Honey Cover My Splits
 * ============================================================================
 * Source: https://youtu.be/H_WYS5gOo-Q
 * Channel: CEG Dealer School
 * 
 * THE FULL LOGIC IN DETAILS:
 * - This strategy is a cooperative / flat-betting system called "Honey Cover My Splits".
 * - On every spin, bets are placed across 11 specific split positions covering a total
 *   of 22 numbers on the roulette board.
 * - The covered splits are:
 *     1. [0, 1] (or 0/00 split depending on layout)
 *     2. [1, 2]
 *     3. [5, 6]
 *     4. [7, 8]
 *     5. [11, 12]
 *     6. [13, 14]
 *     7. [17, 18]
 *     8. [19, 20]
 *     9. [23, 24]
 *    10. [31, 32]
 *    11. [35, 36]
 * 
 * THE FULL BET PROGRESSION IN DETAILS:
 * - Flat Betting: Always bet 1 base unit per split on every spin.
 * - No chasing or negative/positive progression (no doubling on loss, no press on win).
 * - After every spin, the strategy re-places the same flat unit on all 11 split positions.
 * 
 * THE GOAL:
 * - Target Profit: +$500 total profit (or 100 units total net profit).
 * - Stop Loss: $600 total bankroll loss (or full initial buy-in depletion).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit amount for inside split bets
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;

    // Calculate unit per split (clamped to limits)
    let unitPerSplit = Math.max(minInside, Math.min(maxBet, minInside));

    // 2. Target Profit & Stop Loss Check
    if (!state.initialBankroll) {
        state.initialBankroll = bankroll;
    }

    const currentProfit = bankroll - state.initialBankroll;
    const targetProfit = 500; // Target profit from video logic
    const stopLoss = -600;    // Total buy-in loss stop from video logic

    if (currentProfit >= targetProfit || currentProfit <= stopLoss) {
        return []; // Stop betting when goal or stop loss is reached
    }

    // 3. Define the 11 split positions covered in "Honey Cover My Splits"
    const splitPositions = [
        [0, 1],
        [1, 2],
        [5, 6],
        [7, 8],
        [11, 12],
        [13, 14],
        [17, 18],
        [19, 20],
        [23, 24],
        [31, 32],
        [35, 36]
    ];

    // 4. Construct bet objects array
    const bets = splitPositions.map(splitPair => ({
        type: 'split',
        value: splitPair,
        amount: unitPerSplit
    }));

    return bets;
}