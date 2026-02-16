/**
 * Strategy: Double Dozen/Column Counter-Strategy with Safe Recovery (Skip-on-Loss)
 * Source: Custom Strategy (User Specified)
 *
 * The Logic:
 * 1. Monitor the last N spins (default 2).
 * 2. If N consecutive numbers belong to the same Dozen or Column, trigger a bet.
 * 3. Place bets on the *other two* Dozens or Columns (covering ~64% of the board).
 *
 * The Progression (Recovery):
 * 1. Base Bet: Defined by config.betLimits.minOutside.
 * 2. On Loss: Quadruple the bet amount (x4) to recover previous losses + profit.
 * 3. Safe Recovery Mode (Skip Logic):
 * - Allows a specific number of recovery bets (default 1) after the initial loss.
 * - If the recovery bets also fail, enter "Skip Mode".
 * - In Skip Mode, do not place bets, but simulate the progression.
 * - If a spin results in a "Virtual Win", reset the strategy immediately.
 * - If a spin results in a "Virtual Loss", remain in Skip Mode.
 *
 * The Goal:
 * Consistent small gains by capitalizing on the probability that a single Dozen/Column
 * rarely repeats many times in a row, protected by a "Skip" mechanism to avoid deep drawdowns
 * during long streaks.
 */
function bet(spinHistory, bankroll, config, state) {
    // --- Configuration & Defaults ---
    const TRIGGER_COUNT = config.triggerCount || 2; // N consecutive numbers to trigger
    const MAX_RECOVERY_SPINS = config.maxRecoverySpins !== undefined ? config.maxRecoverySpins : 1;
    const PROGRESSION_MULTIPLIER = 4; // Quadruple on loss
    const MIN_BET = config.betLimits.minOutside || 5;
    const MAX_BET = config.betLimits.max || 500;

    // --- Helpers ---
    const getDozen = (n) => (n === 0 ? null : Math.ceil(n / 12));
    const getColumn = (n) => (n === 0 ? null : ((n - 1) % 3) + 1);

    // --- 1. Initialize State ---
    if (!state.strategies) {
        state.strategies = {
            dozen: { active: false, avoid: null, amount: 0, recoveryCount: 0, skipping: false },
            column: { active: false, avoid: null, amount: 0, recoveryCount: 0, skipping: false }
        };
    }

    // --- 2. Process Last Spin (Update Strategy State) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;

        // --- Helper to update a specific strategy (Dozen or Column) ---
        const updateStrategy = (strat, type) => {
            if (!strat.active) return;

            const targetAvoid = strat.avoid;
            const actual = type === 'dozen' ? getDozen(winningNumber) : getColumn(winningNumber);
            // Win condition: Not 0, and the result is NOT the dozen/column we are avoiding
            // (Since we bet on the other two, avoiding the streak target means we hit one of our bets)
            const isWin = winningNumber !== 0 && actual !== targetAvoid;

            if (strat.skipping) {
                // --- SKIP MODE ---
                if (isWin) {
                    // Virtual Win: The streak broke. Reset immediately.
                    strat.active = false;
                    strat.skipping = false;
                    strat.amount = 0;
                    strat.recoveryCount = 0;
                }
                // Else Virtual Loss: Streak continued. Stay in skip mode.
            } else {
                // --- ACTIVE BETTING MODE ---
                if (isWin) {
                    // Real Win: Reset.
                    strat.active = false;
                    strat.amount = 0;
                    strat.recoveryCount = 0;
                } else {
                    // Real Loss: Apply Progression
                    strat.amount = strat.amount * PROGRESSION_MULTIPLIER;
                    strat.recoveryCount++;

                    // Check if we should switch to Skip Mode
                    // recoveryCount 1 means we just lost the Base Bet.
                    // recoveryCount 2 means we lost the 1st Recovery Bet.
                    // If MAX_RECOVERY_SPINS is 1, and recoveryCount becomes 2, we skip next.
                    if (strat.recoveryCount > MAX_RECOVERY_SPINS) {
                        strat.skipping = true;
                    }
                }
            }
        };

        // Update both strategies
        updateStrategy(state.strategies.dozen, 'dozen');
        updateStrategy(state.strategies.column, 'column');
    }

    // --- 3. Check Triggers (Start New Strategies) ---
    // We look at the last N numbers. If they are all the same Dozen/Column, we start betting against it.
    if (spinHistory.length >= TRIGGER_COUNT) {
        const recentHistory = spinHistory.slice(-TRIGGER_COUNT);
        
        // Check Dozen Trigger
        const firstDozen = getDozen(recentHistory[0].winningNumber);
        const allSameDozen = firstDozen !== null && recentHistory.every(s => getDozen(s.winningNumber) === firstDozen);
        
        // If trigger met and we aren't already managing a bet for dozens
        if (allSameDozen && !state.strategies.dozen.active) {
            state.strategies.dozen = {
                active: true,
                avoid: firstDozen,
                amount: MIN_BET,
                recoveryCount: 0,
                skipping: false
            };
        }

        // Check Column Trigger
        const firstColumn = getColumn(recentHistory[0].winningNumber);
        const allSameColumn = firstColumn !== null && recentHistory.every(s => getColumn(s.winningNumber) === firstColumn);

        // If trigger met and we aren't already managing a bet for columns
        if (allSameColumn && !state.strategies.column.active) {
            state.strategies.column = {
                active: true,
                avoid: firstColumn,
                amount: MIN_BET,
                recoveryCount: 0,
                skipping: false
            };
        }
    }

    // --- 4. Generate Bets ---
    const bets = [];

    // Helper to add bets for a strategy
    const addStrategyBets = (strat, type) => {
        if (strat.active && !strat.skipping) {
            // CLAMP TO LIMITS
            let amount = strat.amount;
            amount = Math.max(amount, MIN_BET);
            amount = Math.min(amount, MAX_BET);

            // We bet on the 2 Dozens/Columns that are NOT the 'avoid' target
            [1, 2, 3].forEach(val => {
                if (val !== strat.avoid) {
                    bets.push({
                        type: type, // 'dozen' or 'column'
                        value: val,
                        amount: amount
                    });
                }
            });
        }
    };

    addStrategyBets(state.strategies.dozen, 'dozen');
    addStrategyBets(state.strategies.column, 'column');

    return bets;
}