<<<<<<< HEAD
/**
 * STEADY ANCHOR ROULETTE STRATEGY
 * * Source: 
 * YouTube: The Roulette Master
 * Video: "I LOVE THE NEW STEADY ANCHOR ROULETTE SYSTEM!" (https://www.youtube.com/watch?v=JEqjo2Rf05w)
 * * The Logic:
 * This is a high-coverage hedging strategy designed to cover most outcomes while betting heavily on Black.
 * 1. Heavy Bet on Black (Pays 1:1).
 * 2. Hedge Bet on Column 3 (Pays 2:1). Column 3 contains 8 Red numbers, acting as a "shield" against Red losses.
 * 3. 4 "Anchor" bets on specific Black numbers located in Col 1 or Col 2 (Pays 35:1).
 * * The Ratios (Base Unit):
 * - Black: 40 units
 * - Column 3: 12 units
 * - 4 Single Numbers: 1 unit each
 * - Total Base Bet: 56 units
 * * The Progression (Arithmetic / Flat Hold):
 * 1. Win (Black hits, or Anchor number hits): 
 * - Reset to Level 1.
 * 2. Partial Loss (Red hits in Column 3): 
 * - This is the "Anchor" effect. You lose the Black bet but win the Column bet, mitigating the loss.
 * - Action: Do NOT increase bets. Repeat the same bet level.
 * 3. Full Loss (Red in Col 1/2 or Zero): 
 * - Action: Increase level by +1 (Add one base unit to all bets).
 * - Example: Level 1 -> Level 2 -> Level 3.
 * * The Goal:
 * - Grind steady profit using the high win rate of Black + Col 3 Red coverage.
 * - Reset to base bets immediately upon securing a profit for the round.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & SETUP ---
    
    // Define the specific ratios from the strategy
    const RATIO_BLACK = 40;
    const RATIO_COL3 = 12;
    const RATIO_SINGLE = 1;

    // Define the 4 "Anchor" numbers (Black numbers NOT in Column 3)
    // Col 3 contains: 6, 15, 24, 33 (Blacks). We must avoid these.
    // We pick 4 classic Black numbers from Col 1 & 2.
    const ANCHOR_NUMBERS = [8, 11, 26, 29]; 

    // Helper to calculate bets based on level
    const calculateBets = (level) => {
        // Determine base unit based on minimum limits.
        // We use 'min' for single numbers. 
        const unit = config.betLimits.min; 
        
        let blackAmount = unit * RATIO_BLACK * level;
        let colAmount = unit * RATIO_COL3 * level;
        let singleAmount = unit * RATIO_SINGLE * level;

        // Respect Limits (Clamping)
        // Ensure Outside bets meet minOutside
        blackAmount = Math.max(blackAmount, config.betLimits.minOutside);
        colAmount = Math.max(colAmount, config.betLimits.minOutside);
        
        // Ensure Max Limit is not exceeded
        blackAmount = Math.min(blackAmount, config.betLimits.max);
        colAmount = Math.min(colAmount, config.betLimits.max);
        singleAmount = Math.min(singleAmount, config.betLimits.max);

        const bets = [];
        
        // 1. Bet on Black
        bets.push({ type: 'black', amount: blackAmount });
        
        // 2. Bet on Column 3
        bets.push({ type: 'column', value: 3, amount: colAmount });
        
        // 3. Bet on Anchor Numbers
        ANCHOR_NUMBERS.forEach(num => {
            bets.push({ type: 'number', value: num, amount: singleAmount });
        });

        return bets;
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.level) state.level = 1;
    if (!state.previousBankroll) state.previousBankroll = bankroll;
    if (!state.logBuffer) state.logBuffer = [];
    if (!state.totalSpins) state.totalSpins = 0;

    // --- 3. PROGRESSION LOGIC ---
    
    // Only process logic if we have history (not the very first spin)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const wonLastSpin = bankroll > state.previousBankroll;
        
        // Strategy Specific Logic:
        if (wonLastSpin) {
            // WIN: Reset to base
            state.level = 1;
            state.logBuffer.push(`Spin ${spinHistory.length}: WIN (${lastSpin.winningNumber}). Resetting to Level 1.`);
        } else {
            // LOSS: Determine if Partial or Full
            
            // Check if the number is Red AND in Column 3 (The "Hedge" / Partial Loss)
            // Column 3 numbers where result % 3 === 0
            const isCol3 = (lastSpin.winningNumber !== 0 && lastSpin.winningNumber % 3 === 0);
            const isRed = (lastSpin.winningColor === 'red');
            
            if (isCol3 && isRed) {
                // PARTIAL LOSS: Hold level
                // (Strategy says: "We don't increase on those ones")
                state.logBuffer.push(`Spin ${spinHistory.length}: PARTIAL LOSS (Red Col 3). Holding Level ${state.level}.`);
            } else {
                // FULL LOSS: Increase level
                state.level += 1;
                state.logBuffer.push(`Spin ${spinHistory.length}: FULL LOSS. Increasing to Level ${state.level}.`);
            }
        }
    }

    // Update bankroll tracking for next spin comparison
    state.previousBankroll = bankroll;
    state.totalSpins++;

    // --- 4. LOGGING (PERIODIC) ---
    // Save logs every 50 spins to prevent network congestion
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        const logContent = state.logBuffer.join('\n');
        utils.saveFile(`steady_anchor_log_${Date.now()}.txt`, logContent)
            .then(() => {
                // Clear buffer after successful save to save memory
                state.logBuffer = []; 
            })
            .catch(err => console.error("Failed to save log:", err));
    }

    // --- 5. GENERATE BETS ---
    const nextBets = calculateBets(state.level);

    return nextBets;
=======
/**
 * STEADY ANCHOR ROULETTE STRATEGY
 * * Source: 
 * YouTube: The Roulette Master
 * Video: "I LOVE THE NEW STEADY ANCHOR ROULETTE SYSTEM!" (https://www.youtube.com/watch?v=JEqjo2Rf05w)
 * * The Logic:
 * This is a high-coverage hedging strategy designed to cover most outcomes while betting heavily on Black.
 * 1. Heavy Bet on Black (Pays 1:1).
 * 2. Hedge Bet on Column 3 (Pays 2:1). Column 3 contains 8 Red numbers, acting as a "shield" against Red losses.
 * 3. 4 "Anchor" bets on specific Black numbers located in Col 1 or Col 2 (Pays 35:1).
 * * The Ratios (Base Unit):
 * - Black: 40 units
 * - Column 3: 12 units
 * - 4 Single Numbers: 1 unit each
 * - Total Base Bet: 56 units
 * * The Progression (Arithmetic / Flat Hold):
 * 1. Win (Black hits, or Anchor number hits): 
 * - Reset to Level 1.
 * 2. Partial Loss (Red hits in Column 3): 
 * - This is the "Anchor" effect. You lose the Black bet but win the Column bet, mitigating the loss.
 * - Action: Do NOT increase bets. Repeat the same bet level.
 * 3. Full Loss (Red in Col 1/2 or Zero): 
 * - Action: Increase level by +1 (Add one base unit to all bets).
 * - Example: Level 1 -> Level 2 -> Level 3.
 * * The Goal:
 * - Grind steady profit using the high win rate of Black + Col 3 Red coverage.
 * - Reset to base bets immediately upon securing a profit for the round.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & SETUP ---
    
    // Define the specific ratios from the strategy
    const RATIO_BLACK = 40;
    const RATIO_COL3 = 12;
    const RATIO_SINGLE = 1;

    // Define the 4 "Anchor" numbers (Black numbers NOT in Column 3)
    // Col 3 contains: 6, 15, 24, 33 (Blacks). We must avoid these.
    // We pick 4 classic Black numbers from Col 1 & 2.
    const ANCHOR_NUMBERS = [8, 11, 26, 29]; 

    // Helper to calculate bets based on level
    const calculateBets = (level) => {
        // Determine base unit based on minimum limits.
        // We use 'min' for single numbers. 
        const unit = config.betLimits.min; 
        
        let blackAmount = unit * RATIO_BLACK * level;
        let colAmount = unit * RATIO_COL3 * level;
        let singleAmount = unit * RATIO_SINGLE * level;

        // Respect Limits (Clamping)
        // Ensure Outside bets meet minOutside
        blackAmount = Math.max(blackAmount, config.betLimits.minOutside);
        colAmount = Math.max(colAmount, config.betLimits.minOutside);
        
        // Ensure Max Limit is not exceeded
        blackAmount = Math.min(blackAmount, config.betLimits.max);
        colAmount = Math.min(colAmount, config.betLimits.max);
        singleAmount = Math.min(singleAmount, config.betLimits.max);

        const bets = [];
        
        // 1. Bet on Black
        bets.push({ type: 'black', amount: blackAmount });
        
        // 2. Bet on Column 3
        bets.push({ type: 'column', value: 3, amount: colAmount });
        
        // 3. Bet on Anchor Numbers
        ANCHOR_NUMBERS.forEach(num => {
            bets.push({ type: 'number', value: num, amount: singleAmount });
        });

        return bets;
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.level) state.level = 1;
    if (!state.previousBankroll) state.previousBankroll = bankroll;
    if (!state.logBuffer) state.logBuffer = [];
    if (!state.totalSpins) state.totalSpins = 0;

    // --- 3. PROGRESSION LOGIC ---
    
    // Only process logic if we have history (not the very first spin)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const wonLastSpin = bankroll > state.previousBankroll;
        
        // Strategy Specific Logic:
        if (wonLastSpin) {
            // WIN: Reset to base
            state.level = 1;
            state.logBuffer.push(`Spin ${spinHistory.length}: WIN (${lastSpin.winningNumber}). Resetting to Level 1.`);
        } else {
            // LOSS: Determine if Partial or Full
            
            // Check if the number is Red AND in Column 3 (The "Hedge" / Partial Loss)
            // Column 3 numbers where result % 3 === 0
            const isCol3 = (lastSpin.winningNumber !== 0 && lastSpin.winningNumber % 3 === 0);
            const isRed = (lastSpin.winningColor === 'red');
            
            if (isCol3 && isRed) {
                // PARTIAL LOSS: Hold level
                // (Strategy says: "We don't increase on those ones")
                state.logBuffer.push(`Spin ${spinHistory.length}: PARTIAL LOSS (Red Col 3). Holding Level ${state.level}.`);
            } else {
                // FULL LOSS: Increase level
                state.level += 1;
                state.logBuffer.push(`Spin ${spinHistory.length}: FULL LOSS. Increasing to Level ${state.level}.`);
            }
        }
    }

    // Update bankroll tracking for next spin comparison
    state.previousBankroll = bankroll;
    state.totalSpins++;

    // --- 4. LOGGING (PERIODIC) ---
    // Save logs every 50 spins to prevent network congestion
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        const logContent = state.logBuffer.join('\n');
        utils.saveFile(`steady_anchor_log_${Date.now()}.txt`, logContent)
            .then(() => {
                // Clear buffer after successful save to save memory
                state.logBuffer = []; 
            })
            .catch(err => console.error("Failed to save log:", err));
    }

    // --- 5. GENERATE BETS ---
    const nextBets = calculateBets(state.level);

    return nextBets;
>>>>>>> origin/main
}