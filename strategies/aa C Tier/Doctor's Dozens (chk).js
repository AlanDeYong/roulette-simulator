/**
 * Strategy: Doctor's Dozens
 * Source: "The Roulette Master" on YouTube (http://www.youtube.com/watch?v=zGUU8_iPyWI)
 *
 * The Logic: 
 * - Bets are placed on 10 specific inside positions clustered around the zero section of the European wheel.
 * - Straight bets (7 units total): 0, 1, 2, 9, 10, 13, 14.
 * - Split bets (3 units total): 25/26, 27/28, 35/36.
 * * The Progression: 
 * - Utilizes a modified Fibonacci sequence for bet multipliers: 1, 2, 3, 5, 8, 13, etc.
 * - Wait for 3 consecutive losses at the current level before advancing to the next progression tier.
 * - If a win occurs (straight or split) but the session is still in a net drawdown, keep the bet level the same and reset the loss counter.
 * - If a win pushes the bankroll into an overall session profit (establishing a new high-water mark), reset the progression entirely back to base level.
 * * The Goal: 
 * - The conservative 3-loss trigger aims to ride out dry spells safely, eventually striking the zero-sector clusters to recover and secure a net profit. 
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on the first spin
    if (state.initialized === undefined) {
        state.initialized = true;
        state.sessionStartBankroll = bankroll; // Tracks the high-water mark
        state.fibSeq = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]; // Pre-calculated Fibonacci
        state.progressionIndex = 0;
        state.lossCount = 0;
        state.lastBankroll = bankroll;
    }

    // 2. Process results from the previous spin to determine win/loss
    if (spinHistory.length > 0) {
        // Calculate net change based on bankroll fluctuation 
        // (Assumes simulator deducts bets and adds winnings before calling this function again)
        const netChange = bankroll - state.lastBankroll;
        const totalProfit = bankroll - state.sessionStartBankroll;

        if (netChange > 0) {
            // --- WIN SCENARIO ---
            state.lossCount = 0; // Always reset the consecutive loss counter on any win
            
            if (totalProfit > 0) {
                // We reached a new high-water mark (net profit achieved)
                state.progressionIndex = 0; // Reset progression to base
                state.sessionStartBankroll = bankroll; // Lock in the new high-water mark
            }
            // Else: We won, but are still in a drawdown. Progression level remains exactly the same.
            
        } else {
            // --- LOSS SCENARIO ---
            state.lossCount++;
            
            if (state.lossCount >= 3) {
                // 3 consecutive losses trigger the progression advance
                state.progressionIndex++;
                state.lossCount = 0; // Reset loss counter for the new betting tier
                
                // Cap progression at our max generated Fibonacci level to prevent index out-of-bounds
                if (state.progressionIndex >= state.fibSeq.length) {
                    state.progressionIndex = state.fibSeq.length - 1;
                }
            }
        }
    }

    // 3. Calculate the Bet Amount
    const baseUnit = config.betLimits.min; 
    let multiplier = state.fibSeq[state.progressionIndex];
    let amount = baseUnit * multiplier;

    // 4. Clamp to Config Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Save current bankroll for the next spin's math BEFORE placing bets
    state.lastBankroll = bankroll;

    // 6. Construct and Return the Bets Array
    const straights = [0, 1, 2, 9, 10, 13, 14];
    const splits = [[25, 26], [27, 28], [35, 36]];
    let bets = [];

    straights.forEach(num => {
        bets.push({ type: 'number', value: num, amount: amount });
    });

    splits.forEach(splitArr => {
        bets.push({ type: 'split', value: splitArr, amount: amount });
    });

    return bets;
}