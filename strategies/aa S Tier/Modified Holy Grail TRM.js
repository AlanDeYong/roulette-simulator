/**
 * ============================================================================
 * ROULETTE STRATEGY: THE MODIFIED HOLY GRAIL
 * ============================================================================
 * @source  https://youtu.be/gwhfeFjzS5k
 * @channel The Roulette Master
 * 
 * --- FULL LOGIC IN DETAIL ---
 * 1. Bet Placement:
 *    - Simultaneously covers two 12-number outside sections: First Dozen (1-12)
 *      and Second Dozen (13-24).
 *    - Covering 2 out of 3 dozens provides ~64.8% table coverage on a European wheel.
 * 
 * 2. Triggers and Progression:
 *    - Base Bet: Placed equally on Dozen 1 and Dozen 2 using the outside minimum.
 *    - On WIN:
 *      * If current bankroll reaches or exceeds the highest recorded session profit
 *        (the session peak / High-Water Mark), the strategy locks in the profit
 *        and RESETS back to the base unit bet on both dozens.
 *      * If bankroll is still below the session high-water mark, the bet amount
 *        remains the same ("rebet and spin") to ride winning runs back into profit.
 *    - On LOSS (3rd dozen 25-36 or Zero):
 *      * Standard recovery: Increase the bet on each dozen by 1 base unit (+1 unit).
 *      * "The Roulette Master" High-Tier Modification: When bet per dozen reaches
 *        10 units or higher (e.g., $100 per dozen with a $10 base), subsequent loss
 *        increments accelerate to +2 units ($20) per loss to speed up recovery from
 *        deep drawdowns.
 * 
 * 3. The Goal:
 *    - Continuously achieve new session profit peaks (High-Water Mark resets).
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit using outside bet limits
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;
    const baseUnit = minOutside;

    // 2. Initialize state on first spin
    if (state.highWaterMark === undefined) {
        state.highWaterMark = bankroll;
        state.currentBetPerDozen = baseUnit;
        state.lastBankroll = bankroll;
    }

    // 3. Evaluate previous spin if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        
        // A win occurs if the ball landed in Dozen 1 (1-12) or Dozen 2 (13-24)
        const isWin = (winningNum >= 1 && winningNum <= 24);

        if (bankroll >= state.highWaterMark) {
            // Reached or surpassed session peak profit -> Reset to base
            state.highWaterMark = bankroll;
            state.currentBetPerDozen = baseUnit;
        } else if (isWin) {
            // Won, but still in recovery -> Keep current bet to grind back to peak
            state.currentBetPerDozen = state.currentBetPerDozen;
        } else {
            // Loss -> Step up progression
            const tierThreshold = baseUnit * 10;
            const increment = (state.currentBetPerDozen >= tierThreshold) 
                ? (baseUnit * 2) 
                : baseUnit;
            
            state.currentBetPerDozen += increment;
        }
    }

    // 4. Update session high-water mark if current bankroll is higher
    if (bankroll > state.highWaterMark) {
        state.highWaterMark = bankroll;
    }
    state.lastBankroll = bankroll;

    // 5. Clamp bet per dozen to table limits
    let finalAmount = Math.max(state.currentBetPerDozen, minOutside);
    finalAmount = Math.min(finalAmount, maxBet);

    // Stop placing bets if insufficient bankroll to place both bets
    if (bankroll < finalAmount * 2) {
        finalAmount = Math.floor(bankroll / 2);
        if (finalAmount < minOutside) {
            return [];
        }
    }

    // 6. Return bets covering Dozen 1 (1-12) and Dozen 2 (13-24)
    return [
        { type: 'dozen', value: 1, amount: finalAmount },
        { type: 'dozen', value: 2, amount: finalAmount }
    ];
}