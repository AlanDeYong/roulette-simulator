/**
 * Strategy: Double Dozen Ladder Progression
 * Source: Gamblers University (https://youtu.be/G2iGl3WbWKc?si=1lgNhzVt7fKqHpuP)
 *
 * The Logic:
 * - The strategy bets on two out of three dozens per spin, covering ~64.8% of the board.
 * - The trigger for placement is the previous spin: you always bet on the two dozens that 
 *   did NOT hit on the last spin. If a zero hits, you re-bet the same dozens.
 *
 * The Progression:
 * - Utilizes a ladder progression: 1 unit, 3 units, 7 units, 15 units, 31 units.
 * - After a LOSS: Climb UP one rung on the ladder to recover.
 * - After a WIN: Step DOWN one rung on the ladder (base level is rung 1).
 *
 * The Goal:
 * - Steadily accumulate profit by grinding a high-win-rate coverage. 
 * - The stop-loss condition is hitting a loss at the top of the ladder (Rung 5).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define the progression multipliers (ladder rungs)
    const ladderUnits = [1, 3, 7, 15, 31];

    // 2. Initialize State
    if (typeof state.ladderIndex === 'undefined') {
        state.ladderIndex = 0; // Start at base level (rung 1)
        state.lastBetDozens = [1, 2]; // Default starting bet if history is empty
    }

    // 3. Evaluate previous spin to update progression and target dozens
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Identify which dozen hit (0 if green)
        let hitDozen = 0;
        if (num >= 1 && num <= 12) hitDozen = 1;
        else if (num >= 13 && num <= 24) hitDozen = 2;
        else if (num >= 25 && num <= 36) hitDozen = 3;

        // Update ladder progression based on win/loss
        if (state.lastBetDozens && state.lastBetDozens.length > 0) {
            const won = state.lastBetDozens.includes(hitDozen);

            if (won) {
                // Step down the ladder
                state.ladderIndex = Math.max(0, state.ladderIndex - 1);
            } else {
                // Step up the ladder (capped at max rung)
                state.ladderIndex = Math.min(ladderUnits.length - 1, state.ladderIndex + 1);
            }
        }

        // Update which dozens to bet on
        if (hitDozen !== 0) {
            // Exclude the dozen that just hit
            const allDozens = [1, 2, 3];
            state.lastBetDozens = allDozens.filter(d => d !== hitDozen);
        }
        // Note: If hitDozen === 0 (Green), state.lastBetDozens remains unchanged
    }

    // 4. Calculate Bet Amount
    const baseUnit = config.betLimits.minOutside;
    let amount = baseUnit * ladderUnits[state.ladderIndex];

    // 5. Clamp to Limits (Crucial)
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // If a single dozen bet exceeds bankroll (or 2 dozens exceed it), 
    // we must adjust to avoid negative balances in strict simulators.
    if (amount * 2 > bankroll) {
        amount = Math.floor(bankroll / 2);
    }
    
    // Stop betting if bankroll cannot cover the minimums
    if (amount < config.betLimits.minOutside) {
        return [];
    }

    // 6. Return Bet Objects
    return state.lastBetDozens.map(dozen => ({
        type: 'dozen',
        value: dozen,
        amount: amount
    }));
}