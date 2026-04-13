/**
 * ROULETTE STRATEGY: Count Up Pro
 * * Source: Bet With Mo (https://youtu.be/b6Bxuobtke4)
 * * The Logic: The strategy places bets on two separate double streets (Line bets, covering 6 numbers each). 
 * This covers roughly 1/3 of the board (12 numbers total). 
 * * The Progression: This is a hybrid 10-level progression system designed for quick recoveries.
 * - On a Win: The sequence resets back to Level 1 (base bet).
 * - On a Loss (Levels 1-7): The bet increases via sequential addition. 
 * (L1: 1 unit, L2: L1+2, L3: L2+3, L4: L3+4, L5: L4+5, L6: L5+6, L7: L6+7)
 * - On a Loss (Levels 8-10): The strategy shifts to a strict multiplier, doubling the previous bet 
 * to force mathematical recovery.
 * - If Level 10 is lost, the strategy accepts the stop-loss and resets to Level 1.
 * * The Goal: The system aims for strict $20 profit milestones (or 20x base unit) to minimize bankroll exposure. 
 * Once a milestone is hit, a fresh cycle begins.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.min;

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.baseUnit = unit;
        
        // The multipliers for each of the 10 levels (per position)
        // L1: 1
        // L2: 1 + 2 = 3
        // L3: 3 + 3 = 6
        // L4: 6 + 4 = 10
        // L5: 10 + 5 = 15
        // L6: 15 + 6 = 21
        // L7: 21 + 7 = 28
        // L8: 28 * 2 = 56
        // L9: 56 * 2 = 112
        // L10: 112 * 2 = 224
        state.progressionSequence = [0, 1, 3, 6, 10, 15, 21, 28, 56, 112, 224];
        
        // Define our two line positions (double streets).
        // Standard double streets start at 1, 7, 13, 19, 25, 31.
        // We will use 13 (covers 13-18) and 31 (covers 31-36).
        state.positions = [13, 31]; 
        
        // Tracking for the milestone goal
        state.cycleStartBankroll = bankroll;
        state.profitMilestone = 20 * unit;
    }

    // 3. Evaluate Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        // Check if the last winning number falls within either of our line bets
        const wonPos1 = (num >= state.positions[0] && num <= state.positions[0] + 5);
        const wonPos2 = (num >= state.positions[1] && num <= state.positions[1] + 5);
        const won = wonPos1 || wonPos2;

        if (won) {
            // Reset progression on any win
            state.level = 1;
            
            // Check if we hit our overarching cycle milestone
            if (bankroll >= state.cycleStartBankroll + state.profitMilestone) {
                state.cycleStartBankroll = bankroll; // Start a new milestone cycle
            }
        } else {
            // Loss: advance progression
            state.level++;
            
            // Stop-loss reached, sequence failed, reset to level 1
            if (state.level > 10) {
                state.level = 1;
                state.cycleStartBankroll = bankroll; // Reset cycle tracking
            }
        }
    }

    // 4. Calculate Bet Amount
    const currentMultiplier = state.progressionSequence[state.level];
    let amount = state.baseUnit * currentMultiplier;

    // 5. Clamp to Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 6. Construct and Return Bets
    return [
        { type: 'line', value: state.positions[0], amount: amount },
        { type: 'line', value: state.positions[1], amount: amount }
    ];
}