/**
 * 8 Corners Strategy
 * Source: CEG Dealer School (https://youtu.be/L9It1DOlpKc)
 * 
 * The Full Logic in details:
 * The strategy places 8 touching corner bets to create a dense coverage area over a 15-number block. 
 * For this script, we cover numbers 1 to 15. The numbers hit are categorized by how many corners cover them:
 * - Singles (covered by 1 corner): 1, 3, 13, 15
 * - Doubles (covered by 2 corners): 2, 4, 6, 7, 9, 10, 12, 14
 * - Quads / Middles (covered by 4 corners): 5, 8, 11
 * 
 * The Full Bet Progression in details:
 * The progression utilizes a 2-level system: Level 1 (Base Bet) and Level 2 (Pressed).
 * - On a Single hit: Rebet at the current level (staying steady).
 * - On a Double hit: 
 *     - If currently at Level 1, Press to Level 2.
 *     - If currently at Level 2, Reset back to Level 1 to lock in profit.
 * - On a Quad hit: Rebet at the current level (pocket the massive win and keep rolling).
 * - On a Loss (Miss): Reset back to Level 1.
 * 
 * The Goal:
 * The target profit is to double the buy-in (e.g., $400 buy-in to an $800 exit). 
 * Stop-loss is the exhaustion of the allocated bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define base unit and increment based on config
    const baseBet = config.betLimits.min;
    const increment = config.incrementMode === 'base' ? baseBet : config.minIncrementalBet;
    
    // 2. Initialize State for progression level
    if (!state.level) {
        state.level = 1;
    }

    // 3. Process the last spin to determine the next level
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        // Define our hit categories
        const singles = [1, 3, 13, 15];
        const doubles = [2, 4, 6, 7, 9, 10, 12, 14];
        const quads = [5, 8, 11];

        if (singles.includes(lastSpin)) {
            // Hit Single: Rebet at current level
            // state.level remains unchanged
        } else if (doubles.includes(lastSpin)) {
            // Hit Double: Press if at level 1, Reset if at level 2
            if (state.level === 1) {
                state.level = 2;
            } else {
                state.level = 1;
            }
        } else if (quads.includes(lastSpin)) {
            // Hit Quad / Middle: Rebet at current level
            // state.level remains unchanged
        } else {
            // Miss: Reset back to base
            state.level = 1;
        }
    }

    // 4. Calculate Bet Amount based on the current level
    let amount = baseBet + ((state.level - 1) * increment);

    // 5. Clamp to Limits
    amount = Math.max(amount, config.betLimits.min); 
    amount = Math.min(amount, config.betLimits.max);

    // 6. Return the 8 Corner Bets
    // The values represent the top-left number of each corner covering numbers 1 to 15.
    const cornerStarts = [1, 2, 4, 5, 7, 8, 10, 11];
    
    const bets = cornerStarts.map(val => ({
        type: 'corner',
        value: val,
        amount: amount
    }));

    return bets;
}