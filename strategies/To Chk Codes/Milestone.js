<<<<<<< HEAD
/**
 * MILESTONE ROULETTE STRATEGY
 * * Source: 
 * Video: "AI UNLOCKS THE SECRET TO BEATING ROULETTE!"
 * Channel: THEROULETTEMASTERTV
 * URL: https://www.youtube.com/watch?v=Nwly-rdRw1o
 * * The Logic:
 * 1. Initialization: The strategy identifies the last 6 UNIQUE numbers that have hit.
 * 2. Exclusion: These 6 numbers are added to an "Excluded List". We bet on ALL other numbers.
 * 3. Winning Spin: If a number hits that we bet on (it was NOT in the excluded list):
 * - We ADD the winning number to the Excluded List (reducing our coverage for the next spin).
 * - We keep the bet unit the same.
 * 4. Losing Spin: If a number hits that was in the Excluded List (we didn't bet on it):
 * - We DOUBLE the bet unit for the next spin (Martingale on the unit).
 * - The Excluded List remains unchanged.
 * * The Goal (Milestone):
 * - The strategy targets a specific profit milestone (e.g., +$100 from start of cycle).
 * - Once the bankroll >= milestone target, the system RESETS.
 * - On reset, it scans the history again for the latest 6 unique numbers and resets the bet unit to minimum.
 * * NOTE: This strategy requires at least 6 unique numbers in the history to begin.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    const MILESTONE_STEP = 100; // The profit target to trigger a reset
    const NUM_EXCLUDED = 6;     // How many recent numbers to exclude
    const BET_UNIT_START = config.betLimits.min; // Start with table minimum for inside bets

    // 2. State Initialization
    if (!state.initialized) {
        state.milestoneTarget = bankroll + MILESTONE_STEP;
        state.excludedNumbers = []; // Array of numbers we are NOT betting on
        state.currentUnit = BET_UNIT_START;
        state.active = false;       // Boolean: are we currently in a betting cycle?
        state.spinsSeen = spinHistory.length; // Track history to process results only once per spin
        state.initialized = true;
    }

    // 3. Check Milestone (Stop/Reset Condition)
    // If we hit our profit target, we reset the cycle entirely.
    if (bankroll >= state.milestoneTarget) {
        // Log milestone hit if helpful for debugging
        // console.log(`Milestone Hit! Bankroll: ${bankroll}, Target: ${state.milestoneTarget}`);
        state.milestoneTarget = bankroll + MILESTONE_STEP;
        state.active = false; // Force a re-scan of numbers
    }

    // 4. Cycle Initialization (Start or Restart)
    // If not active, we need to find the last 6 unique numbers to exclude
    if (!state.active) {
        const uniqueNumbers = new Set();
        let idx = spinHistory.length - 1;

        // Scan backwards until we find 6 unique numbers
        while (uniqueNumbers.size < NUM_EXCLUDED && idx >= 0) {
            uniqueNumbers.add(spinHistory[idx].winningNumber);
            idx--;
        }

        // If we don't have enough history yet, wait (return empty bets)
        if (uniqueNumbers.size < NUM_EXCLUDED) {
            return []; 
        }

        state.excludedNumbers = Array.from(uniqueNumbers);
        state.currentUnit = BET_UNIT_START;
        state.active = true;
        
        // Sync spinsSeen so we don't process old history
        state.spinsSeen = spinHistory.length;
    }

    // 5. Process Previous Result (Update Strategy)
    // Only run this logic if a new spin has occurred since we last calculated bets
    if (spinHistory.length > state.spinsSeen) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Logic Check: Did we bet on the last number?
        // We bet on everything NOT in excludedNumbers.
        const wasLoss = state.excludedNumbers.includes(lastNum);

        if (wasLoss) {
            // LOSS Condition: The number that hit was one we excluded.
            // Strategy: Double the bet unit. Excluded list stays the same.
            state.currentUnit *= 2;
        } else {
            // WIN Condition: We hit a number we bet on.
            // Strategy: Remove this number from future bets (add to excluded).
            // Unit stays the same.
            if (!state.excludedNumbers.includes(lastNum)) {
                state.excludedNumbers.push(lastNum);
            }
        }

        // Update tracking
        state.spinsSeen = spinHistory.length;
    }

    // 6. Safety: Clamp Bet Unit
    // Ensure the unit doesn't exceed table max or go below min
    let safeUnit = state.currentUnit;
    if (safeUnit < config.betLimits.min) safeUnit = config.betLimits.min;
    if (safeUnit > config.betLimits.max) safeUnit = config.betLimits.max;

    // 7. Construct Bets
    // Bet on every number 0-36 that is NOT in the excluded list
    const bets = [];
    
    // Standard European Roulette has 37 numbers (0-36). 
    // Ideally, check config for wheel type, but standard 0-36 is safe assumption.
    for (let i = 0; i <= 36; i++) {
        if (!state.excludedNumbers.includes(i)) {
            bets.push({
                type: 'number',
                value: i,
                amount: safeUnit
            });
        }
    }

    // 8. Final Bankroll Check
    // Calculate total required amount
    const totalRequired = bets.reduce((sum, b) => sum + b.amount, 0);
    
    // If we can't afford the strategy, return empty (or partial, but usually empty is safer)
    if (totalRequired > bankroll) {
        return [];
    }

    return bets;
=======
/**
 * MILESTONE ROULETTE STRATEGY
 * * Source: 
 * Video: "AI UNLOCKS THE SECRET TO BEATING ROULETTE!"
 * Channel: THEROULETTEMASTERTV
 * URL: https://www.youtube.com/watch?v=Nwly-rdRw1o
 * * The Logic:
 * 1. Initialization: The strategy identifies the last 6 UNIQUE numbers that have hit.
 * 2. Exclusion: These 6 numbers are added to an "Excluded List". We bet on ALL other numbers.
 * 3. Winning Spin: If a number hits that we bet on (it was NOT in the excluded list):
 * - We ADD the winning number to the Excluded List (reducing our coverage for the next spin).
 * - We keep the bet unit the same.
 * 4. Losing Spin: If a number hits that was in the Excluded List (we didn't bet on it):
 * - We DOUBLE the bet unit for the next spin (Martingale on the unit).
 * - The Excluded List remains unchanged.
 * * The Goal (Milestone):
 * - The strategy targets a specific profit milestone (e.g., +$100 from start of cycle).
 * - Once the bankroll >= milestone target, the system RESETS.
 * - On reset, it scans the history again for the latest 6 unique numbers and resets the bet unit to minimum.
 * * NOTE: This strategy requires at least 6 unique numbers in the history to begin.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Constants
    const MILESTONE_STEP = 100; // The profit target to trigger a reset
    const NUM_EXCLUDED = 6;     // How many recent numbers to exclude
    const BET_UNIT_START = config.betLimits.min; // Start with table minimum for inside bets

    // 2. State Initialization
    if (!state.initialized) {
        state.milestoneTarget = bankroll + MILESTONE_STEP;
        state.excludedNumbers = []; // Array of numbers we are NOT betting on
        state.currentUnit = BET_UNIT_START;
        state.active = false;       // Boolean: are we currently in a betting cycle?
        state.spinsSeen = spinHistory.length; // Track history to process results only once per spin
        state.initialized = true;
    }

    // 3. Check Milestone (Stop/Reset Condition)
    // If we hit our profit target, we reset the cycle entirely.
    if (bankroll >= state.milestoneTarget) {
        // Log milestone hit if helpful for debugging
        // console.log(`Milestone Hit! Bankroll: ${bankroll}, Target: ${state.milestoneTarget}`);
        state.milestoneTarget = bankroll + MILESTONE_STEP;
        state.active = false; // Force a re-scan of numbers
    }

    // 4. Cycle Initialization (Start or Restart)
    // If not active, we need to find the last 6 unique numbers to exclude
    if (!state.active) {
        const uniqueNumbers = new Set();
        let idx = spinHistory.length - 1;

        // Scan backwards until we find 6 unique numbers
        while (uniqueNumbers.size < NUM_EXCLUDED && idx >= 0) {
            uniqueNumbers.add(spinHistory[idx].winningNumber);
            idx--;
        }

        // If we don't have enough history yet, wait (return empty bets)
        if (uniqueNumbers.size < NUM_EXCLUDED) {
            return []; 
        }

        state.excludedNumbers = Array.from(uniqueNumbers);
        state.currentUnit = BET_UNIT_START;
        state.active = true;
        
        // Sync spinsSeen so we don't process old history
        state.spinsSeen = spinHistory.length;
    }

    // 5. Process Previous Result (Update Strategy)
    // Only run this logic if a new spin has occurred since we last calculated bets
    if (spinHistory.length > state.spinsSeen) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Logic Check: Did we bet on the last number?
        // We bet on everything NOT in excludedNumbers.
        const wasLoss = state.excludedNumbers.includes(lastNum);

        if (wasLoss) {
            // LOSS Condition: The number that hit was one we excluded.
            // Strategy: Double the bet unit. Excluded list stays the same.
            state.currentUnit *= 2;
        } else {
            // WIN Condition: We hit a number we bet on.
            // Strategy: Remove this number from future bets (add to excluded).
            // Unit stays the same.
            if (!state.excludedNumbers.includes(lastNum)) {
                state.excludedNumbers.push(lastNum);
            }
        }

        // Update tracking
        state.spinsSeen = spinHistory.length;
    }

    // 6. Safety: Clamp Bet Unit
    // Ensure the unit doesn't exceed table max or go below min
    let safeUnit = state.currentUnit;
    if (safeUnit < config.betLimits.min) safeUnit = config.betLimits.min;
    if (safeUnit > config.betLimits.max) safeUnit = config.betLimits.max;

    // 7. Construct Bets
    // Bet on every number 0-36 that is NOT in the excluded list
    const bets = [];
    
    // Standard European Roulette has 37 numbers (0-36). 
    // Ideally, check config for wheel type, but standard 0-36 is safe assumption.
    for (let i = 0; i <= 36; i++) {
        if (!state.excludedNumbers.includes(i)) {
            bets.push({
                type: 'number',
                value: i,
                amount: safeUnit
            });
        }
    }

    // 8. Final Bankroll Check
    // Calculate total required amount
    const totalRequired = bets.reduce((sum, b) => sum + b.amount, 0);
    
    // If we can't afford the strategy, return empty (or partial, but usually empty is safer)
    if (totalRequired > bankroll) {
        return [];
    }

    return bets;
>>>>>>> origin/main
}