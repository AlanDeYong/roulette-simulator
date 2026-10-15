/**
 * THE PIT BOSS ROULETTE STRATEGY
 * 
 * Source:
 *   - Video: "THE PIT BOSS - ROULETTE SYSTEM TUTORIAL"
 *   - Channel: "Bet With Mo"
 *   - URL: https://youtu.be/TPsoyKZpySY
 * 
 * The Full Logic in Detail:
 *   - "The Pit Boss" is a low-roller coverage system designed to target frequent multi-payouts
 *     and massive "jackpot" overlap hits.
 *   - Bets are placed on every spin across three key board areas:
 *       1. Double Streets (Six-Lines): Beginning with Double Street 1–6 (line 1), adding 7–12 (line 7),
 *          13–18 (line 13), and 19–24 (line 19) as losses occur.
 *       2. Center Splits: Covering the middle vertical split inside each active double street
 *          ([2, 5], [8, 11], [14, 17], and [20, 23]).
 *       3. The 3rd Column: Covering numbers (3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36).
 *   - Overlap Jackpots: Numbers in the 3rd Column that intersect the active double streets (e.g., 3, 6, 9, 12, etc.)
 *     pay out on both the line and the column simultaneously. Center splits provide extra single-number boosts.
 * 
 * The Full Bet Progression in Detail:
 *   - Base Unit: Scaled dynamically to satisfy table minimums (inside min and outside min / 4).
 *   - Level 1 (8 units total):
 *       - Line 1: 3 units | Split [2, 5]: 1 unit | Column 3: 4 units
 *   - Level 2 (16 units total):
 *       - Line 1: 3 units, Line 7: 3 units | Split [2, 5]: 1 unit, Split [8, 11]: 1 unit | Column 3: 8 units
 *   - Level 3 (48 units total - 24 units doubled 2x):
 *       - Line 1, 7, 13: 6 units each | Split [2, 5], [8, 11], [14, 17]: 2 units each | Column 3: 24 units
 *   - Level 4 (64 units total):
 *       - Line 1, 7, 13, 19: 6 units each | Split [2, 5], [8, 11], [14, 17], [20, 23]: 2 units each | Column 3: 32 units
 *   - Level 5 (128 units total - Level 4 doubled 2x):
 *       - Line 1, 7, 13, 19: 12 units each | Split [2, 5], [8, 11], [14, 17], [20, 23]: 4 units each | Column 3: 64 units
 *   - Level 6 (256 units total - Level 5 doubled 2x):
 *       - Line 1, 7, 13, 19: 24 units each | Split [2, 5], [8, 11], [14, 17], [20, 23]: 8 units each | Column 3: 128 units
 * 
 * Progression Rules:
 *   - Loss: Move up one progression level (max Level 6). At levels 5 and 6, permits a 1-spin rebet before capping.
 *   - Win to New Session High: Whenever bankroll reaches or surpasses the session peak, immediately reset to Level 1.
 *   - Win below Session High: Step back down 1 level (e.g., from Level 4 to Level 3, or Level 6 to Level 5) to protect profit.
 * 
 * The Goal:
 *   - Recommended starting bankroll: $520 (approx. 65 base units).
 *   - Profit Target: Recommended session cashout at +$200 profit (or +25 base units).
 *   - Stop-Loss: Stops betting if bankroll cannot fulfill the minimum required bets for the active level.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
        state.levelLossCount = 0;
        state.profitTarget = (config.startingBankroll || bankroll) + 20000;
    }

    // 2. Check Session High and Win/Loss Transitions
    if (spinHistory && spinHistory.length > 0) {
        const netChange = bankroll - state.lastBankroll;

        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
            state.level = 1;
            state.levelLossCount = 0;
        } else if (netChange > 0) {
            // Won, but not a new session high: drop down one level
            state.level = Math.max(1, state.level - 1);
            state.levelLossCount = 0;
        } else if (netChange < 0) {
            // Lost: advance progression
            state.levelLossCount++;
            if (state.level >= 5) {
                // At high levels (128 / 256), rebet once before advancing or holding
                if (state.levelLossCount >= 2) {
                    state.level = Math.min(6, state.level + 1);
                    state.levelLossCount = 0;
                }
            } else {
                state.level = Math.min(6, state.level + 1);
                state.levelLossCount = 0;
            }
        }
    }

    // Update last bankroll tracker
    state.lastBankroll = bankroll;

    // Optional Stop condition if target profit reached
    if (bankroll >= state.profitTarget) {
        return [];
    }

    // 3. Determine Base Unit based on Table Limits
    const minInside = config.betLimits && config.betLimits.min ? config.betLimits.min : 1;
    const minOutside = config.betLimits && config.betLimits.minOutside ? config.betLimits.minOutside : 1;
    const maxLimit = config.betLimits && config.betLimits.max ? config.betLimits.max : 500;

    // Split requires 1 unit >= minInside; Column 3 requires 4 units >= minOutside
    const unit = Math.max(minInside, Math.ceil(minOutside / 4));

    // Helper function to clamp bets within configured limits
    function clampBet(amount, isOutside) {
        const minReq = isOutside ? minOutside : minInside;
        return Math.min(maxLimit, Math.max(minReq, amount));
    }

    // 4. Construct Bets According to Active Level
    const bets = [];

    switch (state.level) {
        case 1:
            // 8 units total: Line 1 (3u), Split [2, 5] (1u), Col 3 (4u)
            bets.push({ type: 'line', value: 1, amount: clampBet(3 * unit, false) });
            bets.push({ type: 'split', value: [2, 5], amount: clampBet(1 * unit, false) });
            bets.push({ type: 'column', value: 3, amount: clampBet(4 * unit, true) });
            break;

        case 2:
            // 16 units total: Line 1 (3u), Line 7 (3u), Split [2, 5] (1u), Split [8, 11] (1u), Col 3 (8u)
            bets.push({ type: 'line', value: 1, amount: clampBet(3 * unit, false) });
            bets.push({ type: 'line', value: 7, amount: clampBet(3 * unit, false) });
            bets.push({ type: 'split', value: [2, 5], amount: clampBet(1 * unit, false) });
            bets.push({ type: 'split', value: [8, 11], amount: clampBet(1 * unit, false) });
            bets.push({ type: 'column', value: 3, amount: clampBet(8 * unit, true) });
            break;

        case 3:
            // 48 units total: Lines 1, 7, 13 (6u each), Splits [2,5], [8,11], [14,17] (2u each), Col 3 (24u)
            bets.push({ type: 'line', value: 1, amount: clampBet(6 * unit, false) });
            bets.push({ type: 'line', value: 7, amount: clampBet(6 * unit, false) });
            bets.push({ type: 'line', value: 13, amount: clampBet(6 * unit, false) });
            bets.push({ type: 'split', value: [2, 5], amount: clampBet(2 * unit, false) });
            bets.push({ type: 'split', value: [8, 11], amount: clampBet(2 * unit, false) });
            bets.push({ type: 'split', value: [14, 17], amount: clampBet(2 * unit, false) });
            bets.push({ type: 'column', value: 3, amount: clampBet(24 * unit, true) });
            break;

        case 4:
            // 64 units total: Lines 1, 7, 13, 19 (6u each), Splits [2,5], [8,11], [14,17], [20,23] (2u each), Col 3 (32u)
            bets.push({ type: 'line', value: 1, amount: clampBet(6 * unit, false) });
            bets.push({ type: 'line', value: 7, amount: clampBet(6 * unit, false) });
            bets.push({ type: 'line', value: 13, amount: clampBet(6 * unit, false) });
            bets.push({ type: 'line', value: 19, amount: clampBet(6 * unit, false) });
            bets.push({ type: 'split', value: [2, 5], amount: clampBet(2 * unit, false) });
            bets.push({ type: 'split', value: [8, 11], amount: clampBet(2 * unit, false) });
            bets.push({ type: 'split', value: [14, 17], amount: clampBet(2 * unit, false) });
            bets.push({ type: 'split', value: [20, 23], amount: clampBet(2 * unit, false) });
            bets.push({ type: 'column', value: 3, amount: clampBet(32 * unit, true) });
            break;

        case 5:
            // 128 units total (Level 4 doubled): Lines (12u each), Splits (4u each), Col 3 (64u)
            bets.push({ type: 'line', value: 1, amount: clampBet(12 * unit, false) });
            bets.push({ type: 'line', value: 7, amount: clampBet(12 * unit, false) });
            bets.push({ type: 'line', value: 13, amount: clampBet(12 * unit, false) });
            bets.push({ type: 'line', value: 19, amount: clampBet(12 * unit, false) });
            bets.push({ type: 'split', value: [2, 5], amount: clampBet(4 * unit, false) });
            bets.push({ type: 'split', value: [8, 11], amount: clampBet(4 * unit, false) });
            bets.push({ type: 'split', value: [14, 17], amount: clampBet(4 * unit, false) });
            bets.push({ type: 'split', value: [20, 23], amount: clampBet(4 * unit, false) });
            bets.push({ type: 'column', value: 3, amount: clampBet(64 * unit, true) });
            break;

        case 6:
        default:
            // 256 units total (Level 5 doubled): Lines (24u each), Splits (8u each), Col 3 (128u)
            bets.push({ type: 'line', value: 1, amount: clampBet(24 * unit, false) });
            bets.push({ type: 'line', value: 7, amount: clampBet(24 * unit, false) });
            bets.push({ type: 'line', value: 13, amount: clampBet(24 * unit, false) });
            bets.push({ type: 'line', value: 19, amount: clampBet(24 * unit, false) });
            bets.push({ type: 'split', value: [2, 5], amount: clampBet(8 * unit, false) });
            bets.push({ type: 'split', value: [8, 11], amount: clampBet(8 * unit, false) });
            bets.push({ type: 'split', value: [14, 17], amount: clampBet(8 * unit, false) });
            bets.push({ type: 'split', value: [20, 23], amount: clampBet(8 * unit, false) });
            bets.push({ type: 'column', value: 3, amount: clampBet(128 * unit, true) });
            break;
    }

    // 5. Total Bet Bankroll Check
    const totalRequired = bets.reduce((sum, b) => sum + b.amount, 0);
    if (bankroll < totalRequired) {
        // Fallback: reset to Level 1 if bankroll can afford it, otherwise cease betting
        state.level = 1;
        state.levelLossCount = 0;
        const level1Total = (3 + 1 + 4) * unit;
        if (bankroll < level1Total) {
            return [];
        }
        return [
            { type: 'line', value: 1, amount: clampBet(3 * unit, false) },
            { type: 'split', value: [2, 5], amount: clampBet(1 * unit, false) },
            { type: 'column', value: 3, amount: clampBet(4 * unit, true) }
        ];
    }

    return bets;
}