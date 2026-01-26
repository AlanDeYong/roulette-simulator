/**
 * STRATEGY: Dual Strike Dozens V2
 * * SOURCE:
 * - Video: https://www.youtube.com/watch?v=cKtvd2I_-6Y
 * - Channel: Roulette Man
 * * THE LOGIC:
 * - Coverage: Always bet on the two most recently hit Dozens (approx 64.8% coverage).
 * - Trigger: 
 * 1. Start in 'FLAT' mode (Base Unit bets).
 * 2. Switch to 'LADDER' mode (Progression) only after a "Full Whack" (a loss on both dozens or a Zero).
 * 3. Reset to 'FLAT' mode immediately upon reaching a new session Bankroll High.
 * * THE PROGRESSION (D'Alembert Variant):
 * - Independent Ladders: Each of the 3 Dozens tracks its own progression level.
 * - On a Win on Dozen X: Decrease Dozen X's level by 3 units (min 1).
 * (Note: The other active dozen that didn't hit counts as a loss and increases by 1).
 * - On a Loss (Full Whack): Increase the level of BOTH active dozens by 1 unit.
 * - Movement: We always shift our bets to the two most recently hit dozens, carrying their specific 
 * progression levels with them.
 * * THE GOAL:
 * - Survive volatility by following "hot" sectors.
 * - Grind small profits using the 64.8% win rate.
 * - Reset risk (levels) frequently by targeting small new bankroll highs.
 */

function bet(spinHistory, bankroll, config, state) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_OUTSIDE = config.betLimits.minOutside;
    const MAX_BET = config.betLimits.max;
    const BASE_UNIT = MIN_OUTSIDE;

    // Helper: Determine which dozen a number belongs to (1, 2, 3). Returns null for 0.
    const getDozen = (num) => {
        if (num === 0 || num === '0' || num === '00') return null;
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return null;
    };

    // Helper: Find the two most recent unique dozens from history
    const getTargetDozens = (history) => {
        let distinct = [];
        // Scan backwards
        for (let i = history.length - 1; i >= 0; i--) {
            const num = history[i].winningNumber;
            const doz = getDozen(num);
            if (doz !== null && !distinct.includes(doz)) {
                distinct.push(doz);
            }
            if (distinct.length === 2) break;
        }
        return distinct;
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.bankrollHigh = bankroll;      // Track session high
        state.mode = 'FLAT';                // 'FLAT' or 'LADDER'
        state.levels = { 1: 1, 2: 1, 3: 1 }; // Independent progression per dozen
        state.lastBets = [];                // Track what we bet on last spin [d1, d2]
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS SPIN RESULTS ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;
        const winningDozen = getDozen(winningNumber);

        // 3a. Update Bankroll High & Check for Reset
        if (bankroll > state.bankrollHigh) {
            state.bankrollHigh = bankroll;
            // RESET RULE: New high = Reset everything to base
            state.mode = 'FLAT';
            state.levels = { 1: 1, 2: 1, 3: 1 };
        }

        // 3b. Update Progression Levels (only if we had active bets)
        if (state.lastBets && state.lastBets.length === 2) {
            const [d1, d2] = state.lastBets;
            const hitOne = (winningDozen === d1 || winningDozen === d2);

            // Trigger Logic: If we were in FLAT mode and lost both, switch to LADDER
            if (state.mode === 'FLAT' && !hitOne) {
                state.mode = 'LADDER';
            }

            // Progression Logic (Applies if in LADDER mode, or transitioning into it)
            if (state.mode === 'LADDER') {
                // Handle Dozen 1
                if (winningDozen === d1) {
                    state.levels[d1] = Math.max(1, state.levels[d1] - 3);
                } else {
                    state.levels[d1]++;
                }

                // Handle Dozen 2
                if (winningDozen === d2) {
                    state.levels[d2] = Math.max(1, state.levels[d2] - 3);
                } else {
                    state.levels[d2]++;
                }
            }
        }
    }

    // --- 4. DETERMINE ACTIVE BETS ---
    // We need at least 2 unique dozens in history to know where to bet.
    // If not enough history, we might default to 1 & 2, or wait. 
    // Strategy says "follow hot", so we wait for data.
    const targetDozens = getTargetDozens(spinHistory);
    
    // Fallback for very first spin if history empty: Bet 1 and 2 arbitrarily or wait.
    // To be safe, if we don't have targets, we don't bet.
    if (targetDozens.length < 2) {
        // Optional: If you want to force start, uncomment below:
        // targetDozens = [1, 2]; 
        return []; 
    }

    // Update state.lastBets for the next iteration
    state.lastBets = targetDozens;

    // --- 5. CONSTRUCT BETS ---
    const bets = targetDozens.map(dozenId => {
        // Calculate raw amount
        // In FLAT mode, multiplier is always 1. In LADDER mode, use stored level.
        const multiplier = (state.mode === 'FLAT') ? 1 : state.levels[dozenId];
        
        let amount = BASE_UNIT * multiplier;

        // CLAMP to Limits
        amount = Math.max(amount, MIN_OUTSIDE);
        amount = Math.min(amount, MAX_BET);

        return {
            type: 'dozen',
            value: dozenId,
            amount: amount
        };
    });

    return bets;
}