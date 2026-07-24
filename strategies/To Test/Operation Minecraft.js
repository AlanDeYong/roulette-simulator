/**
 * STRATEGY: Operation Minecraft
 * SOURCE: https://www.youtube.com/watch?v=XconGGznAlM (The Roulette Master)
 * * THE LOGIC: 
 * Begins with high table coverage (24 specific numbers: all of the 2nd dozen, plus 
 * specific "triangle" patterns in the 1st and 3rd dozens, and 0/00).
 * * THE PROGRESSION:
 * - On a LOSS: Bets stay exactly the same. No numbers are removed.
 * - On a WIN: The winning number is removed from the layout. The bet amount on all 
 * remaining active numbers increases by 1 unit (or based on increment config).
 * * THE GOAL / RESET CONDITIONS:
 * 1. Session Profit: If the current bankroll exceeds the starting bankroll for the cycle, 
 * the entire strategy hard-resets back to the original 24 numbers at the minimum bet.
 * 2. Survival Reset: If the layout dwindles to 15 active numbers and the session is NOT 
 * in profit, the layout resets to the full 24 numbers, but the starting base bet 
 * is increased to aid in aggressive recovery.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define the Initial 24-Number Layout
    // Matches the 2nd dozen entirely, plus selected numbers in 1st/3rd dozens and 0.
    const INITIAL_LAYOUT = [
        0, 2, 3, 4, 5, 6, // 0 and 1st Dozen "Triangles"
        13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, // Entire 2nd Dozen
        31, 32, 33, 35, 36 // 3rd Dozen "Triangles"
    ];

    // 2. Initialize State on First Spin
    if (!state.initialized) {
        state.initialized = true;
        state.activeNumbers = [...INITIAL_LAYOUT];
        state.sessionStartingBankroll = bankroll;
        state.baseBetAmount = config.betLimits.min;
        state.currentBetAmount = state.baseBetAmount;
    }

    // 3. Process the Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        // Check for Hard Reset: Have we achieved session profit?
        if (bankroll > state.sessionStartingBankroll) {
            state.activeNumbers = [...INITIAL_LAYOUT];
            state.sessionStartingBankroll = bankroll; // Update high-water mark
            state.baseBetAmount = config.betLimits.min;
            state.currentBetAmount = state.baseBetAmount;
        } 
        else {
            // Evaluate Win/Loss logic
            const wonLastSpin = state.activeNumbers.includes(lastNumber);

            if (wonLastSpin) {
                // Remove the winning number from active array
                state.activeNumbers = state.activeNumbers.filter(num => num !== lastNumber);

                // Calculate increment based on config
                let increment = config.incrementMode === 'base' 
                    ? state.baseBetAmount 
                    : (config.minIncrementalBet || 1);

                // Increase bet on remaining numbers
                state.currentBetAmount += increment;

                // Check Survival Reset: Dropped to 15 numbers without profit
                if (state.activeNumbers.length <= 15) {
                    state.activeNumbers = [...INITIAL_LAYOUT];
                    state.baseBetAmount += increment; // Step up the base recovery bet
                    state.currentBetAmount = state.baseBetAmount;
                }
            }
            // On a loss, we do absolutely nothing. State persists exactly as is.
        }
    }

    // 4. Construct and Clamp Bets
    // Ensure the calculated bet is within the casino table limits
    let finalAmount = state.currentBetAmount;
    finalAmount = Math.max(finalAmount, config.betLimits.min);
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // Generate the array of bet objects for the simulator
    const currentBets = state.activeNumbers.map(num => {
        return {
            type: 'number',
            value: num,
            amount: finalAmount
        };
    });

    return currentBets;
}