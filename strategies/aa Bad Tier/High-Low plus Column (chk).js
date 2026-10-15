/**
 * Strategy: High-Low/Column Roulette Strategy (Dynamic Historical Recency Tracking)
 * Source: https://youtu.be/rdkMpsXxzNY?si=2Rbia983OWmEM3vf
 * Channel: The Roulette Master
 *
 * * The Logic:
 * - Initial State: The app waits until exactly 2 unique columns have hit in the spin history before making its very first bet on the column that hasn't appeared yet.
 * - Subsequent Reset Placement: When a reset/new sequence is triggered (e.g., after a jackpot win), the app searches back through the entire historical record to identify the 2 columns that won most recently (ignoring repeated hits and zeros) and targets the single remaining column that hasn't won recently.
 * - High/Low selection: Continues to avoid the side that last won on the previous spin.
 *
 * * The Progression:
 * - Base Unit: 30 units on High/Low, 20 units on Column (scaled by config.betLimits.minOutside).
 * - After a Loss: Increase High/Low by 15 units, Column by 10 units.
 * - After a Jackpot Win (Both selections win): Reset progression back to 0.
 * - After a Partial Win: Maintain current progression level.
 *
 * * The Goal:
 * - Filter out active repeating column configurations by dynamically sweeping backwards through history to accurately hunt down cold columns.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.init) {
        state.init = true;
        state.highLowProgression = 0;
        state.columnProgression = 0;
        state.lastTargetHighLow = null;
        state.lastTargetColumn = null;
        state.hasPlacedFirstBet = false;
    }

    // Determine Base Units and Increments respecting Outside bet limits
    const minOutside = config.betLimits.minOutside || 5;
    const baseHighLow = minOutside * 6;      // 30 units standard base
    const baseColumn = minOutside * 4;       // 20 units standard base
    const highLowIncrement = minOutside * 3;  // 15 units step
    const columnIncrement = minOutside * 2;   // 10 units step

    // Helper to map winning number to column (1, 2, or 3)
    const getColumn = (num) => {
        if ([1,4,7,10,13,16,19,22,25,28,31,34].includes(num)) return 1;
        if ([2,5,8,11,14,17,20,23,26,29,32,35].includes(num)) return 2;
        if ([3,6,9,12,15,18,21,24,27,30,33,36].includes(num)) return 3;
        return null; // 0 or 00
    };

    // 2. Evaluate outcome of the last actual bet placed to adjust progression
    if (spinHistory && spinHistory.length > 0 && state.lastTargetHighLow && state.lastTargetColumn) {
        const lastNumber = spinHistory[spinHistory.length - 1].winningNumber;
        
        const wasLowWin = state.lastTargetHighLow === 'low' && lastNumber >= 1 && lastNumber <= 18;
        const wasHighWin = state.lastTargetHighLow === 'high' && lastNumber >= 19 && lastNumber <= 36;
        const wasEvenMoneyWin = wasLowWin || wasHighWin;

        let wasColumnWin = false;
        if (state.lastTargetColumn === 1 && [1,4,7,10,13,16,19,22,25,28,31,34].includes(lastNumber)) wasColumnWin = true;
        if (state.lastTargetColumn === 2 && [2,5,8,11,14,17,20,23,26,29,32,35].includes(lastNumber)) wasColumnWin = true;
        if (state.lastTargetColumn === 3 && [3,6,9,12,15,18,21,24,27,30,33,36].includes(lastNumber)) wasColumnWin = true;

        if (wasEvenMoneyWin && wasColumnWin) {
            // Jackpot hit: Reset progressions and clear triggers to force a fresh historical tracking calculation
            state.highLowProgression = 0;
            state.columnProgression = 0;
            state.lastTargetHighLow = null;
            state.lastTargetColumn = null;
        } else if (!wasEvenMoneyWin && !wasColumnWin) {
            // Total loss: Step up progression
            state.highLowProgression += 1;
            state.columnProgression += 1;
        }
    }

    // 3. Dynamic Selection Logic
    let targetColumn = null;
    let targetHighLow = null;

    if (!state.lastTargetHighLow || !state.lastTargetColumn) {
        // Find the 2 most recently won columns by parsing history backwards
        const recentColumns = [];
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const col = getColumn(spinHistory[i].winningNumber);
            if (col && !recentColumns.includes(col)) {
                recentColumns.push(col);
            }
            if (recentColumns.length === 2) {
                break;
            }
        }

        // Handle initial waiting lock condition
        if (!state.hasPlacedFirstBet) {
            if (recentColumns.length < 2) {
                return []; // Keep waiting initially
            }
            state.hasPlacedFirstBet = true;
        }

        // Determine column that has not hit recently out of [1, 2, 3]
        if (recentColumns.length === 2) {
            targetColumn = 6 - recentColumns[0] - recentColumns[1];
        } else {
            // Safe fallback defaults if history lacks distribution variations
            targetColumn = 1;
        }

        // High/Low selection: avoid the side that last won on the previous spin
        if (spinHistory.length > 0) {
            const lastSpinNum = spinHistory[spinHistory.length - 1].winningNumber;
            if (lastSpinNum >= 1 && lastSpinNum <= 18) {
                targetHighLow = 'high';
            } else if (lastSpinNum >= 19 && lastSpinNum <= 36) {
                targetHighLow = 'low';
            } else {
                targetHighLow = 'low';
            }
        } else {
            targetHighLow = 'low';
        }

        // Save current placement locks to state
        state.lastTargetHighLow = targetHighLow;
        state.lastTargetColumn = targetColumn;
    } else {
        // Keep active layout locked during rolling progression increments/decrements
        targetHighLow = state.lastTargetHighLow;
        targetColumn = state.lastTargetColumn;
    }

    // 4. Calculate final clamped bet amounts
    let highLowAmount = baseHighLow + (state.highLowProgression * highLowIncrement);
    let columnAmount = baseColumn + (state.columnProgression * columnIncrement);

    highLowAmount = Math.max(config.betLimits.minOutside, Math.min(highLowAmount, config.betLimits.max));
    columnAmount = Math.max(config.betLimits.minOutside, Math.min(columnAmount, config.betLimits.max));

    return [
        { type: targetHighLow, amount: highLowAmount },
        { type: 'column', value: targetColumn, amount: columnAmount }
    ];
}