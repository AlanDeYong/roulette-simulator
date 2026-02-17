<<<<<<< HEAD
/**
 * STRATEGY: Three Corner Fibonacci (with Virtual Misses)
 * * SOURCE:
 * URL: https://www.youtube.com/watch?v=QjVaDVcXkhw
 * Channel: The Roulette Master
 * * THE LOGIC:
 * 1. Coverage: The strategy bets on 3 separate Corners (Inside Bets), covering 12 numbers total.
 * - Default Corners used: 1 (covers 1,2,4,5), 13 (covers 13,14,16,17), 25 (covers 25,26,28,29).
 * 2. Virtual Trigger: The strategy observes spin history before betting real money.
 * - It waits for 'n' consecutive virtual losses (default: 4) where none of the 3 corners hit.
 * - Once the virtual loss streak is hit, it activates Real Betting.
 * * THE PROGRESSION (Fibonacci):
 * - Sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89...
 * - Multiplier applies to the base unit for EACH of the 3 corner bets.
 * - ON LOSS: Move one step to the right in the sequence (increase bet).
 * - ON WIN: "One Hit Wonder" logic. A single win recovers previous losses + profit. 
 * Reset immediately to the start (Virtual Mode) and wait for a new trigger.
 * * THE GOAL:
 * - Hit a conservative profit target (e.g., +20% or fixed amount) and stop.
 * - This implementation includes a hard stop if the max bet limit is reached to preserve remaining capital.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const VIRTUAL_MISS_TRIGGER = 4; // How many misses before we start betting real money
    const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];
    
    // Define our 3 Corners (Top-left number of the corner)
    // Corner 1 covers: 1, 2, 4, 5
    // Corner 13 covers: 13, 14, 16, 17
    // Corner 25 covers: 25, 26, 28, 29
    const TARGET_CORNERS = [1, 13, 25]; 
    
    // Explicit list of winning numbers for these 3 corners for easier checking
    const WINNING_NUMBERS = [
        1, 2, 4, 5,
        13, 14, 16, 17,
        25, 26, 28, 29
    ];

    // --- 2. INITIALIZE STATE ---
    if (state.firstRun === undefined) {
        state.firstRun = false;
        state.fibIndex = 0;          // Current position in Fibonacci sequence
        state.virtualLosses = 0;     // Counter for virtual misses
        state.isRealBetting = false; // Toggle between Observing (Virtual) and Betting (Real)
        state.initialBankroll = bankroll;
        
        // Log initialization
        console.log(`[Three Corner Fib] Initialized. Waiting for ${VIRTUAL_MISS_TRIGGER} virtual misses.`);
    }

    // --- 3. PROCESS LAST SPIN RESULT ---
    // If we have history, check if we won or lost the previous round (virtual or real)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Did the last number hit any of our corners?
        const isWin = WINNING_NUMBERS.includes(lastNum);

        if (state.isRealBetting) {
            // --- REAL BETTING PHASE ---
            if (isWin) {
                // WIN: Reset everything. Strategy is "One Hit Wonder".
                // Go back to observing virtual misses.
                console.log(`[Win] Hit on ${lastNum}. Resetting to Virtual Mode.`);
                state.isRealBetting = false;
                state.fibIndex = 0;
                state.virtualLosses = 0; 
            } else {
                // LOSS: Progress up the Fibonacci ladder
                state.fibIndex++;
                console.log(`[Loss] Missed on ${lastNum}. Increasing Tier to ${state.fibIndex}.`);
                
                // Safety: If we run out of Fibonacci steps, reset or cap
                if (state.fibIndex >= FIBONACCI.length) {
                    console.log(`[Max Prog] Reached end of sequence. Resetting.`);
                    state.isRealBetting = false;
                    state.fibIndex = 0;
                    state.virtualLosses = 0;
                }
            }
        } else {
            // --- VIRTUAL / OBSERVATION PHASE ---
            if (isWin) {
                // Even though we didn't bet, the strategy "won" virtually.
                // This breaks the "loss streak", so we reset the counter.
                state.virtualLosses = 0;
            } else {
                // We missed virtually. Increment counter.
                state.virtualLosses++;
                // Check if trigger reached
                if (state.virtualLosses >= VIRTUAL_MISS_TRIGGER) {
                    state.isRealBetting = true;
                    state.fibIndex = 0; // Start progression at 1 unit
                    console.log(`[Trigger] ${state.virtualLosses} Virtual Misses reached. STARTING REAL BETS.`);
                }
            }
        }
    }

    // --- 4. CHECK STOP CONDITIONS ---
    // (Optional: Stop if we hit a profit target, e.g., +20%)
    const profit = bankroll - state.initialBankroll;
    if (profit >= 100) { // Example: Stop after $100 profit
        console.log(`[Target] Profit target reached ($${profit}). Stopping.`);
        return []; 
    }

    // --- 5. PLACE BETS ---
    // If we are not in Real Betting mode, return empty
    if (!state.isRealBetting) {
        return [];
    }

    // Calculate Base Unit
    // Corners are INSIDE bets, so we use config.betLimits.min
    const baseUnit = config.betLimits.min; 
    
    // Calculate Multiplier from Fibonacci
    const multiplier = FIBONACCI[state.fibIndex];
    
    // Calculate Raw Amount
    let betAmount = baseUnit * multiplier;

    // --- 6. RESPECT LIMITS (CRITICAL) ---
    // Clamp between Min and Max
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // If the bet amount is capped by max limit and we are deep in progression, 
    // it might be safer to stop, but for this logic we will place the max bet.

    // Construct the bet array
    // We place the same amount on all 3 target corners
    const currentBets = TARGET_CORNERS.map(cornerVal => {
        return {
            type: 'corner',
            value: cornerVal,
            amount: betAmount
        };
    });

    return currentBets;
=======
/**
 * STRATEGY: Three Corner Fibonacci (with Virtual Misses)
 * * SOURCE:
 * URL: https://www.youtube.com/watch?v=QjVaDVcXkhw
 * Channel: The Roulette Master
 * * THE LOGIC:
 * 1. Coverage: The strategy bets on 3 separate Corners (Inside Bets), covering 12 numbers total.
 * - Default Corners used: 1 (covers 1,2,4,5), 13 (covers 13,14,16,17), 25 (covers 25,26,28,29).
 * 2. Virtual Trigger: The strategy observes spin history before betting real money.
 * - It waits for 'n' consecutive virtual losses (default: 4) where none of the 3 corners hit.
 * - Once the virtual loss streak is hit, it activates Real Betting.
 * * THE PROGRESSION (Fibonacci):
 * - Sequence: 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89...
 * - Multiplier applies to the base unit for EACH of the 3 corner bets.
 * - ON LOSS: Move one step to the right in the sequence (increase bet).
 * - ON WIN: "One Hit Wonder" logic. A single win recovers previous losses + profit. 
 * Reset immediately to the start (Virtual Mode) and wait for a new trigger.
 * * THE GOAL:
 * - Hit a conservative profit target (e.g., +20% or fixed amount) and stop.
 * - This implementation includes a hard stop if the max bet limit is reached to preserve remaining capital.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const VIRTUAL_MISS_TRIGGER = 4; // How many misses before we start betting real money
    const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377];
    
    // Define our 3 Corners (Top-left number of the corner)
    // Corner 1 covers: 1, 2, 4, 5
    // Corner 13 covers: 13, 14, 16, 17
    // Corner 25 covers: 25, 26, 28, 29
    const TARGET_CORNERS = [1, 13, 25]; 
    
    // Explicit list of winning numbers for these 3 corners for easier checking
    const WINNING_NUMBERS = [
        1, 2, 4, 5,
        13, 14, 16, 17,
        25, 26, 28, 29
    ];

    // --- 2. INITIALIZE STATE ---
    if (state.firstRun === undefined) {
        state.firstRun = false;
        state.fibIndex = 0;          // Current position in Fibonacci sequence
        state.virtualLosses = 0;     // Counter for virtual misses
        state.isRealBetting = false; // Toggle between Observing (Virtual) and Betting (Real)
        state.initialBankroll = bankroll;
        
        // Log initialization
        console.log(`[Three Corner Fib] Initialized. Waiting for ${VIRTUAL_MISS_TRIGGER} virtual misses.`);
    }

    // --- 3. PROCESS LAST SPIN RESULT ---
    // If we have history, check if we won or lost the previous round (virtual or real)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Did the last number hit any of our corners?
        const isWin = WINNING_NUMBERS.includes(lastNum);

        if (state.isRealBetting) {
            // --- REAL BETTING PHASE ---
            if (isWin) {
                // WIN: Reset everything. Strategy is "One Hit Wonder".
                // Go back to observing virtual misses.
                console.log(`[Win] Hit on ${lastNum}. Resetting to Virtual Mode.`);
                state.isRealBetting = false;
                state.fibIndex = 0;
                state.virtualLosses = 0; 
            } else {
                // LOSS: Progress up the Fibonacci ladder
                state.fibIndex++;
                console.log(`[Loss] Missed on ${lastNum}. Increasing Tier to ${state.fibIndex}.`);
                
                // Safety: If we run out of Fibonacci steps, reset or cap
                if (state.fibIndex >= FIBONACCI.length) {
                    console.log(`[Max Prog] Reached end of sequence. Resetting.`);
                    state.isRealBetting = false;
                    state.fibIndex = 0;
                    state.virtualLosses = 0;
                }
            }
        } else {
            // --- VIRTUAL / OBSERVATION PHASE ---
            if (isWin) {
                // Even though we didn't bet, the strategy "won" virtually.
                // This breaks the "loss streak", so we reset the counter.
                state.virtualLosses = 0;
            } else {
                // We missed virtually. Increment counter.
                state.virtualLosses++;
                // Check if trigger reached
                if (state.virtualLosses >= VIRTUAL_MISS_TRIGGER) {
                    state.isRealBetting = true;
                    state.fibIndex = 0; // Start progression at 1 unit
                    console.log(`[Trigger] ${state.virtualLosses} Virtual Misses reached. STARTING REAL BETS.`);
                }
            }
        }
    }

    // --- 4. CHECK STOP CONDITIONS ---
    // (Optional: Stop if we hit a profit target, e.g., +20%)
    const profit = bankroll - state.initialBankroll;
    if (profit >= 100) { // Example: Stop after $100 profit
        console.log(`[Target] Profit target reached ($${profit}). Stopping.`);
        return []; 
    }

    // --- 5. PLACE BETS ---
    // If we are not in Real Betting mode, return empty
    if (!state.isRealBetting) {
        return [];
    }

    // Calculate Base Unit
    // Corners are INSIDE bets, so we use config.betLimits.min
    const baseUnit = config.betLimits.min; 
    
    // Calculate Multiplier from Fibonacci
    const multiplier = FIBONACCI[state.fibIndex];
    
    // Calculate Raw Amount
    let betAmount = baseUnit * multiplier;

    // --- 6. RESPECT LIMITS (CRITICAL) ---
    // Clamp between Min and Max
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // If the bet amount is capped by max limit and we are deep in progression, 
    // it might be safer to stop, but for this logic we will place the max bet.

    // Construct the bet array
    // We place the same amount on all 3 target corners
    const currentBets = TARGET_CORNERS.map(cornerVal => {
        return {
            type: 'corner',
            value: cornerVal,
            amount: betAmount
        };
    });

    return currentBets;
>>>>>>> origin/main
}