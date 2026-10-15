/**
 * Modified Housebreaker Roulette Strategy
 *
 * Source: https://www.youtube.com/watch?v=jnb_oVg0RCc (The Roulette Master)
 *
 * The Logic:
 * - Starts by placing equal bets on 6 specific corners.
 * - Evaluates the result to determine if any active corner hit.
 *
 * The Progression:
 * - On a Loss: Bets remain completely static.
 * - On a Win (following a loss): 
 * - If currently betting 6 corners, REMOVE THE SPECIFIC CORNER THAT JUST HIT (dropping to 5) and increase the bet amount on the remaining 5.
 * - Minimum Coverage Rule: NEVER drop below 5 corners.
 * - On a Win at 5 corners (if session is NOT in profit): 
 * - Increase the base unit and restart the recovery tier at 5 corners with the higher base.
 *
 * The Goal:
 * - Safely absorb variance by keeping coverage high (5-6 corners).
 * - Recover drawdowns gradually. Target is a new session high.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (Object.keys(state).length === 0) {
        state.sessionStartBankroll = bankroll;
        state.initialUnit = config.betLimits.min; 
        state.baseUnit = state.initialUnit;
        state.currentBet = state.baseUnit;
        
        // Starting 6 corners based on top-left number (European layout spread)
        state.defaultCorners = [1, 8, 13, 20, 25, 32];
        state.activeCorners = [...state.defaultCorners];
        state.lostLast = false;
    }

    // 2. Determine Increment Value
    const increment = config.incrementMode === 'base' ? state.initialUnit : (config.minIncrementalBet || 1);

    // 3. Process Spin History & Progression Logic
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        
        let isWin = false;
        let hitCorner = null; // Track which specific corner hit
        
        for (let c of state.activeCorners) {
            // A corner defined by top-left 'c' covers: c, c+1, c+3, c+4
            if (winningNum === c || winningNum === c + 1 || winningNum === c + 3 || winningNum === c + 4) {
                isWin = true;
                hitCorner = c; // Save the winning corner's top-left value
                break;
            }
        }

        if (isWin) {
            if (bankroll > state.sessionStartBankroll) {
                // System Reset on Session Profit
                state.sessionStartBankroll = bankroll; 
                state.baseUnit = state.initialUnit;
                state.currentBet = state.baseUnit;
                state.activeCorners = [...state.defaultCorners];
                state.lostLast = false;
            } else {
                // Recovering a drawdown
                if (state.lostLast) {
                    if (state.activeCorners.length === 6 && hitCorner !== null) {
                        // Remove the specific corner that just hit
                        state.activeCorners = state.activeCorners.filter(corner => corner !== hitCorner);
                        state.currentBet += increment;
                    } else if (state.activeCorners.length === 5) {
                        // Minimum coverage reached. Increase base unit.
                        state.baseUnit += increment;
                        state.currentBet = state.baseUnit;
                    }
                }
                state.lostLast = false;
            }
        } else {
            // Loss: Protect bankroll, bets static.
            state.lostLast = true;
        }
    }

    // 4. Clamp bet amounts to respect configuration limits
    let finalBetAmount = state.currentBet;
    finalBetAmount = Math.max(finalBetAmount, config.betLimits.min);
    finalBetAmount = Math.min(finalBetAmount, config.betLimits.max);

    // 5. Construct output array
    let currentBets = [];
    for (let corner of state.activeCorners) {
        currentBets.push({
            type: 'corner',
            value: corner,
            amount: finalBetAmount
        });
    }

    return currentBets;
}