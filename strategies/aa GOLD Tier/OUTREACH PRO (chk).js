/**
 * ROULETTE STRATEGY: OUTREACH PRO
 * 
 * Source:
 * - Channel: Bet With Mo
 * - Video URL: https://youtu.be/H0XmvZ1vUQg
 * 
 * Strategy Overview & Full Logic:
 * - Outreach Pro is a multi-tier positional cover strategy targeting center streets (13-15, 16-18, 19-21, 22-24),
 *   center splits, the 3rd column, and a safety zero split (0/2 or 0/00).
 * - A spin win or profit milestone resets the progression to Level 1.
 * - Losses trigger advancement through 7 predefined bet levels with scaling coverage.
 * 
 * Full Bet Progression (7 Levels):
 * - Level 1 ($10 Total):
 *   - 4 Streets (13, 16, 19, 22) @ 1 unit each ($4)
 *   - 1 Split (0, 2) @ 1 unit ($1)
 *   - 3rd Column @ 5 units ($5)
 * - Level 2 ($18 Total):
 *   - 4 Streets (13, 16, 19, 22) @ 2 units each ($8)
 *   - 4 Splits ([13,14], [16,17], [19,20], [22,23]) @ 1 unit each ($4)
 *   - 1 Split (0, 2) @ 1 unit ($1)
 *   - 3rd Column @ 5 units ($5)
 * - Level 3 ($36 Total):
 *   - 4 Streets (13, 16, 19, 22) @ 4 units each ($16)
 *   - 4 Splits ([13,14], [16,17], [19,20], [22,23]) @ 1 unit each ($4)
 *   - 4 Splits ([14,15], [17,18], [20,21], [23,24]) @ 1 unit each ($4)
 *   - 1 Split (0, 2) @ 2 units ($2)
 *   - 3rd Column @ 10 units ($10)
 * - Level 4 ($54 Total):
 *   - 4 Center Streets (13, 16, 19, 22) @ 4 units each ($16)
 *   - 2 Outer Streets (10, 25) @ 4 units each ($8)
 *   - 8 Center Splits ([13,14], [16,17], [19,20], [22,23], [14,15], [17,18], [20,21], [23,24]) @ 1 unit each ($8)
 *   - 4 Outer Splits ([10,11], [11,12], [25,26], [26,27]) @ 1 unit each ($4)
 *   - 1 Split (0, 2) @ 3 units ($3)
 *   - 3rd Column @ 15 units ($15)
 * - Level 5 ($108 Total): Level 4 doubled
 * - Level 6 ($216 Total): Level 5 doubled
 * - Level 7 ($432 Total): Level 6 doubled
 * 
 * Goal / Exit Condition:
 * - Target profit in increments ($20 - $100 profit sessions).
 * - Reset to Level 1 after a win that restores bankroll above starting/session baseline.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Base units and Limits Setup
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // 2. State Initialization
    if (!state.init) {
        state.init = true;
        state.level = 1;
        state.startingBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // 3. Evaluate previous result to adjust level
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWin = lastSpin.netWin !== undefined ? lastSpin.netWin : (bankroll - state.lastBankroll);
        
        if (lastWin > 0) {
            // On a win, if overall bankroll improved or restored session target, reset to Level 1
            if (bankroll >= state.startingBankroll) {
                state.level = 1;
                state.startingBankroll = bankroll; // update profit baseline
            } else {
                // Step back level or stay if partial recovery
                state.level = Math.max(1, state.level - 1);
            }
        } else if (lastWin < 0) {
            // On loss, advance level up to max level 7
            state.level = Math.min(7, state.level + 1);
        }
    }
    state.lastBankroll = bankroll;

    // Helper function to clamp bet amounts to configured limits
    function clampBet(amount, isOutside) {
        const min = isOutside ? minOutside : minInside;
        return Math.min(Math.max(amount, min), maxBet);
    }

    // Determine scale factor for levels 5-7 (doubling level 4)
    let scale = 1;
    let activeLevel = state.level;
    if (state.level >= 5) {
        scale = Math.pow(2, state.level - 4);
        activeLevel = 4;
    }

    const bets = [];

    // 4. Build Bet Array Based on Level Configuration
    if (activeLevel === 1) {
        // Level 1: 4 Streets (13,16,19,22) @ 1 unit each, 0/2 Split @ 1 unit, 3rd Column @ 5 units
        const streets = [13, 16, 19, 22];
        for (let st of streets) {
            bets.push({ type: 'street', value: st, amount: clampBet(1 * minInside, false) });
        }
        bets.push({ type: 'split', value: [0, 2], amount: clampBet(1 * minInside, false) });
        bets.push({ type: 'column', value: 3, amount: clampBet(5 * minOutside, true) });

    } else if (activeLevel === 2) {
        // Level 2: 4 Streets @ 2 units, 4 Splits @ 1 unit, 0/2 Split @ 1 unit, 3rd Column @ 5 units
        const streets = [13, 16, 19, 22];
        for (let st of streets) {
            bets.push({ type: 'street', value: st, amount: clampBet(2 * minInside, false) });
        }
        const splits = [[13, 14], [16, 17], [19, 20], [22, 23]];
        for (let sp of splits) {
            bets.push({ type: 'split', value: sp, amount: clampBet(1 * minInside, false) });
        }
        bets.push({ type: 'split', value: [0, 2], amount: clampBet(1 * minInside, false) });
        bets.push({ type: 'column', value: 3, amount: clampBet(5 * minOutside, true) });

    } else if (activeLevel === 3) {
        // Level 3: 4 Streets @ 4 units, 8 Center Splits @ 1 unit, 0/2 Split @ 2 units, 3rd Column @ 10 units
        const streets = [13, 16, 19, 22];
        for (let st of streets) {
            bets.push({ type: 'street', value: st, amount: clampBet(4 * minInside * scale, false) });
        }
        const splits = [
            [13, 14], [16, 17], [19, 20], [22, 23],
            [14, 15], [17, 18], [20, 21], [23, 24]
        ];
        for (let sp of splits) {
            bets.push({ type: 'split', value: sp, amount: clampBet(1 * minInside * scale, false) });
        }
        bets.push({ type: 'split', value: [0, 2], amount: clampBet(2 * minInside * scale, false) });
        bets.push({ type: 'column', value: 3, amount: clampBet(10 * minOutside * scale, true) });

    } else if (activeLevel === 4) {
        // Level 4 (and scaled levels 5-7):
        // 4 Center Streets (13,16,19,22) @ 4 units
        // 2 Outer Streets (10, 25) @ 4 units
        // 8 Center Splits @ 1 unit
        // 4 Outer Splits ([10,11], [11,12], [25,26], [26,27]) @ 1 unit
        // 0/2 Split @ 3 units
        // 3rd Column @ 15 units
        const streets = [10, 13, 16, 19, 22, 25];
        for (let st of streets) {
            bets.push({ type: 'street', value: st, amount: clampBet(4 * minInside * scale, false) });
        }
        const splits = [
            [13, 14], [16, 17], [19, 20], [22, 23],
            [14, 15], [17, 18], [20, 21], [23, 24],
            [10, 11], [11, 12], [25, 26], [26, 27]
        ];
        for (let sp of splits) {
            bets.push({ type: 'split', value: sp, amount: clampBet(1 * minInside * scale, false) });
        }
        bets.push({ type: 'split', value: [0, 2], amount: clampBet(3 * minInside * scale, false) });
        bets.push({ type: 'column', value: 3, amount: clampBet(15 * minOutside * scale, true) });
    }

    return bets;
}