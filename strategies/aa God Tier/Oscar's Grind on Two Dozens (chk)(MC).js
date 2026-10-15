/**
 * Roulette Strategy: Oscar's Grind on Two Dozens
 *
 * Source: https://youtu.be/DlcBzektxE4 (Casino Matchmaker)
 *
 * The Full Logic in details:
 * The strategy combines the Oscar's Grind betting system with a "Two Dozens" coverage 
 * (specifically betting on the 1st and 3rd dozens). Covering two dozens gives 24 winning 
 * numbers and 13 losing numbers (on a European wheel), meaning the player is a favorite 
 * to win any given spin (almost 2/3 win rate). The system breaks play into "cycles".
 *
 * The Full Bet Progression in details:
 * 1. Initial Bet: 1 base unit is placed on the 1st dozen, and 1 base unit on the 3rd dozen.
 * 2. On a Loss: The bet size does NOT increase. The exact same bet amount is repeated.
 * 3. On a Win: The bet size is increased by 1 unit (or configured increment). 
 * 4. Capping: The bet size is capped so that a win will yield exactly the target profit 
 * for the cycle. You never risk more than necessary to close out the cycle.
 * 5. Reset: Once the net profit for the current cycle reaches +1 base unit, the cycle 
 * is closed, and bets reset to the initial base unit.
 *
 * The Goal:
 * The target is a steady, conservative profit of 1 base unit per cycle (e.g., $10). 
 * By not increasing bets on a loss, it prevents rapid bankroll destruction during a 
 * losing streak, instead waiting for a cluster of wins to slowly grind back to profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.minOutside;

    // 2. Initialize State
    if (state.cycleProfit === undefined) {
        state.cycleProfit = 0;
        state.currentBetUnit = unit;
        state.targetProfit = unit;
    }

    // 3. Process previous spin result
    if (state.lastBets && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        let winAmount = 0;
        let betAmountTotal = 0;
        let won = false;

        state.lastBets.forEach(b => {
            betAmountTotal += b.amount;
            if (b.type === 'dozen') {
                if (b.value === 1 && num >= 1 && num <= 12) { winAmount += b.amount * 3; won = true; }
                if (b.value === 2 && num >= 13 && num <= 24) { winAmount += b.amount * 3; won = true; }
                if (b.value === 3 && num >= 25 && num <= 36) { winAmount += b.amount * 3; won = true; }
            }
        });

        const netProfit = winAmount - betAmountTotal;
        state.cycleProfit += netProfit;

        if (state.cycleProfit >= state.targetProfit) {
            // Cycle complete, reset to base
            state.cycleProfit = 0;
            state.currentBetUnit = unit;
        } else {
            // Cycle continues
            if (won) {
                // Increase bet on win (SAFELY HANDLE MISSING CONFIG VARIABLES)
                const isFixed = config.incrementMode === 'fixed';
                const validMinInc = typeof config.minIncrementalBet === 'number' && !isNaN(config.minIncrementalBet);
                const increment = (isFixed && validMinInc) ? config.minIncrementalBet : unit;
                
                state.currentBetUnit += increment;
            }

            // Cap the bet so we don't overshoot the cycle target
            // Net profit on a single spin win for 2 dozens = currentBetUnit.
            const requiredBet = state.targetProfit - state.cycleProfit;
            if (state.currentBetUnit > requiredBet) {
                state.currentBetUnit = requiredBet;
            }
        }
    }

    // 4. Calculate Bet Amount and Clamp to Limits
    let amount = state.currentBetUnit;
    
    // Final safety check against NaN creeping in
    if (isNaN(amount) || amount <= 0) {
        amount = unit; 
    }

    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);
    
    // Save bounded amount to state just in case
    state.currentBetUnit = amount;

    // 5. Place Bets on 1st and 3rd Dozens
    const bets = [
        { type: 'dozen', value: 1, amount: amount },
        { type: 'dozen', value: 3, amount: amount }
    ];

    state.lastBets = bets;

    return bets;
}