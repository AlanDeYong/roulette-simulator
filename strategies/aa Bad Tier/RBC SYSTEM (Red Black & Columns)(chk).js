/**
 * ============================================================================
 * ROULETTE STRATEGY: RBC SYSTEM (Red / Black & Columns)
 * ============================================================================
 * 
 * Source:
 * - Channel: Cruising & Craps
 * - Video URL: https://youtu.be/VFSYbZ3Qp4I
 * - Strategy Name: "RBC System" (Red Black Columns)
 * 
 * The Full Logic in Detail:
 * -------------------------
 * The RBC strategy deploys two independent betting systems simultaneously on 
 * the roulette layout:
 * 1. An Even-Money Color Bet (Red / Black):
 *    - Always bets on the last hit color ("following the streak"). If a zero / green
 *      appears, it retains the previously active color.
 * 2. A Two-Column Bet:
 *    - Simultaneously covers two columns (defaulting to Column 1 and Column 2, 
 *      covering ~64.8% of the wheel).
 * 
 * The Full Bet Progression in Detail:
 * -----------------------------------
 * The strategy treats the Color bet and Column bets as two separate, independent
 * progressions:
 * 
 * - Color Bet Progression:
 *   - Starts at 1 base unit (minOutside).
 *   - On Loss: Increase color bet size by 1 unit (+1 progression step) and switch
 *     to the winning color that just hit.
 *   - On Win: Reset color bet back to base unit (1 unit).
 * 
 * - Two-Column Bet Progression:
 *   - Starts at 1 base unit on each of the two selected columns.
 *   - On Loss (neither column hits, e.g., the uncovered 3rd column or zero):
 *     Increase each column bet by 1 unit (+1 progression step).
 *   - On Win (one of the two columns hits, paying 2:1):
 *     Reset both column bets back to base unit (1 unit each).
 * 
 * Increments & Limits:
 * --------------------
 * - Bet increments strictly observe config.incrementMode ('base' or 'fixed').
 * - Every placed bet is clamped between config.betLimits.minOutside and config.betLimits.max.
 * 
 * The Goal:
 * ---------
 * - Profit Target: Default target is +10 units of initial bankroll (in the video, +$100 on a $1,000 bankroll).
 * - Stop Loss: Default stop-loss is -30 units (loss of ~$300) to protect capital.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minOutside = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    // Determine the incremental step based on configuration
    const stepIncrement = config.incrementMode === 'base'
        ? minOutside
        : (config.minIncrementalBet || minOutside);

    // 1. Initialize State
    if (state.colorProgression === undefined) {
        state.colorProgression = 1;      // Current multiplier/units for color bet
        state.columnProgression = 1;     // Current multiplier/units for column bet
        state.targetColor = 'black';     // Initial color choice
        state.selectedColumns = [1, 2];  // Two columns to cover
        state.initialBankroll = bankroll;
        state.lastColorBet = null;
        state.lastColumnBets = null;
    }

    // 2. Target Profit and Stop Loss Checks
    const profitTarget = 1000 * minOutside; // e.g., $100 if base unit is $10
    const stopLoss = 30 * minOutside;     // e.g., $300 if base unit is $10

    if (bankroll >= state.initialBankroll + profitTarget) {
        return []; // Target reached: stop betting
    }
    if (bankroll <= state.initialBankroll - stopLoss) {
        return []; // Stop-loss reached: protect bankroll
    }

    // 3. Evaluate previous spin and adjust progressions
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNumber = lastSpin.winningNumber;
        const lastWinningColor = lastSpin.winningColor;

        // --- Evaluate Color Bet ---
        if (state.lastColorBet) {
            if (lastWinningColor === state.lastColorBet.type) {
                // Win on color: reset to base unit
                state.colorProgression = 1;
            } else {
                // Loss on color (opposite color or green): advance progression
                state.colorProgression += 1;
            }
        }

        // Always follow the streak: switch to the last winning color (if not green)
        if (lastWinningColor === 'red' || lastWinningColor === 'black') {
            state.targetColor = lastWinningColor;
        }

        // --- Evaluate Column Bet ---
        if (state.lastColumnBets && state.lastColumnBets.length > 0) {
            // Find which column won (1, 2, or 3). Zero has no column.
            let winningColumn = null;
            if (lastWinningNumber > 0) {
                const remainder = lastWinningNumber % 3;
                winningColumn = remainder === 1 ? 1 : (remainder === 2 ? 2 : 3);
            }

            const hitColumn = state.selectedColumns.includes(winningColumn);
            if (hitColumn) {
                // One of the two columns won: reset to base unit
                state.columnProgression = 1;
            } else {
                // Neither column won: advance progression
                state.columnProgression += 1;
            }
        }
    }

    // 4. Calculate Bet Amounts
    let colorBetAmount = minOutside + (state.colorProgression - 1) * stepIncrement;
    let columnBetAmount = minOutside + (state.columnProgression - 1) * stepIncrement;

    // Clamp to table limits
    colorBetAmount = Math.max(minOutside, Math.min(colorBetAmount, maxBet));
    columnBetAmount = Math.max(minOutside, Math.min(columnBetAmount, maxBet));

    // Ensure total required bet doesn't exceed current bankroll
    const totalRequired = colorBetAmount + (columnBetAmount * 2);
    if (bankroll < totalRequired) {
        return []; // Insufficient funds to maintain the strategy layout
    }

    // 5. Construct Bets
    const bets = [
        {
            type: state.targetColor,
            amount: colorBetAmount
        },
        {
            type: 'column',
            value: state.selectedColumns[0],
            amount: columnBetAmount
        },
        {
            type: 'column',
            value: state.selectedColumns[1],
            amount: columnBetAmount
        }
    ];

    // Save tracking state for the next spin
    state.lastColorBet = bets[0];
    state.lastColumnBets = [bets[1], bets[2]];

    return bets;
}