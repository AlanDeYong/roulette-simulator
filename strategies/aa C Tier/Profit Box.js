<<<<<<< HEAD
/**
 * Strategy: Profit Box Roulette Strategy
 * Source: The Roulette Master (YouTube) - https://www.youtube.com/watch?v=TC3gqxo6Au0
 * * Logic:
 * 1. Setup: Start with a "Box" of 24 numbers (approx 65% coverage).
 * - Default setup uses numbers 1-24 for simplicity, but conceptually it works with any 24 numbers.
 * 2. Base Phase: 
 * - Bet 1 unit on all 24 numbers.
 * - If you win, collect profit and repeat. Do not remove numbers.
 * 3. Progression (Recovery) Phase:
 * - Trigger: Occurs after the first loss.
 * - On Loss: Increase the bet per number by 1 unit (Add-one progression).
 * - On Win: REMOVE the winning number from the active betting list.
 * (This reduces total outlay while maintaining higher bet sizes on remaining numbers).
 * 4. Reset Condition:
 * - The strategy resets back to the full 24 numbers and base unit when the list 
 * of active numbers drops to 18 (i.e., after 6 recovery wins).
 * * Note: This strategy relies on "fishing" for wins with high coverage, then aggressively 
 * increasing bets while reducing coverage to recover losses.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    // The video uses 24 numbers. We will use 1-24 as the default "Box".
    const INITIAL_BOX = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 
        13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24
    ];
    const RESET_THRESHOLD = 18; // Reset when active numbers drop to this count
    const BASE_UNIT = config.betLimits.min; // Usually 1 or minimum chip size

    // 2. Initialize State
    if (!state.initialized) {
        state.activeNumbers = [...INITIAL_BOX];
        state.currentUnit = BASE_UNIT;
        state.inRecovery = false;
        state.initialized = true;
    }

    // 3. Process Last Spin (if it exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Did we hit one of our numbers?
        const hitIndex = state.activeNumbers.indexOf(lastNumber);
        const won = hitIndex !== -1;

        if (won) {
            if (state.inRecovery) {
                // RECOVERY WIN LOGIC:
                // 1. Remove the winning number from the active box
                state.activeNumbers.splice(hitIndex, 1);

                // 2. Check Reset Condition (Video: "Reset with 18 numbers")
                if (state.activeNumbers.length <= RESET_THRESHOLD) {
                    // Reset to Base
                    state.activeNumbers = [...INITIAL_BOX];
                    state.currentUnit = BASE_UNIT;
                    state.inRecovery = false;
                }
                // If not resetting yet, we continue with reduced numbers at the CURRENT unit size
                // (Video implies we don't drop the unit size down immediately, we just remove the number)
            } else {
                // BASE WIN LOGIC:
                // Just keep grinding at base level, no numbers removed
                // Reset strictly to ensure clean state
                state.activeNumbers = [...INITIAL_BOX];
                state.currentUnit = BASE_UNIT;
            }
        } else {
            // LOSS LOGIC:
            // 1. Enter recovery mode
            state.inRecovery = true;
            
            // 2. Increase bet unit by 1 base unit
            state.currentUnit += BASE_UNIT;
        }
    }

    // 4. Validate Limits & Bankroll
    // Ensure unit size doesn't exceed table max
    let betAmount = Math.min(state.currentUnit, config.betLimits.max);
    
    // Ensure we have enough bankroll to place all bets
    const totalBetNeeded = betAmount * state.activeNumbers.length;
    
    // If bankroll is insufficient, we stop betting (return empty) 
    // or you could implement logic to bet what's left, but stopping is safer for simulation logic.
    if (bankroll < totalBetNeeded) {
        // Optional: Reset strategy if bankroll is blown to try and restart if simulating refill
        // state.initialized = false; 
        return []; 
    }

    // 5. Construct Bets
    const bets = state.activeNumbers.map(num => {
        return {
            type: 'number',
            value: num,
            amount: betAmount
        };
    });

    return bets;
=======
/**
 * Strategy: Profit Box Roulette Strategy
 * Source: The Roulette Master (YouTube) - https://www.youtube.com/watch?v=TC3gqxo6Au0
 * * Logic:
 * 1. Setup: Start with a "Box" of 24 numbers (approx 65% coverage).
 * - Default setup uses numbers 1-24 for simplicity, but conceptually it works with any 24 numbers.
 * 2. Base Phase: 
 * - Bet 1 unit on all 24 numbers.
 * - If you win, collect profit and repeat. Do not remove numbers.
 * 3. Progression (Recovery) Phase:
 * - Trigger: Occurs after the first loss.
 * - On Loss: Increase the bet per number by 1 unit (Add-one progression).
 * - On Win: REMOVE the winning number from the active betting list.
 * (This reduces total outlay while maintaining higher bet sizes on remaining numbers).
 * 4. Reset Condition:
 * - The strategy resets back to the full 24 numbers and base unit when the list 
 * of active numbers drops to 18 (i.e., after 6 recovery wins).
 * * Note: This strategy relies on "fishing" for wins with high coverage, then aggressively 
 * increasing bets while reducing coverage to recover losses.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    // The video uses 24 numbers. We will use 1-24 as the default "Box".
    const INITIAL_BOX = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 
        13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24
    ];
    const RESET_THRESHOLD = 18; // Reset when active numbers drop to this count
    const BASE_UNIT = config.betLimits.min; // Usually 1 or minimum chip size

    // 2. Initialize State
    if (!state.initialized) {
        state.activeNumbers = [...INITIAL_BOX];
        state.currentUnit = BASE_UNIT;
        state.inRecovery = false;
        state.initialized = true;
    }

    // 3. Process Last Spin (if it exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Did we hit one of our numbers?
        const hitIndex = state.activeNumbers.indexOf(lastNumber);
        const won = hitIndex !== -1;

        if (won) {
            if (state.inRecovery) {
                // RECOVERY WIN LOGIC:
                // 1. Remove the winning number from the active box
                state.activeNumbers.splice(hitIndex, 1);

                // 2. Check Reset Condition (Video: "Reset with 18 numbers")
                if (state.activeNumbers.length <= RESET_THRESHOLD) {
                    // Reset to Base
                    state.activeNumbers = [...INITIAL_BOX];
                    state.currentUnit = BASE_UNIT;
                    state.inRecovery = false;
                }
                // If not resetting yet, we continue with reduced numbers at the CURRENT unit size
                // (Video implies we don't drop the unit size down immediately, we just remove the number)
            } else {
                // BASE WIN LOGIC:
                // Just keep grinding at base level, no numbers removed
                // Reset strictly to ensure clean state
                state.activeNumbers = [...INITIAL_BOX];
                state.currentUnit = BASE_UNIT;
            }
        } else {
            // LOSS LOGIC:
            // 1. Enter recovery mode
            state.inRecovery = true;
            
            // 2. Increase bet unit by 1 base unit
            state.currentUnit += BASE_UNIT;
        }
    }

    // 4. Validate Limits & Bankroll
    // Ensure unit size doesn't exceed table max
    let betAmount = Math.min(state.currentUnit, config.betLimits.max);
    
    // Ensure we have enough bankroll to place all bets
    const totalBetNeeded = betAmount * state.activeNumbers.length;
    
    // If bankroll is insufficient, we stop betting (return empty) 
    // or you could implement logic to bet what's left, but stopping is safer for simulation logic.
    if (bankroll < totalBetNeeded) {
        // Optional: Reset strategy if bankroll is blown to try and restart if simulating refill
        // state.initialized = false; 
        return []; 
    }

    // 5. Construct Bets
    const bets = state.activeNumbers.map(num => {
        return {
            type: 'number',
            value: num,
            amount: betAmount
        };
    });

    return bets;
>>>>>>> origin/main
}