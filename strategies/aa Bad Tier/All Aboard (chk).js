/**
 * All Aboard Roulette Strategy
 * 
 * Source:
 * - YouTube Video: https://youtu.be/BUIGRZfwjgY
 * - Channel: The Roulette Master
 * - Strategy Submitter: Jansen ("All Aboard Roulette")
 * 
 * Overview & Bet Logic:
 * 1. Board Coverage:
 *    "All Aboard" covers every single number on the roulette table using a combination of:
 *    - 2nd Dozen (13-24): 10 base units (e.g., $10)
 *    - 3rd Dozen (25-36): 10 base units (e.g., $10)
 *    - Line 1-6 (Double Street starting at 1): 5 base units (e.g., $5)
 *    - Line 7-12 (Double Street starting at 7): 5 base units (e.g., $5)
 *    - Straight Up on 0: 1 base unit (e.g., $1)
 *    - Straight Up on 00 (if American table): 1 base unit (e.g., $1)
 *    *Note: Covers 100% of the wheel numbers on each spin.*
 * 
 * 2. Betting Progression:
 *    - Standard Phase (Cumulative Loss < $500 / 500 units):
 *      - After each spin, identify which bet group won and which lost.
 *      - All losing bet positions increase by their initial base unit (+10 dozens, +5 lines, +1 zeros).
 *      - The winning bet position stays at its current level (no increase).
 *      - When a new net session profit is reached (profit > 0 relative to start of cycle), reset all bets to base units.
 *    - Recovery Phase (Triggered if Drawdown / Deficit reaches -$500):
 *      - Freeze bet increases (do not add more units to losing bets).
 *      - Whenever a bet position hits/wins, remove (pull off) that winning position from subsequent spins.
 *      - Continue spinning the remaining high-value positions until a big hit (e.g., zeros or long-overdue sections) recovers the bankroll into session profit.
 *      - Once session profit is achieved, reset back to full base board coverage.
 * 
 * 3. Goal & Stop Loss:
 *    - Target Profit: Reset cycle on any positive session profit.
 *    - Stop Loss: Total bankroll limit ($2,000 recommended base bankroll).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.recoveryMode = false;
        state.removedBets = {}; // Tracks bets removed during recovery phase
        
        // Base units scaled to table limits
        const minInside = config.betLimits.min || 1;
        const minOutside = config.betLimits.minOutside || 5;
        
        // Scale unit sizes: Dozens (10), Lines (5), Zeros (1)
        const unitSingle = Math.max(1, minInside);
        const unitLine = Math.max(minInside * 2.5, minOutside, 5);
        const unitDozen = Math.max(minOutside * 2, unitLine * 2, 10);
        
        state.baseUnits = {
            dozen2: unitDozen,
            dozen3: unitDozen,
            line1: unitLine,
            line7: unitLine,
            zero: unitSingle,
            doubleZero: unitSingle
        };
        
        // Current progression level multipliers (in units)
        state.currentBets = { ...state.baseUnits };
    }

    const isAmerican = config.tableType === 'american';
    const lastSpin = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1] : null;
    const sessionNet = bankroll - state.initialBankroll;

    // 2. Evaluate Last Spin & Adjust State
    if (lastSpin !== null) {
        const winningNum = lastSpin.winningNumber;

        // Determine which category won
        let winningKey = null;
        if (winningNum >= 13 && winningNum <= 24) {
            winningKey = 'dozen2';
        } else if (winningNum >= 25 && winningNum <= 36) {
            winningKey = 'dozen3';
        } else if (winningNum >= 1 && winningNum <= 6) {
            winningKey = 'line1';
        } else if (winningNum >= 7 && winningNum <= 12) {
            winningKey = 'line7';
        } else if (winningNum === 0) {
            winningKey = 'zero';
        } else if (winningNum === 37 || winningNum === '00' || winningNum === -1) {
            winningKey = 'doubleZero';
        }

        // Check for session profit reset
        if (sessionNet > 0) {
            // Reached new profit -> Reset everything to base level
            state.recoveryMode = false;
            state.removedBets = {};
            state.currentBets = { ...state.baseUnits };
            state.initialBankroll = bankroll; // update cycle baseline
        } else {
            // Check if recovery mode trigger (-$500 drawdown) is hit
            if (sessionNet <= -500 && !state.recoveryMode) {
                state.recoveryMode = true;
            }

            if (state.recoveryMode) {
                // In recovery: remove winning bets from the board upon hitting
                if (winningKey && !state.removedBets[winningKey]) {
                    state.removedBets[winningKey] = true;
                }
                // Do not increment bets further in recovery mode
            } else {
                // Standard mode: increment all losing bets by their base units
                for (const key of Object.keys(state.currentBets)) {
                    if (key !== winningKey) {
                        const inc = config.incrementMode === 'base' ? state.baseUnits[key] : (config.minIncrementalBet || state.baseUnits[key]);
                        state.currentBets[key] += inc;
                    }
                }
            }
        }
    }

    // 3. Helper to clamp bet amounts to configured table limits
    function clampBet(amount, isInside) {
        const min = isInside ? config.betLimits.min : config.betLimits.minOutside;
        const max = config.betLimits.max;
        return Math.min(Math.max(amount, min), max);
    }

    // 4. Construct Bets Array
    const bets = [];

    // Dozen 2 (13-24)
    if (!state.removedBets.dozen2) {
        bets.push({
            type: 'dozen',
            value: 2,
            amount: clampBet(state.currentBets.dozen2, false)
        });
    }

    // Dozen 3 (25-36)
    if (!state.removedBets.dozen3) {
        bets.push({
            type: 'dozen',
            value: 3,
            amount: clampBet(state.currentBets.dozen3, false)
        });
    }

    // Double Street 1-6
    if (!state.removedBets.line1) {
        bets.push({
            type: 'line',
            value: 1,
            amount: clampBet(state.currentBets.line1, true)
        });
    }

    // Double Street 7-12
    if (!state.removedBets.line7) {
        bets.push({
            type: 'line',
            value: 7,
            amount: clampBet(state.currentBets.line7, true)
        });
    }

    // Number 0
    if (!state.removedBets.zero) {
        bets.push({
            type: 'number',
            value: 0,
            amount: clampBet(state.currentBets.zero, true)
        });
    }

    // Number 00 (for American tables)
    if (isAmerican && !state.removedBets.doubleZero) {
        bets.push({
            type: 'number',
            value: 37, // standard representation for 00
            amount: clampBet(state.currentBets.doubleZero, true)
        });
    }

    // If all positions are removed, reset to avoid empty state
    if (bets.length === 0) {
        state.recoveryMode = false;
        state.removedBets = {};
        state.currentBets = { ...state.baseUnits };
        return bet(spinHistory, bankroll, config, state, utils);
    }

    return bets;
}