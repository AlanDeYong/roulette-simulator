/**
 * Strategy: Reptar's Best (Follow the Leader Batch Progression)
 * Source: Roulette Strategy Lab (https://www.youtube.com/watch?v=lCO3cXj4zr4)
 * * The Logic: 
 * - "Follow the Leader": Always bet on the color (Red or Black) that hit on the previous spin.
 * - If the previous spin was Green (0 or 00), remain on the color you were previously betting.
 * - On the very first spin of the session (no history), default to Black.
 * * The Progression:
 * - Operates in batches of 3 spins.
 * - After 3 spins, evaluate the results of that batch:
 * - 3 Wins: Maintain current bet unit.
 * - 2 Wins / 1 Loss: Maintain current bet unit.
 * - 1 Win / 2 Losses: Increase bet by 1 unit.
 * - 0 Wins / 3 Losses: Increase bet by 2 units.
 * * The Goal:
 * - Session Profit Reset: If at any point the current bankroll exceeds the peak 
 * bankroll (putting the session in profit), immediately reset the bet size to 
 * 1 unit and restart the 3-spin batch counter.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (!state.initialized) {
        state.initialized = true;
        state.baseUnit = config.betLimits.minOutside;
        state.currentUnits = 1;
        state.targetColor = 'black'; // Default starting color
        state.lastBetColor = null;   // Track what we actually bet last spin
        
        // Batch tracking
        state.spinCount = 0;
        state.batchWins = 0;
        state.batchLosses = 0;
        
        // Profit tracking
        state.peakBankroll = bankroll; 
    }

    // 2. Evaluate previous spin (if history exists and we placed a bet)
    if (spinHistory.length > 0 && state.lastBetColor) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Check if our last bet won or lost
        if (lastSpin.winningColor === state.lastBetColor) {
            state.batchWins++;
        } else {
            state.batchLosses++;
        }
        state.spinCount++;

        // Update target color based on "Follow the Leader"
        // Ignore green so we don't accidentally try to bet on 'green'
        if (lastSpin.winningColor === 'red' || lastSpin.winningColor === 'black') {
            state.targetColor = lastSpin.winningColor;
        }
    }

    // 3. Check for Session Profit (Reset Condition)
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll; // Update high-water mark
        state.currentUnits = 1;        // Reset to base bet
        state.spinCount = 0;           // Reset batch
        state.batchWins = 0;
        state.batchLosses = 0;
    }

    // 4. Batch Evaluation (Progression Condition)
    if (state.spinCount === 3) {
        if (state.batchWins === 1 && state.batchLosses === 2) {
            state.currentUnits += 1;
        } else if (state.batchWins === 0 && state.batchLosses === 3) {
            state.currentUnits += 2;
        }
        // If 3W or 2W1L, units remain the same.
        
        // Reset batch counters for the next 3 spins
        state.spinCount = 0;
        state.batchWins = 0;
        state.batchLosses = 0;
    }

    // 5. Calculate and Clamp Bet Amount
    let amount = state.currentUnits * state.baseUnit;
    amount = Math.max(amount, config.betLimits.minOutside); // Ensure minimum
    amount = Math.min(amount, config.betLimits.max);        // Ensure maximum

    // 6. Record what we are about to bet for the next evaluation
    state.lastBetColor = state.targetColor;

    // 7. Return the bet
    return [{ type: state.targetColor, amount: amount }];
}