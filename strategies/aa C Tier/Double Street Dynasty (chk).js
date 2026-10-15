/**
 * Roulette Strategy: 8 Hot Double Streets Progression
 * Source: https://youtu.be/ve1GN9mrAB0 (Channel Name Unavailable without Web Access)
 * 
 * The Logic:
 * - The strategy places bets on 8 overlapping double streets (known as 'line' bets, covering 6 numbers each).
 * - From spin 1, it bets on any 8 default double streets.
 * - After a reset (session profit achieved) AND if at least 37 spins have passed, 
 *   it checks the last 37 spins to find the hottest 8 double streets and updates the bet positions.
 * 
 * The Progression:
 * - On a loss, or on a win where the session is not at profit, the bet size for all 8 lines 
 *   increases by their initial bet size (continuous addition, e.g., 1u, 2u, 3u...).
 * 
 * The Goal:
 * - Session profit: When the current bankroll exceeds the reference bankroll (bankroll at the start 
 *   or at the last reset), the strategy resets the progression back to 1 unit and recalculates hot numbers.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // Determine the base unit for inside bets
    const baseUnit = config.betLimits.min;
    
    // Array of all possible starting numbers for double streets (lines) on a standard board
    const allLineStarts = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31];

    // Helper function to find the hottest lines in the last 37 spins
    const getHottestLines = (history, count) => {
        const lineCounts = allLineStarts.map(startNum => ({ line: startNum, hits: 0 }));
        const recentSpins = history.slice(-37);
        
        for (const spin of recentSpins) {
            const num = spin.winningNumber;
            if (num > 0) { // 0 does not fall into any standard line bet
                for (let lc of lineCounts) {
                    if (num >= lc.line && num <= lc.line + 5) {
                        lc.hits++;
                    }
                }
            }
        }
        
        // Sort by most hits descending
        lineCounts.sort((a, b) => b.hits - a.hits);
        return lineCounts.slice(0, count).map(lc => lc.line);
    };

    // 1. Initialize State on first run
    if (!state.initialized) {
        state.initialized = true;
        state.referenceBankroll = bankroll;
        state.progression = 1;
        // Select first 8 overlapping double streets as defaults for the start
        state.selectedLines = allLineStarts.slice(0, 8); 
    }

    // 2. Evaluate previous spin and determine progression/reset
    if (spinHistory.length > 0) {
        if (bankroll > state.referenceBankroll) {
            // Session profit reached - Reset
            state.referenceBankroll = bankroll;
            state.progression = 1;
            
            // Recalculate hottest 8 double streets if we have 37+ spins of data
            if (spinHistory.length >= 37) {
                state.selectedLines = getHottestLines(spinHistory, 8);
            }
        } else {
            // Not at session profit (loss, or win that didn't clear the deficit) - Progress
            state.progression++;
        }
    }

    // 3. Calculate Bet Amount and Clamp to Limits
    let amount = baseUnit * state.progression;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 4. Construct and Return Bets
    let bets = [];
    for (let lineStart of state.selectedLines) {
        bets.push({ type: 'line', value: lineStart, amount: amount });
    }

    return bets;
}