/**
 * Source: http://youtube.com/watch?v=O-h-hFK3Cos&list=WL&index=3
 * Logic: Reverse Martingale (Paroli) targeting Red.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const betType = 'red';
    const baseUnit = config.betLimits.minOutside;

    // Initialize state
    if (state.currentBetAmount === undefined) {
        state.currentBetAmount = baseUnit;
        state.winStreak = 0;
        state.lastBetResult = null;
    }

    // Process last spin result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const previousBet = state.lastBet;
        
        if (previousBet) {
            let wonPreviousBet = false;
            if (previousBet.type === 'red' && lastSpin.winningColor === 'red') {
                wonPreviousBet = true;
            } else if (previousBet.type === 'black' && lastSpin.winningColor === 'black') {
                wonPreviousBet = true;
            } else if (lastSpin.winningColor === 'green') {
                wonPreviousBet = false;
            } else {
                wonPreviousBet = (previousBet.type === lastSpin.winningColor);
            }

            if (wonPreviousBet) {
                state.winStreak++;
                state.lastBetResult = 'win';
            } else {
                state.winStreak = 0;
                state.lastBetResult = 'loss';
            }
        }
    }

    // Progression Logic
    if (state.lastBetResult === 'win') {
        if (state.winStreak >= 3) { 
            // Bank profits after 3 wins
            state.currentBetAmount = baseUnit;
            state.winStreak = 0;
        } else {
            // Aggressive double-up
            state.currentBetAmount *= 2;
        }
    } else if (state.lastBetResult === 'loss') {
        state.currentBetAmount = baseUnit;
    }

    // Safety Clamping
    let finalBetAmount = Math.max(state.currentBetAmount, baseUnit);
    finalBetAmount = Math.min(finalBetAmount, config.betLimits.max);

    // Save state for next iteration
    state.lastBet = { type: betType, amount: finalBetAmount };

    // Bankroll Check
    if (finalBetAmount > bankroll) finalBetAmount = bankroll;
    if (finalBetAmount < baseUnit) return [];
    
    return [{ type: betType, amount: finalBetAmount }];
}