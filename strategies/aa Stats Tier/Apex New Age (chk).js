/**
 * Apex New Age Roulette System
 * 
 * Source: The Roulette Master (YouTube) - https://youtu.be/eHJCmsGp28k
 * 
 * The Full Logic:
 * This strategy combines coverage on the 3rd Column, 3rd Dozen, and a zero-section inside bet 
 * to create "jackpot" overlap numbers (like 27, 30, 33, 36). It uses a slow, highly survivable 
 * recovery progression without aggressive doubling.
 * 
 * The Full Bet Progression:
 * - Base Bets: 1 unit ($5) on Trio [0,1,2], 2 units ($10) on 3rd Column, 2 units ($10) on 3rd Dozen.
 * - After a Loss (bankroll drops from previous spin): Add the base bet amount to each position.
 *   (e.g., after 1 loss: $10 Trio, $20 Col 3, $20 Doz 3).
 * - After a Partial Win (net profit on spin, but session high not reached): Keep bets exactly the same.
 * - After a Full Recovery (bankroll reaches a new session high): Reset all bets back to base level.
 * 
 * The Goal:
 * The video creator recommends declaring victory and cashing out at around $250 profit.
 * This script will run infinitely until the bankroll runs out or the simulation ends.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (typeof state.level === 'undefined') {
        state.level = 1;
        state.highestBankroll = bankroll;
        state.previousBankroll = bankroll;
    }

    // 2. Progression Logic (Evaluate previous spin results)
    if (bankroll > state.highestBankroll) {
        // Reached a new session profit: Reset progression
        state.highestBankroll = bankroll;
        state.level = 1;
    } else if (spinHistory.length > 0) {
        // Not a new high. Determine if it was a loss or partial win.
        if (bankroll < state.previousBankroll) {
            // Net loss on the last spin: Increase progression level
            state.level++;
        }
        // If it was a partial win (bankroll > previousBankroll but <= highestBankroll), 
        // the level remains unchanged (rebet).
    }
    
    // Update previous bankroll for the next spin's evaluation
    state.previousBankroll = bankroll;

    // 3. Determine Base Units (Matching the 1:2:2 ratio from the video)
    // The video uses $5 inside, $10 outside. We scale this ensuring we respect minimum limits.
    const baseTrio = Math.max(5, config.betLimits.min);
    const baseOutside = Math.max(10, config.betLimits.minOutside);

    // 4. Calculate Bet Amounts
    let amountTrio, amountCol, amountDoz;

    if (config.incrementMode === 'fixed') {
        // Fixed increment: Increase by a flat minimum incremental amount per level
        amountTrio = baseTrio + ((state.level - 1) * config.minIncrementalBet);
        amountCol = baseOutside + ((state.level - 1) * config.minIncrementalBet);
        amountDoz = baseOutside + ((state.level - 1) * config.minIncrementalBet);
    } else {
        // Base increment (Default): Add the original base bet amount per level
        amountTrio = baseTrio * state.level;
        amountCol = baseOutside * state.level;
        amountDoz = baseOutside * state.level;
    }

    // 5. Clamp to Table Limits (Crucial)
    amountTrio = Math.max(amountTrio, config.betLimits.min);
    amountTrio = Math.min(amountTrio, config.betLimits.max);

    amountCol = Math.max(amountCol, config.betLimits.minOutside);
    amountCol = Math.min(amountCol, config.betLimits.max);

    amountDoz = Math.max(amountDoz, config.betLimits.minOutside);
    amountDoz = Math.min(amountDoz, config.betLimits.max);

    // 6. Return Bet Array
    return [
        { type: 'trio', value: [0, 1, 2], amount: amountTrio },
        { type: 'column', value: 3, amount: amountCol },
        { type: 'dozen', value: 3, amount: amountDoz }
    ];
}