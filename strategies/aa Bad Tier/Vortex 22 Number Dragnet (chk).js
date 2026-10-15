/**
 * ============================================================================
 * STRATEGY: Vortex Roulette Strategy (22-Number Dragnet)
 * SOURCE: "I Decoded the Roulette Board using Vortex Mathematics"
 * CHANNEL: The Lucky Felt (Todd Hoover)
 * URL: https://youtu.be/j04zAenjPUI
 * ============================================================================
 * 
 * --- THE LOGIC & BET PLACEMENTS ---
 * The strategy applies Vortex Mathematics (the repeating 1-2-4-8-7-5 digital root
 * doubling circuit) to the roulette layout. 
 * - Column 3 (3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36) represents the 3-6-9
 *   energy flux field and is completely abandoned.
 * - Column 1 and Column 2 cover the physical doubling circuit.
 * - Numbers 19 and 28 are excluded as the center/void axis of the vortex.
 * 
 * Total numbers covered (22 straight-up bets):
 * - Column 1: 1, 4, 7, 10, 13, 16, 22, 25, 31, 34 (10 numbers)
 * - Column 2: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35 (12 numbers)
 * 
 * --- BET PROGRESSION ---
 * The betting sequence strictly follows the 6-stage Vortex sequence multipliers:
 * Multipliers: [1, 2, 4, 8, 7, 5]
 * - Start at index 0 (1 unit per number -> 22 units total).
 * - On a LOSS: Advance to the next multiplier in the sequence (1 -> 2 -> 4 -> 8 -> 7 -> 5).
 * - If the 5-unit step loses, restart from the beginning (index 0) to prevent deep drawdowns.
 * - On a WIN: If in session profit or after recovering, reset to index 0 (1 unit).
 * 
 * --- THE GOAL ---
 * - Target Profit: +20% of the initial bankroll (e.g., +$200 on a $1,000 starting bankroll).
 * - Stop condition: Cease betting once the target profit is reached or bankroll is depleted.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Target numbers defined by Vortex Mathematics
    const VORTEX_NUMBERS = [
        // Column 1 (excluding 19, 28)
        1, 4, 7, 10, 13, 16, 22, 25, 31, 34,
        // Column 2 (all 12 numbers)
        2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
    ];

    // 2. Progression multipliers based on the Vortex sequence
    const PROGRESSION = [1, 2, 4, 8, 7, 5];

    // 3. Initialize persistent state
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.progressionIndex = 0;
        state.targetProfit = config.startingBankroll ? config.startingBankroll * 0.20 : 200;
        state.highestBankroll = bankroll;
    }

    // 4. Check if target profit is reached
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= state.targetProfit) {
        return []; // Target reached, stop betting
    }

    // 5. Evaluate the last spin result (if history exists)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const isWin = VORTEX_NUMBERS.includes(lastSpin.winningNumber);

        if (isWin) {
            // Reset progression upon reaching a new high or recovering
            if (bankroll >= state.highestBankroll) {
                state.highestBankroll = bankroll;
                state.progressionIndex = 0;
            } else {
                // If back in overall profit for this cycle, reset
                state.progressionIndex = 0;
            }
        } else {
            // Advance progression on loss
            state.progressionIndex++;
            if (state.progressionIndex >= PROGRESSION.length) {
                // Loop completes: reset to 1 unit to control drawdown
                state.progressionIndex = 0;
            }
        }
    }

    // 6. Calculate unit bet amount per straight up number
    const baseUnit = config.betLimits.min;
    const multiplier = PROGRESSION[state.progressionIndex];
    let unitAmount = baseUnit * multiplier;

    // Respect limits
    unitAmount = Math.max(unitAmount, config.betLimits.min);
    unitAmount = Math.min(unitAmount, config.betLimits.max);

    // Verify bankroll sufficiency for all 22 numbers
    const totalRequired = unitAmount * VORTEX_NUMBERS.length;
    if (bankroll < totalRequired) {
        // Fallback to minimum inside bet if possible
        unitAmount = Math.max(Math.floor(bankroll / VORTEX_NUMBERS.length), 0);
        if (unitAmount < config.betLimits.min) {
            return []; // Insufficient funds
        }
    }

    // 7. Place straight up bets on all 22 Vortex numbers
    const bets = VORTEX_NUMBERS.map(num => ({
        type: 'number',
        value: num,
        amount: unitAmount
    }));

    return bets;
}