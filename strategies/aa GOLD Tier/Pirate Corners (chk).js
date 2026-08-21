/**
 * Strategy: Pirate Corners
 * Source: Casino Matchmaker (YouTube: https://youtu.be/GfKxHD98vUs)
 * Creator: Street Parat
 *
 * The Full Logic in details:
 * This strategy pairs an Even Money bet with an insurance Line (Double Street) bet.
 * The ratio of the Even Money bet to the Line bet is always 5:1. This ensures that 
 * if the Line bet hits, its 5:1 payout perfectly covers the lost Even Money bet, 
 * resulting in a "Push".
 * - High Setup: Bet on High (19-36) + Line bet on 13 (covers 13-18).
 * - Low Setup: Bet on Low (1-18) + Line bet on 19 (covers 19-24).
 * Triggers:
 * - Win (Even Money hits): Stay on the same side.
 * - Push (Line bet hits): Stay on the same side. Treat as a dead spin.
 * - Loss (Neither hits): Toggle to the opposite side (High <-> Low).
 * * The Full Bet Progression in details:
 * Uses a modified Fibonacci sequence omitting the second '1': [1, 2, 3, 5, 8, 13, 21, 34...]
 * - Win: Move 1 step down the sequence (decrease bet).
 * - Push: Stay at the current sequence level.
 * - Loss: Move 1 step up the sequence (increase bet).
 * * The Goal:
 * Leverage the 18/13 win-to-loss ratio and insurance pushes to slowly grind 
 * out a profit through the up-and-down Fibonacci progression until bankroll depletion.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.fibSequence) {
        state.fibSequence = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584];
        state.progressionIndex = 0;
        state.side = 'high'; // Initial setup
    }

    // 2. Evaluate Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        let outcome = 'loss'; // Default fallback

        if (state.side === 'high') {
            if (num >= 19 && num <= 36) outcome = 'win';
            else if (num >= 13 && num <= 18) outcome = 'push';
        } else {
            if (num >= 1 && num <= 18) outcome = 'win';
            else if (num >= 19 && num <= 24) outcome = 'push';
        }

        // Apply progression and triggers based on the outcome
        if (outcome === 'win') {
            state.progressionIndex = Math.max(0, state.progressionIndex - 1);
        } else if (outcome === 'loss') {
            state.progressionIndex++;
            // Toggle sides strictly on a loss
            state.side = state.side === 'high' ? 'low' : 'high';
        }
        // If push, progressionIndex and side remain exactly the same
    }

    // Safety constraint: Cap progression to avoid out-of-bounds array access
    if (state.progressionIndex >= state.fibSequence.length) {
        state.progressionIndex = state.fibSequence.length - 1;
    }

    // 3. Calculate Bet Amounts
    const fibMultiplier = state.fibSequence[state.progressionIndex];
    
    // Determine base unit sizes to maintain the strict 5:1 ratio
    let insideUnit = config.betLimits.min;
    
    // Ensure the resulting outside unit respects the table's minimum outside limit
    if (insideUnit * 5 < config.betLimits.minOutside) {
        insideUnit = Math.ceil(config.betLimits.minOutside / 5);
    }

    let insideAmount = insideUnit * fibMultiplier;
    let outsideAmount = (insideUnit * 5) * fibMultiplier;

    // 4. Clamp to Limits
    if (outsideAmount > config.betLimits.max) {
        outsideAmount = config.betLimits.max;
        // Adjust inside amount down proportionally to maintain the 5:1 insurance ratio
        insideAmount = Math.floor(outsideAmount / 5); 
    }
    
    if (insideAmount > config.betLimits.max) {
        insideAmount = config.betLimits.max;
    }

    // 5. Check Bankroll limits before placing the bet
    const totalBet = outsideAmount + insideAmount;
    if (bankroll < totalBet) {
        return []; // Stop betting if the next sequence step exceeds the available bankroll
    }

    // 6. Return Bet Array
    const bets = [];
    if (state.side === 'high') {
        bets.push({ type: 'high', amount: outsideAmount });
        bets.push({ type: 'line', value: 13, amount: insideAmount });
    } else {
        bets.push({ type: 'low', amount: outsideAmount });
        bets.push({ type: 'line', value: 19, amount: insideAmount });
    }

    return bets;
}