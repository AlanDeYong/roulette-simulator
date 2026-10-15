/**
 * Golden Gate Roulette Strategy
 * 
 * Source:
 * - URL: https://youtu.be/h0BSE-Gq7QE
 * - Channel: The Roulette Master
 * - System: Golden Gate Roulette System (created by Dan O)
 * 
 * Strategy Logic:
 * - The system provides high table coverage (27 numbers) utilizing a 9-unit total base layout:
 *     1. 6 units on High (19-36) [Outside Bet]
 *     2. 2 units on Double Street / Six-Line 13-18 (Line bet at 13) [Inside Bet]
 *     3. 1 unit on the 0/2 Split / Trio (covering 0, 2 or 0, 00, 2) [Inside Bet]
 * 
 * Bet Progression & Rules:
 * - Base Level: Bet 1x the unit layout. Rebet base amount upon every win.
 * - Loss Progression: Upon a loss, double the entire bet layout (2x Martingale-style step)
 *   and enter recovery mode.
 * - Recovery Mode: Once the bet is doubled, the system requires TWO (2) wins at the current
 *   elevated bet level before resetting back to the base 1x layout.
 * - Subsequent Losses during Recovery: If a loss occurs before achieving the two wins,
 *   double the bet again and reset the win counter for the new level.
 * 
 * Goal:
 * - Target profit of $150 - $300 per session, or stop upon reaching table max limits / bankroll stop-loss.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.multiplier = 1;
        state.recoveryWins = 0;
        state.lastBankroll = bankroll;
        state.targetProfit = 30000;
        state.initialBankroll = bankroll;
        state.initialized = true;
    }

    // 2. Evaluate Previous Spin Result (if history exists)
    if (spinHistory && spinHistory.length > 0) {
        const netProfitLastSpin = bankroll - state.lastBankroll;

        if (netProfitLastSpin > 0) {
            // Won the previous spin
            if (state.multiplier > 1) {
                state.recoveryWins += 1;
                // Check if two wins have been achieved to clear recovery
                if (state.recoveryWins >= 2) {
                    state.multiplier = 1;
                    state.recoveryWins = 0;
                }
            } else {
                // Win at base level keeps multiplier at 1
                state.multiplier = 1;
                state.recoveryWins = 0;
            }
        } else if (netProfitLastSpin < 0) {
            // Lost the previous spin -> double the bet and reset recovery win count
            state.multiplier *= 2;
            state.recoveryWins = 0;
        }
    }

    // Update bankroll tracker for the next spin
    state.lastBankroll = bankroll;

    // 3. Check Session Profit Goal / Bankroll Limits
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        return []; // Stop betting once session target is reached
    }

    // 4. Calculate Base Units respecting table limits
    const baseUnitOutside = config.betLimits.minOutside || 5;
    const baseUnitInside = config.betLimits.min || 2;
    const unit = Math.max(Math.floor(baseUnitOutside / 6), baseUnitInside, 1);

    // Golden Gate Bet Ratios: 6 units High, 2 units Line (13), 1 unit Split (0, 2)
    let highAmount = Math.max(unit * 6 * state.multiplier, config.betLimits.minOutside);
    let lineAmount = Math.max(unit * 2 * state.multiplier, config.betLimits.min);
    let splitAmount = Math.max(unit * 1 * state.multiplier, config.betLimits.min);

    // 5. Clamp to Table Maximum Limits
    highAmount = Math.min(highAmount, config.betLimits.max);
    lineAmount = Math.min(lineAmount, config.betLimits.max);
    splitAmount = Math.min(splitAmount, config.betLimits.max);

    // Total required funds
    const totalRequired = highAmount + lineAmount + splitAmount;
    if (bankroll < totalRequired) {
        return []; // Insufficient bankroll to place the full system
    }

    // 6. Return Bet Array
    return [
        { type: 'high', amount: highAmount },
        { type: 'line', value: 13, amount: lineAmount },
        { type: 'split', value: [0, 2], amount: splitAmount }
    ];
}