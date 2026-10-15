/**
 * Strategy Name: Dr. Roulette's "Fifth Element" Strategy
 * Source: https://youtu.be/s-aTuabu26k
 * YouTube Channel: The Roulette Master
 * 
 * THE FULL LOGIC IN DETAIL:
 * -------------------------
 * - High-coverage system placing bets on 5 Double Streets (Six-Line bets) covering 30 of 37 numbers.
 * - Standard double street positions: Line 1 (1-6), Line 7 (7-12), Line 13 (13-18), Line 19 (19-24), Line 25 (25-30).
 * - Plays in cycles of 5 spins.
 * - Spins 1 through 4 of every cycle are always played at the base unit size (e.g., 1 unit per line bet).
 * - Spin 5 (the "Fifth Element"): If the session is not in overall profit, the bet size on this single 
 *   5th spin is increased to a higher multiplier level (starting at 2 units, then 3, 4, 5 units, etc. 
 *   for subsequent cycles).
 * 
 * THE FULL BET PROGRESSION IN DETAIL:
 * ----------------------------------
 * 1. Base Unit: Defined by `config.betLimits.min` (or `minOutside` scaled appropriately for inside/line bets).
 * 2. Cycle Counter: Tracks spin count within the current 5-spin cycle (1 to 5).
 * 3. Fifth Element Progression Level: Tracks the multiplier for the 5th spin (starts at 2x base unit).
 * 4. Execution Rules:
 *    - For spin counts 1, 2, 3, 4: Place 1x base unit on each of the 5 double streets.
 *    - For spin count 5: Place (Level)x base unit on each of the 5 double streets.
 *    - After spin 5 completes:
 *      - If session profit > 0 (or new high watermark reached): Reset Fifth Element Level to 2x.
 *      - If session profit <= 0: Increment Fifth Element Level by +1 for the next cycle's 5th spin.
 * 
 * THE GOAL:
 * ---------
 * - Accumulate consistent small wins across high-coverage spins and cash out upon reaching a target 
 *   session profit (e.g., +250 units or 10-25% of starting bankroll).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define base unit (Line bet is an inside bet)
    const baseUnit = config.betLimits.min || 2;

    // 2. Initialize State
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.spinCount = 0;              // Spins within the current 5-spin cycle (0 to 4)
        state.fifthElementLevel = 2;       // Multiplier for the 5th spin (2x, 3x, 4x, etc.)
    }

    // 3. Update state based on past spins
    if (spinHistory.length > 0) {
        state.spinCount = (state.spinCount + 1) % 5;

        // At the start of a new cycle (just completed spin 5), evaluate profit
        if (state.spinCount === 0) {
            const currentProfit = bankroll - state.initialBankroll;
            if (currentProfit > 0) {
                // Reset level on profit
                state.fifthElementLevel = 2;
            } else {
                // Step up progression for the next 5th element spin
                state.fifthElementLevel += 1;
            }
        }
    }

    // 4. Calculate multiplier for the current spin
    // Spins 0, 1, 2, 3 (spins 1-4 of cycle) = 1x base unit
    // Spin 4 (5th spin of cycle) = fifthElementLevel x base unit
    let multiplier = 1;
    if (state.spinCount === 4) {
        multiplier = state.fifthElementLevel;
    }

    // 5. Calculate and clamp bet amount per line position
    let lineBetAmount = baseUnit * multiplier;
    lineBetAmount = Math.max(lineBetAmount, config.betLimits.min);
    lineBetAmount = Math.min(lineBetAmount, config.betLimits.max);

    // 6. Define the 5 double street (line) positions
    const linePositions = [1, 7, 13, 19, 25];

    // 7. Construct and return bet objects
    const bets = linePositions.map(startNum => ({
        type: 'line',
        value: startNum,
        amount: lineBetAmount
    }));

    return bets;
}