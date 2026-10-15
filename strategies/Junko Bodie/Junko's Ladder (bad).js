/**
 * Junko's Ladder Roulette Strategy
 * 
 * Source:
 * - URL: https://youtu.be/2AHU1NSNXq0
 * - Channel: Junko Bodie
 * 
 * The Full Logic in Details:
 * - Junko's Ladder focuses on steady session-high progression and comp building with a structured
 *   hybrid layout of inside straight-up bets and outside middle dozen/column bets.
 * - Initial Bet Layout:
 *   - Inside: 12 Straight-Up numbers in the middle column (2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35),
 *     organized into 3 Dozen groups of 4 numbers each:
 *       * Group 1 (1st 12): 2, 5, 8, 11
 *       * Group 2 (2nd 12): 14, 17, 20, 23
 *       * Group 3 (3rd 12): 26, 29, 32, 35
 *   - Outside: 2nd Dozen (type: 'dozen', value: 2) and 2nd Column (type: 'column', value: 2).
 * - Group Removal Rule:
 *   - When in recovery (bankroll < session high), if any spin lands within a dozen (1-12, 13-24, or 25-36),
 *     the corresponding 4-number inside group for that dozen is removed from the active betting list
 *     until a new session high is achieved.
 * 
 * The Full Bet Progression in Details:
 * - Session High / Reset:
 *   - Whenever current bankroll >= sessionHigh, all bets reset to base amounts, all 3 inside groups
 *     are restored, inside spin counter resets to 0, and sessionHigh is updated.
 * - Recovery Progression (Bankroll < sessionHigh):
 *   - Inside Bets: Bet size holds steady for 3 spins. On every 3rd spin without reaching a new session high,
 *     the bet per active inside number increases by 1 unit (+minIncrementalBet).
 *   - Outside Bets: Increases on every single spin.
 *       * Outside Bet < 10: increases by +1 unit
 *       * 10 <= Outside Bet < 30: increases by +5 units
 *       * Outside Bet >= 30: increases by +10 units
 * 
 * The Goal:
 * - Achieve continuous new session highs (peak bankrolls) and reset, stacking profits while minimizing drawdowns.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.sessionHigh = config.startingBankroll || bankroll;
        state.insideUnit = config.betLimits.min;
        state.outsideUnit = config.betLimits.minOutside;
        state.insideSpinCount = 0;
        state.activeGroups = { 1: true, 2: true, 3: true };
    }

    const insideIncrement = config.incrementMode === 'base' 
        ? config.betLimits.min 
        : (config.minIncrementalBet || 1);

    const outsideIncrement = config.incrementMode === 'base' 
        ? config.betLimits.minOutside 
        : (config.minIncrementalBet || 1);

    // Number mapping for each dozen group in the 2nd column
    const groupNumbers = {
        1: [2, 5, 8, 11],
        2: [14, 17, 20, 23],
        3: [26, 29, 32, 35]
    };

    // 2. Evaluate previous spin if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Check if new session high achieved
        if (bankroll >= state.sessionHigh) {
            state.sessionHigh = bankroll;
            state.insideUnit = config.betLimits.min;
            state.outsideUnit = config.betLimits.minOutside;
            state.insideSpinCount = 0;
            state.activeGroups = { 1: true, 2: true, 3: true };
        } else {
            // Still in recovery mode
            // Check if last winning number hit one of the dozens to remove that inside group
            if (lastNum >= 1 && lastNum <= 12) {
                state.activeGroups[1] = false;
            } else if (lastNum >= 13 && lastNum <= 24) {
                state.activeGroups[2] = false;
            } else if (lastNum >= 25 && lastNum <= 36) {
                state.activeGroups[3] = false;
            }

            // Outside bet progression (increases every spin)
            let step = 1;
            if (state.outsideUnit >= 30) {
                step = 10;
            } else if (state.outsideUnit >= 10) {
                step = 5;
            }
            state.outsideUnit += step * outsideIncrement;

            // Inside bet progression (increases every 3 spins)
            state.insideSpinCount++;
            if (state.insideSpinCount >= 3) {
                state.insideSpinCount = 0;
                state.insideUnit += insideIncrement;
            }
        }
    }

    // 3. Calculate clamped bet amounts
    const insideBetAmount = Math.min(
        config.betLimits.max,
        Math.max(config.betLimits.min, state.insideUnit)
    );

    const outsideBetAmount = Math.min(
        config.betLimits.max,
        Math.max(config.betLimits.minOutside, state.outsideUnit)
    );

    // 4. Construct Bets
    const bets = [];

    // Add active inside straight-up bets
    for (let group = 1; group <= 3; group++) {
        if (state.activeGroups[group]) {
            for (const num of groupNumbers[group]) {
                bets.push({
                    type: 'number',
                    value: num,
                    amount: insideBetAmount
                });
            }
        }
    }

    // Add outside bets (2nd Dozen and 2nd Column)
    bets.push({
        type: 'dozen',
        value: 2,
        amount: outsideBetAmount
    });

    bets.push({
        type: 'column',
        value: 2,
        amount: outsideBetAmount
    });

    return bets;
}