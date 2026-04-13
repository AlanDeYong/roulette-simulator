/**
 * Strategy: Swingy
 * Source: CEG Dealer School (https://youtu.be/q-Ngs6wjH-g)
 * * The Logic: 
 * This strategy relies on betting on non-touching corner bets to cover sections of the board. 
 * A corner bet covers 4 numbers. By playing 3, 4, or 5 non-touching corners, the player 
 * covers 12, 16, or 20 numbers respectively.
 * * The Progression:
 * Phase 1 (Negative Progression):
 * - Step 1: Bet 1 unit on 3 non-touching corners. Win -> Reset to Step 1. Lose -> Go to Step 2.
 * - Step 2: Bet 1 unit on 4 non-touching corners. Win -> Reset to Step 1. Lose -> Go to Step 3.
 * - Step 3: Bet 1 unit on 5 non-touching corners. Lose -> Reset to Step 1. Win -> Go to Phase 2.
 * * Phase 2 (Positive Progression / Pressing):
 * - Maintain the 5 corner bets.
 * - Increase the bet size on EACH corner by a fixed increment (e.g., $1 or 1 unit) on every consecutive win.
 * - Profit Lock: After any win in Phase 2, if your current bankroll is higher than your starting bankroll, reset to Step 1.
 * - If you lose at any point during Phase 2, reset entirely back to Phase 1, Step 1.
 * * The Goal:
 * To secure a 25% profit relative to the buy-in. (e.g., $75 profit on a $300 buy-in).
 * The script will stop placing bets once this target profit is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. System Constants & Initialization ---
    const unit = config.betLimits.min;
    const increment = config.minIncrementalBet || 1;
    const targetProfit = unit * 15000; // 15 base units equals a 25% ROI (e.g. 15 * $5 = $75)

    // Non-touching corner anchors (top-left number of the corner block)
    // Corner 1: 1,2,4,5 | Corner 8: 8,9,11,12 | Corner 16: 16,17,19,20 
    // Corner 23: 23,24,26,27 | Corner 32: 32,33,35,36
    const corners = [1, 8, 16, 23, 32]; 

    if (!state.initialized) {
        state.initialized = true;
        state.startingBankroll = bankroll;
        state.sessionActive = true;
        
        state.phase = 'negative'; // 'negative' or 'positive'
        state.step = 1;           // 1 (3 corners), 2 (4 corners), or 3 (5 corners)
        state.pressAmount = unit; // Current bet size for positive progression
        state.lastBets = [];      // Track bets to calculate wins
    }

    // --- 2. Check Goal Condition ---
    if (bankroll >= state.startingBankroll + targetProfit) {
        state.sessionActive = false;
    }

    if (!state.sessionActive) {
        return []; // Goal reached, stop betting
    }

    // --- 3. Evaluate Previous Spin ---
    let wonLastSpin = false;
    if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1].winningNumber;
        
        for (const bet of state.lastBets) {
            const anchor = bet.value;
            // A corner bet on 'anchor' covers: anchor, anchor+1, anchor+3, anchor+4
            const coveredNumbers = [anchor, anchor + 1, anchor + 3, anchor + 4];
            if (coveredNumbers.includes(lastResult)) {
                wonLastSpin = true;
                break;
            }
        }
    }

    // --- 4. State Machine / Progression Logic ---
    if (spinHistory.length > 0) {
        if (state.phase === 'negative') {
            if (wonLastSpin) {
                if (state.step === 1 || state.step === 2) {
                    // Win on early step: secure profit, reset.
                    state.step = 1;
                } else if (state.step === 3) {
                    // Win on step 3: Enter positive progression
                    state.phase = 'positive';
                    state.pressAmount = unit + increment; 
                }
            } else {
                // Lost
                if (state.step === 1) {
                    state.step = 2;
                } else if (state.step === 2) {
                    state.step = 3;
                } else if (state.step === 3) {
                    // Lost on final negative step, take the hit and reset
                    state.step = 1;
                }
            }
        } else if (state.phase === 'positive') {
            if (wonLastSpin) {
                // Profit lock check: If we are net positive for the session, reset.
                if (bankroll > state.startingBankroll) {
                    state.phase = 'negative';
                    state.step = 1;
                    state.pressAmount = unit;
                } else {
                    // Not net positive yet, keep pressing
                    state.pressAmount += increment;
                }
            } else {
                // Lost during press, reset entirely
                state.phase = 'negative';
                state.step = 1;
                state.pressAmount = unit;
            }
        }
    }

    // --- 5. Determine Current Bets ---
    let activeCorners = [];
    let currentBetAmount = unit;

    if (state.phase === 'negative') {
        if (state.step === 1) activeCorners = corners.slice(0, 3);
        if (state.step === 2) activeCorners = corners.slice(0, 4);
        if (state.step === 3) activeCorners = corners.slice(0, 5);
    } else if (state.phase === 'positive') {
        activeCorners = corners.slice(0, 5);
        currentBetAmount = state.pressAmount;
    }

    // --- 6. Clamp Limits & Build Bet Array ---
    // Ensure bet amount is within casino limits
    currentBetAmount = Math.max(currentBetAmount, config.betLimits.min);
    currentBetAmount = Math.min(currentBetAmount, config.betLimits.max);

    let nextBets = [];
    for (let i = 0; i < activeCorners.length; i++) {
        nextBets.push({
            type: 'corner',
            value: activeCorners[i],
            amount: currentBetAmount
        });
    }

    // Save for next spin evaluation
    state.lastBets = nextBets;

    return nextBets;
}