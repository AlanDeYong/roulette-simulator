/**
 * Strategy: Any 12 (Low Roller System)
 * Source: https://www.youtube.com/watch?v=aR76nq7KtZg (Bet With Mo)
 *
 * The Logic:
 * This strategy places straight-up inside bets on exactly 12 numbers. For this 
 * implementation, numbers 1 through 12 are selected, as the specific numbers 
 * mathematically do not matter as long as 12 are covered.
 *
 * The Progression:
 * - The base bet is 1 unit per number.
 * - At the base level (Level 1), the system absorbs two consecutive losses. If a 
 * second consecutive loss occurs, the progression moves to Level 2.
 * - At Level 2 and beyond, the progression increases by 1 increment after every 
 * single loss.
 * - Any win completely resets the progression back to Level 1.
 * - Bet increments are dynamic and respect `config.incrementMode`.
 *
 * The Goal:
 * To generate steady, small-scale profits through a slow-scaling loss recovery 
 * progression, resetting to base upon any hit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit using the minimum for inside bets
    const baseUnit = config.betLimits.min;

    // 2. Initialize State on first run
    if (state.level === undefined) {
        state.level = 1;
        state.lossesAtCurrentLevel = 0;
        // The strategy states "any 12 numbers". We will use 1-12 for consistency.
        state.targetNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }

    // 3. Process previous spin and update progression state
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const isWin = state.targetNumbers.includes(lastSpin.winningNumber);

        if (isWin) {
            // Win: Reset everything
            state.level = 1;
            state.lossesAtCurrentLevel = 0;
        } else {
            // Loss: Evaluate triggers
            state.lossesAtCurrentLevel++;

            if (state.level === 1 && state.lossesAtCurrentLevel >= 2) {
                // Base level allows 2 losses before advancing
                state.level++;
                state.lossesAtCurrentLevel = 0;
            } else if (state.level > 1 && state.lossesAtCurrentLevel >= 1) {
                // Higher levels advance after every single loss
                state.level++;
                state.lossesAtCurrentLevel = 0;
            }
        }
    }

    // 4. Calculate Bet Amount per number based on current level
    let amountPerNumber = baseUnit;

    if (state.level > 1) {
        // Determine the increment size based on user configuration
        const incrementAmount = config.incrementMode === 'base' 
            ? baseUnit 
            : (config.minIncrementalBet || 1);
            
        // Add the increment for every level above 1
        amountPerNumber = baseUnit + (incrementAmount * (state.level - 1));
    }

    // 5. Clamp to Limits (Crucial)
    amountPerNumber = Math.max(amountPerNumber, config.betLimits.min);
    amountPerNumber = Math.min(amountPerNumber, config.betLimits.max);

    // 6. Generate and return the array of bet objects
    const bets = [];
    for (let i = 0; i < state.targetNumbers.length; i++) {
        bets.push({
            type: 'number',
            value: state.targetNumbers[i],
            amount: amountPerNumber
        });
    }

    return bets;
}