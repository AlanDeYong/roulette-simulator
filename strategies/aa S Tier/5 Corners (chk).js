/**
 * Strategy: 5 Corners
 * Source: Bet With Mo - https://www.youtube.com/watch?v=0_000000000
 * 
 * The Logic:
 * This strategy places 5 specific Corner bets to cover 20 numbers (54% coverage).
 * The corners target the middle and high sections of the board.
 * Specific Corners (Top-Left): 8, 14, 20, 26, 32.
 * 
 * The Progression (Classic Promo Sequence):
 * A custom 7-level negative progression is used. 
 * Multipliers (per corner): [4, 6, 9, 14, 23, 40, 64]
 * 
 * Rules:
 * - Start at Level 1 (Index 0).
 * - Loss: Advance to the next level to recover and profit.
 * - Win: Regression; move back down one level (min Level 1).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const corners = [8, 14, 20, 26, 32];
    const coveredNumbers = [
        8, 9, 11, 12, 14, 15, 17, 18,
        20, 21, 23, 24, 26, 27, 29, 30,
        32, 33, 35, 36
    ];

    const progressionUnits = [4, 6, 9, 14, 23, 40, 64];

    if (state.currentLevel === undefined) state.currentLevel = 0;

    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const isWin = coveredNumbers.includes(lastSpin.winningNumber);

        if (isWin) {
            state.currentLevel = Math.max(0, state.currentLevel - 1);
        } else {
            state.currentLevel = Math.min(progressionUnits.length - 1, state.currentLevel + 1);
        }
    }

    const baseChipValue = config.betLimits.min;
    let betAmount = baseChipValue * progressionUnits[state.currentLevel];

    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    return corners.map(cornerValue => ({
        type: 'corner',
        value: cornerValue,
        amount: betAmount
    }));
}