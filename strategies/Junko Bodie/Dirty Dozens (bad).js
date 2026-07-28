/**
 * Roulette Strategy: Dirty Dozen
 * 
 * Source:
 * - Channel: Junko Bodie
 * - Strategy Title: Roulette Strategy: Dirty Dozen
 * 
 * Strategy Logic Details:
 * 1. Track spin history for all 3 Dozens (1, 2, 3) and all 3 Columns (1, 2, 3).
 * 2. Slot Restrictions:
 *    - At most ONE Dozen and ONE Column can be actively bet on at any given time.
 *    - A new Dozen is only selected if NO Dozen is currently active.
 *    - A new Column is only selected if NO Column is currently active.
 * 3. Selection Trigger:
 *    - When looking for a new target (Dozen or Column), select a candidate that has 
 *      NOT won for the past 4 or more spins (drought >= 4). If multiple qualify, pick 
 *      the one with the longest drought.
 * 
 * Modified Bet Progression Details:
 * - Base Unit: Uses `config.betLimits.minOutside` for outside bets.
 * - Initial Bet: Starts at 1 base unit for newly selected positions.
 * - On Loss Progression (Tiered Increments based on consecutive losses):
 *   - Losses 1 to 4: Increase bet by 1 unit per loss.
 *   - Losses 5 to 8: Increase bet by 2 units per loss.
 *   - Losses 9 to 12: Increase bet by 5 units per loss.
 *   - Losses 13+: Increase bet by 10 units per loss.
 * - On Win:
 *   - If the position had not won for 8 or more spins prior to this win (drought >= 8), 
 *     reset bet size to 1 unit, reset loss count to 0, AND force a mandatory rebet for the next spin.
 *   - Otherwise, reset/clear the active target so the strategy can search for a new trigger.
 * 
 * Goal:
 * - Target steady profit accumulation by exploiting statistical gaps in Dozen/Column distributions
 *   with an accelerated tiered progression while strictly limiting table exposure to 1 Dozen + 1 Column.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    if (!spinHistory || spinHistory.length === 0) {
        return [];
    }

    const baseUnit = config.betLimits.minOutside || 5;

    // Active state slots (at most 1 active Dozen and 1 active Column)
    if (state.activeDozen === undefined) state.activeDozen = null; // null or { value, unit, lossCount, forceRebet }
    if (state.activeColumn === undefined) state.activeColumn = null; // null or { value, unit, lossCount, forceRebet }

    // Helper: Determine tier-based unit increment according to loss count
    function getStepIncrement(lossCount) {
        if (lossCount <= 4) return 1;
        if (lossCount <= 8) return 2;
        if (lossCount <= 12) return 5;
        return 10;
    }

    // Helper: Determine winning dozen (1, 2, 3 or null)
    function getWinningDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return null;
    }

    // Helper: Determine winning column (1, 2, 3 or null)
    function getWinningColumn(num) {
        if (num <= 0 || num > 36) return null;
        if (num % 3 === 1) return 1;
        if (num % 3 === 2) return 2;
        if (num % 3 === 0) return 3;
        return null;
    }

    // Helper: Calculate consecutive spins without a win
    function getDrought(history, type, value) {
        let count = 0;
        for (let i = history.length - 1; i >= 0; i--) {
            const num = history[i].winningNumber;
            const hit = (type === 'dozen') 
                ? (getWinningDozen(num) === value)
                : (getWinningColumn(num) === value);
            if (hit) break;
            count++;
        }
        return count;
    }

    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNum = lastResult.winningNumber;
    const lastWinDozen = getWinningDozen(lastNum);
    const lastWinCol = getWinningColumn(lastNum);

    const historyBeforeLast = spinHistory.slice(0, spinHistory.length - 1);

    // 1. Evaluate existing Active Dozen
    if (state.activeDozen) {
        const won = (state.activeDozen.value === lastWinDozen);
        if (won) {
            const droughtBeforeWin = getDrought(historyBeforeLast, 'dozen', state.activeDozen.value);
            if (droughtBeforeWin >= 8) {
                // Rule 4: Rebet and reset bet amount & loss count
                state.activeDozen.unit = 1;
                state.activeDozen.lossCount = 0;
                state.activeDozen.forceRebet = true;
            } else {
                // Win fulfilled, clear active dozen slot
                state.activeDozen = null;
            }
        } else {
            // Tiered progression on loss
            state.activeDozen.lossCount = (state.activeDozen.lossCount || 0) + 1;
            const increment = getStepIncrement(state.activeDozen.lossCount);
            state.activeDozen.unit += increment;
            state.activeDozen.forceRebet = false;
        }
    }

    // 2. Evaluate existing Active Column
    if (state.activeColumn) {
        const won = (state.activeColumn.value === lastWinCol);
        if (won) {
            const droughtBeforeWin = getDrought(historyBeforeLast, 'column', state.activeColumn.value);
            if (droughtBeforeWin >= 8) {
                // Rule 4: Rebet and reset bet amount & loss count
                state.activeColumn.unit = 1;
                state.activeColumn.lossCount = 0;
                state.activeColumn.forceRebet = true;
            } else {
                // Win fulfilled, clear active column slot
                state.activeColumn = null;
            }
        } else {
            // Tiered progression on loss
            state.activeColumn.lossCount = (state.activeColumn.lossCount || 0) + 1;
            const increment = getStepIncrement(state.activeColumn.lossCount);
            state.activeColumn.unit += increment;
            state.activeColumn.forceRebet = false;
        }
    }

    // 3. Search for NEW Dozen if no active dozen is currently set
    if (!state.activeDozen) {
        let bestDozen = null;
        let maxDrought = -1;

        for (let d = 1; d <= 3; d++) {
            const drought = getDrought(spinHistory, 'dozen', d);
            if (drought >= 4 && drought > maxDrought) {
                maxDrought = drought;
                bestDozen = d;
            }
        }

        if (bestDozen !== null) {
            state.activeDozen = { value: bestDozen, unit: 1, lossCount: 0, forceRebet: false };
        }
    }

    // 4. Search for NEW Column if no active column is currently set
    if (!state.activeColumn) {
        let bestCol = null;
        let maxDrought = -1;

        for (let c = 1; c <= 3; c++) {
            const drought = getDrought(spinHistory, 'column', c);
            if (drought >= 4 && drought > maxDrought) {
                maxDrought = drought;
                bestCol = c;
            }
        }

        if (bestCol !== null) {
            state.activeColumn = { value: bestCol, unit: 1, lossCount: 0, forceRebet: false };
        }
    }

    // 5. Construct Bets (Maximum 1 Dozen bet and 1 Column bet)
    const bets = [];

    if (state.activeDozen) {
        let amount = baseUnit * state.activeDozen.unit;
        amount = Math.max(amount, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({
            type: 'dozen',
            value: state.activeDozen.value,
            amount: amount
        });
    }

    if (state.activeColumn) {
        let amount = baseUnit * state.activeColumn.unit;
        amount = Math.max(amount, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({
            type: 'column',
            value: state.activeColumn.value,
            amount: amount
        });
    }

    return bets;
}