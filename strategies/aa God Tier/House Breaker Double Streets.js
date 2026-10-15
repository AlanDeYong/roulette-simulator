/**
 * Source: VIPER STRATEGIES (https://youtu.be/MvnZ9k7l7Lk)
 * The Logic: Places 4 Double Street (Six Line) bets to cover 24 numbers (approx 65% win probability). 
 *            This script defaults to the first four lines (numbers 1-24).
 * The Progression: Negative progression. Increases the bet unit size on all four lines after a loss. 
 *                  Resets to the base minimum unit after a win.
 * The Goal: Achieve a session profit of $50, or trigger a hard stop-loss at a drawdown of $150.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize Session State
    if (state.sessionStartBankroll === undefined) {
        state.sessionStartBankroll = bankroll;
        state.currentUnit = config.betLimits.min;
        state.lines = [1, 7, 13, 19]; // Defaulting to numbers 1-24
    }

    // 2. Check Profit / Stop-Loss Limits
    const sessionProfit = bankroll - state.sessionStartBankroll;
    
    if (sessionProfit >= 50) {
        // Target reached. Stop betting.
        return []; 
    }
    if (sessionProfit <= -150) {
        // Stop-loss triggered. Stop betting.
        return []; 
    }

    // 3. Process Progression Logic (if history exists)
    if (spinHistory.length > 0 && state.lastBetAmount) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        let wonLastSpin = false;

        // Check if the last number falls within our covered lines
        // Line '1' covers 1-6, '7' covers 7-12, '13' covers 13-18, '19' covers 19-24
        if (lastSpin !== 0 && lastSpin <= 24) {
            wonLastSpin = true;
        }

        if (wonLastSpin) {
            // Win: Reset to base unit
            state.currentUnit = config.betLimits.min;
        } else {
            // Loss: Implement negative progression increase
            const increment = config.incrementMode === 'base' ? config.betLimits.min : config.minIncrementalBet;
            state.currentUnit += increment;
        }
    }

    // 4. Calculate and Clamp Bet Amount
    let finalAmount = state.currentUnit;
    finalAmount = Math.max(finalAmount, config.betLimits.min);
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // Store for next spin reference
    state.lastBetAmount = finalAmount;

    // 5. Place Bets
    const bets = state.lines.map(startNum => ({
        type: 'line',
        value: startNum,
        amount: finalAmount
    }));

    return bets;
}