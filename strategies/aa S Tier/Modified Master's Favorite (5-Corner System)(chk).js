/**
 * Source: https://youtu.be/j24MgHjzcKg
 * Channel Name: The Roulette Master
 * Strategy Name: Modified Master's Favorite (5-Corner System - Strictly Peak Profit Reset)
 * 
 * THE FULL LOGIC IN DETAILS:
 * - What triggers a bet? 
 *   Places 5 corner bets continuously on every spin across the board.
 * - Corner Bet Positions (Value indicates top-left number of corner):
 *   1  -> Covers [1, 2, 4, 5]
 *   14 -> Covers [14, 15, 17, 18]
 *   20 -> Covers [20, 21, 23, 24]
 *   26 -> Covers [26, 27, 29, 30]
 *   32 -> Covers [32, 33, 35, 36]
 * 
 * THE FULL BET PROGRESSION IN DETAILS:
 * - Base Bet: 1 unit per corner across 5 corners.
 * - Peak Tracking & Reset Condition:
 *   - `state.peakBankroll` continuously records the highest bankroll achieved during the session.
 *   - The progression strictly ONLY resets to Level 0 (Base Bet) when the current bankroll
 *     reaches or exceeds the session's peak profit (`bankroll >= state.peakBankroll`).
 * - On Win (without reaching peak profit):
 *   - Continues at the current progression level or maintains bets until a win breaks a new peak.
 * - On Loss:
 *   - Increments progression level:
 *     - Levels 0 to 4: Adds 2 units per level (e.g., +$10 per corner at $5 base unit).
 *     - Levels 5+: Adds 4 units per level (e.g., +$20 per corner at $5 base unit).
 * 
 * THE GOAL:
 * - Target Profit: Stop betting once target profit (+250 units / $250) is reached.
 * - Bankroll Protection: Clamp bets to maximum table limits and stop if bankroll is insufficient.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) state.level = 0;
    if (state.initialBankroll === undefined) state.initialBankroll = bankroll;
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;

    const targetProfit = 25000; // $250 session profit target
    const currentProfit = bankroll - state.initialBankroll;

    // Target profit achieved - stop placing bets
    if (currentProfit >= targetProfit) {
        return [];
    }

    // 2. Evaluate Last Spin & Apply Strict Peak Profit Reset Condition
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNum = lastSpin.winningNumber;

        // Covered Corner Numbers
        const cornerPositions = [
            { topStart: 1,  nums: [1, 2, 4, 5] },
            { topStart: 14, nums: [14, 15, 17, 18] },
            { topStart: 20, nums: [20, 21, 23, 24] },
            { topStart: 26, nums: [26, 27, 29, 30] },
            { topStart: 32, nums: [32, 33, 35, 36] }
        ];

        const isWin = cornerPositions.some(c => c.nums.includes(lastWinningNum));

        // STRICT CONDITION: Reset ONLY when current bankroll reaches or breaks session peak
        if (bankroll >= state.peakBankroll) {
            state.peakBankroll = bankroll; // Update new session peak profit
            state.level = 0;               // Reset progression to base level
        } else if (!isWin) {
            // Increase progression step on loss
            state.level += 1;
        }
        // If it was a win but didn't reach the session peak profit, level remains unchanged
    }

    // 3. Base Unit Calculation
    const baseUnit = config.betLimits.min;

    // 4. Calculate Bet Amount Per Corner
    let amountPerCorner = baseUnit;

    if (state.level === 0) {
        amountPerCorner = baseUnit; // Base level (1 unit per corner)
    } else if (state.level <= 4) {
        // Levels 1 to 4: Add 2 units ($10 at $5 min) per level step
        amountPerCorner = baseUnit + (state.level * (baseUnit * 2));
    } else {
        // Levels 5+: Add 4 units ($20 at $5 min) per additional level step
        const level4Amount = baseUnit + (4 * (baseUnit * 2));
        amountPerCorner = level4Amount + ((state.level - 4) * (baseUnit * 4));
    }

    // 5. Clamp Bet Amounts to Config Limits
    amountPerCorner = Math.max(amountPerCorner, config.betLimits.min);
    amountPerCorner = Math.min(amountPerCorner, config.betLimits.max);

    // Verify bankroll sufficiency for 5 corner bets
    const totalBetRequired = amountPerCorner * 5;
    if (bankroll < totalBetRequired) {
        amountPerCorner = Math.max(config.betLimits.min, Math.floor(bankroll / 5));
        if (amountPerCorner * 5 > bankroll) {
            return []; // Stop betting if insufficient bankroll
        }
    }

    // 6. Return Array of 5 Corner Bets
    return [
        { type: 'corner', value: 1,  amount: amountPerCorner },
        { type: 'corner', value: 14, amount: amountPerCorner },
        { type: 'corner', value: 20, amount: amountPerCorner },
        { type: 'corner', value: 26, amount: amountPerCorner },
        { type: 'corner', value: 32, amount: amountPerCorner }
    ];
}