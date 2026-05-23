/**
 * Strategy: The Housebreaker
 * Source: https://www.youtube.com/watch?v=AsUPCV9KFHM (The Roulette Master)
 * * The Logic: 
 * This strategy utilizes high board coverage using 6 non-overlapping Corner (Square) bets, 
 * initially covering a total of 24 numbers. 
 * - Base Layout: 6 distinct corners (e.g., 1, 7, 13, 19, 25, 31).
 * - Trigger: Bets are placed actively on every spin.
 * * The Progression:
 * - On a Loss: Re-bet the exact same amount on the exact same active corners. Do not increase the bet.
 * - On a Win (while in session drawdown): 
 * 1. Remove the specific corner bet that just won (reducing coverage to 5 corners, then eventually 4).
 * 2. Increase the bet amount on all remaining corners by the incremental unit.
 * *Safety Limit*: Never drop below 4 active corners (16 numbers). If a win occurs while at 4 corners, 
 * simply increase the bet size without removing the winning corner.
 * * The Goal:
 * To systematically recover from cold streaks using a positive progression that limits exposure.
 * When the current bankroll exceeds the session's starting bankroll (Session Profit achieved), 
 * the entire progression resets back to the base layout of 6 corners at the minimum bet.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on the first run or after a full reset
    const baseUnit = config.betLimits.min;
    
    // We use top-left numbers to define 6 distinct, non-overlapping corners (covers 24 numbers total)
    // Corner 1 covers: 1, 2, 4, 5. Corner 7 covers: 7, 8, 10, 11, etc.
    const initialCorners = [1, 7, 13, 19, 25, 31]; 
    
    if (!state.activeCorners) {
        state.activeCorners = [...initialCorners];
        state.currentBet = baseUnit;
        state.sessionStartBankroll = bankroll;
    }

    // Helper: A corner defined by 'n' covers n, n+1, n+3, n+4 on a standard European/American layout.
    const isNumberInCorner = (num, cornerStart) => {
        const cornerNumbers = [cornerStart, cornerStart + 1, cornerStart + 3, cornerStart + 4];
        return cornerNumbers.includes(num);
    };

    // 2. Evaluate previous spin if history exists
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Check if the last number hit one of our active corners
        let wonLastSpin = false;
        let winningCornerIndex = -1;
        
        for (let i = 0; i < state.activeCorners.length; i++) {
            if (isNumberInCorner(lastNumber, state.activeCorners[i])) {
                wonLastSpin = true;
                winningCornerIndex = i;
                break;
            }
        }

        if (wonLastSpin) {
            // Check if we reached session profit (current bankroll includes last spin's payout)
            if (bankroll > state.sessionStartBankroll) {
                // RESET Condition Met
                state.activeCorners = [...initialCorners];
                state.currentBet = baseUnit;
                state.sessionStartBankroll = bankroll; // Update high watermark
            } else {
                // PROGRESSION: Remove winning corner (enforcing max safety limit of 4 corners)
                if (state.activeCorners.length > 4 && winningCornerIndex !== -1) {
                    state.activeCorners.splice(winningCornerIndex, 1);
                }
                
                // Increase bet based on simulator configuration
                let increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);
                state.currentBet += increment;
            }
        }
        // On Loss: The strategy mandates doing nothing. Keep the same corners and same bet amount.
    }

    // 3. Calculate and Clamp Bet Amount
    let finalBetAmount = state.currentBet;
    finalBetAmount = Math.max(finalBetAmount, config.betLimits.min);
    finalBetAmount = Math.min(finalBetAmount, config.betLimits.max);
    
    // Safety check: Ensure sufficient bankroll for the total layout
    const totalBetNeeded = finalBetAmount * state.activeCorners.length;
    if (totalBetNeeded > bankroll) {
        // Fallback: Scale down the bet to whatever the remaining bankroll can support
        finalBetAmount = Math.floor(bankroll / state.activeCorners.length);
        if (finalBetAmount < config.betLimits.min) {
            return []; // Bankroll is empty or cannot meet minimum limits
        }
    }

    // 4. Construct and Return Bets
    const bets = state.activeCorners.map(cornerVal => {
        return {
            type: 'corner',
            value: cornerVal,
            amount: finalBetAmount
        };
    });

    return bets;
}