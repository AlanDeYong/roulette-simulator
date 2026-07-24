/*
 * Strategy Name: Load the Profit
 * Source: CEG Dealer School (https://youtu.be/MLPZcxt_kGs)
 * 
 * The Full Logic in details:
 * This strategy is a 3-phase positive progression designed to build a profit stack and then play safely with "house money."
 * - Phase 1: Bet $10 (2 units) each on two Dozens (or Columns). Total risk is 4 units.
 * - Phase 2: If Phase 1 wins, you take the entire payout (6 units) and bet it all "back-to-back" on a single Dozen.
 * - Phase 3 (Conservative Branch): If Phase 2 wins, the 6 units become 18 units. You pull back your initial risk plus some profit (pocketing 6 units), and bet the remaining 12 units by placing 6 units each on two Dozens. 
 *   *Note: The video discusses an alternative "Desperate" branch for Phase 3 involving stacking inside corners/splits, but the Conservative two-dozen path is implemented here for consistent, systematic play.*
 * 
 * The Full Bet Progression in details:
 * - Win at Phase 1 -> Move to Phase 2 (Pressing profits onto one Dozen).
 * - Win at Phase 2 -> Move to Phase 3 (Spreading profits across two Dozens).
 * - Win at Phase 3 -> Repeat Phase 3 (Continuing to lock in 6 units of profit per win).
 * - Loss at ANY phase -> Reset immediately back to Phase 1.
 * 
 * The Goal:
 * Safely generate a large profit from a $200 buy-in by leveraging two consecutive wins. Once in Phase 3, the goal is to continuously grind out returns entirely on house money until the streak ends.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.minOutside;

    // 2. Initialize State
    if (!state.phase) {
        state.phase = 1;
        state.lastBets = [];
    }

    // 3. Process the last spin to update progression
    if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let won = false;
        
        // Ignore 0 and 00 (37 is often used for 00 in generic engines)
        if (lastNum !== 0 && lastNum !== 37) { 
            for (const b of state.lastBets) {
                if (b.type === 'dozen') {
                    if (b.value === 1 && lastNum >= 1 && lastNum <= 12) won = true;
                    if (b.value === 2 && lastNum >= 13 && lastNum <= 24) won = true;
                    if (b.value === 3 && lastNum >= 25 && lastNum <= 36) won = true;
                }
            }
        }

        // Update Phase based on win/loss
        if (won) {
            if (state.phase === 1) state.phase = 2;
            else if (state.phase === 2) state.phase = 3;
            else if (state.phase === 3) state.phase = 3; // Stay in Phase 3 profit loop
        } else {
            state.phase = 1; // Reset on any loss
        }
    }

    // 4. Calculate Bet Amounts
    let amount1, amount2;
    let currentBets = [];

    if (state.phase === 1) {
        // Phase 1: 2 units on two dozens
        amount1 = Math.min(Math.max(unit * 2, config.betLimits.minOutside), config.betLimits.max);
        amount2 = Math.min(Math.max(unit * 2, config.betLimits.minOutside), config.betLimits.max);
        
        currentBets = [
            { type: 'dozen', value: 1, amount: amount1 },
            { type: 'dozen', value: 2, amount: amount2 }
        ];
    } 
    else if (state.phase === 2) {
        // Phase 2: 6 units on one dozen
        amount1 = Math.min(Math.max(unit * 6, config.betLimits.minOutside), config.betLimits.max);
        
        currentBets = [
            { type: 'dozen', value: 1, amount: amount1 }
        ];
    } 
    else if (state.phase === 3) {
        // Phase 3: 6 units on two dozens
        amount1 = Math.min(Math.max(unit * 6, config.betLimits.minOutside), config.betLimits.max);
        amount2 = Math.min(Math.max(unit * 6, config.betLimits.minOutside), config.betLimits.max);
        
        currentBets = [
            { type: 'dozen', value: 1, amount: amount1 },
            { type: 'dozen', value: 2, amount: amount2 }
        ];
    }

    // 5. Save state for the next spin evaluation
    state.lastBets = currentBets;
    
    return currentBets;
}