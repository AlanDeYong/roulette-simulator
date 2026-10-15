/**
 * NUMBER THEORY - ROULETTE STRATEGY
 * Source: https://youtu.be/ygcprc22_aY (YouTube Channel: Bet With Mo)
 * * Logic:
 * This strategy combines an outside "Even" bet with straight-up bets on odd numbers in the 1st and 2nd dozens.
 * It uses a 7-level negative progression that increases coverage (adding more odd numbers) and bet sizes 
 * proportionally to recoup losses from previous spins.
 * * Progression:
 * - Level 1: 12 units on Even, 1 unit each on 1, 3, 5, 7, 9, 11. (Total: 18 units)
 * - Level 2 (Loss): Add 1 unit each on 13, 15, 17. Add 6 units to Even. (Total: 27 units)
 * - Level 3 (Loss): Add 1 unit each on 19, 21, 23. Add 6 units to Even. Then double all bets. (Total: 72 units)
 * - Level 4 (Loss): Increase all straight bets by 1 unit each. Add 12 units to Even. (Total: 96 units)
 * - Level 5 (Loss): Increase all straight bets by 1 unit each. Add 12 units to Even. (Total: 120 units)
 * - Level 6 (Loss): Double up all bets. (Total: 240 units)
 * - Level 7 (Loss): Increase all straight bets by 5 units each. Add 60 units to Even. (Total: 360 units)
 * * Conditions:
 * - On Win: Check the net bankroll. If the session's peak profit is reached or exceeded, reset to Level 1.
 * If not yet at peak profit, rebet but drop down 1 level in the progression.
 * - On Loss: Rebet and move up to the next level in the progression. If Level 7 is lost, the progression is 
 * exhausted and resets back to Level 1 to prevent unbounded losses.
 * * Goal:
 * To accumulate profit by hitting heavily covered numbers (Even + multiple Odds) and instantly locking in 
 * profits by resetting whenever a new peak bankroll is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const levels = [
        { even: 12, numbers: [1, 3, 5, 7, 9, 11], numBet: 1 },
        { even: 18, numbers: [1, 3, 5, 7, 9, 11, 13, 15, 17], numBet: 1 },
        { even: 48, numbers: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23], numBet: 2 },
        { even: 60, numbers: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23], numBet: 3 },
        { even: 72, numbers: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23], numBet: 4 },
        { even: 144, numbers: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23], numBet: 8 },
        { even: 204, numbers: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23], numBet: 13 }
    ];

    // Initialize state on the first spin
    if (!state.initialized) {
        state.level = 0;
        state.peakBankroll = bankroll;
        state.previousBankroll = bankroll;
        state.initialized = true;
    } else if (spinHistory.length > 0) {
        // Calculate the net result of the last spin
        let net = bankroll - state.previousBankroll;

        if (net > 0) {
            // Win condition
            if (bankroll >= state.peakBankroll) {
                // Peak profit reached or exceeded: reset progression
                state.level = 0;
            } else {
                // Not at peak profit: go down 1 level
                state.level = Math.max(0, state.level - 1);
            }
        } else {
            // Loss condition (or push treated as loss)
            state.level++;
            // If the maximum progression level is breached, reset to the base level
            if (state.level >= levels.length) {
                state.level = 0;
            }
        }
    }

    // Continually track the highest bankroll achieved
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // Retrieve the bet distribution for the current level
    const currentLevel = levels[state.level];
    let bets = [];

    // Construct Even bet and clamp to table limits
    let evenAmount = currentLevel.even;
    evenAmount = Math.max(evenAmount, config.betLimits.minOutside);
    evenAmount = Math.min(evenAmount, config.betLimits.max);

    bets.push({ type: 'even', amount: evenAmount });

    // Construct Straight-up number bets and clamp to table limits
    let numAmount = currentLevel.numBet;
    numAmount = Math.max(numAmount, config.betLimits.min);
    numAmount = Math.min(numAmount, config.betLimits.max);

    for (let i = 0; i < currentLevel.numbers.length; i++) {
        bets.push({
            type: 'number',
            value: currentLevel.numbers[i],
            amount: numAmount
        });
    }

    // Save the current bankroll to calculate the net result on the next iteration
    state.previousBankroll = bankroll;

    return bets;
}