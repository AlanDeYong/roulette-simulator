/**
 * SOURCE:
 * Channel: Bet With Mo
 * Video: SUPER SAFE - ROULETTE STRATEGY FOR LOW ROLLERS (https://www.youtube.com/watch?v=ukcKWC6hHXM)
 *
 * THE LOGIC:
 * 1. This strategy covers a large portion of the table using two Columns and one Corner bet.
 * 2. Positions:
 * - Mode "Up": Bets on Column 2, Column 3, and a Corner (e.g., 1-2-4-5).
 * - Mode "Down": Bets on Column 1, Column 2, and a Corner (e.g., 25-26-28-29).
 * 3. Triggers:
 * - WIN (Hit Corner): Net profit is +6 units. Reset to Level 1 and switch Mode (Up/Down).
 * - PUSH (Hit Column): Net profit is 0. Stay at the current level. If two Pushes occur in a row at the same level, proceed to the next level.
 * - LOSS (Hit nothing): Net loss is -3 units. Proceed to the next level immediately.
 *
 * THE PROGRESSION:
 * A 7-level system designed for a $495 bankroll (based on a $1 unit).
 * Unit Multipliers per spot: [1, 2, 6, 16, 20, 40, 80]
 * Total bet per level: [3, 6, 18, 48, 60, 120, 240]
 *
 * THE GOAL:
 * Target profit is approximately $200 (or as defined by user). 
 * Stop-loss is the exhaustion of the 7-level progression ($495).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 0; // 0 to 6
        state.pushCount = 0;
        state.mode = 'up'; // 'up' or 'down'
        state.initialBankroll = bankroll;
        state.targetProfit = 200000; 
    }

    const multipliers = [1, 2, 6, 16, 20, 40, 80];
    const unit = config.betLimits.minOutside; // Use minOutside as the base unit for columns

    // 2. Check for Take Profit or Stop Loss
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        return []; // Stop playing, target reached
    }
    
    // 3. Analyze Last Result to Update Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastLevel = state.level;
        const lastMultiplier = multipliers[lastLevel];
        const lastTotalBet = lastMultiplier * unit * 3;

        // Determine the result of the last bet
        // Note: This logic assumes the last bet was placed according to the state
        const lastNumber = lastSpin.winningNumber;
        const lastCols = state.mode === 'up' ? [2, 3] : [1, 2];
        const cornerNumbers = state.mode === 'up' ? [1, 2, 4, 5] : [25, 26, 28, 29];

        let result = 'loss';
        
        // Check Column Hit (Push)
        const hitColumn = (lastNumber % 3 === 0 && lastCols.includes(3)) || 
                          (lastNumber % 3 === 2 && lastCols.includes(2)) || 
                          (lastNumber % 3 === 1 && lastCols.includes(1));
        
        // Ensure it's not a zero (Columns don't cover 0)
        if (lastNumber !== 0 && hitColumn) {
            result = 'push';
        }

        // Check Corner Hit (Win)
        if (cornerNumbers.includes(lastNumber)) {
            result = 'win';
        }

        // Apply Strategy Rules
        if (result === 'win') {
            state.level = 0;
            state.pushCount = 0;
            state.mode = state.mode === 'up' ? 'down' : 'up'; // Switch coverage
        } else if (result === 'push') {
            state.pushCount++;
            if (state.pushCount >= 2) {
                state.level++;
                state.pushCount = 0;
            }
        } else { // loss
            state.level++;
            state.pushCount = 0;
        }

        // Safety reset if we bust the 7 levels
        if (state.level >= multipliers.length) {
            state.level = 0;
            state.pushCount = 0;
        }
    }

    // 4. Calculate Current Bet Amount
    const currentMultiplier = multipliers[state.level];
    let amountPerSpot = currentMultiplier * unit;

    // 5. Clamp to Limits
    amountPerSpot = Math.max(amountPerSpot, config.betLimits.minOutside);
    amountPerSpot = Math.min(amountPerSpot, config.betLimits.max);

    // 6. Define Bets based on Mode
    let bets = [];
    if (state.mode === 'up') {
        bets = [
            { type: 'column', value: 2, amount: amountPerSpot },
            { type: 'column', value: 3, amount: amountPerSpot },
            { type: 'corner', value: 1, amount: amountPerSpot } // Covers 1, 2, 4, 5
        ];
    } else {
        bets = [
            { type: 'column', value: 1, amount: amountPerSpot },
            { type: 'column', value: 2, amount: amountPerSpot },
            { type: 'corner', value: 25, amount: amountPerSpot } // Covers 25, 26, 28, 29
        ];
    }

    // 7. Final Bankroll Check
    const totalBetValue = amountPerSpot * 3;
    if (totalBetValue > bankroll) {
        return []; // Not enough money to continue progression
    }

    return bets;
}