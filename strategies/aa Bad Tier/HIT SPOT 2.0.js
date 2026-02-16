/**
 * Strategy: Hit Spot 2.0 (Bet With Mo)
 * Source: https://www.youtube.com/watch?v=urZkwAoDWfg
 * Channel: Bet With Mo
 *
 * Logic:
 * 1. Coverage: The strategy relies on "Large Coverage" (approx. 30 numbers).
 * 2. The Mechanics:
 * - Start by betting on 30 individual numbers (Straight Up).
 * - ON WIN: "Get rid of it." Remove the winning number from the active betting set. 
 * This locks in profit and reduces the total bet amount for the next spin.
 * - ON LOSS: "Rebet / Double Up." If a loss occurs (hitting one of the few open spots or Zero), 
 * increase the bet multiplier to recover the previous loss.
 * - TARGET: The video aims for $20-$40 profit increments. Once a target is hit, 
 * the strategy "Switches Sides" (resets to a full 30 numbers, potentially changing the specific set).
 *
 * Progression:
 * - Negative Progression (Martingale-style) on the Multiplier.
 * - Multiplier increases after a loss to recover cost.
 * - Multiplier resets to 1 after a win (but the specific number is removed).
 *
 * Simulator Note:
 * - To ensure precise "number removal," this implementation uses 30 Straight-Up bets 
 * rather than Splits/Corners, as removing "half a split" is mathematically ambiguous in code.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- CONFIGURATION ---
    const TARGET_PROFIT_INCREMENT = 20; // Re-sets strategy after making this much profit
    const INITIAL_COVERAGE_COUNT = 30;  // How many numbers to cover at start
    const MAX_LOSS_STREAK = 6;          // Safety cap for doubling

    // --- HELPER: GENERATE NUMBER SETS ---
    // Generates 30 numbers. "Side A" is mostly low/mid, "Side B" is mostly mid/high
    // This mimics the "Switch Sides" mechanic from the video.
    const getNumberSet = (side) => {
        const allNumbers = Array.from({ length: 36 }, (_, i) => i + 1); // 1-36
        // Shuffle simply to randomize the 6 uncovered numbers
        // In a real scenario, Side A might be 1-30, Side B might be 7-36. 
        // We will just filter out 6 numbers based on the 'side' toggle.
        const excludeStart = side === 'A' ? 31 : 1;
        const excludeEnd = side === 'A' ? 36 : 6;
        return allNumbers.filter(n => n < excludeStart || n > excludeEnd);
    };

    // --- STATE INITIALIZATION ---
    if (!state.initialized) {
        state.activeNumbers = getNumberSet('A'); // Current numbers we are betting on
        state.currentSide = 'A';                 // Toggle between A and B
        state.multiplier = 1;                    // Bet unit multiplier
        state.startBankroll = bankroll;          // Snapshot of bankroll at start of "level"
        state.globalStartBankroll = bankroll;    // Snapshot of session start
        state.lossStreak = 0;
        state.initialized = true;
    }

    // --- 1. PROCESS LAST SPIN RESULT ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.winAmount || 0;
        const lastBetTotal = lastSpin.totalBet || 0;
        const netChange = lastWinAmount - lastBetTotal;

        if (netChange > 0) {
            // === WIN ===
            // 1. Remove the winning number from our active set ("Get rid of it")
            state.activeNumbers = state.activeNumbers.filter(n => n !== lastSpin.winningNumber);
            
            // 2. Reset multiplier (we made profit, no need to double)
            state.multiplier = 1;
            state.lossStreak = 0;

            // 3. Check Profit Goal (The "Target" logic)
            // If we are up by the increment amount since the last reset
            const currentSessionProfit = bankroll - state.startBankroll;
            
            // Also reset if we run out of numbers (rare, but possible)
            if (currentSessionProfit >= TARGET_PROFIT_INCREMENT || state.activeNumbers.length === 0) {
                // "Switch Sides" and Reset
                state.currentSide = state.currentSide === 'A' ? 'B' : 'A';
                state.activeNumbers = getNumberSet(state.currentSide);
                state.startBankroll = bankroll; // Reset profit baseline
                // console.log(`Target hit! Switching to Side ${state.currentSide}`);
            }

        } else {
            // === LOSS ===
            // 1. We keep the same active numbers (don't remove anything)
            // 2. Increase progression to recover
            state.lossStreak++;
            
            // Simple logic: Double up if we lose to cover the massive coverage cost
            // The video mentions "8 levels", this implies a doubling or step progression.
            if (state.lossStreak <= MAX_LOSS_STREAK) {
                state.multiplier *= 2;
            } else {
                // Stop loss / Cap hit: Reset multiplier to avoid bankruptcy
                state.multiplier = 1; 
                state.lossStreak = 0;
            }
        }
    }

    // --- 2. CALCULATE BETS ---
    
    // Determine base unit value based on limits
    const baseUnit = config.betLimits.min; 
    let betAmountPerNumber = baseUnit * state.multiplier;

    // --- 3. APPLY LIMITS (Crucial) ---
    betAmountPerNumber = Math.max(betAmountPerNumber, config.betLimits.min);
    betAmountPerNumber = Math.min(betAmountPerNumber, config.betLimits.max);

    // Calculate total bet size to ensure we don't exceed bankroll
    const totalNeeded = betAmountPerNumber * state.activeNumbers.length;
    
    // If bankroll is too low for the full strategy, stop betting or flatten bets
    if (totalNeeded > bankroll) {
        // Emergency Mode: flatten to minimum or stop
        betAmountPerNumber = Math.floor(bankroll / state.activeNumbers.length);
        if (betAmountPerNumber < config.betLimits.min) return []; // Stop if we can't meet min bet
    }

    // --- 4. GENERATE BET OBJECTS ---
    const bets = state.activeNumbers.map(num => {
        return {
            type: 'number', // Straight up bet
            value: num,
            amount: betAmountPerNumber
        };
    });

    return bets;
}