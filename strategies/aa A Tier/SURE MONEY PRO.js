<<<<<<< HEAD
/**
 * Strategy: Sure Money Pro (Shore Money Pro) - High Coverage / Elimination
 * * Source: 
 * Video: "BEST NEW ROULETTE STRATEGY FOR LOW ROLLERS | SURE MONEY PRO" 
 * Channel: Bet With Mo
 * URL: https://www.youtube.com/watch?v=3BH3VHoJbq0
 * * The Logic:
 * - Initial Setup: 
 * 1. Straight Up bets on the 1st Dozen: 2, 3, 5, 6, 8, 9.
 * 2. Double Street (Line) bets on the 2nd Dozen: 13-18 and 19-24.
 * This covers 18 numbers total (approx 50%).
 * * The Progression (Hybrid Progression & Elimination):
 * - ON WIN (Straight Up): Remove the winning number from the bet list (lock in profit).
 * - ON WIN (Line Bet): Remove the Line bet, but ADD the remaining 5 numbers from that line 
 * as individual Straight Up bets (Elimination logic). 
 * Example: Win on 15 (Line 13-18). Next spin: Remove Line 13-18. Add Straights on 13,14,16,17,18.
 * - ON LOSS: Increase the betting unit by 1 (Not Martingale, just linear increase: 1u -> 2u -> 3u).
 * - ON RESET: If a profit target is hit or the table is cleared significantly, reset to base.
 * * The Goal:
 * - Accumulate small wins rapidly.
 * - "Remove" numbers to reduce exposure while banking profit.
 * - Reset after +50 units profit or if the multiplier gets too high (Safety Cap).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPER DATA ---
    const MIN_CHIP = config.betLimits.min; 
    const MAX_BET = config.betLimits.max;
    
    // Definition of the Line bets used in this strategy
    const LINES = {
        13: [13, 14, 15, 16, 17, 18], // Line covering 13-18
        19: [19, 20, 21, 22, 23, 24]  // Line covering 19-24
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.multiplier = 1;
        state.startingBankroll = bankroll;
        // Initial specific straight bets (1st Dozen pattern)
        state.activeStraights = [2, 3, 5, 6, 8, 9]; 
        // Initial line bets (2nd Dozen coverage)
        state.activeLines = [13, 19]; 
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS RESULT (If exists) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        let won = false;

        // Check if we hit a straight up
        const straightIndex = state.activeStraights.indexOf(lastNum);
        if (straightIndex !== -1) {
            won = true;
            // WIN RULE: Remove the number (Hunting/Elimination)
            state.activeStraights.splice(straightIndex, 1);
            // Reset multiplier on win or keep? Video implies keeping unless reset, 
            // but for safety, we often reduce. We will keep current flow: 
            // If win, we don't increase multiplier. We just remove coverage.
        }

        // Check if we hit a line
        // We iterate backwards to allow splicing if needed
        for (let i = state.activeLines.length - 1; i >= 0; i--) {
            const lineStart = state.activeLines[i];
            const numbersInLine = LINES[lineStart];
            
            if (numbersInLine.includes(lastNum)) {
                won = true;
                // WIN RULE FOR LINE: 
                // 1. Remove the Line bet.
                // 2. Add the REMAINING numbers in that line as Straight Ups.
                state.activeLines.splice(i, 1);
                
                numbersInLine.forEach(num => {
                    if (num !== lastNum) {
                        // Avoid duplicates if logic gets complex, though unlikely here
                        if (!state.activeStraights.includes(num)) {
                            state.activeStraights.push(num);
                        }
                    }
                });
            }
        }

        if (!won) {
            // LOSS RULE: Increase unit size
            state.multiplier += 1;
        } 
        
        // --- 4. PROFIT TAKING / RESET LOGIC ---
        const currentProfit = bankroll - state.startingBankroll;
        
        // Reset if:
        // 1. Profit > 50 units (Take profit)
        // 2. Multiplier > 8 (Stop loss/Safety cap)
        // 3. No bets left (Board cleared)
        if (currentProfit >= (MIN_CHIP * 50) || state.multiplier > 8 || (state.activeStraights.length === 0 && state.activeLines.length === 0)) {
             state.multiplier = 1;
             state.startingBankroll = bankroll;
             state.activeStraights = [2, 3, 5, 6, 8, 9];
             state.activeLines = [13, 19];
        }
    }

    // --- 5. CONSTRUCT BETS ---
    const bets = [];

    // Calculate dynamic bet amounts
    // Straight ups usually 1 unit base
    let straightAmount = MIN_CHIP * state.multiplier;
    // Lines usually 2 units base in this specific strategy video ("$2 bets")
    let lineAmount = MIN_CHIP * 2 * state.multiplier;

    // Clamp values to table limits
    straightAmount = Math.min(Math.max(straightAmount, config.betLimits.min), config.betLimits.max);
    lineAmount = Math.min(Math.max(lineAmount, config.betLimits.min), config.betLimits.max);

    // Add Straight Bets
    state.activeStraights.forEach(num => {
        bets.push({
            type: 'number',
            value: num,
            amount: straightAmount
        });
    });

    // Add Line Bets
    state.activeLines.forEach(lineStart => {
        bets.push({
            type: 'line',
            value: lineStart,
            amount: lineAmount
        });
    });

    return bets;
=======
/**
 * Strategy: Sure Money Pro (Shore Money Pro) - High Coverage / Elimination
 * * Source: 
 * Video: "BEST NEW ROULETTE STRATEGY FOR LOW ROLLERS | SURE MONEY PRO" 
 * Channel: Bet With Mo
 * URL: https://www.youtube.com/watch?v=3BH3VHoJbq0
 * * The Logic:
 * - Initial Setup: 
 * 1. Straight Up bets on the 1st Dozen: 2, 3, 5, 6, 8, 9.
 * 2. Double Street (Line) bets on the 2nd Dozen: 13-18 and 19-24.
 * This covers 18 numbers total (approx 50%).
 * * The Progression (Hybrid Progression & Elimination):
 * - ON WIN (Straight Up): Remove the winning number from the bet list (lock in profit).
 * - ON WIN (Line Bet): Remove the Line bet, but ADD the remaining 5 numbers from that line 
 * as individual Straight Up bets (Elimination logic). 
 * Example: Win on 15 (Line 13-18). Next spin: Remove Line 13-18. Add Straights on 13,14,16,17,18.
 * - ON LOSS: Increase the betting unit by 1 (Not Martingale, just linear increase: 1u -> 2u -> 3u).
 * - ON RESET: If a profit target is hit or the table is cleared significantly, reset to base.
 * * The Goal:
 * - Accumulate small wins rapidly.
 * - "Remove" numbers to reduce exposure while banking profit.
 * - Reset after +50 units profit or if the multiplier gets too high (Safety Cap).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPER DATA ---
    const MIN_CHIP = config.betLimits.min; 
    const MAX_BET = config.betLimits.max;
    
    // Definition of the Line bets used in this strategy
    const LINES = {
        13: [13, 14, 15, 16, 17, 18], // Line covering 13-18
        19: [19, 20, 21, 22, 23, 24]  // Line covering 19-24
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.multiplier = 1;
        state.startingBankroll = bankroll;
        // Initial specific straight bets (1st Dozen pattern)
        state.activeStraights = [2, 3, 5, 6, 8, 9]; 
        // Initial line bets (2nd Dozen coverage)
        state.activeLines = [13, 19]; 
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS RESULT (If exists) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        let won = false;

        // Check if we hit a straight up
        const straightIndex = state.activeStraights.indexOf(lastNum);
        if (straightIndex !== -1) {
            won = true;
            // WIN RULE: Remove the number (Hunting/Elimination)
            state.activeStraights.splice(straightIndex, 1);
            // Reset multiplier on win or keep? Video implies keeping unless reset, 
            // but for safety, we often reduce. We will keep current flow: 
            // If win, we don't increase multiplier. We just remove coverage.
        }

        // Check if we hit a line
        // We iterate backwards to allow splicing if needed
        for (let i = state.activeLines.length - 1; i >= 0; i--) {
            const lineStart = state.activeLines[i];
            const numbersInLine = LINES[lineStart];
            
            if (numbersInLine.includes(lastNum)) {
                won = true;
                // WIN RULE FOR LINE: 
                // 1. Remove the Line bet.
                // 2. Add the REMAINING numbers in that line as Straight Ups.
                state.activeLines.splice(i, 1);
                
                numbersInLine.forEach(num => {
                    if (num !== lastNum) {
                        // Avoid duplicates if logic gets complex, though unlikely here
                        if (!state.activeStraights.includes(num)) {
                            state.activeStraights.push(num);
                        }
                    }
                });
            }
        }

        if (!won) {
            // LOSS RULE: Increase unit size
            state.multiplier += 1;
        } 
        
        // --- 4. PROFIT TAKING / RESET LOGIC ---
        const currentProfit = bankroll - state.startingBankroll;
        
        // Reset if:
        // 1. Profit > 50 units (Take profit)
        // 2. Multiplier > 8 (Stop loss/Safety cap)
        // 3. No bets left (Board cleared)
        if (currentProfit >= (MIN_CHIP * 50) || state.multiplier > 8 || (state.activeStraights.length === 0 && state.activeLines.length === 0)) {
             state.multiplier = 1;
             state.startingBankroll = bankroll;
             state.activeStraights = [2, 3, 5, 6, 8, 9];
             state.activeLines = [13, 19];
        }
    }

    // --- 5. CONSTRUCT BETS ---
    const bets = [];

    // Calculate dynamic bet amounts
    // Straight ups usually 1 unit base
    let straightAmount = MIN_CHIP * state.multiplier;
    // Lines usually 2 units base in this specific strategy video ("$2 bets")
    let lineAmount = MIN_CHIP * 2 * state.multiplier;

    // Clamp values to table limits
    straightAmount = Math.min(Math.max(straightAmount, config.betLimits.min), config.betLimits.max);
    lineAmount = Math.min(Math.max(lineAmount, config.betLimits.min), config.betLimits.max);

    // Add Straight Bets
    state.activeStraights.forEach(num => {
        bets.push({
            type: 'number',
            value: num,
            amount: straightAmount
        });
    });

    // Add Line Bets
    state.activeLines.forEach(lineStart => {
        bets.push({
            type: 'line',
            value: lineStart,
            amount: lineAmount
        });
    });

    return bets;
>>>>>>> origin/main
}