/**
 * STRATEGY: Target Removal Progression (Straight-Up Conversion)
 * Logic:
 * - A 4-unit corner is placed as four 1-unit straight-up bets.
 * - A 2-unit split is placed as two 1-unit straight-up bets.
 * - On Loss: Increase all active bets by 1 initial unit.
 * - On Win: Remove the winning number. Reduce remaining bets by 1 unit (down to base).
 * - Reset: Restores original layout on the win AFTER 3 distinct numbers have been removed. 
 * The specific number that triggered the reset is excluded from the new layout.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits ? config.betLimits.min : 1;

    // Helper to initialize or reset the betting layout, with optional exclusion
    function resetBets(excludeNumber = null) {
        state.currentBets = [];
        state.numbersRemoved = 0;
        state.setup = true;

        const targetNumbers = [
            0, 34, 
            1, 2, 4, 5, 
            6, 7, 8, 9, 
            11, 12, 
            16, 17, 
            20, 21, 
            25, 26, 
            27, 28, 30, 31, 
            32, 33
        ];

        // Place 1 unit on each number, skipping the excluded number if applicable
        targetNumbers.forEach(num => {
            if (num !== excludeNumber) {
                state.currentBets.push({ 
                    type: 'number', 
                    value: num, 
                    amount: 1 * unit, 
                    initialBase: 1 * unit 
                });
            }
        });
    }

    // 1. Initialize State on first run
    if (!state.setup) {
        resetBets();
    }

    // Wait for at least one spin to apply win/loss logic
    if (spinHistory.length === 0) {
        return state.currentBets.map(b => ({ type: b.type, value: b.value, amount: b.amount }));
    }

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastWinningNumber = lastSpin.winningNumber;

    // 2. Check for a Win
    const winningBetIndex = state.currentBets.findIndex(b => b.value === lastWinningNumber);
    const isWin = winningBetIndex !== -1;

    // 3. Progression Logic
    if (isWin) {
        // If 3 numbers are ALREADY removed, this new win triggers the reset
        if (state.numbersRemoved >= 3) {
            resetBets(lastWinningNumber);
        } else {
            state.numbersRemoved++;

            // Remove the winning bet/number from the board completely
            state.currentBets.splice(winningBetIndex, 1);

            // Reduce remaining bets down 1 level until the base amount is reached
            state.currentBets.forEach(b => {
                b.amount = Math.max(b.initialBase, b.amount - b.initialBase);
            });
        }
    } else {
        // On Loss: Rebet and increase all bets by their initial starting amount (1 base unit)
        state.currentBets.forEach(b => {
            b.amount += b.initialBase;
            
            // Apply max bet limits if defined in config
            if (config.betLimits && config.betLimits.max) {
                b.amount = Math.min(b.amount, config.betLimits.max);
            }
        });
    }

    // 4. Return Final Bet Objects
    const totalBetRequired = state.currentBets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBetRequired > bankroll) return []; // Stop betting if bankroll is insufficient

    return state.currentBets.map(b => ({ type: b.type, value: b.value, amount: b.amount }));
}