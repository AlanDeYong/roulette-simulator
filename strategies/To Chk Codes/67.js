
/**
 * Strategy: The "67" Roulette System
 * * Source: Casino Matchmaker - "Six Seven Isn’t Just a Meme… This Roulette Strategy Is Actually Smart"
 * Video URL: https://www.youtube.com/watch?v=OWwjiZpGJ0c
 * * --- THE LOGIC ---
 * This strategy relies on covering 24 numbers (approx 64% of the wheel) using a specific ratio
 * to balance wins and losses.
 * * The Setup (Base Unit Ratio):
 * 1. Even Money Bet: 6 Units on 'Even'
 * 2. Column Bet: 7 Units on Column 3 (Top/Right: 3, 6, 9...)
 * 3. Column Bet: 7 Units on Column 2 (Middle: 2, 5, 8...)
 * Total Base Bet: 20 Units.
 * * Outcome Scenarios:
 * 1. Jackpot Win: Even Number + (Col 2 or Col 3). Pays big.
 * 2. Small Win: Even Number + Col 1. Small profit/break-even.
 * 3. Partial Loss: Odd Number + (Col 2 or Col 3). Lose 'Even' stake, win 'Column'. Small loss.
 * 4. Full Whack: Odd Number + Col 1 (or Zero). Lose everything.
 * * --- THE PROGRESSION ---
 * 1. On Start/Reset: Level 1.
 * 2. On Partial Loss: Do NOTHING. Maintain current bet level.
 * 3. On Win: Check session profit. If Bankroll > Session Start, Reset to Level 1.
 * - Optional "Layering Out": If high level and hit a Jackpot win, reduce level by 1.
 * 4. On Full Whack (Total Loss): Increase Level by +2. 
 * (e.g., Level 1 -> Level 3. This triples the bet to recover the "Whack").
 * * --- THE GOAL ---
 * Target: End the session in profit (Bankroll > Starting Bankroll).
 * Stop Loss: Implicitly defined by bankroll exhaustion, but this code respects max bet limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPER FUNCTIONS ---
    
    // Define the base ratio 6:7:7
    const RATIOS = {
        even: 6,
        col2: 7,
        col3: 7
    };

    // Helper to calculate bet amount while respecting strict limits
    const getSafeAmount = (baseUnits, level) => {
        // Use minOutside as the base multiplier ($1 equivalent)
        const unitValue = config.betLimits.minOutside || 1; 
        let amount = baseUnits * level * unitValue;
        
        // Clamp to limits
        amount = Math.max(amount, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);
        return amount;
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 1;              // Current progression level
        state.startBankroll = bankroll; // Remember starting balance for profit check
        state.initialized = true;
        // console.log(`[67 Strategy] Initialized. Target: > ${state.startBankroll}`);
    }

    // --- 3. ANALYZE PREVIOUS SPIN (If available) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        // Determine properties of the result
        const isZero = (num === 0 || num === '0' || num === '00');
        const isEven = (!isZero && num % 2 === 0);
        
        // Columns: 
        // Col 1: 1, 4, 7... (num % 3 === 1) -> LOSING COLUMN
        // Col 2: 2, 5, 8... (num % 3 === 2) -> BETTING COLUMN
        // Col 3: 3, 6, 9... (num % 3 === 0) -> BETTING COLUMN
        const isCol1 = (!isZero && num % 3 === 1);
        const isCol2 = (!isZero && num % 3 === 2);
        const isCol3 = (!isZero && num % 3 === 0);

        // Logic Determination
        let isFullWhack = false;
        let isJackpot = false;
        let isPartialLoss = false;

        if (isZero || (isCol1 && !isEven)) {
            // Odd number in Col 1, or Zero = Lost everything
            isFullWhack = true;
        } else if (isEven && (isCol2 || isCol3)) {
            // Even number in a betting column = Jackpot
            isJackpot = true;
        } else if (!isEven && (isCol2 || isCol3)) {
            // Odd number in a betting column = Partial Loss (Won column, lost Even)
            isPartialLoss = true;
        } 
        // Note: Even + Col 1 is a "Small Win", logic stays same (no change)

        // --- 4. APPLY PROGRESSION LOGIC ---

        // RULE 1: Check for Session Profit (The "Strict" Reset)
        if (bankroll > state.startBankroll) {
            // console.log(`[67 Strategy] In Profit (${bankroll}). Resetting to Level 1.`);
            state.level = 1;
        } 
        else if (isFullWhack) {
            // RULE 2: Full Whack -> Increase by 2 Levels
            state.level += 2;
            // console.log(`[67 Strategy] Full Whack on ${num}. Increasing to Level ${state.level}`);
        } 
        else if (isJackpot && state.level > 1) {
            // RULE 3: "Layering Out" -> If we hit a jackpot but aren't in total profit yet,
            // reduce risk slightly to lock in gains.
            state.level = Math.max(1, state.level - 1);
            // console.log(`[67 Strategy] Jackpot on ${num}. Layering down to Level ${state.level}`);
        }
        else if (isPartialLoss) {
            // RULE 4: Partial Loss -> Hold steady. Do not increase.
            // console.log(`[67 Strategy] Partial Loss on ${num}. Holding Level ${state.level}`);
        }
    }

    // --- 5. CONSTRUCT BETS ---
    
    // Calculate amounts based on current level
    const evenAmount = getSafeAmount(RATIOS.even, state.level);
    const col2Amount = getSafeAmount(RATIOS.col2, state.level);
    const col3Amount = getSafeAmount(RATIOS.col3, state.level);

    // Verify bankroll capability (Prevent negative betting)
    const totalBet = evenAmount + col2Amount + col3Amount;
    if (totalBet > bankroll) {
        // console.log("[67 Strategy] Insufficient funds for full strategy. Stopping.");
        return []; 
    }

    const bets = [
        { type: 'even', amount: evenAmount },       // The "6"
        { type: 'column', value: 2, amount: col2Amount }, // The "7" (Middle)
        { type: 'column', value: 3, amount: col3Amount }  // The "7" (Top)
    ];

    return bets;

}