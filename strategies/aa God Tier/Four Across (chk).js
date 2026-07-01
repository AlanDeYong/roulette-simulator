/**
 * Strategy Name: Four Across (Randomized)
 * Source: https://youtu.be/fYH5awTuyLw (Channel: Gamblers University)
 * 
 * Logic:
 * - Coverage: 28 numbers total.
 * - Base Bets: 10 units each on 1st and 3rd Dozen; 1 unit each on 4 random numbers from the 2nd Dozen (13-24).
 * - Progression: 
 *    - Start at base levels (Dozens: 10, Numbers: 1).
 *    - If a spin is a loss, increment the progression level by 1.
 *    - If a spin is a win and the bankroll reaches or exceeds the session high, reset to base levels.
 * 
 * Goal: Cumulative profit recovery.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialization
    if (state.progression === undefined) state.progression = 1;
    if (state.sessionHigh === undefined) state.sessionHigh = bankroll;

    // 2. Determine Win/Loss from previous spin
    if (spinHistory.length > 0) {
        const previousBankroll = state.lastBankroll || config.startingBankroll;
        
        if (bankroll > previousBankroll) {
            // Win: Check if we hit or exceeded session high
            if (bankroll >= state.sessionHigh) {
                state.progression = 1; // Reset to base
                state.sessionHigh = bankroll; // Update high
            }
        } else if (bankroll < previousBankroll) {
            // Loss: Increment progression
            state.progression += 1;
        }
    }

    state.lastBankroll = bankroll;

    // 3. Randomly select 4 unique numbers from the 2nd Dozen (13-24)
    const middleDozen = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    const shuffled = middleDozen.sort(() => 0.5 - Math.random());
    const selectedNumbers = shuffled.slice(0, 4);

    // 4. Calculate Bet Amounts (Clamped to limits)
    // Base: Dozen = 10 units, Straight = 1 unit
    let outsideAmount = 10 * state.progression;
    let insideAmount = 1 * state.progression;

    // Apply limits
    outsideAmount = Math.max(outsideAmount, config.betLimits.minOutside);
    outsideAmount = Math.min(outsideAmount, config.betLimits.max);
    
    insideAmount = Math.max(insideAmount, config.betLimits.min);
    insideAmount = Math.min(insideAmount, config.betLimits.max);

    // 5. Return Bets
    return [
        { type: 'dozen', value: 1, amount: outsideAmount },
        { type: 'dozen', value: 3, amount: outsideAmount },
        { type: 'number', value: selectedNumbers[0], amount: insideAmount },
        { type: 'number', value: selectedNumbers[1], amount: insideAmount },
        { type: 'number', value: selectedNumbers[2], amount: insideAmount },
        { type: 'number', value: selectedNumbers[3], amount: insideAmount }
    ];
}