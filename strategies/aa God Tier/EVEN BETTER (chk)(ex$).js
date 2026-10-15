/**
 * Roulette Strategy: Even Better
 * 
 * Source: 
 * - URL: https://www.youtube.com/watch?v=w_PcJE2z6vg&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=2
 * - Channel: From the provided YouTube playlist
 * 
 * The Full Logic in details:
 * - The strategy covers nearly half the board by targeting specific streets and straight numbers within those streets, along with the zero.
 * - The covered numbers are essentially the streets 1-3, 7-9, 13-15, 19-21, 25-27, 31-33 and 0.
 * - A win occurs if any of these numbers hit. 
 * - The session's "peak bankroll" is tracked. If the bankroll reaches or exceeds this peak, the progression resets to the base level.
 * - If a win occurs but the peak bankroll hasn't been recovered, the strategy "rebets" (stays at the exact same progression level).
 * - If a loss occurs, the strategy advances to the next step in the bet progression.
 * 
 * The Full Bet Progression in details:
 * - Level 0 (Base): 1 unit on straights (2,8,14,20,26,32), 2 units on streets (1,7,13,19,25,31), 2 units on 0. (Total: 20 units)
 * - Level 1 (Loss 1): Base * 2 for all bets. (Total: 40 units)
 * - Level 2 (Loss 2): Base * 3 for all bets. (Total: 60 units)
 * - Level 3 (Loss 3): Base * 4 for all bets. (Total: 80 units)
 * - Level 4 (Loss 4): Double all bets from Level 3. (Total: 160 units)
 * - Level 5 (Loss 5): Add 10 units to straights and 20 units to streets/zero compared to Level 4. (Total: 360 units)
 * - Level 6 (Loss 6): Add another 10 units to straights and 20 units to streets/zero compared to Level 5. (Total: 560 units)
 * - If losses continue past Level 6, the strategy stays at the max level (Level 6) until a win/reset.
 * 
 * The Goal:
 * - The primary goal is to hit numbers and achieve a new session peak profit. Reaching or exceeding the highest recorded bankroll triggers a full reset to base bets.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Betting Progression and Layout
    const straights = [2, 8, 14, 20, 26, 32];
    const streets = [1, 7, 13, 19, 25, 31];
    const zero = 0;

    // Progression mapping exactly to the strategy rules (Straight multiplier, Street multiplier, Zero multiplier)
    const progression = [
        { straight: 1, street: 2, zero: 2 },    // Base (Total 20)
        { straight: 2, street: 4, zero: 4 },    // Loss 1: Base * 2 (Total 40)
        { straight: 3, street: 6, zero: 6 },    // Loss 2: Base * 3 (Total 60)
        { straight: 4, street: 8, zero: 8 },    // Loss 3: Base * 4 (Total 80)
        { straight: 8, street: 16, zero: 16 },  // Loss 4: Double Level 3 (Total 160)
        { straight: 18, street: 36, zero: 36 }, // Loss 5: Lvl 4 + (10 straight, 20 street/zero) (Total 360)
        { straight: 28, street: 56, zero: 56 }  // Loss 6: Lvl 5 + (10 straight, 20 street/zero) (Total 560)
    ];

    // Numbers covered by the bets to determine win/loss
    const winningNumbers = [0, 1, 2, 3, 7, 8, 9, 13, 14, 15, 19, 20, 21, 25, 26, 27, 31, 32, 33];

    // 2. Initialize State on first spin
    if (spinHistory.length === 0) {
        state.level = 0;
        state.peakBankroll = bankroll;
    } else {
        // 3. Process the previous spin result
        const lastSpin = spinHistory[spinHistory.length - 1];
        const isWin = winningNumbers.includes(lastSpin.winningNumber);

        // Check if we reached or exceeded the peak session profit
        if (bankroll >= state.peakBankroll) {
            state.level = 0;                 // Reset progression
            state.peakBankroll = bankroll;   // Establish new peak
        } else {
            // Not at peak profit
            if (isWin) {
                // Won, but not at peak: Rebet (keep level exactly the same)
                // state.level remains unchanged
            } else {
                // Lost: Advance progression by 1, capped at the max array length
                state.level = Math.min(state.level + 1, progression.length - 1);
            }
        }
    }

    // 4. Calculate Bet Amounts for Current Level
    const unit = config.betLimits.min; 
    const currentStep = progression[state.level];

    let straightAmount = unit * currentStep.straight;
    let streetAmount = unit * currentStep.street;
    let zeroAmount = unit * currentStep.zero;

    // Clamp values to respect table minimums and maximums
    straightAmount = Math.max(config.betLimits.min, Math.min(config.betLimits.max, straightAmount));
    streetAmount = Math.max(config.betLimits.min, Math.min(config.betLimits.max, streetAmount));
    zeroAmount = Math.max(config.betLimits.min, Math.min(config.betLimits.max, zeroAmount));

    // 5. Place Bets
    let bets = [];

    // Place straight bets
    straights.forEach(num => {
        bets.push({ type: 'number', value: num, amount: straightAmount });
    });

    // Place street bets (value is the start number of the row)
    streets.forEach(num => {
        bets.push({ type: 'street', value: num, amount: streetAmount });
    });

    // Place zero bet
    bets.push({ type: 'number', value: zero, amount: zeroAmount });

    return bets;
}