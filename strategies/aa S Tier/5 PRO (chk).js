/**
 * Source: https://www.youtube.com/watch?v=54Skimo6xW4 (5 Pro roulette strategy)
 * * The Logic:
 * - Plays two distinct sides of the board ("Left" moving up, "Right" moving down).
 * - Bets consist of a 3-unit Street bet and two 1-unit Straight-up bets as the baseline.
 * - Relies on inside bets to catch specific zones of the wheel/board.
 * * The Progression:
 * - Operates on a 7-level loss progression.
 * - L1, L2, L3: Base units (3 units street, 1 unit each straight).
 * - L4, L5: Double the base units (6 units street, 2 units each straight).
 * - L6: Rebet L5 positions and double the amount (12 units, 4 units, 4 units).
 * - L7: Rebet L6 positions and double the amount (24 units, 8 units, 8 units).
 * - On any win that doesn't reach the overall goal, the progression resets to Level 1 on the current side.
 * - On a loss at Level 7, it resets to Level 1 to prevent severe bankruptcy.
 * * The Goal:
 * - Achieve an incremental profit of $20 from the highest recorded bankroll.
 * - Once the target (+20) is hit, the peak bankroll is updated, the side (Left/Right) is swapped, and the progression resets to Level 1.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.currentSide = 'left';
        state.level = 1;
        state.peakBankroll = bankroll;
        state.targetBankroll = bankroll + 20;
        state.lastBankroll = bankroll;
    }

    // 2. Evaluate previous spin outcome & manage overall progression target
    if (spinHistory.length > 0) {
        const isWin = bankroll > state.lastBankroll;

        // Check if we hit the primary goal
        if (bankroll >= state.targetBankroll) {
            state.peakBankroll = bankroll;
            state.targetBankroll = state.peakBankroll + 20;
            state.currentSide = state.currentSide === 'left' ? 'right' : 'left';
            state.level = 1;
        } else {
            // Standard progression behavior
            if (isWin) {
                state.level = 1; // Reset progression on win
                // Keep track of any new high watermarks
                if (bankroll > state.peakBankroll) {
                    state.peakBankroll = bankroll;
                }
            } else {
                state.level++; // Advance progression on loss
                if (state.level > 7) {
                    state.level = 1; // Stop-loss safeguard
                }
            }
        }
    }

    // Update bankroll tracker for the next spin's evaluation
    state.lastBankroll = bankroll;

    // 3. Define the positional data for both sides
    // su = Street Units, nu = Number Units
    const leftSide = [
        { street: 1,  str1: 5,  str2: 6,  su: 3,  nu: 1 },  // Level 1
        { street: 7,  str1: 11, str2: 12, su: 3,  nu: 1 },  // Level 2
        { street: 13, str1: 17, str2: 18, su: 3,  nu: 1 },  // Level 3
        { street: 19, str1: 23, str2: 24, su: 6,  nu: 2 },  // Level 4
        { street: 25, str1: 29, str2: 30, su: 6,  nu: 2 },  // Level 5
        { street: 25, str1: 29, str2: 30, su: 12, nu: 4 },  // Level 6
        { street: 25, str1: 29, str2: 30, su: 24, nu: 8 }   // Level 7
    ];

    const rightSide = [
        { street: 34, str1: 32, str2: 33, su: 3,  nu: 1 },  // Level 1
        { street: 28, str1: 26, str2: 27, su: 3,  nu: 1 },  // Level 2
        { street: 22, str1: 20, str2: 21, su: 3,  nu: 1 },  // Level 3
        { street: 16, str1: 14, str2: 15, su: 6,  nu: 2 },  // Level 4
        { street: 10, str1: 8,  str2: 9,  su: 6,  nu: 2 },  // Level 5
        { street: 10, str1: 8,  str2: 9,  su: 12, nu: 4 },  // Level 6
        { street: 10, str1: 8,  str2: 9,  su: 24, nu: 8 }   // Level 7
    ];

    // 4. Extract current bet data
    const progressionData = state.currentSide === 'left' ? leftSide : rightSide;
    const currentBetSetup = progressionData[state.level - 1];
    
    // 5. Calculate base unit and apply limits
    const unit = config.betLimits.min;
    
    let streetAmount = currentBetSetup.su * unit;
    let str1Amount = currentBetSetup.nu * unit;
    let str2Amount = currentBetSetup.nu * unit;

    // Clamp values to respect configuration limits
    streetAmount = Math.max(config.betLimits.min, Math.min(streetAmount, config.betLimits.max));
    str1Amount = Math.max(config.betLimits.min, Math.min(str1Amount, config.betLimits.max));
    str2Amount = Math.max(config.betLimits.min, Math.min(str2Amount, config.betLimits.max));

    // 6. Return bet placements
    return [
        { type: 'street', value: currentBetSetup.street, amount: streetAmount },
        { type: 'number', value: currentBetSetup.str1,   amount: str1Amount },
        { type: 'number', value: currentBetSetup.str2,   amount: str2Amount }
    ];
}