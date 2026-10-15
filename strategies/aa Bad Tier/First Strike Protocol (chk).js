/**
 * Strategy: First Strike Protocol
 * Source: The Lucky Felt (https://youtu.be/yhs9pJi8URE)
 *
 * The Full Logic in details:
 * This is a fast, aggressive "hit and run" strategy designed to cover 24 unique numbers 
 * while balancing a safety net with high-yield spike payouts.
 * The layout consists of exactly 10 units per base cycle:
 * - Two Line bets (Double Streets) at 2 units each. We use 1-6 and 31-36.
 * - Six Split bets at 1 unit each scattered in the middle. We use 8/11, 10/13, 14/17, 16/19, 20/23, 22/25.
 * This covers 12 numbers with high payouts (the splits) and 12 numbers with smaller safety payouts (the lines).
 * * The Full Bet Progression in details:
 * The strategy utilizes a unique "Tiered Doubling" progression to safely recover losses.
 * - Stage 1, Attempt 1 begins at base units (1x multiplier).
 * - On a LOSS: You double the bet up to a maximum of 3 attempts within the current Stage (1x, 2x, 4x).
 * - If you lose Attempt 3: You move to the next "Stage". You revert back to Attempt 1, but the new base 
 * unit for this Stage is doubled from the previous Stage's base unit.
 * - On a WIN (but still negative for the session): You "rebet" and stay at your current Stage and Attempt.
 * - On a SESSION HIGH (Profit): Everything resets completely back to Stage 1, Attempt 1.
 * * The Goal:
 * The target goal is to grab +20 to +40 units of profit quickly and leave the casino. 
 * In this script, the progression continually resets on new highs to allow continuous simulation 
 * charting, naturally displaying the hit-and-run peaks.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    // We use the lowest inside limit as 1 unit.
    const baseUnit = config.betLimits.min;

    // 2. Initialize State
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
        state.stage = 1;
        state.attempt = 1;
        state.lastBankroll = bankroll;
    }

    // 3. Update Progression based on the previous spin's bankroll change
    if (spinHistory.length > 0) {
        if (bankroll > state.sessionHigh) {
            // New session high! Reset everything to base levels.
            state.sessionHigh = bankroll;
            state.stage = 1;
            state.attempt = 1;
        } else if (bankroll < state.lastBankroll) {
            // Loss on the previous spin. Progress the Tiered Doubling.
            state.attempt++;
            
            // Limit to 3 attempts per stage, then revert to attempt 1 of the next stage
            if (state.attempt > 3) {
                state.attempt = 1;
                state.stage++;
            }
        }
        // If bankroll >= lastBankroll but <= sessionHigh, it's a win during a drawdown.
        // The protocol dictates we re-bet the exact same amount until we reach session profit.
    }

    // Update lastBankroll for the next spin's calculation
    state.lastBankroll = bankroll;

    // 4. Calculate Current Multiplier
    // Stage multiplier doubles every stage. Attempt multiplier doubles every attempt.
    const stageMultiplier = Math.pow(2, state.stage - 1);
    const attemptMultiplier = Math.pow(2, state.attempt - 1);
    const currentMultiplier = stageMultiplier * attemptMultiplier;

    // 5. Calculate Bet Amounts (Base: 2 units for lines, 1 unit for splits)
    let splitAmount = baseUnit * currentMultiplier;
    let lineAmount = (baseUnit * 2) * currentMultiplier;

    // 6. Clamp to Table Limits
    splitAmount = Math.max(splitAmount, config.betLimits.min);
    splitAmount = Math.min(splitAmount, config.betLimits.max);

    lineAmount = Math.max(lineAmount, config.betLimits.min);
    lineAmount = Math.min(lineAmount, config.betLimits.max);

    // 7. Return Bet Array
    return [
        // 2 Line Bets (Double Streets) - covering 1-6 and 31-36
        { type: 'line', value: 1, amount: lineAmount },
        { type: 'line', value: 31, amount: lineAmount },
        
        // 6 Split Bets - covering 12 numbers in the middle section
        { type: 'split', value: [8, 11], amount: splitAmount },
        { type: 'split', value: [10, 13], amount: splitAmount },
        { type: 'split', value: [14, 17], amount: splitAmount },
        { type: 'split', value: [16, 19], amount: splitAmount },
        { type: 'split', value: [20, 23], amount: splitAmount },
        { type: 'split', value: [22, 25], amount: splitAmount }
    ];
}