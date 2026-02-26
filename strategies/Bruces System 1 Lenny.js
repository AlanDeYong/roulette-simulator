/**
 * SOURCE: The Roulette Master (YouTube) - https://www.youtube.com/watch?v=rJr_fPyxQQE
 * * THE LOGIC: 
 * This strategy cycles through a specific sequence of outside even-money bets, 
 * moving left-to-right across the betting layout: 1-18 (Low) -> Even -> Red -> Black.
 * * THE PROGRESSION:
 * - On a Loss: Increase the bet size by 1 unit AND move 1 step to the right in the sequence.
 * (e.g., If you lose 1 unit on Low, you bet 2 units on Even next).
 * - On a Win: Decrease the bet size by 1 unit AND move 1 step to the left in the sequence. 
 * (e.g., If you win 2 units on Even, you bet 1 unit on Low next).
 * - Boundaries: If you win at the start of the sequence (Low at 1 unit), you simply re-bet. 
 * If you lose at the end of the sequence (Black), you stay on Black but continue to increase the bet.
 * * THE GOAL: 
 * To grind out a profit by capitalizing on short-term variance, systematically working 
 * the bets back to the left side of the sequence to lock in gains. No hard stop-loss is defined.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Define the progression sequence
    const sequence = ['low', 'even', 'red', 'black'];

    // 1. Initialize State on first run
    if (typeof state.sequenceIndex === 'undefined') {
        state.sequenceIndex = 0; // Starts at 'low'
        state.currentUnits = 1;  // Starts at 1 unit
        state.lastBetType = null;
    }

    // 2. Evaluate previous spin if history exists
    if (spinHistory.length > 0 && state.lastBetType) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const color = lastSpin.winningColor;
        
        let wonLastSpin = false;

        // 0 or 00 is an automatic loss for these outside bets
        if (num !== 0) {
            switch (state.lastBetType) {
                case 'low':
                    wonLastSpin = (num >= 1 && num <= 18);
                    break;
                case 'even':
                    wonLastSpin = (num % 2 === 0);
                    break;
                case 'red':
                    wonLastSpin = (color === 'red');
                    break;
                case 'black':
                    wonLastSpin = (color === 'black');
                    break;
            }
        }

        // 3. Adjust Progression based on Win/Loss
        if (wonLastSpin) {
            // Win: Move Left, Decrease Units
            state.sequenceIndex = Math.max(0, state.sequenceIndex - 1);
            state.currentUnits = Math.max(1, state.currentUnits - 1);
        } else {
            // Loss: Move Right, Increase Units
            state.sequenceIndex = Math.min(sequence.length - 1, state.sequenceIndex + 1);
            state.currentUnits += 1;
        }
    }

    // 4. Calculate Bet Amount
    const baseUnit = config.betLimits.minOutside;
    const increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);
    
    // Formula: Base unit + (Current units minus 1) * Increment size
    let amount = baseUnit + ((state.currentUnits - 1) * increment);

    // 5. Clamp to Limits
    amount = Math.max(amount, config.betLimits.minOutside); 
    amount = Math.min(amount, config.betLimits.max);

    // Stop betting if bankroll cannot cover the minimum required bet
    if (bankroll < amount) {
        return []; 
    }

    // 6. Set the bet type for this spin and save to state for the next evaluation
    const betToPlace = sequence[state.sequenceIndex];
    state.lastBetType = betToPlace;

    return [{ type: betToPlace, amount: amount }];
}