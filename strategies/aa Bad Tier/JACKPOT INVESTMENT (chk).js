/**
 * ROULETTE STRATEGY: Jackpot Investment (Dual-Zone Expansion Variant) - BUG FIX
 * * The Logic: 
 * Concentrates 6 inside bets on either the 1st or 3rd Dozen. 
 * On a loss, it keeps the original bets AND adds an identical 
 * configuration to the 2nd Dozen (12 bets total).
 * * The Progression:
 * - Base: 1 unit on Start Dozen (1st or 3rd). 6 bets total.
 * - 1st Loss: Add pattern to 2nd Dozen. 12 bets total at 1 unit each.
 * - 2nd, 3rd, 4th Loss: Increase all 12 bets by 1 unit sequentially.
 * - 5th Loss onwards: Double all 12 bets.
 * - On Win: Clear the 2nd Dozen, reset to 1 unit, toggle the Start Dozen (1st <-> 3rd).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.min;

    // 1. Initialize State
    if (!state.initialized) {
        state.startDozen = 1;     // Toggles between 1 and 3 upon winning
        state.unitLevel = 1;
        state.lossCount = 0;
        state.lastBankroll = bankroll;
        state.initialized = true;
    }

    // 2. Process History & Execute Progression Logic
    if (spinHistory.length > 0) {
        // Net profit from the previous round
        const profit = bankroll - state.lastBankroll;

        if (profit > 0) {
            // WIN: Reset progression, alternate the starting point
            state.startDozen = state.startDozen === 1 ? 3 : 1;
            state.unitLevel = 1;
            state.lossCount = 0;
        } else if (profit < 0) {
            // LOSS: Advance progression
            state.lossCount++;

            if (state.lossCount === 1) {
                // 1st loss: Level remains 1, but we will now add the 2nd dozen below
                state.unitLevel = 1;
            } else if (state.lossCount >= 2 && state.lossCount <= 4) {
                // 2nd, 3rd, 4th loss: Increase by 1 unit
                let increment = config.incrementMode === 'fixed' ? config.minIncrementalBet : 1;
                state.unitLevel += increment;
            } else if (state.lossCount >= 5) {
                // 5th loss onwards: Double up
                state.unitLevel *= 2;
            }
        }
        // If profit === 0 (e.g., a push or exact break-even), state remains exactly the same.
    }

    // 3. Calculate Bet Amount & Clamp to Config Limits
    let amountPerBet = baseUnit * state.unitLevel;
    amountPerBet = Math.max(amountPerBet, config.betLimits.min);
    amountPerBet = Math.min(amountPerBet, config.betLimits.max);

    let bets = [];

    // 4. Helper Function to map the geometric pattern to any dozen
    const addPatternForDozen = (dozen) => {
        let offset = (dozen - 1) * 12;
        bets.push({ type: 'street', value: 4 + offset, amount: amountPerBet });
        bets.push({ type: 'street', value: 7 + offset, amount: amountPerBet });
        bets.push({ type: 'line', value: 4 + offset, amount: amountPerBet });
        bets.push({ type: 'split', value: [5 + offset, 8 + offset], amount: amountPerBet });
        bets.push({ type: 'split', value: [6 + offset, 9 + offset], amount: amountPerBet });
        bets.push({ type: 'corner', value: 5 + offset, amount: amountPerBet });
    };

    // 5. Build the Bet Array
    // Always place bets on our target outer dozen (1st or 3rd)
    addPatternForDozen(state.startDozen);

    // If we have suffered at least one loss in this sequence, add the 2nd Dozen
    if (state.lossCount > 0) {
        addPatternForDozen(2);
    }

    // 6. Bankroll Snapshot for Next Iteration
    // [BUG FIX]: Record the pre-bet bankroll to accurately track net win/loss
    state.lastBankroll = bankroll; 

    // Safety abort if table max is breached or bankroll is depleted
    const totalBetCost = bets.reduce((sum, bet) => sum + bet.amount, 0);
    if (totalBetCost > bankroll) return [];

    return bets;
}