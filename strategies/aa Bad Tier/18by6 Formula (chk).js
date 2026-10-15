/**
 * Roulette Strategy: The 18/6 Formula Strategy
 * 
 * Source:
 * - Channel: WillVegas
 * - Video URL: http://www.youtube.com/watch?v=034z1XJ5Ybw
 * 
 * Strategy Overview:
 * - Covers 18 total numbers across the table using a combination of Dozen and Double Street (Line) bets:
 *   1. 2nd Dozen (numbers 13–24): 12 numbers total.
 *   2. Double Street / Line 10 (numbers 10–15): 6 numbers total (3 overlap with 2nd Dozen).
 *   3. Double Street / Line 22 (numbers 22–27): 6 numbers total (3 overlap with 2nd Dozen).
 * - "6 Jackpot Hits": The 6 overlapping numbers (13, 14, 15, 22, 23, 24) win on BOTH the 2nd Dozen 
 *   and one of the Line bets, yielding maximum payout.
 * - Green Hedge: Starting at progression level 3 or higher, a Split bet on [0, 2] is added to 
 *   hedge against green zero outcomes.
 * 
 * Progression Logic:
 * - Base betting unit ratio = 2 units on 2nd Dozen : 1 unit on Line 10 : 1 unit on Line 22.
 * - On Loss: Progression level increases by +1 (+2 units on Dozen, +1 unit on each Line).
 * - Level >= 3: Add 1 unit on Split [0, 2].
 * - On Win: If session profit target is reached or net session recovery is achieved, reset to Level 1.
 *   Otherwise, remain at current level or step down to lock in gains.
 * 
 * Goal:
 * - Achieve a target session profit ($30 to $50 target on a $500 starting bankroll, ~10% profit).
 * - Stop or reset progression once target profit is reached.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.targetProfit = 50; // Standard $50 profit target
        state.level = 1;
        state.initialized = true;
    }

    // Check if target profit reached
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= state.targetProfit) {
        // Goal achieved - stop betting or reset session
        state.level = 1;
        state.initialBankroll = bankroll;
    }

    // 2. Evaluate Last Spin Outcome (if history exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Check winning zones
        const inDozen2 = (num >= 13 && num <= 24);
        const inLine10 = (num >= 10 && num <= 15);
        const inLine22 = (num >= 22 && num <= 27);
        const inSplit = (state.level >= 3 && (num === 0 || num === 2));

        const isWin = inDozen2 || inLine10 || inLine22 || inSplit;

        if (isWin) {
            // Reset progression if back in profit or completed recovery
            if (bankroll >= state.initialBankroll) {
                state.level = 1;
            } else if (inDozen2 && (inLine10 || inLine22)) {
                // Jackpot hit: significant recovery, step down or reset
                state.level = Math.max(1, state.level - 2);
            }
        } else {
            // Loss: Increase progression level
            state.level += 1;
        }
    }

    // 3. Determine Unit Sizes based on Bet Limits
    const insideMin = config.betLimits.min || 2;
    const outsideMin = config.betLimits.minOutside || 5;
    const maxLimit = config.betLimits.max || 500;

    const baseInsideUnit = insideMin;
    const baseOutsideUnit = Math.max(outsideMin, baseInsideUnit * 2);

    // Calculate bet amounts based on current progression level
    let dozenBetAmount = baseOutsideUnit * state.level;
    let line10Amount = baseInsideUnit * state.level;
    let line22Amount = baseInsideUnit * state.level;
    let splitAmount = baseInsideUnit;

    // Clamp bet amounts to table limits
    dozenBetAmount = Math.min(Math.max(dozenBetAmount, outsideMin), maxLimit);
    line10Amount = Math.min(Math.max(line10Amount, insideMin), maxLimit);
    line22Amount = Math.min(Math.max(line22Amount, insideMin), maxLimit);
    splitAmount = Math.min(Math.max(splitAmount, insideMin), maxLimit);

    // 4. Construct Bets Array
    const bets = [
        { type: 'dozen', value: 2, amount: dozenBetAmount },
        { type: 'line', value: 10, amount: line10Amount },
        { type: 'line', value: 22, amount: line22Amount }
    ];

    // Add Green Hedge starting at level 3
    if (state.level >= 3) {
        bets.push({ type: 'split', value: [0, 2], amount: splitAmount });
    }

    return bets;
}