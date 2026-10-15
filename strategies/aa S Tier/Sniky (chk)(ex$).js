/**
 * Strategy Name: Sniky / Sniky Roulette Strategy
 * Source: https://youtu.be/I1lkQUHN5mI
 * YouTube Channel: Casino Matchmaker (Submitted by Hobra 2008)
 *
 * FULL LOGIC:
 * 1. Base Setup (Level 1):
 *    - Place 4 Six-Line (Double Street) bets covering numbers 7 through 30:
 *      - Line 7 (7, 8, 9, 10, 11, 12)
 *      - Line 13 (13, 14, 15, 16, 17, 18)
 *      - Line 19 (19, 20, 21, 22, 23, 24)
 *      - Line 25 (25, 26, 27, 28, 29, 30)
 *    - Base bet unit is 1 unit per chip placement (4 units total).
 *
 * 2. Step-by-Step Progression on Loss:
 *    - Level 1 (4 Units Total): 4 Six-Lines @ 1 unit each.
 *    - Level 2 (12 Units Total): Repeat 4 Six-Lines @ 1 unit + Add 8 Corner bets @ 1 unit each.
 *      - Corner positions: 8, 11, 14, 17, 20, 23, 26, 29.
 *    - Level 3 (16 Units Total): 4 Six-Lines @ 2 units each + 8 Corners @ 1 unit each.
 *    - Level 4 (24 Units Total): 4 Six-Lines @ 2 units each + 8 Corners @ 2 units each.
 *    - Level 5 (28 Units Total): 4 Six-Lines @ 3 units each + 8 Corners @ 2 units each.
 *    - Beyond Level 5: Double up total progression bet until session target/reset or bust.
 *
 * 3. On Win / Session Profit:
 *    - If bankroll reaches session profit target (e.g., +100 units or higher than starting bankroll), reset progression to Level 1.
 *    - If a win occurs without reaching net session profit, repeat the current bet level.
 *
 * THE GOAL:
 * - Reach +100 units profit target in 37 spins or less.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.targetProfit = 100; // Target profit in units/currency
        state.level = 1;          // Progression level (1 to 5+)
        state.multiplier = 1;     // Multiplier for levels beyond 5
        state.initialized = true;
    }

    // 2. Base Unit Set to 1 Unit (Clamped to minimum inside bet limit)
    const baseUnit = Math.max(config.betLimits.min || 1, 1);

    // 3. Evaluate Spin Result to Update Progression
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const currentProfit = bankroll - state.initialBankroll;

        // Reset condition: Session target profit hit or net overall gain achieved
        if (currentProfit >= state.targetProfit || currentProfit > 0) {
            state.level = 1;
            state.multiplier = 1;
            state.initialBankroll = bankroll; // Reset base baseline for next cycle
        } else {
            // Check if last spin resulted in a win/loss compared to previous state balance
            const netWin = lastSpin.payout ? lastSpin.payout - lastSpin.totalBet : 0;

            if (netWin <= 0) {
                // Loss or net deficit spin -> Advance progression level
                if (state.level < 5) {
                    state.level += 1;
                } else {
                    // Beyond level 5: Double bet sizes
                    state.multiplier *= 2;
                }
            }
            // On partial/full win that doesn't clear net deficit: repeat current level/multiplier
        }
    }

    // 4. Calculate Bet Units for Current Progression Level
    let lineMultiplier = 0;
    let cornerMultiplier = 0;

    switch (state.level) {
        case 1:
            lineMultiplier = 1;
            cornerMultiplier = 0;
            break;
        case 2:
            lineMultiplier = 1;
            cornerMultiplier = 1;
            break;
        case 3:
            lineMultiplier = 2;
            cornerMultiplier = 1;
            break;
        case 4:
            lineMultiplier = 2;
            cornerMultiplier = 2;
            break;
        case 5:
        default:
            lineMultiplier = 3;
            cornerMultiplier = 2;
            break;
    }

    // Apply additional doubling multiplier if progression exceeded Level 5
    lineMultiplier *= state.multiplier;
    cornerMultiplier *= state.multiplier;

    // 5. Construct Bet Objects with Clamped Limits
    const bets = [];

    // Line Bet Locations: covering 7 to 30
    const lineValues = [7, 13, 19, 25];
    if (lineMultiplier > 0) {
        for (const val of lineValues) {
            let lineAmount = baseUnit * lineMultiplier;
            lineAmount = Math.max(lineAmount, config.betLimits.min);
            lineAmount = Math.min(lineAmount, config.betLimits.max);
            bets.push({ type: 'line', value: val, amount: lineAmount });
        }
    }

    // Corner Bet Locations (8, 11, 14, 17, 20, 23, 26, 29 top-left offsets)
    const cornerValues = [8, 11, 14, 17, 20, 23, 26, 29];
    if (cornerMultiplier > 0) {
        for (const val of cornerValues) {
            let cornerAmount = baseUnit * cornerMultiplier;
            cornerAmount = Math.max(cornerAmount, config.betLimits.min);
            cornerAmount = Math.min(cornerAmount, config.betLimits.max);
            bets.push({ type: 'corner', value: val, amount: cornerAmount });
        }
    }

    return bets;
}