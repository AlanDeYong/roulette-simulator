/**
 * ============================================================================
 * ROULETTE STRATEGY: Hottest 22 System
 * ============================================================================
 * 
 * Source:
 *   - Video: https://youtu.be/fWdJ57UooH0
 *   - Channel: Mastering The Wheel ("Hottest 22 Wins Again | 185 Spins… But Right on the Math!")
 * 
 * Strategy Logic & Trigger:
 *   - Number Selection: Monitors a rolling window of the last 74 spins (or all available
 *     spins if fewer) to track the frequency of each number (0–36). The top 22 most 
 *     frequently hit numbers are designated as the "Hottest 22".
 *   - Trigger Condition: Tracks consecutive "misses" (spins where the winning number is 
 *     NOT in the current Hottest 22 set). Betting is triggered only after observing 
 *     3 consecutive misses. If a hot number hits while waiting, the miss count resets to 0.
 * 
 * Bet Progression (5-Level Triple Martingale):
 *   - Places straight-up inside bets ('number') on each of the 22 hottest numbers.
 *   - Progression Multipliers across 5 levels:
 *       Level 1: 1 unit per number  (22 units total)
 *       Level 2: 3 units per number  (66 units total)
 *       Level 3: 9 units per number  (198 units total)
 *       Level 4: 27 units per number (594 units total)
 *       Level 5: 81 units per number (1,782 units total)
 *   - After Win: Full recovery + profit. Resets back to Level 1 and resets the trigger 
 *     (must wait for 3 consecutive misses again).
 *   - After Loss: Advances to the next level (1 -> 2 -> 3 -> 4 -> 5).
 * 
 * Stop Conditions & Target:
 *   - Target Profit (Stop-Win): Default is 5% profit over starting bankroll (or reached profit target).
 *   - Stop-Loss: If Level 5 loses (8 consecutive misses total: 3 trigger + 5 bet losses), 
 *     the progression halts completely to protect the bankroll.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.targetProfit = bankroll * 0.05; // 5% profit target
        state.level = 1;                     // Levels 1 to 5
        state.isBetting = false;              // Active betting flag
        state.consecutiveMisses = 0;         // Miss counter for trigger
        state.lastSpinCount = 0;             // Track processed spins
        state.activeNumbers = [];            // Numbers currently bet on
        state.stopped = false;               // Halt flag
    }

    // If stop condition triggered, do not place further bets
    if (state.stopped) {
        return [];
    }

    // Check Stop-Win condition
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        state.stopped = true;
        return [];
    }

    // Minimum history needed to identify hot numbers (at least 1 spin, ideal 74)
    if (!spinHistory || spinHistory.length === 0) {
        return [];
    }

    // 2. Helper: Calculate Top 22 Hottest Numbers over the rolling window (74 spins)
    const ROLLING_WINDOW = 74;
    function getHottest22(history) {
        const windowSpins = history.slice(-ROLLING_WINDOW);
        const counts = {};
        const lastSeen = {};

        for (let i = 0; i <= 36; i++) {
            counts[i] = 0;
            lastSeen[i] = -1;
        }

        windowSpins.forEach((spin, idx) => {
            const num = spin.winningNumber;
            if (num !== undefined && num !== null) {
                counts[num] = (counts[num] || 0) + 1;
                lastSeen[num] = idx;
            }
        });

        const numbers = [];
        for (let i = 0; i <= 36; i++) {
            numbers.push(i);
        }

        // Sort descending by frequency, break ties by most recent hit, then number
        numbers.sort((a, b) => {
            if (counts[b] !== counts[a]) {
                return counts[b] - counts[a];
            }
            if (lastSeen[b] !== lastSeen[a]) {
                return lastSeen[b] - lastSeen[a];
            }
            return a - b;
        });

        return numbers.slice(0, 22);
    }

    // 3. Process New Spin Results
    if (spinHistory.length > state.lastSpinCount) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        if (state.isBetting) {
            // Check if the spin won or lost against our placed bets
            const won = state.activeNumbers.includes(lastNum);

            if (won) {
                // Reset to waiting state after a win
                state.isBetting = false;
                state.level = 1;
                state.consecutiveMisses = 0;
                state.activeNumbers = [];
            } else {
                // Loss: Advance to next level
                state.level += 1;
                if (state.level > 5) {
                    // Exceeded level 5: Stop-loss reached
                    state.stopped = true;
                    state.isBetting = false;
                    return [];
                }
            }
        } else {
            // In waiting mode: determine whether last spin was a miss for Hottest 22
            // Hot numbers evaluated as of the spin prior to lastNum
            const previousHistory = spinHistory.slice(0, -1);
            const hot22 = getHottest22(previousHistory.length > 0 ? previousHistory : spinHistory);

            if (!hot22.includes(lastNum)) {
                state.consecutiveMisses += 1;
            } else {
                state.consecutiveMisses = 0;
            }

            // Check trigger: 3 consecutive misses
            if (state.consecutiveMisses >= 3) {
                state.isBetting = true;
                state.level = 1;
            }
        }

        state.lastSpinCount = spinHistory.length;
    }

    // 4. Return bets if betting mode is active
    if (!state.isBetting) {
        return [];
    }

    // Determine current hot 22 numbers to bet on
    const currentHot22 = getHottest22(spinHistory);
    state.activeNumbers = currentHot22;

    // Progression multipliers: 1, 3, 9, 27, 81
    const multipliers = [1, 3, 9, 27, 81];
    const multiplier = multipliers[Math.min(state.level - 1, multipliers.length - 1)];

    // Determine base unit and clamp to table limits
    const baseUnit = config.betLimits.min;
    let betPerNumber = baseUnit * multiplier;

    // Ensure within limits
    betPerNumber = Math.max(betPerNumber, config.betLimits.min);
    betPerNumber = Math.min(betPerNumber, config.betLimits.max);

    // Build bet array for all 22 numbers
    const bets = currentHot22.map((num) => ({
        type: 'number',
        value: num,
        amount: betPerNumber
    }));

    return bets;
}