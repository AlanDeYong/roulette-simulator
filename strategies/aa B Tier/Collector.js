/**
 * Strategy: The Collector
 * Source: YouTube - The Roulette Master TV (https://www.youtube.com/watch?v=c6_0_o9Ielk)
 * Channel: THEROULETTEMASTERTV
 *
 * The Logic:
 * This strategy targets Dozens and Columns, specifically looking for "cold" ones (haven't hit recently).
 * It operates in two distinct phases to manage risk and recover losses.
 *
 * 1. Phase 1 (Accumulation):
 * - Trigger: Start of session or after a Reset.
 * - Selection: Identify the Dozen or Column that has gone the longest without hitting.
 * - Bet: Flat bet using the minimum outside limit.
 * - Stop Condition: Stop Phase 1 if we hit 5 consecutive losses on the specific target.
 * - Win Condition: Any win in Phase 1 resets the count and selects a new target.
 *
 * 2. Phase 2 (The Collector / Recovery):
 * - Trigger: Immediately after 5 consecutive losses in Phase 1.
 * - The Calculation: Take the Total Drawdown (total lost in the current sequence) and divide by 2.
 * Round this result up (Math.ceil) to determine the next bet size.
 * (e.g., Down $50 -> Bet $25 or $30. Win pays 2:1, recovering the $50 loss).
 * - Target: Stick to the same Dozen/Column.
 * - Win Condition: A single win recovers all previous losses in the sequence. Reset to Phase 1.
 * - Loss Condition: Add the new bet amount to the Total Drawdown and recalculate (Drawdown / 2) for the next spin.
 *
 * The Goal:
 * To use the 2:1 payout of Dozens/Columns to aggressively recover losses after a predefined "safety buffer"
 * of 5 flat bets, minimizing the exposure to long losing streaks until necessary.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Limits
    const minBet = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    // 2. Initialize State
    if (!state.initialized) {
        state.phase = 'PHASE_1';      // 'PHASE_1' or 'PHASE_2'
        state.currentLosses = 0;      // Consecutive losses in current sequence
        state.drawdown = 0;           // Total monetary loss in current sequence
        state.target = null;          // Current bet target: { type: 'dozen', value: 1 }
        state.lastBetAmount = 0;      // Track amount to calculate drawdown
        state.logData = "Spin,Phase,Target,Bet,Result,Drawdown\n"; // CSV Header for logs
        state.initialized = true;
    }

    // 3. Helper Functions
    const getDozen = (n) => {
        if (n === 0 || n === '00') return null;
        if (n <= 12) return 1;
        if (n <= 24) return 2;
        return 3;
    };

    const getColumn = (n) => {
        if (n === 0 || n === '00') return null;
        return ((n - 1) % 3) + 1;
    };

    const findColdestTarget = (history) => {
        // scan history to find which Dozen or Column hasn't hit for the longest time
        let lastSeen = {
            'dozen_1': -1, 'dozen_2': -1, 'dozen_3': -1,
            'column_1': -1, 'column_2': -1, 'column_3': -1
        };

        // Iterate backwards through history
        for (let i = history.length - 1; i >= 0; i--) {
            const num = history[i].winningNumber;
            const d = getDozen(num);
            const c = getColumn(num);
            
            if (d && lastSeen[`dozen_${d}`] === -1) lastSeen[`dozen_${d}`] = i;
            if (c && lastSeen[`column_${c}`] === -1) lastSeen[`column_${c}`] = i;

            // Optimization: If we found all 6, stop scanning
            const allFound = Object.values(lastSeen).every(val => val !== -1);
            if (allFound) break;
        }

        // Find the key with the smallest index (or -1)
        let coldestKey = 'dozen_2'; // Default
        let lowestIndex = Infinity;

        for (const [key, index] of Object.entries(lastSeen)) {
            // If index is -1, it has never hit in history (coldest possible)
            if (index === -1) {
                coldestKey = key;
                break;
            }
            if (index < lowestIndex) {
                lowestIndex = index;
                coldestKey = key;
            }
        }

        const parts = coldestKey.split('_');
        return { type: parts[0], value: parseInt(parts[1]) };
    };

    // 4. Process Previous Result
    if (spinHistory.length > 0 && state.target) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let won = false;
        if (state.target.type === 'dozen' && getDozen(lastNum) === state.target.value) won = true;
        else if (state.target.type === 'column' && getColumn(lastNum) === state.target.value) won = true;

        // Logging
        const logEntry = `${spinHistory.length},${state.phase},${state.target.type}${state.target.value},${state.lastBetAmount},${won ? 'WIN' : 'LOSS'},${state.drawdown}\n`;
        state.logData += logEntry;

        if (won) {
            // WIN LOGIC
            // Full Reset regardless of phase (Collector strategy resets completely on recovery win)
            state.phase = 'PHASE_1';
            state.currentLosses = 0;
            state.drawdown = 0;
            state.target = null; // Force re-selection of new coldest number
        } else {
            // LOSS LOGIC
            state.drawdown += state.lastBetAmount;
            
            if (state.phase === 'PHASE_1') {
                state.currentLosses++;
                // Check Trigger for Phase 2
                if (state.currentLosses >= 5) {
                    state.phase = 'PHASE_2';
                }
            }
            // If Phase 2, we stay in Phase 2 until a win, accumulating drawdown
        }
    }

    // 5. Select Target (if reset)
    if (!state.target) {
        if (spinHistory.length < 5) {
            // Not enough history, default to 2nd Dozen
            state.target = { type: 'dozen', value: 2 };
        } else {
            state.target = findColdestTarget(spinHistory);
        }
    }

    // 6. Calculate Bet Amount
    let betAmount = minBet;

    if (state.phase === 'PHASE_1') {
        // Phase 1: Flat bet min
        betAmount = minBet;
    } else {
        // Phase 2: The Collector
        // Formula: Drawdown / 2. Round up.
        // We use Math.ceil to ensure we at least break even/profit slightly.
        // Example: Drawdown 50. 50/2 = 25. Bet 25. Win (pays 2:1) = 50. Net = 0.
        // To mimic the video's profitability, we ensure it rounds up generously or use a slight buffer.
        // We will stick to Math.ceil logic as it is mathematically sound for recovery.
        
        let rawCalc = state.drawdown / 2;
        betAmount = Math.ceil(rawCalc);
        
        // Ensure bet is at least minBet (though usually drawdown/2 is larger)
        if (betAmount < minBet) betAmount = minBet;
    }

    // 7. Respect Bet Limits (Clamp)
    if (betAmount > maxBet) betAmount = maxBet; // Cap at max
    if (betAmount < minBet) betAmount = minBet; // Ensure min

    // Store for next spin calculation
    state.lastBetAmount = betAmount;

    // 8. Periodic Logging (Every 50 spins)
    if (spinHistory.length > 0 && spinHistory.length % 50 === 0) {
        utils.saveFile("collector_strategy_log.csv", state.logData)
            .then(() => console.log("Log saved"))
            .catch(err => console.error("Log save failed", err));
    }

    // 9. Return Bet
    return [{
        type: state.target.type,
        value: state.target.value,
        amount: betAmount
    }];
}