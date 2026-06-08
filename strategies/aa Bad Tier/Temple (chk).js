/**
 * @description Roulette Strategy Implementation
 * * ======================================================================================
 * SOURCE:
 * - Video URL: https://youtu.be/b-LdbNwQ-Po?si=azToSbZiCorUXyKO
 * - Channel Name: ROULETTE JACKPOT
 * ======================================================================================
 * THE FULL LOGIC IN DETAILS:
 * - The strategy places a specific multi-bet layout covering a large portion of the wheel:
 * 1. Corner Bet: 1, 2, 4, 5 (1 unit)
 * 2. Corner Bet: 31, 32, 34, 35 (1 unit)
 * 3. 2nd Dozen Bet (1 unit)
 * 4. 3rd Column Bet (2 units)
 * * THE WIN/LOSS PROGRESSION CONDITIONS:
 * - Session Peak Reset:
 * - If the bankroll reaches a new session peak profit, reset back to Level 1 completely.
 * - Flat Bet (Hold current level):
 * - If session peak is NOT reached, but the last spin hit winning numbers:
 *   - Overlaps: 15, 18, 21, 24
 *   - Corners: 1, 2, 4, 5, 31, 32, 34, 35
 *   - 3rd Column pure wins (including 3 and 33)
 * - Increase Level (Progress to next multiplier tier):
 * - If session peak is NOT reached, and the last spin hit losing/partial numbers:
 *   - Partial loss "safety" numbers: 13, 14, 16, 17, 19, 20, 22, 23 (2nd Dozen only)
 *   - Total table loss/wipeout
 * ======================================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Tracking
    if (!state.currentLevel) {
        state.currentLevel = 1;
    }
    if (!state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Evaluate Last Spin Result to Determine Progression Action
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Define exact conditional arrays based on user rules
        const corners = [1, 2, 4, 5, 31, 32, 34, 35];
        const overlaps = [15, 18, 21, 24];
        const column3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
        const partialLossDozen = [13, 14, 16, 17, 19, 20, 22, 23];

        // Core Rule 1: Absolute Reset only on Session Peak Profit
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
            state.currentLevel = 1;
        } else {
            // Core Rule 2: If peak isn't broken, check spin results to flat-bet or increase
            if (overlaps.includes(num) || corners.includes(num) || column3.includes(num)) {
                // Win, but no session peak -> rebet current level (do not increase, do not reset)
                state.currentLevel = state.currentLevel; 
            } else if (partialLossDozen.includes(num)) {
                // Partial loss safety -> increase bet level
                state.currentLevel += 1;
            } else {
                // Total loss / wipeout -> increase bet level
                state.currentLevel += 1;
            }
        }
    }

    // 3. Establish Base Unit Limits
    const insideUnit = config.betLimits.min;
    const outsideUnit = config.betLimits.minOutside;

    // 4. Calculate Bet Sizes Based on Mode
    let insideMultiplier, outsideMultiplier;
    if (config.incrementMode === 'fixed') {
        const fixedIncrement = config.minIncrementalBet || 1;
        insideMultiplier = insideUnit + (state.currentLevel - 1) * fixedIncrement;
        outsideMultiplier = outsideUnit + (state.currentLevel - 1) * fixedIncrement;
    } else {
        insideMultiplier = insideUnit * state.currentLevel;
        outsideMultiplier = outsideUnit * state.currentLevel;
    }

    // 5. Build Layout Allocation
    let corner15Amount = insideMultiplier * 1;
    let corner3135Amount = insideMultiplier * 1;
    let dozen2Amount = outsideMultiplier * 1;
    let column3Amount = outsideMultiplier * 2;

    // 6. Clamp to Official Table Limits
    corner15Amount = Math.min(Math.max(corner15Amount, config.betLimits.min), config.betLimits.max);
    corner3135Amount = Math.min(Math.max(corner3135Amount, config.betLimits.min), config.betLimits.max);
    dozen2Amount = Math.min(Math.max(dozen2Amount, config.betLimits.minOutside), config.betLimits.max);
    column3Amount = Math.min(Math.max(column3Amount, config.betLimits.minOutside), config.betLimits.max);

    // 7. Verify Bankroll Liquidity
    const totalRequiredOutlay = corner15Amount + corner3135Amount + dozen2Amount + column3Amount;
    if (bankroll < totalRequiredOutlay) {
        return [];
    }

    // 8. Return Strategy Array
    return [
        { type: 'corner', value: 1, amount: corner15Amount },
        { type: 'corner', value: 31, amount: corner3135Amount },
        { type: 'dozen', value: 2, amount: dozen2Amount },
        { type: 'column', value: 3, amount: column3Amount }
    ];
}