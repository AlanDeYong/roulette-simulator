/**
 * STRATEGY: High Beam Low Beam System
 * SOURCE: Roulette Man (Charles Blackley)
 * VIDEO: https://www.youtube.com/watch?v=Cquo7y6Na7o
 *
 * LOGIC:
 * The strategy alternates between two specific betting positions based on winning streaks.
 * - Position A ("Edges"): Covers the top and bottom Double Streets (Lines 1-6 and 31-36).
 * - Higher risk, higher reward (covers 12 numbers).
 * - Position B ("Center"): Covers the middle four Double Streets (Lines 7-12, 13-18, 19-24, 25-30).
 * - Lower risk, lower reward (covers 24 numbers).
 *
 * TRIGGER:
 * - Start on Position A.
 * - Switch positions ONLY after achieving 2 consecutive wins on the current position.
 *
 * PROGRESSION (Negative Progression):
 * - On Loss: Increase the bet amount by 1 unit per bet.
 * - On Win (1st): Maintain the current bet amount.
 * - On Win (2nd Consecutive): Reset bet amount to 1 unit and SWITCH positions.
 *
 * GOAL:
 * Accumulate small profits by leveraging the coverage of the Center position and the payouts of the Edge position,
 * while using the progression to recover losses.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    // 'line' bets are typically considered Inside bets for limits, but check your specific casino rules.
    // We use config.betLimits.min as the base unit per prompt guidelines.
    const baseUnit = config.betLimits.min;
    const maxBet = config.betLimits.max;

    // Position Definitions (Double Street / Line Bets start numbers)
    const POSITIONS = {
        'A': [1, 31],            // Edges: 1-6 and 31-36
        'B': [7, 13, 19, 25]     // Center: 7-12, 13-18, 19-24, 25-30
    };

    // 2. Initialize State
    if (!state.initialized) {
        state.currentPosition = 'A'; // Start with Edges
        state.betLevel = 1;          // Start at 1 unit
        state.consecutiveWins = 0;   // Track streak
        state.initialized = true;
    }

    // 3. Process Previous Spin (if exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;
        
        // Determine if the LAST bet won
        // We check if the winning number is covered by the CURRENT position's lines
        // A "Line" bet covers the start number + 5 subsequent numbers (e.g., 1 covers 1-6)
        let won = false;
        
        // Get the lines we bet on based on the state AT THE TIME OF THE BET
        // (Since we haven't changed state.currentPosition yet, it represents the last bet)
        const activeLines = POSITIONS[state.currentPosition];
        
        // Check if winning number falls within any of the active lines
        for (let startNum of activeLines) {
            if (winningNumber >= startNum && winningNumber <= startNum + 5) {
                won = true;
                break;
            }
        }

        // 4. Update Logic based on Result
        if (won) {
            state.consecutiveWins++;
            
            if (state.consecutiveWins >= 2) {
                // TRIGGER: 2 Wins in a row
                // Action: Switch Position and Reset Level
                state.currentPosition = (state.currentPosition === 'A') ? 'B' : 'A';
                state.betLevel = 1;
                state.consecutiveWins = 0; // Reset streak counter after switch
            } else {
                // Action: 1 Win
                // Maintain level, Maintain position
                // (No changes needed to state)
            }
        } else {
            // LOSS
            state.consecutiveWins = 0;
            state.betLevel++; // Increase progression by 1 unit
        }
    }

    // 5. Construct Bets
    const bets = [];
    
    // Calculate bet amount respecting limits
    let rawAmount = baseUnit * state.betLevel;
    
    // CLAMP: Ensure bet is at least min and at most max
    let finalAmount = Math.max(rawAmount, config.betLimits.min);
    finalAmount = Math.min(finalAmount, maxBet);

    // Get line numbers for current position
    const linesToBet = POSITIONS[state.currentPosition];

    // Create bet objects
    for (let lineStart of linesToBet) {
        bets.push({
            type: 'line',
            value: lineStart,
            amount: finalAmount
        });
    }

    return bets;
}