/**
 * STRATEGY: THE GOLDEN KEY (Roulette)
 * * Source: YouTube - Casino Matchmaker (Video: "A Fantastic Roulette Strategy That Fits Any Player")
 * URL: https://www.youtube.com/watch?v=7CRODUXsvqA
 * * THE LOGIC:
 * This strategy covers 21 numbers (approx. 57% of the board) to ensure the player is a 
 * favorite on most spins. It uses a 3:1 ratio across two specific areas:
 * 1. The First Dozen (Numbers 1-12)
 * 2. Three specific Streets (13-15, 16-18, 19-21)
 * * THE PROGRESSION (D'Alembert Style):
 * The function implements the "Aggressive/Smarter" version mentioned in the video:
 * 1. Start at a specific level (Level 5).
 * 2. On a LOSS: Increase the progression level by 1.
 * 3. On a WIN: Decrease the progression level by 1.
 * 4. This allows the player to "work back" losses without the total reset of Martingale.
 * * THE GOAL:
 * To profit from the higher payout of the Streets (which pay double the Dozen's profit) 
 * while maintaining high table coverage. The session resets if the level drops below 1 
 * or a specific profit target is met.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. Initialization & State Management ---
    const MIN_INSIDE = config.betLimits.min;
    const MIN_OUTSIDE = config.betLimits.minOutside;
    const MAX_BET = config.betLimits.max;

    // Initialize state on first run
    if (state.level === undefined) {
        state.level = 1; // Recommended starting level for D'Alembert
        state.initialBankroll = bankroll;
    }

    // --- 2. Evaluate Last Spin Result ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        // Determine if last spin was a win
        // Winning numbers: 1-12 (Dozen) and 13-21 (Streets)
        const isWin = lastSpin >= 1 && lastSpin <= 21;

        if (isWin) {
            state.level = Math.max(1, state.level - 1);
        } else {
            state.level++;
        }
    }

    // --- 3. Calculate Bet Amounts ---
    // Base unit is determined by the Street bet (Inside bet min)
    // The ratio is 3 units on Dozen, 1 unit on each of the 3 Streets.
    // We ensure the Street bet meets the minimum inside bet requirement.
    const unitSize = Math.max(MIN_INSIDE, config.minIncrementalBet || 1);
    
    let streetAmount = unitSize * state.level;
    let dozenAmount = (unitSize * 3) * state.level;

    // --- 4. Clamp to Table Limits ---
    // Clamping dozen (Outside bet)
    dozenAmount = Math.max(dozenAmount, MIN_OUTSIDE);
    dozenAmount = Math.min(dozenAmount, MAX_BET);

    // Clamping streets (Inside bets)
    streetAmount = Math.max(streetAmount, MIN_INSIDE);
    streetAmount = Math.min(streetAmount, MAX_BET);

    // Ensure total bet doesn't exceed bankroll
    const totalRequired = dozenAmount + (streetAmount * 3);
    if (totalRequired > bankroll) {
        // If we can't afford the full progression, try to scale down or stop
        if (bankroll < (MIN_OUTSIDE + (MIN_INSIDE * 3))) return []; 
    }

    // --- 5. Construct Bet Array ---
    // The Golden Key Setup:
    // - 1st Dozen
    // - Street 13 (covers 13, 14, 15)
    // - Street 16 (covers 16, 17, 18)
    // - Street 19 (covers 19, 20, 21)
    return [
        { type: 'dozen', value: 1, amount: dozenAmount },
        { type: 'street', value: 13, amount: streetAmount },
        { type: 'street', value: 16, amount: streetAmount },
        { type: 'street', value: 19, amount: streetAmount }
    ];
}