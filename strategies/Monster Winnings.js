/**
 * Source: https://www.youtube.com/watch?v=HkVlqBTpnF0 (ROULETTE JACKPOT)
 * * The Logic: The strategy places 7 corner bets simultaneously. Each corner covers 4 numbers, 
 * meaning 28 out of 37 (or 38) numbers are covered, creating a high hit rate.
 * The chosen corners are randomized every spin to "switch up the flavor" and 
 * supposedly avoid pattern recognition.
 * * The Progression: "Laddering" (Negative Progression). 
 * - On a LOSS: The base bet unit increases to recoup the lost spread.
 * - On a WIN: The bet unit resets back to the table minimum.
 * * The Goal: A hit-and-run approach targeting a flat profit (e.g., $200). Betting halts 
 * entirely once this target is hit or if the bankroll cannot support the next spread.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on the first spin
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.currentUnit = config.betLimits.min; 
        state.lastBankroll = bankroll;
        state.targetProfit = 200; // As explicitly targeted in the video
        
        // Array of all valid top-left numbers that form a corner bet on the layout
        state.validCorners = [
            1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17, 
            19, 20, 22, 23, 25, 26, 28, 29, 31, 32
        ];
    }
    
    // 2. Goal & Bankroll Checks
    // Stop betting if we hit our target profit
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        return []; 
    }
    // Stop betting if we can't afford the 7-bet spread at the current unit
    if (bankroll < (state.currentUnit * 7)) {
        return [];
    }

    // 3. Process Progression Logic (Laddering)
    if (spinHistory.length > 0) {
        if (bankroll < state.lastBankroll) {
            // Net Loss: Ladder up
            let increment = config.incrementMode === 'base' ? config.betLimits.min : (config.minIncrementalBet || 1);
            state.currentUnit += increment;
        } else if (bankroll > state.lastBankroll) {
            // Net Win: Reset to base minimum
            state.currentUnit = config.betLimits.min;
        }
    }
    
    // Record current bankroll to compare on the next spin
    state.lastBankroll = bankroll;

    // 4. Calculate and Clamp Bet Amount
    let amount = state.currentUnit;
    amount = Math.max(amount, config.betLimits.min); // Ensure at least minimum
    amount = Math.min(amount, config.betLimits.max); // Ensure at most maximum

    // 5. Select 7 Random Corners
    // Shuffle the valid corners array to simulate the creator moving chips around
    let shuffled = [...state.validCorners].sort(() => 0.5 - Math.random());
    let selectedCorners = shuffled.slice(0, 7);

    // 6. Construct and Return Bets
    let bets = [];
    for (let corner of selectedCorners) {
        bets.push({
            type: 'corner',
            value: corner,
            amount: amount
        });
    }

    return bets;
}