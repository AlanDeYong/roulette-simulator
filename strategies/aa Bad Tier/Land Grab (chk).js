/**
 * STRATEGY: Modified "Land Grab" (Adaptive Start)
 * * Source: 
 * - Channel: The Lucky Felt (Todd Hoover)
 * - URL: https://www.youtube.com/watch?v=lA9JGlGJJ5s
 * * Logic:
 * 1. The strategy uses "Line" (Double Street) bets, each covering 6 numbers.
 * 2. Adaptive Start & Reset: Observes the last winning number. If the win is High (19-36), 
 * it starts betting on the opposite end (Low: lines 1, 7, 13). If the win is Low (1-18), 
 * it starts on the High end (lines 19, 25, 31). This happens at session start and upon resetting.
 * 3. Expansion: 
 * - At 3 double streets covered: Requires 2 consecutive wins to add a 4th double street.
 * - At 4 double streets covered: Requires 1 consecutive win to add the 5th double street.
 * 4. The "2-Life" Rule (Losses):
 * - To move UP in bet size: You must lose TWICE in a row.
 * * Progression:
 * - If 2 consecutive losses occur: Increase the unit size for all current lines (Step-up voltage).
 * - After expanding to 5 double streets and achieving a win, the sequence resets. The unit 
 * size returns to base, and the new starting side is determined by the last winning number.
 * * Goal:
 * - Target Profit: 20% of the starting bankroll.
 * - Stop Loss: Standard bankroll depletion.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. Initialize State ---
    if (!state.initialized) {
        state.startingBankroll = bankroll;
        state.targetProfit = bankroll * 0.20;
        state.unitSize = config.betLimits.min;
        state.lineCount = 3; 
        state.consecutiveWins = 0;
        state.consecutiveLosses = 0;
        
        // Define pools to easily draw lines from depending on the starting side
        state.poolLow = [1, 7, 13, 19, 25, 31];
        state.poolHigh = [19, 25, 31, 1, 7, 13];
        state.currentPool = [];
        state.activeLines = [];
        
        state.setupRequired = true; // Flag to determine starting side on the first observed spin
        state.initialized = true;
    }

    // --- 2. Check Profit Goal ---
    const currentProfit = bankroll - state.startingBankroll;
    if (currentProfit >= state.targetProfit) {
        // Reset to base if goal reached
        state.unitSize = config.betLimits.min;
        state.setupRequired = true; // Force re-evaluating the opposite side
        state.consecutiveWins = 0;
        state.consecutiveLosses = 0;
    }

    // If there's no history, we must wait for 1 spin to determine the "last win"
    if (spinHistory.length === 0) {
        return [];
    }

    // --- 3. Analyze Last Result (The 2-Life & Adaptive Logic) ---
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNumber = lastSpin.winningNumber;

    // Handle Setup / Reset Initializer
    if (state.setupRequired) {
        // "if the last win is from the 19/36 range, start betting from the opposite end and vice versa"
        if (lastNumber >= 19) {
            state.currentPool = state.poolLow;
        } else {
            state.currentPool = state.poolHigh;
        }
        state.activeLines = state.currentPool.slice(0, 3);
        state.lineCount = 3;
        state.setupRequired = false;
        
    } else {
        // Normal gameplay phase
        // Determine if the last spin was a win (number was inside one of our active lines)
        let wonLastSpin = false;
        for (let lineStart of state.activeLines) {
            if (lastNumber >= lineStart && lastNumber <= lineStart + 5) {
                wonLastSpin = true;
                break;
            }
        }

        if (wonLastSpin) {
            state.consecutiveWins++;
            state.consecutiveLosses = 0;

            // Apply Expansion and Reset Rules
            if (state.lineCount === 3 && state.consecutiveWins >= 2) {
                // "when 3 double streets are covered need to get 2 consecutive wins before adding"
                state.activeLines.push(state.currentPool[3]);
                state.lineCount = 4;
                state.consecutiveWins = 0;
            } 
            else if (state.lineCount === 4 && state.consecutiveWins >= 1) {
                // "after that expand after each consecutive win until 5 double streets are covered"
                state.activeLines.push(state.currentPool[4]);
                state.lineCount = 5;
                state.consecutiveWins = 0;
            } 
            else if (state.lineCount === 5 && state.consecutiveWins >= 1) {
                // We won with 5 lines covered. Trigger a full reset.
                state.unitSize = config.betLimits.min;
                state.consecutiveWins = 0;
                
                // "when resetting if the last win is from the 19/36 range, start betting from the opposite end"
                if (lastNumber >= 19) {
                    state.currentPool = state.poolLow;
                } else {
                    state.currentPool = state.poolHigh;
                }
                state.activeLines = state.currentPool.slice(0, 3);
                state.lineCount = 3;
            }
        } else {
            state.consecutiveLosses++;
            state.consecutiveWins = 0;

            // LOSS RULE: Increase bet size (Step up voltage) after 2 consecutive losses
            if (state.consecutiveLosses >= 2) {
                const increment = config.incrementMode === 'base' ? config.betLimits.min : config.minIncrementalBet;
                state.unitSize += increment;
                state.consecutiveLosses = 0; // Reset counter after stepping up
            }
        }
    }

    // --- 4. Construct Bets ---
    let bets = [];
    
    // Safety check for unit size limits
    let finalUnitAmount = Math.max(state.unitSize, config.betLimits.min);
    finalUnitAmount = Math.min(finalUnitAmount, config.betLimits.max);

    // Create a bet for each active line
    for (let lineStart of state.activeLines) {
        bets.push({
            type: 'line',
            value: lineStart,
            amount: finalUnitAmount
        });
    }

    // --- 5. Bankroll Safety ---
    const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBetAmount > bankroll) {
        return null; // Stop if we can't afford the strategy at the current level
    }

    return bets;
}