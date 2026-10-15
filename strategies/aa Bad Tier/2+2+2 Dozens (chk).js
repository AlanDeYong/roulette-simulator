/**
 * Strategy Name: 2+2+2 Dozen Strategy
 * Source: https://youtu.be/sjciNccKFME (Channel: WillVegas)
 * * The Full Logic in details: 
 * - The strategy waits for the same dozen to hit twice in a row (e.g., Dozen 1, Dozen 1). 
 * - Green (0 or 00) is ignored during this tracking phase (e.g., Dozen 1, Green, Dozen 1 still triggers the bet).
 * - Once the trigger is met, bets are placed on the OTHER two dozens (e.g., Dozen 2 and Dozen 3).
 * - The bets remain on these two target dozens until a win occurs.
 * * The Full Bet Progression in details:
 * - The initial bet is 1 unit (base outside minimum) on each of the two target dozens.
 * - If the bet loses (the repeating dozen hits again, or green hits), the bet amount on EACH dozen is increased by 2 units.
 * - If the bet wins (one of the two target dozens hits), the progression resets, and the strategy goes back to waiting for the trigger.
 * * The Goal:
 * - Target profit is $50 (relative to a typical $500 starting bankroll).
 * - Stop-loss is the depletion of the bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.minOutside;

    // Helper to get dozen (1, 2, or 3) or 0 for green
    function getDozen(number) {
        if (number === 0 || number === '00') return 0;
        if (number >= 1 && number <= 12) return 1;
        if (number >= 13 && number <= 24) return 2;
        if (number >= 25 && number <= 36) return 3;
        return 0;
    }

    // Initialize State
    if (state.currentBetAmount === undefined) {
        state.currentBetAmount = baseUnit;
        state.targetDozens = null;
    }

    // Determine the 2-unit increment amount
    const incrementMode = config.incrementMode || 'fixed';
    const minInc = config.minIncrementalBet !== undefined ? config.minIncrementalBet : 1;
    const unitIncrement = incrementMode === 'base' ? baseUnit : minInc;
    const incrementAmount = unitIncrement * 2;

    // 1. Process the previous spin if we had active bets
    if (state.targetDozens !== null && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastDozen = getDozen(lastSpin.winningNumber);

        if (state.targetDozens.includes(lastDozen)) {
            // Won! Reset state to tracking mode
            state.targetDozens = null;
            state.currentBetAmount = baseUnit;
        } else {
            // Lost! Increase the bet by 2 units
            state.currentBetAmount += incrementAmount;
        }
    }

    // 2. Look for the trigger if we are not currently betting
    if (state.targetDozens === null && spinHistory.length >= 2) {
        let lastValidDozen = -1;
        let prevValidDozen = -1;
        
        // Traverse history backwards to find the last two valid dozens (ignoring 0/00)
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const doz = getDozen(spinHistory[i].winningNumber);
            if (doz !== 0) {
                if (lastValidDozen === -1) {
                    lastValidDozen = doz;
                } else if (prevValidDozen === -1) {
                    prevValidDozen = doz;
                    break; // Found the last two valid dozens
                }
            }
        }

        // Trigger: Two consecutive identical dozens
        if (lastValidDozen !== -1 && lastValidDozen === prevValidDozen) {
            // Set target dozens to the OTHER two dozens
            state.targetDozens = [1, 2, 3].filter(d => d !== lastValidDozen);
            state.currentBetAmount = baseUnit; 
        }
    }

    // 3. Place Bets if active
    if (state.targetDozens !== null) {
        // Clamp to limits
        let amount = Math.max(state.currentBetAmount, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);

        return [
            { type: 'dozen', value: state.targetDozens[0], amount: amount },
            { type: 'dozen', value: state.targetDozens[1], amount: amount }
        ];
    }

    // No active bets, wait for trigger
    return [];
}