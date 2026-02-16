/**
 * STRATEGY: Sticky Winner Core (No Limits)
 * * SOURCE: 
 * "Sticky Winner Strategy Simulator" (Custom logic defined in collaborative session).
 * * THE LOGIC:
 * - Sequence: Fixed circular order: 1-18 (Low) -> Even -> Red -> Black -> Odd -> 19-36 (High).
 * - Movement: Always move to the next spot in the sequence after every spin, regardless of the result.
 * * THE PROGRESSION:
 * - Base Unit: Derived from config.betLimits.minOutside (typically $5).
 * - Step Size: 3 Units (typically $15).
 * - On Loss: Increase bet amount by 1 Step (+$15).
 * - On Win: Decrease bet amount by 1 Step (-$15), floor at Base Unit.
 * * PEAK RESET (Optimization):
 * - If the current bankroll exceeds the recorded Peak Bankroll (All-Time High), 
 * the bet amount is immediately reset to the Base Unit to lock in profits.
 * * THE GOAL:
 * - Utilize the aggressive positive/negative progression to recover drawdowns quickly, 
 * while using the "Peak Reset" to prevent giving back profits on large bets after a lucky streak.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- Configuration & Constants ---
    const SEQUENCE = ['low', 'even', 'red', 'black', 'odd', 'high'];
    const BASE_UNIT = config.betLimits.minOutside; // Usually $5
    const STEP_UNIT = BASE_UNIT * 3;               // Usually $15

    // --- Helper: Check Win ---
    const isWin = (number, type) => {
        if (number === 0 || number === '00') return false; // Zero loses all these outside bets
        // Note: spinHistory usually provides number stats. Assuming standard structure:
        // numbers 1-36 have properties. If strictly raw number:
        const RED_NUMS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
        
        switch (type) {
            case 'low': return number >= 1 && number <= 18;
            case 'high': return number >= 19 && number <= 36;
            case 'even': return number % 2 === 0;
            case 'odd': return number % 2 !== 0;
            case 'red': return RED_NUMS.includes(number);
            case 'black': return !RED_NUMS.includes(number);
            default: return false;
        }
    };

    // --- 1. Initialize State (First Spin) ---
    if (!state.initialized) {
        state.initialized = true;
        state.currentBetAmount = BASE_UNIT;
        state.seqIndex = 0; // Starts at 'low' (1-18)
        state.peakBankroll = bankroll;
        state.lastBetIndex = null; // To track what we bet previously
        
        // Place initial bet
        return [{ type: SEQUENCE[state.seqIndex], amount: state.currentBetAmount }];
    }

    // --- 2. Process Last Spin Result ---
    const lastSpin = spinHistory[spinHistory.length - 1];
    
    // Determine if the last bet won
    // We look at what we bet on (SEQUENCE[state.lastBetIndex]) vs the actual number
    const lastBetType = SEQUENCE[state.seqIndex]; 
    const wonLast = isWin(lastSpin.winningNumber, lastBetType);

    // --- 3. Update Progression ---
    if (wonLast) {
        // On Win: Decrease by Step, floor at Base
        state.currentBetAmount = Math.max(BASE_UNIT, state.currentBetAmount - STEP_UNIT);
    } else {
        // On Loss: Increase by Step
        state.currentBetAmount += STEP_UNIT;
    }

    // --- 4. Sequence Logic ---
    // Always move to the next spot
    state.seqIndex++;
    if (state.seqIndex >= SEQUENCE.length) {
        state.seqIndex = 0;
    }

    // --- 5. Peak Reset Logic ---
    // If we hit a new All-Time High, reset progression
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
        // Optimization: Reset to base unit to lock in profit
        if (state.currentBetAmount > BASE_UNIT) {
            state.currentBetAmount = BASE_UNIT;
        }
    }

    // --- 6. Clamp to Limits (Crucial) ---
    // Ensure we don't bet less than table min or more than table max
    let finalAmount = state.currentBetAmount;
    finalAmount = Math.max(finalAmount, config.betLimits.minOutside);
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // Update state so we know what to check next spin
    // (Note: In this strategy, index aligns with current spin, but we tracked last bet via logic flow)
    
    // --- 7. Return Bet ---
    return [{ 
        type: SEQUENCE[state.seqIndex], 
        amount: finalAmount 
    }];
}