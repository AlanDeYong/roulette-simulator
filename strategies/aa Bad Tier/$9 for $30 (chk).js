/**
 * ROULLETTE STRATEGY: WillVegas "9 for $30" Positive Progression Tweak
 * 
 * Source:
 * - Video: "I TWEAKED My $9 for $30 Roulette Strategy… The WINNING Results! ⭐" (https://youtu.be/y73fvWZSUvU)
 * - Channel: WillVegas
 * 
 * The Full Logic in Detail:
 * 1. Coverage (30 out of 37 numbers):
 *    - Outside Bet: Low (1 to 18) - 5 units.
 *    - Inside Bets: 4 Streets covering 19 to 30 - 1 unit on each street:
 *      * Street 19-21 (value: 19)
 *      * Street 22-24 (value: 22)
 *      * Street 25-27 (value: 25)
 *      * Street 28-30 (value: 28)
 * 2. Uncovered Numbers: 0, 31, 32, 33, 34, 35, 36.
 * 3. The "Tweak" (Pause on Loss):
 *    - When an uncovered number lands (Loss), the strategy "steps out" and pauses betting.
 *    - It monitors incoming spins without placing bets until a positive winning number (1–30) lands.
 *    - Once a 1–30 lands, it unpauses and resumes placing bets at base level (Level 1).
 * 
 * The Full Bet Progression in Detail:
 * - Positive Progression: After every win (1–30), increase bet level by +1 (Level 1 -> Level 2 -> Level 3...).
 * - Base Unit multipliers at Level L:
 *   * Low (1–18): 5 * L * unit
 *   * Streets (19, 22, 25, 28): 1 * L * unit each
 * - Goal / Cycle Reset:
 *   * Cycle Target: Win 5 units of net profit.
 *   * When cycle profit reaches or exceeds +5 units, reset progression level back to Level 1.
 *   * On any loss, enter pause state and reset level to Level 1.
 * 
 * The Goal:
 * - Achieve micro-session profit target of 5 units per cycle and reset to base.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Base Units & Limits Setup
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;

    // Inside unit = minimum inside bet limit
    const insideUnit = minInside;
    // Outside unit needs to maintain 5:1 ratio relative to inside unit (at least minOutside)
    const outsideUnit = Math.max(minOutside, insideUnit * 5);

    // 2. State Initialization
    if (state.level === undefined) state.level = 1;
    if (state.isPaused === undefined) state.isPaused = false;
    if (state.cycleProfit === undefined) state.cycleProfit = 0;
    if (state.lastBankroll === undefined) state.lastBankroll = bankroll;

    // 3. Process Previous Spin Results
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastNum = lastResult.winningNumber;
        const isWinNumber = lastNum >= 1 && lastNum <= 30;

        if (state.isPaused) {
            // While paused, check if a positive number landed on the wheel
            if (isWinNumber) {
                state.isPaused = false;
                state.level = 1;
                state.cycleProfit = 0;
            } else {
                // Still paused, do not bet
                state.lastBankroll = bankroll;
                return [];
            }
        } else {
            // Evaluate profit/loss from last active bet
            const delta = bankroll - state.lastBankroll;
            state.cycleProfit += delta;

            if (isWinNumber) {
                // Check if cycle goal of 5 units is reached
                const cycleGoal = insideUnit * 5;
                if (state.cycleProfit >= cycleGoal) {
                    state.level = 1;
                    state.cycleProfit = 0;
                } else {
                    // Positive progression: increase level after win
                    state.level += 1;
                }
            } else {
                // Loss on uncovered number: trigger pause / step out
                state.isPaused = true;
                state.level = 1;
                state.lastBankroll = bankroll;
                return [];
            }
        }
    }

    state.lastBankroll = bankroll;

    // 4. Calculate Bet Amounts for Current Level
    const currentLevel = state.level;
    
    let lowBetAmount = outsideUnit * currentLevel;
    let streetBetAmount = insideUnit * currentLevel;

    // Clamp individual bets to limits
    lowBetAmount = Math.max(lowBetAmount, minOutside);
    lowBetAmount = Math.min(lowBetAmount, config.betLimits.max);

    streetBetAmount = Math.max(streetBetAmount, minInside);
    streetBetAmount = Math.min(streetBetAmount, config.betLimits.max);

    // Ensure bankroll can cover total bet cost
    const totalBetCost = lowBetAmount + (streetBetAmount * 4);
    if (bankroll < totalBetCost) {
        return []; // Not enough bankroll to place full strategy coverage
    }

    // 5. Construct and Return Bet Objects
    return [
        { type: 'low', amount: lowBetAmount },
        { type: 'street', value: 19, amount: streetBetAmount },
        { type: 'street', value: 22, amount: streetBetAmount },
        { type: 'street', value: 25, amount: streetBetAmount },
        { type: 'street', value: 28, amount: streetBetAmount }
    ];
}