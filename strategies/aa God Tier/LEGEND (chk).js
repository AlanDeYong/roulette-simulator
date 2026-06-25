/**
 * Board Legend Roulette Strategy
 * Source: https://youtu.be/OlJOzuyPMSI (YouTube Channel: Bet With Mo)
 * * The Full Logic in details:
 * This strategy covers a large portion of the board using double streets (line bets) and corners.
 * A session peak profit is tracked. If a spin results in a net win (bankroll increases) but 
 * the peak profit hasn't been reached, the strategy rebets at the current progression level.
 * If a spin results in a net loss (bankroll decreases), the strategy progresses up 1 level.
 * If a new peak profit is reached, the progression fully resets to the starting level.
 * * The Full Bet Progression in details:
 * The strategy moves through 7 levels (Level 0 to Level 6) upon consecutive losses:
 * - Level 0: 1 unit on double streets 7/12, 13/18, 19/24, 25/30.
 * - Level 1: Add 1 unit on corners 8/12, 14/18, 20/24, 26/30.
 * - Level 2: Increase all double street bets by their base bet amount (+1 unit = 2u).
 * - Level 3: Increase all corner bets by their base bet amount (+1 unit = 2u).
 * - Level 4: Increase all double street bets by their base bet amount (+1 unit = 3u).
 * - Level 5: On the next loss, double up all bets (DS = 6u, Corner = 4u).
 * - Level 6: On the next loss, double up all bets again (DS = 12u, Corner = 8u).
 * * The Goal: 
 * Systematically increase bet coverage and size to recoup losses, reverting to a lower risk profile 
 * as profit recovers. The ultimate goal is to consistently reach new session peak profits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.peakProfit === undefined) {
        state.peakProfit = bankroll;
        state.currentLevel = 0;
    }

    const levelDefinitions = [
        { dsUnits: 1, cornerUnits: 0 },
        { dsUnits: 1, cornerUnits: 1 },
        { dsUnits: 2, cornerUnits: 1 },
        { dsUnits: 2, cornerUnits: 2 },
        { dsUnits: 3, cornerUnits: 2 },
        { dsUnits: 6, cornerUnits: 4 },
        { dsUnits: 12, cornerUnits: 8 }
    ];

    // 2. Evaluate previous spin
    if (spinHistory.length > 0 && state.lastBankroll !== undefined) {
        if (bankroll > state.peakProfit) {
            state.peakProfit = bankroll;
            state.currentLevel = 0; // Reset progression
        } else if (bankroll > state.lastBankroll) {
            // Net win, but not at peak profit -> Rebet (maintain current level)
        } else {
            // Net loss -> Go up 1 level
            state.currentLevel = Math.min(levelDefinitions.length - 1, state.currentLevel + 1);
        }
    }

    // Update lastBankroll to the current bankroll before we place new bets
    state.lastBankroll = bankroll;

    // 3. Determine base unit
    const unit = config.betLimits.min; 
    const currentDef = levelDefinitions[state.currentLevel];
    const bets = [];

    // 4. Calculate Bet Amounts and Clamp to Limits
    if (currentDef.dsUnits > 0) {
        let amount = currentDef.dsUnits * unit;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        
        [7, 13, 19, 25].forEach(num => {
            bets.push({ type: 'line', value: num, amount: amount });
        });
    }

    if (currentDef.cornerUnits > 0) {
        let amount = currentDef.cornerUnits * unit;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        
        [8, 14, 20, 26].forEach(num => {
            bets.push({ type: 'corner', value: num, amount: amount });
        });
    }

    // 5. Return Bets
    return bets;
}