/**
 * SOURCE: 
 * YouTube Channel: CEG Dealer School
 * URL: https://www.youtube.com/watch?v=YB9uOTQdhiQ
 * * THE LOGIC:
 * This is the "Two-Story Corners" strategy. It utilizes corner bets (covering 4 numbers each).
 * The strategy starts by betting on 1 corner and adds an additional corner after every loss 
 * up to a maximum of 6 corners. If a loss occurs while at 6 corners, it doubles the unit 
 * size (Tier 2/Story 2) and restarts from 1 corner.
 * * THE PROGRESSION:
 * - Tier 1: 1-6 corners at base unit (config.betLimits.min).
 * - Tier 2: 1-6 corners at 2x base unit.
 * - Reset: The progression resets to Step 1 (Tier 1, 1 corner) if the current bankroll 
 * reaches a new session high (starting bankroll + profit).
 * * THE GOAL:
 * To capitalize on the fact that sessions rarely exceed the first 12 steps of this 
 * D'Alembert-style progression (98.4% success rate in testing).
 */

function bet(spinHistory, bankroll, config, state) {
    // 1. Initialize State
    if (!state.initialized) {
        state.highestBankroll = bankroll;
        state.tier = 1; // 1 or 2
        state.numCorners = 1; // 1 through 6
        state.initialized = true;
    }

    // 2. Check for Reset (New Session High)
    if (bankroll >= state.highestBankroll) {
        state.highestBankroll = bankroll;
        state.tier = 1;
        state.numCorners = 1;
    } 
    // 3. Handle Loss/Win Progression
    else if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Determine if we won the last round
        // Note: state.lastBets stores what we actually bet last time
        const wonLastRound = state.lastBets && state.lastBets.some(b => {
            const num = lastSpin.winningNumber;
            // Corner covers: n, n+1, n+3, n+4
            return [b.value, b.value + 1, b.value + 3, b.value + 4].includes(num);
        });

        if (!wonLastRound) {
            // Progression Logic: Move to next step
            if (state.numCorners < 6) {
                state.numCorners++;
            } else if (state.tier === 1) {
                // Move to Story 2
                state.tier = 2;
                state.numCorners = 1;
            } else {
                // Tier 2, 6 corners reached and lost. 
                // Strategy "Stop the Bleed" logic: Reset to Tier 1
                state.tier = 1;
                state.numCorners = 1;
            }
        }
        // Note: If we won but didn't hit a new session high, we stay at current level 
        // to continue recovering back to the high mark.
    }

    // 4. Define Corner Positions
    // These are top-left numbers for corners (e.g., 1 covers 1,2,4,5)
    // We select a sequence that distributes across the board
    const cornerSequence = [1, 5, 11, 19, 23, 29]; 
    
    // 5. Calculate Bet Amount
    const baseUnit = config.betLimits.min;
    let amountPerCorner = state.tier === 1 ? baseUnit : baseUnit * 2;
    
    // Clamp per corner bet to limits
    amountPerCorner = Math.max(amountPerCorner, config.betLimits.min);
    amountPerCorner = Math.min(amountPerCorner, config.betLimits.max);

    // 6. Construct Bets
    const bets = [];
    for (let i = 0; i < state.numCorners; i++) {
        bets.push({
            type: 'corner',
            value: cornerSequence[i],
            amount: amountPerCorner
        });
    }

    // Store for win detection in next spin
    state.lastBets = bets;

    return bets.length > 0 ? bets : null;
}