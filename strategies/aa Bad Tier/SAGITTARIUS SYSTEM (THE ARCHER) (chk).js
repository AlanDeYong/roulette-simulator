/**
 * ============================================================================
 * STRATEGY DOCUMENTATION: THE SAGITTARIUS SYSTEM (THE ARCHER)
 * ============================================================================
 * 
 * Source:
 *   - Video: "The Sagittarius System: The Ultimate Target Practice"
 *   - Channel: The Lucky Felt (Todd Hoover)
 *   - URL: https://youtu.be/sTc9Aa3J9ng
 * 
 * The Full Logic in Detail:
 *   Sagittarius represents the Archer—wide coverage across the board to fund 
 *   table time while taking targeted high-leverage shots at a single number.
 *   
 *   - Outside Coverage (The Bow):
 *     2 units on the 1st Dozen (1-12)
 *     2 units on the 3rd Dozen (25-36)
 *   - Inside Shot (The Arrow):
 *     1 unit straight-up on any number located in the 2nd Dozen (13-24). 
 *     Default is 17 (the center of the board). If cold or user preferred, 
 *     it can roam to any hot number within the 2nd Dozen (e.g., 14, 19, 20, 23).
 *   
 *   - Payout Mechanics:
 *     * When 1st or 3rd Dozen hits: Pays 2:1 on that dozen (+1 unit net profit),
 *       keeping bankroll steady.
 *     * When the targeted straight-up number hits: Pays 35:1 (+31 units net profit),
 *       vaulting the session into substantial profit.
 *     * When an uncovered 2nd dozen number or 0 hits: -5 units net loss.
 * 
 * The Full Bet Progression in Detail (3-2-1 Tiered Progression):
 *   - Stage 1 (Base Level, 1x multiplier):
 *     * Bets: 2 units Doz 1, 2 units Doz 3, 1 unit Straight-Up.
 *     * Duration: 3 spins.
 *   - Stage 2 (Double Level, 2x multiplier):
 *     * Bets: 4 units Doz 1, 4 units Doz 3, 2 units Straight-Up.
 *     * Duration: 2 spins.
 *     * If in good session profit or target reached during this stage, resets.
 *   - Stage 3 (Double Level, 4x multiplier):
 *     * Bets: 8 units Doz 1, 8 units Doz 3, 4 units Straight-Up.
 *     * Duration: 1 spin.
 *   - Cycle Reset:
 *     * After finishing Stage 3 (or upon reaching profit target), the cycle 
 *       resets back to Stage 1.
 * 
 * The Goal:
 *   - Profit Target: +20% of starting bankroll (e.g. +$400 on $2,000 bankroll).
 *   - Stop Loss: Inability to cover table minimums or hitting bankroll exhaustion.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.startingBankroll = bankroll;
        state.targetProfit = bankroll * 0.20; // 20% target profit
        state.stage = 1;                      // 1, 2, or 3
        state.spinsInStage = 0;
        state.arrowNumber = 17;              // Target straight-up number in 2nd Dozen
        state.maxSpinsPerStage = { 1: 3, 2: 2, 3: 1 };
    }

    // 2. Goal Check: Stop if target profit reached or insufficient bankroll
    const currentProfit = bankroll - state.startingBankroll;
    if (currentProfit >= state.targetProfit) {
        return []; // Target achieved, end session
    }

    // 3. Process previous spin result and advance progression
    if (spinHistory.length > 0) {
        state.spinsInStage++;

        // Reset if we reached a satisfactory profit surge
        if (currentProfit >= state.targetProfit) {
            return [];
        }

        // Check if current stage has completed its spin allowance
        const stageMax = state.maxSpinsPerStage[state.stage];
        if (state.spinsInStage >= stageMax) {
            if (state.stage === 1) {
                state.stage = 2;
                state.spinsInStage = 0;
            } else if (state.stage === 2) {
                // If in session profit after Stage 2, reset; otherwise step into Stage 3
                if (currentProfit > 0) {
                    state.stage = 1;
                } else {
                    state.stage = 3;
                }
                state.spinsInStage = 0;
            } else {
                // End of Stage 3: reset back to Stage 1
                state.stage = 1;
                state.spinsInStage = 0;
            }
        }
    }

    // 4. Calculate Multiplier based on stage
    // Stage 1: 1x, Stage 2: 2x, Stage 3: 4x
    const multiplier = Math.pow(2, state.stage - 1);

    // 5. Establish Unit Sizes respecting betLimits
    // Base Dozen bet is 2 units (must satisfy minOutside)
    // Base Straight-up bet is 1 unit (must satisfy min inside)
    const baseInsideUnit = config.betLimits.min;
    const baseOutsideUnit = Math.max(config.betLimits.minOutside / 2, baseInsideUnit);

    let straightUpAmount = baseInsideUnit * multiplier;
    let dozenAmount = baseOutsideUnit * 2 * multiplier;

    // Clamp inside bet
    straightUpAmount = Math.max(straightUpAmount, config.betLimits.min);
    straightUpAmount = Math.min(straightUpAmount, config.betLimits.max);

    // Clamp outside bets
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    // Total required for this spin
    const totalRequired = straightUpAmount + (dozenAmount * 2);
    if (bankroll < totalRequired) {
        return []; // Insufficient funds to place full strategy layout
    }

    // 6. Return Bet Array
    return [
        { type: 'dozen', value: 1, amount: dozenAmount },
        { type: 'dozen', value: 3, amount: dozenAmount },
        { type: 'number', value: state.arrowNumber, amount: straightUpAmount }
    ];
}