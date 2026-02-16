/**
 * STRATEGY: Moving Dozens (Fibonacci Progression)
 * * SOURCE: 
 * YouTube: The Roulette Master
 * Video: "INCREDIBLE NEW MOVING DOZENS ROULETTE SYSTEM!"
 * URL: https://www.youtube.com/watch?v=pbq3Gibj5KY
 * * LOGIC:
 * The core concept is "Follow the Winner" while alternating between Dozens and Columns.
 * 1. Identify the last non-zero number that hit.
 * 2. If the previous bet was a Dozen, bet on the Column that contains that number.
 * 3. If the previous bet was a Column, bet on the Dozen that contains that number.
 * 4. This ensures you never get stuck betting on the same sector if it goes cold, 
 * and you are always chasing the hot number's properties.
 * * PROGRESSION (Fibonacci):
 * - Sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55...
 * - On LOSS: Move one step up the sequence (add the last two bet units).
 * - On WIN: Reset to the beginning (Step 0, 1 unit).
 * *Note: While some Fibonacci systems step back 2 steps on a win, the video 
 * demonstrates a full reset to the base bet after a win to secure profits.*
 * * GOAL:
 * - Accumulate small wins using the high coverage of Dozens/Columns (32.4% win rate per spin).
 * - Use the bankroll to absorb variance via the Fibonacci sequence.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPERS ---
    
    // Define the Fibonacci sequence for the progression
    const fibSequence = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];
    
    // Helper: Get which Dozen (1, 2, 3) a number belongs to
    const getDozen = (num) => {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return null; // 0
    };

    // Helper: Get which Column (1, 2, 3) a number belongs to
    const getColumn = (num) => {
        if (num === 0) return null;
        if (num % 3 === 1) return 1; // 1, 4, 7...
        if (num % 3 === 2) return 2; // 2, 5, 8...
        if (num % 3 === 0) return 3; // 3, 6, 9...
        return null;
    };

    // --- 2. STATE INITIALIZATION ---
    if (state.progressionIndex === undefined) state.progressionIndex = 0;
    if (state.nextBetType === undefined) state.nextBetType = 'dozen'; // Start with Dozens
    // We track the last valid number to handle cases where 0 hits (we can't "follow" 0)
    if (state.lastValidNumber === undefined) state.lastValidNumber = 17; // Default start if history empty
    // Track the last bet to determine win/loss
    if (state.lastBetResult === undefined) state.lastBetResult = null; 

    // --- 3. GAME LOOP ---

    // If this is the very first spin, place a default bet
    if (spinHistory.length === 0) {
        const units = fibSequence[0];
        const amount = Math.max(units * config.betLimits.minOutside, config.betLimits.minOutside);
        
        // Save state for next turn logic
        state.lastBetResult = { type: 'dozen', value: 2 }; // Assume we start on 2nd Dozen for example
        
        return [{ type: 'dozen', value: 2, amount: amount }];
    }

    const lastSpin = spinHistory[spinHistory.length - 1];
    const winningNumber = lastSpin.winningNumber;

    // Update last valid number (ignore 0 for targeting purposes)
    if (winningNumber !== 0) {
        state.lastValidNumber = winningNumber;
    }

    // --- 4. DETERMINE WIN/LOSS & UPDATE PROGRESSION ---
    
    // Did we win the previous bet?
    let wonLast = false;
    
    if (state.lastBetResult) {
        if (state.lastBetResult.type === 'dozen') {
            wonLast = getDozen(winningNumber) === state.lastBetResult.value;
        } else if (state.lastBetResult.type === 'column') {
            wonLast = getColumn(winningNumber) === state.lastBetResult.value;
        }
    }

    if (wonLast) {
        // WIN: Reset progression
        state.progressionIndex = 0;
    } else {
        // LOSS: Move up Fibonacci sequence
        state.progressionIndex++;
        // Cap progression at the end of defined sequence to prevent crash, or adhere to max bet
        if (state.progressionIndex >= fibSequence.length) {
            state.progressionIndex = fibSequence.length - 1;
        }
    }

    // --- 5. SWITCH BET TYPE ---
    // Strictly alternate: Dozen -> Column -> Dozen -> Column
    state.nextBetType = (state.nextBetType === 'dozen') ? 'column' : 'dozen';

    // --- 6. CALCULATE BET AMOUNT ---
    
    const units = fibSequence[state.progressionIndex];
    let betAmount = units * config.betLimits.minOutside;

    // Clamp to Limits
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Stop if we don't have enough bankroll for the full bet
    if (betAmount > bankroll) {
        // Optional: Bet remaining, or stop. We'll return empty to stop.
        return [];
    }

    // --- 7. DETERMINE BET TARGET ---
    
    let betValue = null;
    
    // We target the sector that contains the last valid number
    if (state.nextBetType === 'dozen') {
        betValue = getDozen(state.lastValidNumber);
    } else {
        betValue = getColumn(state.lastValidNumber);
    }

    // Sanity check: if logic fails (shouldn't happen), default to 2
    if (!betValue) betValue = 2;

    // Store what we are betting now so we can check it next spin
    state.lastBetResult = { type: state.nextBetType, value: betValue };

    // --- 8. RETURN BET OBJECT ---
    return [{
        type: state.nextBetType, // 'dozen' or 'column'
        value: betValue,         // 1, 2, or 3
        amount: betAmount
    }];
}