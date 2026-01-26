/**
 * Strategy: Modified Half Moon Bay (Skip-on-Loss Variant)
 * Source: "Roulette Strategy that works? Half Moon Bay System" (YouTube: CEG Dealer School)
 * https://www.youtube.com/watch?v=VV_1sUjyOA4
 *
 * The Logic:
 * 1. Sets:
 * - Custom Set (H): [32, 15, 21, 2, 34, 6, 27, 13, 23, 10, 16, 33, 14, 31, 18, 29, 12, 35]
 * - Opposite (O): All other numbers 1-36.
 * 2. Trigger:
 * - Wait for 3 consecutive non-zero numbers to hit one set (e.g., 3 hits on H).
 * - Bet on the Opposite set + Zero.
 *
 * The Progression & Recovery:
 * - On 1st Loss: Enter Recovery. Increase bet (Default: Add 1 Unit), Bet immediately on next spin.
 * - On 2nd Consecutive Loss: Enter Skip Mode. Do NOT bet on next spin.
 * - During Skip Mode:
 * - If Skipped Spin would have WON (Virtual Win): The streak is broken. Reset strategy to IDLE (Base unit).
 * - If Skipped Spin would have LOST (Virtual Loss): The streak continues. Resume BETTING on next spin with current progression level.
 * - Note: This creates a Bet -> Bet -> Skip -> Bet -> Skip pattern during deep losses.
 *
 * The Goal: 
 * - Grind consistent small profits.
 * - Use the Skip logic to avoid betting into a long adverse streak.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- Configuration Defaults ---
    const TRIGGER_COUNT = 3;
    const PROGRESSION_TYPE = 'ADD'; // Options: 'ADD' or 'MULTIPLY'
    const ADD_UNIT = 1;             // Units to add on loss (if ADD)
    const MULTIPLIER = 2.0;         // Multiplier on loss (if MULTIPLY)
    
    // --- Constants ---
    // User defined set (Corrected list of 18 numbers)
    const HALF_MOON_SET = [32, 15, 21, 2, 34, 6, 27, 13, 23, 10, 16, 33, 14, 31, 18, 29, 12, 35];
    const ALL_NUMBERS = Array.from({ length: 36 }, (_, i) => i + 1);
    const OPPOSITE_SET = ALL_NUMBERS.filter(n => !HALF_MOON_SET.includes(n));
    const ZERO = [0];

    // --- State Initialization ---
    if (!state.initialized) {
        state.phase = 'IDLE';         // 'IDLE' | 'BETTING' | 'SKIPPING'
        state.targetNumbers = [];     // Numbers active in the current session
        state.nonZeroHistory = [];    // History excluding 0 (for trigger detection)
        state.currentUnit = config.betLimits.min; 
        state.consecutiveLosses = 0;
        state.initialized = true;
    }

    // --- 1. Process Last Result (Update State) ---
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastNumber = lastResult.winningNumber;

        // Update Non-Zero History for triggers (0 is transparent)
        if (lastNumber !== 0) {
            state.nonZeroHistory.push(lastNumber);
        }

        // Handle Logic based on current phase
        if (state.phase === 'BETTING') {
            // Did we win?
            if (state.targetNumbers.includes(lastNumber)) {
                // WIN: Reset Strategy
                state.phase = 'IDLE';
                state.currentUnit = config.betLimits.min;
                state.consecutiveLosses = 0;
            } else {
                // LOSS: Handle Recovery
                state.consecutiveLosses++;
                
                // Apply Progression
                if (PROGRESSION_TYPE === 'MULTIPLY') {
                    state.currentUnit *= MULTIPLIER;
                } else {
                    state.currentUnit += (config.betLimits.min * ADD_UNIT);
                }

                // Check for Skip Condition
                // We skip if we have 2 or more consecutive losses active
                if (state.consecutiveLosses >= 2) {
                    state.phase = 'SKIPPING';
                }
                // If only 1 loss, we stay in 'BETTING' (Recovery Spin)
            }
        } 
        else if (state.phase === 'SKIPPING') {
            // Virtual Check: Would we have won?
            const virtualWin = state.targetNumbers.includes(lastNumber);
            
            if (virtualWin) {
                // Virtual Win -> Treat as missed win, Reset completely
                state.phase = 'IDLE';
                state.currentUnit = config.betLimits.min;
                state.consecutiveLosses = 0;
            } else {
                // Virtual Loss -> Treat as dodged bullet, Resume Betting
                state.phase = 'BETTING';
                // IMPORTANT: We do NOT reset consecutiveLosses here.
                // Keeping it >= 2 ensures that if the NEXT bet loses, we skip again immediately.
            }
        }
    }

    // --- 2. Check Triggers (Only if IDLE) ---
    if (state.phase === 'IDLE') {
        if (state.nonZeroHistory.length >= TRIGGER_COUNT) {
            const recent = state.nonZeroHistory.slice(-TRIGGER_COUNT);
            
            const allHalfMoon = recent.every(n => HALF_MOON_SET.includes(n));
            const allOpposite = recent.every(n => OPPOSITE_SET.includes(n));

            if (allHalfMoon) {
                state.phase = 'BETTING';
                state.targetNumbers = [...OPPOSITE_SET, ...ZERO]; // Bet Opposite + 0
                state.consecutiveLosses = 0;
            } else if (allOpposite) {
                state.phase = 'BETTING';
                state.targetNumbers = [...HALF_MOON_SET, ...ZERO]; // Bet Half Moon + 0
                state.consecutiveLosses = 0;
            }
        }
    }

    // --- 3. Place Bets (Only if BETTING) ---
    if (state.phase === 'BETTING') {
        // Clamp Unit to Limits
        let betAmount = state.currentUnit;
        betAmount = Math.max(betAmount, config.betLimits.min);
        betAmount = Math.min(betAmount, config.betLimits.max);

        // Generate Bet Array
        // We bet Straight Up ('number') on all target numbers
        const bets = state.targetNumbers.map(num => ({
            type: 'number',
            value: num,
            amount: betAmount
        }));

        return bets;
    }

    // If IDLE or SKIPPING, return no bets
    return [];
}