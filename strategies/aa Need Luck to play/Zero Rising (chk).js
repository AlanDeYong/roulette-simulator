/**
 * Strategy: Zero Rising (European Layout Adaptation - CORRECTED)
 * Source: Adapted from WillVegas (https://www.youtube.com/watch?v=mRueuVFK8S4)
 *
 * The Logic: Targets the zero and immediate neighbors on a single-zero wheel. 
 * Places 6 inside bets: straight-up on 0, three splits (0/1, 0/2, 0/3), and 
 * two 3-number combinations (0/1/2, 0/2/3).
 *
 * The Progression: A linear negative progression.
 * - Base bets are placed across the 6 targeted positions.
 * - On a Loss: Bet size on EVERY position increases by the incremental unit.
 * - On a Win: Progression fully resets to the base unit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minUnit = config.betLimits.min;

    if (state.progressionLevel === undefined) {
        state.progressionLevel = 1;
    }

    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const wn = lastSpin.winningNumber;
        
        // Target numbers for this specific bet spread
        const isWin = wn === 0 || wn === 1 || wn === 2 || wn === 3;

        if (isWin) {
            state.progressionLevel = 1;
        } else {
            state.progressionLevel++;
        }
    }

    let currentUnit = minUnit;
    if (state.progressionLevel > 1) {
        const increment = config.incrementMode === 'base' ? minUnit : (config.minIncrementalBet || 1);
        currentUnit = minUnit + (increment * (state.progressionLevel - 1));
    }

    currentUnit = Math.max(currentUnit, config.betLimits.min);
    currentUnit = Math.min(currentUnit, config.betLimits.max);

    if (bankroll < currentUnit * 6) {
        return [];
    }

    // CORRECTED: Changed 3-number bets from 'corner' to 'street'
    // A corner implies 4 numbers (paying 8:1), whereas 0/1/2 is a Trio/Street paying 11:1.
    return [
        { type: 'number', value: 0, amount: currentUnit },
        { type: 'split', value: [0, 1], amount: currentUnit },
        { type: 'split', value: [0, 2], amount: currentUnit },
        { type: 'split', value: [0, 3], amount: currentUnit },
        { type: 'street', value: [0, 1, 2], amount: currentUnit }, 
        { type: 'street', value: [0, 2, 3], amount: currentUnit }
    ];
}