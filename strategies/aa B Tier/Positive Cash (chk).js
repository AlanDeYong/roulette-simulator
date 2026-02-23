/**
 * Positive Cash Roulette Strategy
 * * Source: "The ONLY Roulette Strategy That Refuses to LOSE" by The Roulette Master 
 * URL: http://www.youtube.com/watch?v=Xc4xgaddw1A
 * * The Logic: 
 * The system bets straight-up on 24 individual numbers (representing two dozens). 
 * The two dozens chosen are the ones that did NOT include the last winning number.
 * * The Progression:
 * - On a LOSS: Do absolutely nothing. The bet size and covered numbers remain exactly the same.
 * - On a WIN: Remove the specific number that just won from the betting layout. Then, increase 
 * the wager on ALL remaining covered numbers by 1 base unit.
 * * The Goal (Reset Conditions):
 * The cycle resets back to the base layout (24 numbers at 1 unit each) when either:
 * 1. The current cycle achieves a profit of at least 25 base units.
 * 2. The amount of actively covered numbers drops to 12.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;
    const profitTarget = 25 * unit;
    const lastSpin = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1] : null;

    // 1. Initialize overall state if first run
    if (!state.initialized) {
        state.initialized = true;
        state.activeBets = null; // null indicates a reset is needed
    }

    // 2. Process previous spin result if we have active bets
    if (lastSpin && state.activeBets) {
        const winNum = lastSpin.winningNumber;
        
        // Did we win?
        if (state.activeBets.hasOwnProperty(winNum)) {
            // Remove the winning number from layout
            delete state.activeBets[winNum];
            
            // Increase all remaining numbers by 1 unit
            for (let num in state.activeBets) {
                state.activeBets[num] += unit;
            }
        } 
        // On loss: do nothing, bets stay exactly the same.

        // 3. Check Reset Conditions
        const currentProfit = bankroll - state.sessionStartBankroll;
        const numbersCovered = Object.keys(state.activeBets).length;

        if (currentProfit >= profitTarget || numbersCovered <= 12) {
            state.activeBets = null; // Trigger a reset for the next phase
        }
    }

    // 4. Initialize a new cycle if needed (First spin or after a reset)
    if (!state.activeBets) {
        state.sessionStartBankroll = bankroll;
        state.activeBets = {};

        // Determine which dozen to avoid based on the last spin
        let dozenToAvoid = 1; // Default starting position
        
        if (lastSpin) {
            const num = lastSpin.winningNumber;
            if (num >= 1 && num <= 12) dozenToAvoid = 1;
            else if (num >= 13 && num <= 24) dozenToAvoid = 2;
            else if (num >= 25 && num <= 36) dozenToAvoid = 3;
            // If 0 or 00, it keeps the default (avoid 1)
        }

        // Figure out which two dozens to cover
        let dozensToCover = [];
        if (dozenToAvoid === 1) dozensToCover = [2, 3];
        else if (dozenToAvoid === 2) dozensToCover = [1, 3];
        else if (dozenToAvoid === 3) dozensToCover = [1, 2];

        // Populate the 24 individual numbers at 1 base unit each
        dozensToCover.forEach(dozen => {
            let startNum = (dozen - 1) * 12 + 1;
            let endNum = dozen * 12;
            for (let i = startNum; i <= endNum; i++) {
                state.activeBets[i] = unit;
            }
        });
    }

    // 5. Format and clamp bets for the simulator output
    let currentBets = [];
    
    for (let numStr in state.activeBets) {
        let amount = state.activeBets[numStr];
        
        // Clamp to maximum table limits (minimum is inherently met as we start at min and only add)
        amount = Math.min(amount, config.betLimits.max);
        
        currentBets.push({
            type: 'number',
            value: parseInt(numStr, 10),
            amount: amount
        });
    }

    return currentBets;
}