<<<<<<< HEAD
/**
 * STRATEGY: Basier's "Golden Circle" System
 * * SOURCE:
 * - Video: "CRAZY GOOD! SUBSCRIBER WINS DAILY(GOLDEN CIRCLE ROULETTE)"
 * - Channel: The Roulette Master
 * - URL: https://youtu.be/Uihq0kvi4e0
 * * THE LOGIC:
 * This strategy relies on covering a significant portion of the wheel (approx 24 numbers)
 * using a combination of Inside Bets with weighted units. It focuses on the "Golden Circle"
 * (visually central numbers on the layout) to create frequent wins.
 * * The Setup (24 Numbers covered):
 * 1. Double Streets (Lines): 2 specific lines (3 units each).
 * 2. Corners: 4 specific corners (2 units each).
 * 3. Splits: 2 specific splits (1 unit each).
 * * THE PROGRESSION (Hybrid Martingale/Linear):
 * 1. Base Level: 1.
 * 2. On Win: Check total bankroll. If it is a new "All Time High" (ATH), reset to Base Level 1.
 * 3. On Loss:
 * - If it is the 1st Loss in a sequence: DOUBLE the bet level (Martingale).
 * - If it is the 2nd+ Loss in a sequence: Add +1 to the bet level (Linear).
 * * THE GOAL:
 * - Grind small profits using high coverage.
 * - Survive variance by switching to linear progression after the first double.
 * - Stop Loss: Determined by bankroll depletion.
 * - Take Profit: Reset to base bet immediately upon reaching a new bankroll high.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // -------------------------------------------------------------------------
    // 1. INITIALIZATION & STATE MANAGEMENT
    // -------------------------------------------------------------------------
    
    // Initialize state variables on the very first run
    if (!state.initialized) {
        state.currentLevel = 1;          // The multiplier for the base unit
        state.lossSequence = 0;          // How many losses in a row
        state.maxBankroll = bankroll;    // Track highest bankroll to trigger resets
        state.lastTotalBet = 0;          // To calculate Net Win/Loss
        state.historyLog = [];           // For logging
        state.initialized = true;
    }

    // Determine Base Unit (Inside Bet Minimum)
    const unit = config.betLimits.min;

    // -------------------------------------------------------------------------
    // 2. ANALYZE PREVIOUS SPIN (If available)
    // -------------------------------------------------------------------------
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Use a simple heuristic to determine win/loss based on bankroll change
        // (Current Bankroll - Previous Bankroll including the bet cost)
        // Since 'bankroll' passed in is *current*, we compare it to what we expect.
        // However, a simpler way is checking if bankroll went up or down vs previous high.
        
        // Calculate Net Result: (Current Bankroll) - (Bankroll before last spin)
        // Note: In many simulator contexts, we don't have 'prevBankroll' unless we save it.
        // Let's rely on the strategy logic: if Bankroll > state.maxBankroll, we won significantly.
        
        const isWin = bankroll > (state.maxBankroll - state.lastTotalBet); // Approximation logic
        // A more accurate win check would require calculating the payout of the specific numbers hit.
        // For this strategy, we will assume:
        // If Bankroll > state.maxBankroll -> We recovered or profited -> RESET
        // If Bankroll < state.maxBankroll -> We are in a drawdown -> PROGRESS
        
        if (bankroll >= state.maxBankroll) {
            // --- WIN / RECOVERY CONDITION ---
            state.currentLevel = 1;
            state.lossSequence = 0;
            state.maxBankroll = bankroll; // Update High Score
        } else {
            // --- LOSS / DRAWDOWN CONDITION ---
            // If the bankroll dropped, we assume a loss or insufficient win.
            
            // Logic: 
            // 1. First loss (or drop from high) -> Double
            // 2. Subsequent losses -> Linear Add (+1)
            
            if (state.lossSequence === 0) {
                // First drop triggers the Double
                state.currentLevel = state.currentLevel * 2;
                state.lossSequence = 1;
            } else {
                // Subsequent drops trigger Linear increase
                state.currentLevel = state.currentLevel + 1;
                state.lossSequence++;
            }
        }
    }

    // -------------------------------------------------------------------------
    // 3. DEFINE THE "GOLDEN CIRCLE" BET CONFIGURATION
    // -------------------------------------------------------------------------
    // Based on the video, we construct a layout covering ~24 numbers.
    // Weights: Line=3, Corner=2, Split=1.
    
    const bettingPattern = [
        // --- Double Streets (Lines) - Weight 3 ---
        // Covers 13-18 and 31-36 (Examples of "Middle" and "Bottom" coverage)
        { type: 'line', value: 13, weight: 3 }, 
        { type: 'line', value: 31, weight: 3 }, 

        // --- Corners - Weight 2 ---
        // Placing corners to cover gaps in the middle
        { type: 'corner', value: 4, weight: 2 },  // Covers 4, 5, 7, 8
        { type: 'corner', value: 8, weight: 2 },  // Covers 8, 9, 11, 12
        { type: 'corner', value: 20, weight: 2 }, // Covers 20, 21, 23, 24
        { type: 'corner', value: 26, weight: 2 }, // Covers 26, 27, 29, 30

        // --- Splits - Weight 1 ---
        // Specific targeting
        { type: 'split', value: [0, 2], weight: 1 }, // Zero protection
        { type: 'split', value: [10, 11], weight: 1 }
    ];

    // -------------------------------------------------------------------------
    // 4. CALCULATE BETS & RESPECT LIMITS
    // -------------------------------------------------------------------------
    let bets = [];
    let currentTotalBet = 0;

    for (let item of bettingPattern) {
        // Calculate raw amount: Unit * Weight * Level
        let rawAmount = unit * item.weight * state.currentLevel;

        // CLAMP: Ensure bet is within table limits
        // 1. Min Limit (Inside bets)
        let finalAmount = Math.max(rawAmount, config.betLimits.min);
        
        // 2. Max Limit
        finalAmount = Math.min(finalAmount, config.betLimits.max);

        // Add to bet list
        bets.push({
            type: item.type,
            value: item.value,
            amount: finalAmount
        });
        
        currentTotalBet += finalAmount;
    }

    // Save total bet to state for next spin calculation
    state.lastTotalBet = currentTotalBet;

    // -------------------------------------------------------------------------
    // 5. LOGGING (PERIODIC SAVE)
    // -------------------------------------------------------------------------
    // Log current status for debugging
    state.historyLog.push(
        `Spin: ${spinHistory.length} | Bank: ${bankroll} | Lvl: ${state.currentLevel} | LossSeq: ${state.lossSequence}`
    );

    // Save to file every 50 spins to avoid network congestion
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        // Create a string blob from the array
        const logContent = state.historyLog.join('\n');
        
        // Clear the array to free memory (optional, or keep appending)
        // state.historyLog = []; 
        
        // Call Utils (Returns a Promise, but we don't await it here to avoid blocking)
        utils.saveFile("strategy-golden-circle-log.txt", logContent)
            .catch(err => console.error("Save failed", err));
    }

    return bets;
=======
/**
 * STRATEGY: Basier's "Golden Circle" System
 * * SOURCE:
 * - Video: "CRAZY GOOD! SUBSCRIBER WINS DAILY(GOLDEN CIRCLE ROULETTE)"
 * - Channel: The Roulette Master
 * - URL: https://youtu.be/Uihq0kvi4e0
 * * THE LOGIC:
 * This strategy relies on covering a significant portion of the wheel (approx 24 numbers)
 * using a combination of Inside Bets with weighted units. It focuses on the "Golden Circle"
 * (visually central numbers on the layout) to create frequent wins.
 * * The Setup (24 Numbers covered):
 * 1. Double Streets (Lines): 2 specific lines (3 units each).
 * 2. Corners: 4 specific corners (2 units each).
 * 3. Splits: 2 specific splits (1 unit each).
 * * THE PROGRESSION (Hybrid Martingale/Linear):
 * 1. Base Level: 1.
 * 2. On Win: Check total bankroll. If it is a new "All Time High" (ATH), reset to Base Level 1.
 * 3. On Loss:
 * - If it is the 1st Loss in a sequence: DOUBLE the bet level (Martingale).
 * - If it is the 2nd+ Loss in a sequence: Add +1 to the bet level (Linear).
 * * THE GOAL:
 * - Grind small profits using high coverage.
 * - Survive variance by switching to linear progression after the first double.
 * - Stop Loss: Determined by bankroll depletion.
 * - Take Profit: Reset to base bet immediately upon reaching a new bankroll high.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // -------------------------------------------------------------------------
    // 1. INITIALIZATION & STATE MANAGEMENT
    // -------------------------------------------------------------------------
    
    // Initialize state variables on the very first run
    if (!state.initialized) {
        state.currentLevel = 1;          // The multiplier for the base unit
        state.lossSequence = 0;          // How many losses in a row
        state.maxBankroll = bankroll;    // Track highest bankroll to trigger resets
        state.lastTotalBet = 0;          // To calculate Net Win/Loss
        state.historyLog = [];           // For logging
        state.initialized = true;
    }

    // Determine Base Unit (Inside Bet Minimum)
    const unit = config.betLimits.min;

    // -------------------------------------------------------------------------
    // 2. ANALYZE PREVIOUS SPIN (If available)
    // -------------------------------------------------------------------------
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Use a simple heuristic to determine win/loss based on bankroll change
        // (Current Bankroll - Previous Bankroll including the bet cost)
        // Since 'bankroll' passed in is *current*, we compare it to what we expect.
        // However, a simpler way is checking if bankroll went up or down vs previous high.
        
        // Calculate Net Result: (Current Bankroll) - (Bankroll before last spin)
        // Note: In many simulator contexts, we don't have 'prevBankroll' unless we save it.
        // Let's rely on the strategy logic: if Bankroll > state.maxBankroll, we won significantly.
        
        const isWin = bankroll > (state.maxBankroll - state.lastTotalBet); // Approximation logic
        // A more accurate win check would require calculating the payout of the specific numbers hit.
        // For this strategy, we will assume:
        // If Bankroll > state.maxBankroll -> We recovered or profited -> RESET
        // If Bankroll < state.maxBankroll -> We are in a drawdown -> PROGRESS
        
        if (bankroll >= state.maxBankroll) {
            // --- WIN / RECOVERY CONDITION ---
            state.currentLevel = 1;
            state.lossSequence = 0;
            state.maxBankroll = bankroll; // Update High Score
        } else {
            // --- LOSS / DRAWDOWN CONDITION ---
            // If the bankroll dropped, we assume a loss or insufficient win.
            
            // Logic: 
            // 1. First loss (or drop from high) -> Double
            // 2. Subsequent losses -> Linear Add (+1)
            
            if (state.lossSequence === 0) {
                // First drop triggers the Double
                state.currentLevel = state.currentLevel * 2;
                state.lossSequence = 1;
            } else {
                // Subsequent drops trigger Linear increase
                state.currentLevel = state.currentLevel + 1;
                state.lossSequence++;
            }
        }
    }

    // -------------------------------------------------------------------------
    // 3. DEFINE THE "GOLDEN CIRCLE" BET CONFIGURATION
    // -------------------------------------------------------------------------
    // Based on the video, we construct a layout covering ~24 numbers.
    // Weights: Line=3, Corner=2, Split=1.
    
    const bettingPattern = [
        // --- Double Streets (Lines) - Weight 3 ---
        // Covers 13-18 and 31-36 (Examples of "Middle" and "Bottom" coverage)
        { type: 'line', value: 13, weight: 3 }, 
        { type: 'line', value: 31, weight: 3 }, 

        // --- Corners - Weight 2 ---
        // Placing corners to cover gaps in the middle
        { type: 'corner', value: 4, weight: 2 },  // Covers 4, 5, 7, 8
        { type: 'corner', value: 8, weight: 2 },  // Covers 8, 9, 11, 12
        { type: 'corner', value: 20, weight: 2 }, // Covers 20, 21, 23, 24
        { type: 'corner', value: 26, weight: 2 }, // Covers 26, 27, 29, 30

        // --- Splits - Weight 1 ---
        // Specific targeting
        { type: 'split', value: [0, 2], weight: 1 }, // Zero protection
        { type: 'split', value: [10, 11], weight: 1 }
    ];

    // -------------------------------------------------------------------------
    // 4. CALCULATE BETS & RESPECT LIMITS
    // -------------------------------------------------------------------------
    let bets = [];
    let currentTotalBet = 0;

    for (let item of bettingPattern) {
        // Calculate raw amount: Unit * Weight * Level
        let rawAmount = unit * item.weight * state.currentLevel;

        // CLAMP: Ensure bet is within table limits
        // 1. Min Limit (Inside bets)
        let finalAmount = Math.max(rawAmount, config.betLimits.min);
        
        // 2. Max Limit
        finalAmount = Math.min(finalAmount, config.betLimits.max);

        // Add to bet list
        bets.push({
            type: item.type,
            value: item.value,
            amount: finalAmount
        });
        
        currentTotalBet += finalAmount;
    }

    // Save total bet to state for next spin calculation
    state.lastTotalBet = currentTotalBet;

    // -------------------------------------------------------------------------
    // 5. LOGGING (PERIODIC SAVE)
    // -------------------------------------------------------------------------
    // Log current status for debugging
    state.historyLog.push(
        `Spin: ${spinHistory.length} | Bank: ${bankroll} | Lvl: ${state.currentLevel} | LossSeq: ${state.lossSequence}`
    );

    // Save to file every 50 spins to avoid network congestion
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        // Create a string blob from the array
        const logContent = state.historyLog.join('\n');
        
        // Clear the array to free memory (optional, or keep appending)
        // state.historyLog = []; 
        
        // Call Utils (Returns a Promise, but we don't await it here to avoid blocking)
        utils.saveFile("strategy-golden-circle-log.txt", logContent)
            .catch(err => console.error("Save failed", err));
    }

    return bets;
>>>>>>> origin/main
}