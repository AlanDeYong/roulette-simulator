/**
 * Source: CEG Dealer School - https://www.youtube.com/watch?v=pBbRowmnurk
 * * The Logic:
 * This strategy, called "Padovan Boulevard", targets Double Streets (six lines).
 * It starts at the top of the board (31-36) and moves down to the next double street 
 * (25-30, 19-24, 13-18, 7-12, 1-6) only AFTER securing a win on the current one. 
 * * The Progression:
 * Uses the Padovan sequence to determine the bet multiplier after a loss:
 * P(n) = P(n-2) + P(n-3).
 * The sequence of multipliers is: 1, 1, 1, 2, 2, 3, 4, 5, 7, 9, 12, 16, 21, 28, 37...
 * - On a Loss: Advance to the next step in the Padovan sequence to calculate the multiplier.
 * - On a Win: Reset the sequence to the first step (1 unit), and move the target 
 * to the next double street down the board.
 * * The Goal:
 * To successfully hit all 6 double streets sequentially. Once the final street (1-6) 
 * is hit, the strategy resets to the top (31-36). 
 * Note: The video mentions an optional "bonus round" of chasing 0/00 after finishing 
 * the sequence, but the hosts heavily advise against it due to rapid table-limit caps. 
 * Therefore, this code omits the bonus round to preserve bankroll and realistic simulation.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.targetStreetIndex = 0; // Index for tracking which double street we are on (0 to 5)
        state.progressionIndex = 0;  // Index for tracking our step in the Padovan sequence
        
        // Starting values for the 6 double streets in descending order (31-36 down to 1-6)
        state.streets = [31, 25, 19, 13, 7, 1]; 
        
        // Pre-calculated Padovan sequence up to 25 steps
        state.padovan = [1, 1, 1, 2, 2, 3, 4, 5, 7, 9, 12, 16, 21, 28, 37, 49, 65, 86, 114, 151, 200, 265, 351, 465, 616];
        state.initialized = true;
    }

    // 2. Process Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Parse the winning number (handles '00' as 0 mathematically, which correctly fails line bet checks)
        const lastWinningNumber = parseInt(lastSpin.winningNumber, 10);
        const targetLineStart = state.streets[state.targetStreetIndex];

        // Check if last spin was a win for our targeted double street
        // A 'line' bet covers the starting number and the next 5 consecutive numbers
        let isWin = false;
        if (!isNaN(lastWinningNumber) && lastWinningNumber >= targetLineStart && lastWinningNumber <= targetLineStart + 5) {
            isWin = true;
        }

        if (isWin) {
            // Win: Reset betting progression, advance to the next street
            state.progressionIndex = 0;
            state.targetStreetIndex++;

            // If we completed all 6 streets, reset back to the top of the board
            if (state.targetStreetIndex >= state.streets.length) {
                state.targetStreetIndex = 0;
            }
        } else {
            // Loss: Advance progression sequence
            state.progressionIndex++;

            // Failsafe: dynamically generate the next Padovan number if we hit a brutal losing streak 
            // that exceeds our pre-calculated array.
            if (state.progressionIndex >= state.padovan.length) {
                const n = state.progressionIndex;
                const pN = state.padovan[n - 2] + state.padovan[n - 3];
                state.padovan.push(pN);
            }
        }
    }

    // 3. Calculate Bet Amount
    // The video plays this as a $10 base unit (by doubling a $5 system). 
    // We default to 10, or the table minimum if the table minimum is higher.
    const baseUnit = Math.max(10, config.betLimits.min);
    
    let multiplier = state.padovan[state.progressionIndex];
    let amount = baseUnit * multiplier;

    // 4. Clamp to Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Place Bet
    return [{
        type: 'line', // 'line' is the Double Street bet
        value: state.streets[state.targetStreetIndex],
        amount: amount
    }];
}