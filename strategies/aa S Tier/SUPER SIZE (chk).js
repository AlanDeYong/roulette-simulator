/**
 * Super Size - Roulette Strategy
 * 
 * Source: Bet With Mo - "SUPER SIZE - ROULETTE STRATEGY | 30 NUMBERS COVERED | HUGE WIN POTENTIAL NEW SYSTEM"
 * URL: https://www.youtube.com/watch?v=-VkZLxGZYKs
 * 
 * The Logic: 
 * This is a massive coverage strategy that covers up to 30 numbers on the board using a combination 
 * of straight-up bets and double street (line) bets. Because of the heavy overlap, hits can either 
 * result in a full win (net profit > 0) or a partial loss (net profit < 0, but a covered number hit).
 * 
 * The Progression:
 * - The strategy operates across 7 defined levels of coverage and bet sizes.
 * - On a full loss (a number hits that is completely uncovered, like 0): Move up 1 level.
 * - On a partial loss: Re-bet the same level. If a partial loss occurs 3 times in a row, move up 1 level.
 * - On a win (net profit > 0): Stay at the current level and keep betting until the session target is reached.
 * 
 * Level Layouts (1 unit = minimum bet):
 * - Level 1: Straight 16-21 (1u). Line 16 (2u).
 * - Level 2: Straight 13-24 (1u). Lines 13, 16, 19 (2u).
 * - Level 3: Straight 10-27 (1u). Lines 10, 13, 16, 19, 22 (2u).
 * - Level 4: Straight 7-30 (1u). Lines 7, 10, 13, 16, 19, 22, 25 (4u).
 * - Level 5: Straight 4-33 (2u). Lines 4, 7, 10, 13, 16, 19, 22, 25, 28 (12u).
 * - Level 6: Straight 4-33 (2u). Lines 4, 7, 10, 13, 16, 19, 22, 25, 28 (16u).
 * - Level 7: Straight 4-33 (4u). Lines 4, 7, 10, 13, 16, 19, 22, 25, 28 (42u).
 * 
 * The Goal: 
 * Target a $20 profit from the highest recorded bankroll of the session. Once achieved, reset 
 * the progression back to Level 1 and set a new $20 profit target.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables
    if (state.level === undefined) {
        state.level = 1;
        state.partialLossCount = 0;
        state.sessionHigh = bankroll;
        state.sessionTarget = bankroll + 20;
        state.lastBankroll = bankroll;
    }

    // Update Session High
    state.sessionHigh = Math.max(state.sessionHigh, bankroll);

    // 2. Process Previous Spin Result
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const netProfit = bankroll - state.lastBankroll;
        
        // Helper to check if the last number was covered (to detect partial loss)
        // Since all levels center around blocks of numbers, we can deduce coverage by the level's range
        let coveredMin = 16 - ((state.level > 4 ? 4 : state.level - 1) * 3);
        let coveredMax = 21 + ((state.level > 4 ? 4 : state.level - 1) * 3);
        const isCovered = lastSpin.winningNumber >= coveredMin && lastSpin.winningNumber <= coveredMax && lastSpin.winningNumber !== 0;

        // Target Reached: Reset progression
        if (bankroll >= state.sessionTarget) {
            state.level = 1;
            state.partialLossCount = 0;
            state.sessionTarget = state.sessionHigh + 20;
        } 
        // Loss Detection
        else if (netProfit <= 0) {
            if (isCovered) {
                // Partial Loss
                state.partialLossCount++;
                if (state.partialLossCount >= 2) { 
                    // Rebet up to 2 times, then move up (so >= 2 triggers level up)
                    state.level++;
                    state.partialLossCount = 0;
                }
            } else {
                // Full Loss (e.g., 0 hit, or outside our block)
                state.level++;
                state.partialLossCount = 0;
            }
        } 
        // Pure Win (but target not yet reached)
        else {
            state.partialLossCount = 0; 
        }

        // Cap Level at 7 to prevent infinite progression
        if (state.level > 7) {
            state.level = 7;
        }
    }

    // Save current bankroll for next spin's net profit calculation
    state.lastBankroll = bankroll;

    // 3. Define Bet Placements per Level
    let straights = [];
    let lines = [];
    let straightUnits = 1;
    let lineUnits = 2;

    switch (state.level) {
        case 1:
            straights = [16, 17, 18, 19, 20, 21];
            lines = [16];
            straightUnits = 1;
            lineUnits = 2;
            break;
        case 2:
            straights = Array.from({length: 12}, (_, i) => 13 + i); 
            lines = [13, 16, 19];
            straightUnits = 1;
            lineUnits = 2;
            break;
        case 3:
            straights = Array.from({length: 18}, (_, i) => 10 + i); 
            lines = [10, 13, 16, 19, 22];
            straightUnits = 1;
            lineUnits = 2;
            break;
        case 4:
            straights = Array.from({length: 24}, (_, i) => 7 + i); 
            lines = [7, 10, 13, 16, 19, 22, 25];
            straightUnits = 1;
            lineUnits = 4;
            break;
        case 5:
            straights = Array.from({length: 30}, (_, i) => 4 + i); 
            lines = [4, 7, 10, 13, 16, 19, 22, 25, 28];
            straightUnits = 2;
            lineUnits = 12;
            break;
        case 6:
            straights = Array.from({length: 30}, (_, i) => 4 + i); 
            lines = [4, 7, 10, 13, 16, 19, 22, 25, 28];
            straightUnits = 2;
            lineUnits = 16;
            break;
        case 7:
            straights = Array.from({length: 30}, (_, i) => 4 + i); 
            lines = [4, 7, 10, 13, 16, 19, 22, 25, 28];
            straightUnits = 4;
            lineUnits = 42;
            break;
    }

    // 4. Construct and Clamp Bets
    const bets = [];
    const unit = config.betLimits.min;

    // Calculate clamped amounts
    const finalStraightAmount = Math.min(Math.max(straightUnits * unit, config.betLimits.min), config.betLimits.max);
    const finalLineAmount = Math.min(Math.max(lineUnits * unit, config.betLimits.min), config.betLimits.max);

    // Place Straight Bets
    for (const num of straights) {
        bets.push({ type: 'number', value: num, amount: finalStraightAmount });
    }

    // Place Line (Double Street) Bets
    // Note: The 'value' for a line bet is the first number of the 6-number block.
    for (const lineStart of lines) {
        bets.push({ type: 'line', value: lineStart, amount: finalLineAmount });
    }

    return bets;
}