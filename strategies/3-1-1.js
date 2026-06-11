/**
 * Source: https://youtu.be/xG4LhnsODcA
 * Channel Name: WillVegas
 * * Logic of the 3-1-1 Roulette Strategy:
 * ------------------------------------
 * - This is a low-budget, low-stress grinding strategy that covers 26 out of 37 slots on a European wheel.
 * - Every spin, the player covers three specific table segments simultaneously using 5 units overall:
 * 1. Red (Outside Bet): 3 Units
 * 2. Double Street covering numbers 10-15: 1 Unit
 * 3. Double Street covering numbers 28-33: 1 Unit
 * * Why these two double streets?
 * - Each of these double streets contains 4 black numbers (10, 11, 13, 15 and 28, 29, 31, 33).
 * - Combined, they give us 8 black numbers plus the 18 red numbers, for a total of 26 covered numbers.
 * * Outcome Analysis (per base level):
 * - If any uncovered Red number hits (14 numbers total): We win Red (+3) and lose both double streets (-2) = +1 unit net profit.
 * - If a covered Black number hits inside the double streets (8 numbers total): We win the double street (+5) and lose Red (-3) and the other double street (-1) = +1 unit net profit.
 * - If a covered Red number hits inside the double streets (4 numbers total - 12, 30 and 14, 32): We win Red (+3) and the double street (+5) and lose the other double street (-1) = +7 units net profit ("Jackpot" hit).
 * - If an uncovered Black number or 0 hits: Complete loss of 5 units.
 * * Bet Progression:
 * - Start at base level (Multipliers: Red = 3, Double Streets = 1 each).
 * - On a LOSS (complete miss): Increase the multiplier of each position by +1 unit base weight.
 * - Level 1 (Base): 3 on Red, 1 on each Line. Total = 5 units.
 * - Level 2: 6 on Red, 2 on each Line. Total = 10 units.
 * - Level 3: 9 on Red, 3 on each Line. Total = 15 units.
 * - Level 4: 12 on Red, 4 on each Line. Total = 20 units... and so on.
 * - On a WIN: Check if the total net session profit is reached or surpassed. 
 * - If session profit is achieved, reset completely back to the baseline (Level 1).
 * - If still in a net deficit for the session, do not change anything and continue riding the current progression layer.
 * * The Goal:
 * - Target a 10% gain of the starting session bankroll (e.g., $30 profit on a $300 bankroll) or safe exit. 
 * - The stop-loss is bounded by the session bankroll or the table limits configuration.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Target Objectives / Session Variables Initialization
    if (state.sessionStartBankroll === undefined) {
        state.sessionStartBankroll = bankroll;
        state.targetProfit = 30; // Targeted profit ceiling per session loop
        state.progressionLevel = 1;
    }

    // Check if target profit has been cleared
    if (bankroll >= state.sessionStartBankroll + state.targetProfit) {
        // Goal achieved: Stop betting or reset session baseline metrics
        state.sessionStartBankroll = bankroll;
        state.progressionLevel = 1;
    }

    // 2. Base units assessment using configured constraints
    const insideUnit = config.betLimits.min;
    const outsideUnit = config.betLimits.minOutside;

    // 3. Track progression logic based on historical performance data
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const color = lastSpin.winningColor;

        // Determine if the last spin was a hit or total loss
        const hitLine1 = (num >= 10 && num <= 15);
        const hitLine2 = (num >= 28 && num <= 33);
        const hitRed = (color === 'red');

        if (hitRed || hitLine1 || hitLine2) {
            // Winning spin occurred. Test if total session recovery is accomplished
            if (bankroll >= state.sessionStartBankroll) {
                state.progressionLevel = 1;
                state.sessionStartBankroll = bankroll; // Reset reference baseline
            }
        } else {
            // Complete miss / loss scenario -> Advance progression layer up one unit weight
            state.progressionLevel += 1;
        }
    }

    // 4. Calculate customized bet sizes scaled by progression level multiplier
    let redAmount = outsideUnit * state.progressionLevel;
    let line10Amount = insideUnit * state.progressionLevel;
    let line28Amount = insideUnit * state.progressionLevel;

    // 5. Clamp to table thresholds elegantly to ensure strict compliance
    redAmount = Math.max(Math.min(redAmount, config.betLimits.max), config.betLimits.minOutside);
    line10Amount = Math.max(Math.min(line10Amount, config.betLimits.max), config.betLimits.min);
    line28Amount = Math.max(Math.min(line28Amount, config.betLimits.max), config.betLimits.min);

    // Verify bankroll has enough funds to cover the combined wager pool
    const totalWager = redAmount + line10Amount + line28Amount;
    if (bankroll < totalWager) {
        return []; // Insufficient funds to execute the full strategy sequence safely
    }

    // 6. Return structured bets array
    return [
        { type: 'red', amount: redAmount },
        { type: 'line', value: 10, amount: line10Amount }, // Covers 10, 11, 12, 13, 14, 15
        { type: 'line', value: 28, amount: line28Amount }  // Covers 28, 29, 30, 31, 32, 33
    ];
}