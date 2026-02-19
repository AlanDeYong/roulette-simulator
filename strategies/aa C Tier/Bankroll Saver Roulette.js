
/**
 * STRATEGY: Bankroll Saver (James Dylan)
 * * SOURCE:
 * - Video: https://www.youtube.com/watch?v=Z8qbVsscTTw
 * - Channel: Roulette Master
 * * THE LOGIC:
 * This strategy oscillates between a "Base Mode" (low volatility) and a "Recovery Mode" (hedging)
 * to protect the bankroll while grinding small profits.
 * * 1. BASE MODE (Low Risk):
 * - Trigger: When the bet unit is at the minimum (1 unit).
 * - Placement: Bet 1 unit each on two different Dozens (e.g., Dozen 1 & Dozen 3).
 * - Coverage: ~64.8% of the board.
 * - Math: Risk 2 units to win 1 unit.
 * * 2. RECOVERY MODE (The "Saver" Switch):
 * - Trigger: Activated immediately after a loss.
 * - Placement: Switches structure to 1 Dozen + 1 Column (e.g., Dozen 2 + Column 1).
 * - Purpose: This creates "Overlap Numbers" (numbers that exist in both the Dozen and Column).
 * - Hitting an Overlap pays heavily, recovering losses faster.
 * - Hitting just one section minimizes the loss for that spin.
 * * THE PROGRESSION (D'Alembert Variant):
 * - On Loss: Increase bet size by 1 unit. Switch/Stay in Recovery Mode.
 * - On Win: Decrease bet size by 1 unit. 
 * - Reset: If unit size returns to 1, switch back to Base Mode (2 Dozens).
 * * THE GOAL:
 * - Generate consistent small wins in Base Mode.
 * - Survive volatility using the hedged Recovery Mode.
 * - Stop Loss: Recommended at 20-30% of bankroll (not enforced in code, but good practice).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & STATE INITIALIZATION ---
    
    // Define the base betting unit based on table limits
    const baseUnit = config.betLimits.minOutside; 

    // Initialize state if this is the first spin
    if (!state.initialized) {
        state.currentUnit = 1;          // Start with 1 base unit
        state.mode = 'base';            // Modes: 'base' (2 Dozens) or 'recovery' (Dozen + Col)
        state.totalProfit = 0;          // Track session profit
        state.spinCount = 0;            // For periodic logging
        state.initialized = true;
    }

    // --- 2. ANALYZE PREVIOUS SPIN (If available) ---
    
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Calculate the result of our last bet to determine progression
        // Note: We need to know if we won or lost. 
        // A simple heuristic: check if bankroll increased or decreased.
        // However, since 'bankroll' passed in is *current*, we can't easily compare to *previous* // without storing it. Better to calculate win/loss based on strategy logic.
        
        // Simpler D'Alembert Logic based on implied result:
        // We will assume the simulator handles the payout, we just need to adjust the *next* bet.
        // We need to know if the *last specific bet* won.
        // Since we don't have the last bet object strictly passed back, we infer from numbers.
        
        // Helper to check if a number is in a Dozen/Column
        const isDozen = (num, d) => num >= (d - 1) * 12 + 1 && num <= d * 12;
        const isColumn = (num, c) => num > 0 && (num - c) % 3 === 0;

        let wonLast = false;
        const num = lastSpin.winningNumber;

        if (state.lastBetType === 'base') {
            // Base was Dozen 1 & 3
            if (isDozen(num, 1) || isDozen(num, 3)) wonLast = true;
        } else if (state.lastBetType === 'recovery') {
            // Recovery was Dozen 2 & Column 1
            // In recovery, we "win" if we profit. 
            // Dozen pays 2:1, Col pays 2:1.
            // If overlapping number hits (Dozen 2 AND Col 1): BIG WIN.
            // If non-overlapping hit: Push or small loss depending on unit.
            // For the progression logic, we count any payout > 0 as a "win" to reduce units,
            // OR strictly only profit. The video implies standard D'Alembert:
            // Win = Reduce Unit, Loss = Increase Unit.
            const hitDozen = isDozen(num, 2);
            const hitCol = isColumn(num, 1);
            if (hitDozen || hitCol) wonLast = true; 
        }

        // Apply Progression
        if (wonLast) {
            if (state.currentUnit > 1) {
                state.currentUnit--; // Reduce unit on win
            }
        } else {
            state.currentUnit++; // Increase unit on loss
        }

        // Mode Switching Logic
        if (state.currentUnit === 1) {
            state.mode = 'base'; // Reset to safe mode if back to 1 unit
        } else {
            state.mode = 'recovery'; // Engage recovery if units are elevated
        }
    }

    // --- 3. CALCULATE BET AMOUNTS ---

    // Calculate raw amount
    let rawAmount = state.currentUnit * baseUnit;

    // CLAMP TO LIMITS (Crucial Requirement)
    // 1. Ensure >= Table Minimum
    let finalAmount = Math.max(rawAmount, config.betLimits.minOutside);
    // 2. Ensure <= Table Maximum
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // --- 4. CONSTRUCT BETS ---
    
    const bets = [];

    if (state.mode === 'base') {
        // Base Strategy: Dozen 1 and Dozen 3
        bets.push({ type: 'dozen', value: 1, amount: finalAmount });
        bets.push({ type: 'dozen', value: 3, amount: finalAmount });
        state.lastBetType = 'base';
    } else {
        // Recovery Strategy: Dozen 2 and Column 1
        // (You can rotate these if you prefer, but static is fine for testing)
        bets.push({ type: 'dozen', value: 2, amount: finalAmount });
        bets.push({ type: 'column', value: 1, amount: finalAmount });
        state.lastBetType = 'recovery';
    }

    // --- 5. LOGGING (Periodically) ---
    
    state.spinCount++;
    if (state.spinCount % 50 === 0) { // Save every 50 spins
        const logData = `Spin: ${state.spinCount} | Mode: ${state.mode.toUpperCase()} | Unit: ${state.currentUnit} | Bet Amount: ${finalAmount}\n`;
        
        // We catch the promise to prevent execution blocking, 
        // though in this sync function we just fire and forget.
        utils.saveFile("bankroll-saver-log.txt", logData)
            .then(() => {}) // Silent success
            .catch(err => console.error("Log save failed:", err));
    }

    return bets;

}