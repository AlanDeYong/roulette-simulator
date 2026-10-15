/**
 * Master Plan Roulette Strategy
 * 
 * Source: The Roulette Master (YouTube) - https://youtu.be/9eLPX5Bs4jA
 * Strategy by: Roger Bennett
 * 
 * The Full Logic:
 * - The strategy places three simultaneous outside multiplier bets:
 *   1. 1st Dozen (Numbers 1-12)
 *   2. 2nd Dozen (Numbers 13-24)
 *   3. 2nd Column (Numbers 2, 5, 8... 35)
 * - The strategy focuses on tracking a "High Water Mark" (your peak bankroll).
 * - If you achieve a "New Session Profit" (bankroll >= highest recorded bankroll), 
 *   you are NOT in recovery. You just spin with the base minimum bets.
 * - If you break even while at your peak bankroll, you just rebet the base bets.
 * - If your bankroll drops below the peak recorded bankroll, you enter "Recovery".
 * 
 * The Full Bet Progression:
 * - Base bet is the table minimum for outside bets.
 * - Every spin, compare the current bankroll to the High Water Mark.
 * - If bankroll >= High Water Mark (Out of Recovery): Reset all bets to the base unit.
 * - If bankroll < High Water Mark (In Recovery): Evaluate each of the 3 bets independently based on the last spin:
 *   - If the specific bet WON: Reset that bet back to the base unit to secure the win.
 *   - If the specific bet LOST: Double that specific bet's previous amount (Martingale).
 *   - (Note: Code also respects config.incrementMode if customized to 'fixed' or 'base', but pure doubling is the true strategy).
 * 
 * The Goal:
 * - Consistently push the peak bankroll up by banking profits. Recover from losses 
 *   aggressively by independently doubling missed zones while safely resetting hit 
 *   zones to minimums to limit exposure. The creator notes typically cashing out 
 *   at +$200 to +$300 profit.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine Base Unit (Using outside limits per config)
    const U = config.betLimits.minOutside;

    // 2. Initialize State
    if (!state.highWaterMark) {
        state.highWaterMark = bankroll;
    }

    if (!state.bets) {
        // Initial Base Bets: 1st Dozen, 2nd Dozen, 2nd Column
        state.bets = [
            { type: 'dozen', value: 1, amount: U },
            { type: 'dozen', value: 2, amount: U },
            { type: 'column', value: 2, amount: U }
        ];
    }

    // 3. Process Previous Spin Progression
    if (spinHistory.length > 0) {
        const lastResultStr = spinHistory[spinHistory.length - 1].winningNumber;
        const n = (lastResultStr === '00' || lastResultStr === 0 || lastResultStr === '0') ? -1 : parseInt(lastResultStr, 10);

        // Check if we hit a new peak or returned to it (Out of Recovery)
        if (bankroll >= state.highWaterMark) {
            state.highWaterMark = bankroll; // Set new peak
            // Reset all bets to base unit
            state.bets.forEach(b => {
                b.amount = U;
            });
        } else {
            // We are In Recovery (Bankroll is below peak)
            state.bets.forEach(b => {
                let won = false;
                
                // Determine if this specific bet won on the last spin
                if (n > 0) {
                    if (b.type === 'dozen') {
                        if (b.value === 1 && n >= 1 && n <= 12) won = true;
                        if (b.value === 2 && n >= 13 && n <= 24) won = true;
                        if (b.value === 3 && n >= 25 && n <= 36) won = true;
                    } else if (b.type === 'column') {
                        if (b.value === 1 && n % 3 === 1) won = true;
                        if (b.value === 2 && n % 3 === 2) won = true;
                        if (b.value === 3 && n % 3 === 0) won = true;
                    }
                }

                if (won) {
                    // Reset winning bet back to base unit safely
                    b.amount = U;
                } else {
                    // Progression on losing bet
                    if (config.incrementMode === 'fixed') {
                        b.amount += config.minIncrementalBet;
                    } else if (config.incrementMode === 'base') {
                        b.amount += U;
                    } else {
                        // Genuine Master Plan Strategy dictates independent doubling
                        b.amount *= 2; 
                    }
                }
            });
        }
    }

    // 4. Clamp All Bets to Table Limits
    state.bets.forEach(b => {
        b.amount = Math.max(b.amount, config.betLimits.minOutside);
        b.amount = Math.min(b.amount, config.betLimits.max);
    });

    // 5. Return a fresh array of bet objects to avoid state reference mutation
    return state.bets.map(b => ({ type: b.type, value: b.value, amount: b.amount }));
}