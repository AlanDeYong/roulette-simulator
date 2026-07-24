/**
 * Strategy Name: FORTUNE STACK
 * Source: YouTube (https://youtu.be/k_uRPn-PKqY)
 * From BET WITH MO, Video deleted
 * 
 * Full Logic & Conditions:
 * - This strategy dynamically covers a set sector of the roulette board (numbers 10 through 27) 
 *   using double streets, splits, and straight-up bets.
 * - The strategy tracks the session's peak bankroll. 
 * - On a Win: If the bankroll reaches or exceeds the session's peak profit, the strategy resets to Level 1. 
 *   If a win occurs but does not reach a new peak, it maintains the current progression level ("rebet").
 * - On a Loss: The strategy advances to the next progression level, intensifying coverage and bet sizing.
 * 
 * Full Bet Progression (8 Levels):
 * 1. Level 1 (9 Units): 3 units each on double streets 10/15, 16/21, 22/27.
 * 2. Level 2 (24 Units): Double the double streets (6 units each) + add 1 unit each on splits 10/11, 13/14, 16/17, 19/20, 22/23, 25/26.
 * 3. Level 3 (39 Units): Double streets increase to 9 units each + keep previous splits + add 1 unit each on splits 11/12, 14/15, 17/18, 20/21, 23/24, 26/27.
 * 4. Level 4 (54 Units): Double streets increase to 12 units each + keep all 12 splits + add 1 unit each on straight numbers 11, 14, 17, 20, 23, 26.
 * 5. Level 5 (69 Units): Double streets increase to 15 units each + keep all 12 splits + straight numbers increase to 2 units each.
 * 6. Level 6 (84 Units): Double streets increase to 18 units each + keep all 12 splits + straight numbers increase to 3 units each.
 * 7. Level 7 (99 Units): Double streets increase to 21 units each + keep all 12 splits + straight numbers increase to 4 units each.
 * 8. Level 8 (198 Units): Double up all bet amounts from Level 7.
 * 
 * Goal:
 * - Continuously secure new session peak bankrolls, resetting risk upon achieving a peak.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
    }
    if (state.currentLevel === undefined) {
        state.currentLevel = 1;
    }

    // Update peak bankroll if current bankroll is higher
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Determine base unit using inside bet minimums
    const unit = config.betLimits.min || 2;

    // 3. Process Win/Loss Logic from the last spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Determine if the last spin was a win by checking if the number falls within our covered area (10-27)
        const isWin = lastNumber >= 10 && lastNumber <= 27;

        if (isWin) {
            // Reset to Level 1 if we reached or exceeded the session's peak bankroll
            if (bankroll >= state.peakBankroll) {
                state.currentLevel = 1;
            }
            // Otherwise, "rebet" means we stay at the current level
        } else {
            // On loss, move to the next level
            state.currentLevel++;
            if (state.currentLevel > 8) {
                state.currentLevel = 1; // Safeguard reset after completing the full progression
            }
        }
    }

    // 4. Build Bets Based on Current Progression Level
    const bets = [];

    // Base bet allocations per level
    let dsAmount = 0;       // Double Street units
    let splitGroup1 = 0;   // Units for 10/11, 13/14, 16/17, 19/20, 22/23, 25/26
    let splitGroup2 = 0;   // Units for 11/12, 14/15, 17/18, 20/21, 23/24, 26/27
    let straightAmount = 0; // Units for 11, 14, 17, 20, 23, 26

    switch (state.currentLevel) {
        case 1:
            dsAmount = 3;
            break;
        case 2:
            dsAmount = 6;
            splitGroup1 = 1;
            break;
        case 3:
            dsAmount = 9;
            splitGroup1 = 1;
            splitGroup2 = 1;
            break;
        case 4:
            dsAmount = 12;
            splitGroup1 = 1;
            splitGroup2 = 1;
            straightAmount = 1;
            break;
        case 5:
            dsAmount = 15;
            splitGroup1 = 1;
            splitGroup2 = 1;
            straightAmount = 2;
            break;
        case 6:
            dsAmount = 18;
            splitGroup1 = 1;
            splitGroup2 = 1;
            straightAmount = 3;
            break;
        case 7:
            dsAmount = 21;
            splitGroup1 = 1;
            splitGroup2 = 1;
            straightAmount = 4;
            break;
        case 8:
            dsAmount = 42;
            splitGroup1 = 2;
            splitGroup2 = 2;
            straightAmount = 8;
            break;
    }

    // Helper function to safely push and clamp inside bets
    const addInsideBet = (type, value, units) => {
        if (units <= 0) return;
        let amount = units * unit;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        bets.push({ type, value, amount });
    };

    // Place Double Street Bets (Six Lines)
    addInsideBet('line', 10, dsAmount);
    addInsideBet('line', 16, dsAmount);
    addInsideBet('line', 22, dsAmount);

    // Place Split Group 1 Bets
    const splits1 = [[10, 11], [13, 14], [16, 17], [19, 20], [22, 23], [25, 26]];
    splits1.forEach(val => addInsideBet('split', val, splitGroup1));

    // Place Split Group 2 Bets
    const splits2 = [[11, 12], [14, 15], [17, 18], [20, 21], [23, 24], [26, 27]];
    splits2.forEach(val => addInsideBet('split', val, splitGroup2));

    // Place Straight Up Number Bets
    const straights = [11, 14, 17, 20, 23, 26];
    straights.forEach(val => addInsideBet('number', val, straightAmount));

    return bets;
}