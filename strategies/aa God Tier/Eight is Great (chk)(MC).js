/**
 * Roulette Strategy: "Eight is Great" (No Losses Strategy)
 * Source: https://youtu.be/wNgtF9YTCq0 (Channel: WillVegas, originally from Roulette Masters)
 *
 * The Full Logic:
 * This is a high-coverage strategy that places equal-sized bets on 8 specific positions.
 * The layout is designed to create overlapping "Jackpot" numbers in the middle column,
 * generate small profits on a wide range of other numbers, and survive partial losses.
 * * The 8 bet positions are:
 * 1. Straight Up on 0 (Adapting the 0/00 split shown in the video for EU/US compatibility)
 * 2. Corner 4 (covers 4, 5, 7, 8)
 * 3. Corner 5 (covers 5, 6, 8, 9)
 * 4. Corner 16 (covers 16, 17, 19, 20)
 * 5. Corner 17 (covers 17, 18, 20, 21)
 * 6. Corner 28 (covers 28, 29, 31, 32)
 * 7. Corner 29 (covers 29, 30, 32, 33)
 * 8. Column 2 (Covers the middle column)
 *
 * Hit Mechanics:
 * - Jackpot hits (2 overlapping corners + Col 2): 5, 8, 17, 20, 29, 32 (Massive profit)
 * - Standard hits (1 corner): Pays 8:1 (+1 unit profit overall)
 * - Partial Losses (Col 2 only): e.g. 2, 14, 23, 26, 35 (Return 3 units, lose 5 units)
 * - Complete Losses: e.g. 24, 27 (Lose all 8 units)
 *
 * The Full Bet Progression:
 * - The strategy operates in "cycles", starting at Level 1.
 * - Every time a spin results in a net LOSS (complete OR partial), the bet size 
 * for ALL 8 positions goes UP by 1 level.
 * - If a spin results in a net WIN, the strategy evaluates the "Cycle Profit".
 * - If the Cycle Profit > 0 (meaning all cycle losses are fully recovered), 
 * the cycle ends, and bets RESET to Level 1.
 * - If the Cycle Profit <= 0 (still negative overall), the bet level STAYS THE SAME.
 *
 * The Goal:
 * - The visual target in the video is a session profit of +$50 to +$100.
 * - The script will continuously run to accumulate profit until the simulator 
 * runs out of data or the bankroll drops below the minimum required to place 8 bets.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.level = 1;
        state.cycleProfit = 0;
        state.initialized = true;
    }

    // 2. Calculate Profit/Loss from the previous spin
    // We use the bankroll difference to perfectly track net profit across all 8 payouts
    if (spinHistory.length > 0 && state.lastBankroll !== undefined) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const profit = bankroll - state.lastBankroll;

        state.cycleProfit += profit;

        // Uncomment for sparse debugging
        // console.log(`Spin: ${lastSpin.winningNumber} | Color: ${lastSpin.winningColor} | Net Profit: ${profit} | Cycle Profit: ${state.cycleProfit}`);

        if (profit < 0) {
            // Any loss (complete or partial) increments the progression level
            state.level++;
        } else if (profit >= 0) {
            // On a win, check if we recovered the entire cycle
            if (state.cycleProfit > 0) {
                state.level = 1;       // Reset progression
                state.cycleProfit = 0; // Reset cycle
            }
            // If cycleProfit <= 0, we stay at the current level to grind back to positive
        }
    }

    // Update bankroll tracker for the next spin's math
    state.lastBankroll = bankroll;

    // 3. Determine Base Unit and Bet Amount
    // We must use a unit large enough to satisfy both inside and outside (Column) minimums
    const baseUnit = Math.max(config.betLimits.min, config.betLimits.minOutside);

    // Determine the incremental amount to add per level
    const incrementAmount = config.incrementMode === 'base' 
        ? baseUnit 
        : (config.minIncrementalBet || 1);

    // Calculate the raw bet amount per position for this level
    let amount = baseUnit + ((state.level - 1) * incrementAmount);

    // 4. Clamp to Limits
    amount = Math.max(amount, baseUnit);
    amount = Math.min(amount, config.betLimits.max);

    // Stop-Loss / Bankruptcy Check: Ensure we have enough bankroll to cover all 8 bets
    if (bankroll < amount * 8) {
        amount = Math.floor(bankroll / 8);
        if (amount < config.betLimits.min) {
            return null; // Stop betting, insufficient funds
        }
    }

    // 5. Return Bet Objects
    return [
        { type: 'number', value: 0, amount: amount },
        { type: 'corner', value: 4, amount: amount },
        { type: 'corner', value: 5, amount: amount },
        { type: 'corner', value: 16, amount: amount },
        { type: 'corner', value: 17, amount: amount },
        { type: 'corner', value: 28, amount: amount },
        { type: 'corner', value: 29, amount: amount },
        { type: 'column', value: 2, amount: amount }
    ];
}