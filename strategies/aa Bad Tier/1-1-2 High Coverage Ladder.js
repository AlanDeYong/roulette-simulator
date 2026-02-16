<<<<<<< HEAD
/**
 * STRATEGY: The "1-1-2" High Coverage Ladder (32-Number Cover)
 *
 * SOURCE:
 * - Video: "A GIFT!.MADE OVER $1,000 BUCKS IN 17 MINS!..."
 * - Channel: ROULETTE JACKPOT
 * - URL: https://www.youtube.com/watch?v=80D5SHD8Iwg
 *
 * THE LOGIC:
 * - This strategy covers 32 out of 37 numbers (on a single zero wheel).
 * - It creates a high-frequency win rate (~86%).
 * - The "1-1-2" name in the video refers to the rhythmic pattern of placing chips,
 * but mathematically it results in a flat bet on 32 individual numbers.
 * - Based on the video's loss examples (14, 16, 22), these numbers are among the 5 excluded.
 *
 * THE PROGRESSION (The "Ladder"):
 * - Base Bet: 1 unit on 32 numbers ($32 total if unit is $1).
 * - Win Condition: Pays 35:1. Total return 36 units. Profit 4 units.
 * - Loss Condition: Lose 32 units.
 * - Recovery (Ladder): On a loss, increase the bet unit by 1 (e.g., 1 -> 2 -> 3).
 * - Unlike Martingale (doubling), this adds 1 unit per level to prevent
 * rapid table-limit hits, accepting a slower recovery ("comeback").
 * - Reset: On a win, the video suggests aggressive pressing, but for safety/simulation
 * stability, this function resets to 1 unit after a win.
 *
 * THE GOAL:
 * - Grind out small profits (4 units per spin) with high frequency.
 * - Survive the inevitable losses using the ladder progression.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Initialization
    // ---------------------------------
    const baseUnit = config.betLimits.min; // Usually $1 or similar
    const totalNumbersToCover = 32;

    // Initialize State if first run
    if (!state.progressionLevel) state.progressionLevel = 1;
    if (!state.excludedNumbers) {
        // We need to exclude 5 numbers to bet on 32 (Standard EU Wheel has 37 numbers).
        // Based on video losses (14, 16, 22), we exclude these plus 2 others to form the "Gap".
        // A common 5-number sector gap or dispersed gap.
        state.excludedNumbers = [14, 16, 22, 1, 17];
    }

    // 2. Analyze Previous Spin (Trigger Logic)
    // ----------------------------------------
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        // Did we win? (Was the last number NOT in our excluded list?)
        const isWin = !state.excludedNumbers.includes(lastNumber);

        if (isWin) {
            // WIN: Reset ladder to base level
            // Note: Use state.progressionLevel = state.progressionLevel to "press" if desired,
            // but standard strategy is Reset.
            state.progressionLevel = 1;
        } else {
            // LOSS: Ladder up (Increase unit size by 1)
            // Video: "Ladder one time" -> "Ladder again"
            state.progressionLevel += 1;
        }
    }

    // 3. Calculate Bet Amounts
    // ------------------------
    // Calculate unit size based on progression
    let currentUnit = baseUnit * state.progressionLevel;

    // Safety: Clamp to Maximum Table Limits
    // We must ensure that currentUnit does not exceed the Max Bet per spot
    currentUnit = Math.min(currentUnit, config.betLimits.max);

    // Safety: Bankroll Check
    // If the total bet (32 * unit) exceeds bankroll, reduce unit size or stop
    if ((currentUnit * totalNumbersToCover) > bankroll) {
        // If we can't afford the ladder, try to bet whatever is left evenly, or stop
        currentUnit = Math.floor(bankroll / totalNumbersToCover);
        if (currentUnit < config.betLimits.min) {
            return []; // Stop betting if we are busted
        }
    }

    // 4. Construct Bets
    // -----------------
    const bets = [];

    // Loop through all numbers 0-36
    // If the number is NOT in the excluded list, place a bet
    for (let i = 0; i <= 36; i++) {
        if (!state.excludedNumbers.includes(i)) {
            bets.push({
                type: 'number',
                value: i,
                amount: currentUnit
            });
        }
    }

    return bets;
=======
/**
 * STRATEGY: The "1-1-2" High Coverage Ladder (32-Number Cover)
 *
 * SOURCE:
 * - Video: "A GIFT!.MADE OVER $1,000 BUCKS IN 17 MINS!..."
 * - Channel: ROULETTE JACKPOT
 * - URL: https://www.youtube.com/watch?v=80D5SHD8Iwg
 *
 * THE LOGIC:
 * - This strategy covers 32 out of 37 numbers (on a single zero wheel).
 * - It creates a high-frequency win rate (~86%).
 * - The "1-1-2" name in the video refers to the rhythmic pattern of placing chips,
 * but mathematically it results in a flat bet on 32 individual numbers.
 * - Based on the video's loss examples (14, 16, 22), these numbers are among the 5 excluded.
 *
 * THE PROGRESSION (The "Ladder"):
 * - Base Bet: 1 unit on 32 numbers ($32 total if unit is $1).
 * - Win Condition: Pays 35:1. Total return 36 units. Profit 4 units.
 * - Loss Condition: Lose 32 units.
 * - Recovery (Ladder): On a loss, increase the bet unit by 1 (e.g., 1 -> 2 -> 3).
 * - Unlike Martingale (doubling), this adds 1 unit per level to prevent
 * rapid table-limit hits, accepting a slower recovery ("comeback").
 * - Reset: On a win, the video suggests aggressive pressing, but for safety/simulation
 * stability, this function resets to 1 unit after a win.
 *
 * THE GOAL:
 * - Grind out small profits (4 units per spin) with high frequency.
 * - Survive the inevitable losses using the ladder progression.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Initialization
    // ---------------------------------
    const baseUnit = config.betLimits.min; // Usually $1 or similar
    const totalNumbersToCover = 32;

    // Initialize State if first run
    if (!state.progressionLevel) state.progressionLevel = 1;
    if (!state.excludedNumbers) {
        // We need to exclude 5 numbers to bet on 32 (Standard EU Wheel has 37 numbers).
        // Based on video losses (14, 16, 22), we exclude these plus 2 others to form the "Gap".
        // A common 5-number sector gap or dispersed gap.
        state.excludedNumbers = [14, 16, 22, 1, 17];
    }

    // 2. Analyze Previous Spin (Trigger Logic)
    // ----------------------------------------
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        // Did we win? (Was the last number NOT in our excluded list?)
        const isWin = !state.excludedNumbers.includes(lastNumber);

        if (isWin) {
            // WIN: Reset ladder to base level
            // Note: Use state.progressionLevel = state.progressionLevel to "press" if desired,
            // but standard strategy is Reset.
            state.progressionLevel = 1;
        } else {
            // LOSS: Ladder up (Increase unit size by 1)
            // Video: "Ladder one time" -> "Ladder again"
            state.progressionLevel += 1;
        }
    }

    // 3. Calculate Bet Amounts
    // ------------------------
    // Calculate unit size based on progression
    let currentUnit = baseUnit * state.progressionLevel;

    // Safety: Clamp to Maximum Table Limits
    // We must ensure that currentUnit does not exceed the Max Bet per spot
    currentUnit = Math.min(currentUnit, config.betLimits.max);

    // Safety: Bankroll Check
    // If the total bet (32 * unit) exceeds bankroll, reduce unit size or stop
    if ((currentUnit * totalNumbersToCover) > bankroll) {
        // If we can't afford the ladder, try to bet whatever is left evenly, or stop
        currentUnit = Math.floor(bankroll / totalNumbersToCover);
        if (currentUnit < config.betLimits.min) {
            return []; // Stop betting if we are busted
        }
    }

    // 4. Construct Bets
    // -----------------
    const bets = [];

    // Loop through all numbers 0-36
    // If the number is NOT in the excluded list, place a bet
    for (let i = 0; i <= 36; i++) {
        if (!state.excludedNumbers.includes(i)) {
            bets.push({
                type: 'number',
                value: i,
                amount: currentUnit
            });
        }
    }

    return bets;
>>>>>>> origin/main
}