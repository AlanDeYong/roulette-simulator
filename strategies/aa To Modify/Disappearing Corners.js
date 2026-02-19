
/**
 * Strategy: Disappearing Corners
 * Source: YouTube - The Roulette Master (https://www.youtube.com/watch?v=j4QJ6UZMLXA)
 *
 * THE LOGIC:
 * - Start with 6 non-overlapping corners covering 24 numbers.
 * - Suggested Corners (Top-Left): 1, 7, 13, 19, 25, 31.
 * - When a corner HITS (Win):
 * - Remove that corner from the active set ("Disappear").
 * - Do NOT increase the bet level.
 * - Check if we are down to 3 corners.
 * - When a corner MISSES (Loss):
 * - Increase the bet amount on all *remaining* corners.
 *
 * THE PROGRESSION:
 * - Modified Fibonacci Sequence on LOSS: 1, 2, 3, 5, 8, 13, 21, 34...
 * - On a Loss: Move to the next number in the sequence.
 * - On a Win: Stay at the current bet level (do not regress, do not advance).
 *
 * THE RESET:
 * - Global Reset Condition: As soon as the board is down to 3 active corners (i.e., after 3 wins), 
 * reset everything:
 * - Restore all 6 corners.
 * - Reset betting progression to level 1 (1 unit).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    // Fibonacci sequence for progression (1, 2, 3, 5, 8...)
    const FIB_SEQ = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];
    
    // Define the 6 non-overlapping corners by their Top-Left number
    // Corner 1 covers 1,2,4,5
    // Corner 7 covers 7,8,10,11
    // ... etc
    const INITIAL_CORNERS = [1, 7, 13, 19, 25, 31];

    // Helper to get all numbers in a corner (Standard Layout)
    const getCornerNumbers = (topLeft) => {
        return [topLeft, topLeft + 1, topLeft + 3, topLeft + 4];
    };

    // Determine Base Unit (Inside Bet Minimum)
    const unit = config.betLimits.min; 

    // --- 2. STATE INITIALIZATION ---
    if (!state.activeCorners || state.activeCorners.length === 0) {
        state.activeCorners = [...INITIAL_CORNERS];
    }
    if (state.fibIndex === undefined) state.fibIndex = 0;
    if (state.totalWins === undefined) state.totalWins = 0;
    if (state.totalLosses === undefined) state.totalLosses = 0;

    // --- 3. PROCESS PREVIOUS RESULT ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Check if the winning number hit one of our ACTIVE corners
        let hitCornerIndex = -1;

        for (let i = 0; i < state.activeCorners.length; i++) {
            const cornerNumbers = getCornerNumbers(state.activeCorners[i]);
            if (cornerNumbers.includes(winningNum)) {
                hitCornerIndex = i;
                break;
            }
        }

        if (hitCornerIndex !== -1) {
            // --- WIN ---
            state.totalWins++;
            
            // Remove the winning corner
            state.activeCorners.splice(hitCornerIndex, 1);
            
            // Note: On a win, we stay at current Fib level (or we could reset, 
            // but standard survival strat logic implies holding level until Reset condition).
            
            // CHECK RESET CONDITION: Down to 3 corners?
            if (state.activeCorners.length <= 3) {
                // Global Reset
                state.activeCorners = [...INITIAL_CORNERS];
                state.fibIndex = 0;
            }
        } else {
            // --- LOSS ---
            state.totalLosses++;
            
            // Progression: Move up the Fibonacci ladder
            // Only increase if we haven't maxed out our defined sequence
            if (state.fibIndex < FIB_SEQ.length - 1) {
                state.fibIndex++;
            }
        }
    }

    // --- 4. CALCULATE BETS ---
    const multiplier = FIB_SEQ[state.fibIndex];
    let betAmount = unit * multiplier;

    // --- 5. CLAMP TO LIMITS ---
    // Ensure bet is at least min
    betAmount = Math.max(betAmount, config.betLimits.min);
    // Ensure bet is at most max
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Calculate total required bankroll for this spin
    const totalBetNeeded = betAmount * state.activeCorners.length;

    // Bankroll Safety Check
    if (bankroll < totalBetNeeded) {
        // Not enough money to place full spread
        return [];
    }

    // --- 6. LOGGING (Periodic) ---
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        const logData = `Spin: ${spinHistory.length} | Active Corners: ${state.activeCorners.length} | FibLevel: ${state.fibIndex} (x${multiplier}) | Bankroll: ${bankroll}\n`;
        utils.saveFile("disappearing-corners-log.txt", logData).catch(() => {});
    }

    // --- 7. CONSTRUCT BET ARRAY ---
    const currentBets = state.activeCorners.map(cornerVal => {
        return {
            type: 'corner',
            value: cornerVal,
            amount: betAmount
        };
    });

    return currentBets;

}