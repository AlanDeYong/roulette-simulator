/**
 * Treasure Hunt Roulette Strategy
 * Source: Casino Matchmaker
 * https://youtu.be/DYD_8VZbWDI?si=stMGqr_uPWxJA4nw
 * Logic:
 * The strategy uses two separate "Treasure" bets that operate independently but overlap on the board.
 * - Treasure Low covers the numbers 7-12 and 16-21 (Line 7 and Line 16).
 * - Treasure High covers the numbers 16-21 and 25-30 (Line 16 and Line 25).
 * Because both bets cover the 16-21 double street, that specific line ("The Jackpot") receives 
 * the combined bet amounts of both progressions.
 * 
 * Bet Progression:
 * Each Treasure bet follows its own independent Fibonacci sequence (1, 1, 2, 3, 5, 8, 13, 21...) 
 * multiplied by the base betting unit (the minimum inside bet limit).
 * - If a Treasure bet loses (the winning number is NOT in its covered lines), its progression moves to the next Fibonacci step.
 * - If a Treasure bet wins, its progression completely resets to the very first step (index 0).
 * - If the overlapping line (16-21) hits, BOTH Treasure bets are winners, so BOTH reset to index 0 simultaneously.
 * 
 * Goal: 
 * Catch the overlapping 16-21 "Jackpot" line to win big and reset both progressions, or sustain 
 * through the Fibonacci progression until the individual sections hit to recover losses.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State for independent Fibonacci indices
    if (state.lowIndex === undefined) {
        state.lowIndex = 0;
        state.highIndex = 0;
    }

    // 2. Process the last spin to update progressions
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        // Determine if Treasure Low (7-12, 16-21) hit
        const lowWon = (num >= 7 && num <= 12) || (num >= 16 && num <= 21);
        
        // Determine if Treasure High (16-21, 25-30) hit
        const highWon = (num >= 16 && num <= 21) || (num >= 25 && num <= 30);

        // Update Low Progression: Reset on win, step up on loss
        if (lowWon) {
            state.lowIndex = 0;
        } else {
            state.lowIndex++;
        }

        // Update High Progression: Reset on win, step up on loss
        if (highWon) {
            state.highIndex = 0;
        } else {
            state.highIndex++;
        }
    }

    // 3. Fibonacci Helper Function
    // Generates standard sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34...
    function getFibMultiplier(index) {
        let a = 1, b = 1;
        for (let i = 0; i < index; i++) {
            let temp = a + b;
            a = b;
            b = temp;
        }
        return a;
    }

    // 4. Calculate Bet Amounts
    // The base unit uses the table's minimum inside bet
    const unit = Math.max(config.betLimits.min, 1); 

    const lowAmount = getFibMultiplier(state.lowIndex) * unit;
    const highAmount = getFibMultiplier(state.highIndex) * unit;

    // Line bets are defined by the start of their first row
    let bet7 = lowAmount;
    let bet16 = lowAmount + highAmount; // Overlapping "Jackpot" line merges both amounts
    let bet25 = highAmount;

    // 5. Clamp Bets to Table Limits
    bet7 = Math.min(bet7, config.betLimits.max);
    bet16 = Math.min(bet16, config.betLimits.max);
    bet25 = Math.min(bet25, config.betLimits.max);

    // 6. Construct and Return Bets
    const bets = [];
    
    // Safety check to ensure we only push valid inside bets that meet the minimum
    if (bet7 >= config.betLimits.min) bets.push({ type: 'line', value: 7, amount: bet7 });
    if (bet16 >= config.betLimits.min) bets.push({ type: 'line', value: 16, amount: bet16 });
    if (bet25 >= config.betLimits.min) bets.push({ type: 'line', value: 25, amount: bet25 });

    return bets;
}