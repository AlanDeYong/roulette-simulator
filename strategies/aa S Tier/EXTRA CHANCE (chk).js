/**
 * EXTRA CHANCE - Roulette System
 * 
 * Source:
 *   - Video: "EXTRA CHANCE - ROULETTE SYSTEM TUTORIAL"
 *   - URL: https://youtu.be/aGW4DK-6UMk
 *   - Channel: Bet With Mo
 * 
 * Strategy Logic & Placement:
 *   1. Initial Trigger / Placement:
 *      - Tracks the last 3 unique winning numbers from history.
 *      - Places inside Split bets covering each of those 3 numbers.
 *      - Adds a Split bet covering Zero (0/00 in American, or 0/2 in European).
 *      - Initial setup consists of 4 Split bets, each at 1 base unit.
 * 
 *   2. Progression & Loss Handling:
 *      - On a LOSS:
 *        - The newly hit number is added as an active split.
 *        - The new split starts at the previous bet level.
 *        - All active split bets are then increased by 1 unit (+1 unit D'Alembert progression).
 *        - Normal progression increases up to a maximum cap of 5 units per split.
 *        - If consecutive losses continue at the 5-unit cap, a 2-stage double-up (recovery multiplier)
 *          is triggered before dropping back down after a hit.
 * 
 *   3. Win Handling & Reset:
 *      - On a WIN:
 *        - If session profit > 0 (or a cycle target is reached), the progression resets.
 *        - On reset, the strategy re-seeds with the most recent 3 numbers + Zero split at 1 unit.
 *        - If not yet in profit, it rebets at the current level to capitalize on repeat hits.
 * 
 *   4. Target & Limits:
 *      - Session target profit: Configurable (default ~100-240 units / session).
 *      - All bets are dynamically scaled using config.betLimits.min and config.betLimits.max.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = (config.betLimits && config.betLimits.min) ? config.betLimits.min : 1;
    const maxBet = (config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;
    const isAmerican = (config.tableType === 'american');

    // Helper: Find a clean standard split for a given number (0-36)
    function getSplitForNumber(num) {
        if (num === 0) {
            return isAmerican ? [0, '00'] : [0, 2];
        }
        if (num === '00') {
            return [0, '00'];
        }
        const n = parseInt(num, 10);
        if (isNaN(n) || n < 1 || n > 36) return null;

        // Pair with adjacent vertical number on standard layout
        if (n <= 33) {
            return [n, n + 3];
        } else {
            return [n - 3, n];
        }
    }

    // Helper: Check if a split covers a winning number
    function splitCovers(splitVal, num) {
        if (!splitVal) return false;
        if (Array.isArray(splitVal)) {
            return splitVal.includes(num) || splitVal.includes(String(num)) || splitVal.includes(Number(num));
        }
        return splitVal === num;
    }

    // Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.unitLevel = 1;
        state.multiplier = 1;
        state.consecutiveLossesAtCap = 0;
        state.activeSplits = []; // Array of { value: [n1, n2], baseUnits: number }
    }

    const lastSpin = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1] : null;

    // Reset Cycle Helper: Seed with last 3 numbers + 0 split
    function resetToLastThree() {
        state.unitLevel = 1;
        state.multiplier = 1;
        state.consecutiveLossesAtCap = 0;
        state.activeSplits = [];

        // Add 0 split
        state.activeSplits.push({
            value: isAmerican ? [0, '00'] : [0, 2],
            baseUnits: 1
        });

        // Collect last 3 unique numbers from spin history
        const recentNums = [];
        for (let i = spinHistory.length - 1; i >= 0 && recentNums.length < 3; i--) {
            const num = spinHistory[i].winningNumber;
            if (num !== 0 && num !== '00' && !recentNums.includes(num)) {
                recentNums.push(num);
            }
        }

        // If not enough history, fallback defaults
        const defaults = [8, 16, 36];
        while (recentNums.length < 3) {
            const fallback = defaults[recentNums.length];
            if (!recentNums.includes(fallback)) {
                recentNums.push(fallback);
            }
        }

        for (const num of recentNums) {
            const s = getSplitForNumber(num);
            if (s) {
                state.activeSplits.push({ value: s, baseUnits: 1 });
            }
        }
    }

    // If initial launch or no active splits
    if (!state.activeSplits || state.activeSplits.length === 0) {
        resetToLastThree();
    } else if (lastSpin !== null) {
        const winningNum = lastSpin.winningNumber;
        const won = state.activeSplits.some(s => splitCovers(s.value, winningNum));

        const sessionProfit = bankroll - state.initialBankroll;

        if (won) {
            // Check if in profit or recovered
            if (sessionProfit > 0) {
                resetToLastThree();
            } else if (state.multiplier > 1) {
                // Recovery hit: step down multiplier
                state.multiplier = 1;
                state.consecutiveLossesAtCap = 0;
            }
        } else {
            // LOSS handling
            const newlyHit = getSplitForNumber(winningNum);
            const alreadyExists = state.activeSplits.some(s => 
                Array.isArray(s.value) && Array.isArray(newlyHit) &&
                s.value[0] === newlyHit[0] && s.value[1] === newlyHit[1]
            );

            if (state.unitLevel < 5) {
                // Normal D'Alembert +1 unit progression
                if (!alreadyExists && newlyHit) {
                    state.activeSplits.push({ value: newlyHit, baseUnits: state.unitLevel });
                }
                state.unitLevel += 1;
                for (const s of state.activeSplits) {
                    s.baseUnits = state.unitLevel;
                }
            } else {
                // At 5 unit cap
                if (!alreadyExists && newlyHit && state.activeSplits.length < 12) {
                    state.activeSplits.push({ value: newlyHit, baseUnits: 5 });
                }
                state.consecutiveLossesAtCap += 1;

                // After 2 losses at cap, perform doubling recovery stages
                if (state.consecutiveLossesAtCap === 3) {
                    state.multiplier = 2; // Double to 10 units
                } else if (state.consecutiveLossesAtCap === 4) {
                    state.multiplier = 4; // Double to 20 units
                }
            }
        }
    }

    // Build bets array clamped to limits
    const bets = [];
    for (const splitObj of state.activeSplits) {
        let amount = splitObj.baseUnits * state.multiplier * minInside;
        amount = Math.max(amount, minInside);
        amount = Math.min(amount, maxBet);

        bets.push({
            type: 'split',
            value: splitObj.value,
            amount: amount
        });
    }

    return bets;
}