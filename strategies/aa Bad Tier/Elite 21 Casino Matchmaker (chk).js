/**
 * Roulette Strategy: "The Elite 21" (Combination Strategy - Stack Progression)
 * * Source: https://youtu.be/s0HvPzUwB_M (Channel: WillVegas, originally by David Elliot / Scouse House Roulette)
 * * The Full Logic in details:
 * This strategy aims to cover numbers 1 through 21 completely, ensuring a profit if any of them hit.
 * It uses a mix of outside and inside bets to achieve a positive net payout for these 21 numbers.
 * The 15-unit base bet spread is constructed as follows:
 * - 3 units on 1-18 (Low)
 * - 5 units on 1st Dozen
 * - 2 units on Street 19-21
 * - 1 unit on 2nd Column
 * - 1 unit on 3rd Column
 * - 3 units on Line (Double Street) 13-18
 * * Conditions & Triggers:
 * - Win: Any number from 1 to 21 hits.
 * - Partial Loss: Any number from 23 to 36 (excluding 1st column numbers) hits. 
 * - Complete Loss: 0, 00, and 1st column numbers > 21 (22, 25, 28, 31, 34) hit. 
 * * The Full Bet Progression in details:
 * - The strategy uses a "History Stack" to track bet states.
 * - After a Win (1-21): If NOT at session peak profit, it strictly goes back exactly 1 level by restoring the previous bet state from the stack (undoing the last double or increment). If at peak profit, it clears history and resets to base.
 * - After a Partial Loss: rebet
 * - After a Complete Loss: Saves current state to history, then doubles all current bet amounts.
 * * The Goal:
 * Target profit is $50. The strategy stops betting when this profit is reached or bankroll is depleted.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Goal, Stop Loss & Peak Bankroll Evaluation
    if (!state.initialBankroll) {
        state.initialBankroll = bankroll;
        state.peakBankroll = bankroll;
        state.betHistory = []; // Stack to remember exact past bet amounts
    }

    // Check if we are currently at or above the peak bankroll BEFORE processing
    const isPeak = bankroll >= state.peakBankroll;
    
    // Update peak bankroll tracker
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    const targetProfit = 50000;
    if (bankroll - state.initialBankroll >= targetProfit) {
        return []; // Target reached
    }
    if (bankroll <= 0) {
        return []; // Bankroll depleted
    }

    // 2. Determine base unit & setup
    const unit = Math.max(config.betLimits.min, config.betLimits.minOutside);

    const baseBets = [
        { type: 'low', value: null, units: 3 },
        { type: 'dozen', value: 1, units: 5 },
        { type: 'column', value: 2, units: 1 },
        { type: 'column', value: 3, units: 1 },
        { type: 'line', value: 13, units: 3 },
        { type: 'street', value: 19, units: 2 }
    ];

    const getBaseBetState = () => baseBets.map(b => ({
        type: b.type,
        value: b.value,
        amount: b.units * unit
    }));

    const cloneBets = (bets) => bets.map(b => ({ ...b }));

    // 3. Initialize State
    if (!state.currentBets) {
        state.currentBets = getBaseBetState();
    }

    // 4. Process Last Spin & Apply Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        let resultType = 'win';
        if (num === '0' || num === '00' || num === 0) {
            resultType = 'completeLoss';
        } else {
            const n = Number(num);
            const completeLossNums = [22, 25, 28, 31, 34]; // 1st Column numbers > 21
            
            if (completeLossNums.includes(n)) {
                resultType = 'completeLoss';
            } else if (n > 21) {
                resultType = 'partialLoss'; // 2nd/3rd Column numbers > 21
            } else {
                resultType = 'win'; // Numbers 1 through 21
            }
        }

        // Apply Betting Rules based on Outcome
        if (resultType === 'win') {
            if (!isPeak && state.betHistory && state.betHistory.length > 0) {
                // Not at peak profit: go back EXACTLY 1 level by popping the stack
                state.currentBets = state.betHistory.pop();
            } else {
                // At peak profit (or stack empty): reset completely
                state.currentBets = getBaseBetState();
                state.betHistory = [];
            }
        } else if (resultType === 'partialLoss') {
            // Rebet: Do nothing, maintain current bet amounts
        } else if (resultType === 'completeLoss') {
            // Save current state BEFORE changing it
            if (!state.betHistory) state.betHistory = [];
            state.betHistory.push(cloneBets(state.currentBets));

            // Double the current bets
            state.currentBets = state.currentBets.map(bet => ({
                ...bet,
                amount: bet.amount * 2
            }));
        }
    }

    // 5. Clamp to Limits and Format Output
    const outsideTypes = ['red', 'black', 'even', 'odd', 'low', 'high', 'dozen', 'column'];
    
    return state.currentBets.map(bet => {
        const minAllowed = outsideTypes.includes(bet.type) ? config.betLimits.minOutside : config.betLimits.min;
        
        // Clamp Amount
        let finalAmount = Math.max(bet.amount, minAllowed);
        finalAmount = Math.min(finalAmount, config.betLimits.max);

        // Build output object
        const betObj = { type: bet.type, amount: finalAmount };
        if (bet.value !== null && bet.value !== undefined) {
            betObj.value = bet.value;
        }
        return betObj;
    });
}