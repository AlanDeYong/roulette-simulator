/**
 * Roulette Strategy: 5 Street Escalator & Mirror
 * Source: https://youtu.be/IPm3gSv27Kc?si=5Oh-pqczJ7thWzKz
 * 
 * The Logic: 
 * Targets 5 specific streets on either the low (left) or high (right) side of the table. 
 * As losses occur, the strategy layers in additional straight up and split bets above the targeted streets 
 * to increase coverage and potential payout, while scaling up the base street bets.
 * 
 * The Progression:
 * - Start: 2 units on 5 streets (Left: 1, 4, 7, 10, 13 or Right: 22, 25, 28, 31, 34).
 * - Loss 1: Rebet + 1 unit on Straight Ups (Col 3 level).
 * - Loss 2: Rebet + increase streets by 2u + 1 unit on Straight Ups (Col 2 level).
 * - Loss 3: Rebet + increase streets by 2u.
 * - Loss 4: Rebet + add 2 units on Splits between Col 2 & 3.
 * - Loss 5: Rebet + increase streets by 2u + increase splits by 2u.
 * - Loss 6: Double all bets.
 * - Loss 7: Double all bets.
 * - Loss 8+: Increase streets by 10u, increase splits by 5u.
 * 
 * The Goal:
 * Achieve a $20 profit above the session high (reference bankroll). 
 * Upon a win that achieves this target, the strategy resets its progression and mirrors 
 * the attack onto the opposite side of the table. If a win yields less than $20 profit 
 * from the session high, the exact previous bets are repeated (rebet).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unitSize = config.betLimits.min;
    const maxBet = config.betLimits.max;
    const targetProfit = 20;

    // Helper to determine if the last spin was a win
    const checkWin = (bets, winningNumber) => {
        if (!bets || bets.length === 0) return false;
        for (let b of bets) {
            if (b.type === 'number' && b.value === winningNumber) return true;
            if (b.type === 'split' && b.value.includes(winningNumber)) return true;
            if (b.type === 'street' && winningNumber >= b.value && winningNumber <= b.value + 2 && winningNumber !== 0) return true;
        }
        return false;
    };

    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 0;
        state.side = 'left';
        state.sessionHigh = bankroll;
        state.lastBets = [];
    }

    // 2. Process Previous Spin Result
    if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const isWin = checkWin(state.lastBets, lastResult.winningNumber);

        if (isWin) {
            if (bankroll >= state.sessionHigh + targetProfit) {
                // Target hit: Reset progression, update session high, and mirror sides
                state.level = 0;
                state.sessionHigh = bankroll;
                state.side = state.side === 'left' ? 'right' : 'left';
            } else {
                // Win but target not reached: Rebet (keep level exactly the same)
            }
        } else {
            // Loss: Advance progression
            state.level++;
        }
    }

    // 3. Determine Multipliers based on Progression Level
    let s = 0, su1 = 0, su2 = 0, sp = 0;

    switch (state.level) {
        case 0: s = 2; su1 = 0; su2 = 0; sp = 0; break;
        case 1: s = 2; su1 = 1; su2 = 0; sp = 0; break;
        case 2: s = 4; su1 = 1; su2 = 1; sp = 0; break;
        case 3: s = 6; su1 = 1; su2 = 1; sp = 0; break;
        case 4: s = 6; su1 = 1; su2 = 1; sp = 2; break;
        case 5: s = 8; su1 = 1; su2 = 1; sp = 4; break;
        case 6: s = 16; su1 = 2; su2 = 2; sp = 8; break;
        case 7: s = 32; su1 = 4; su2 = 4; sp = 16; break;
        default:
            // Level 8 and beyond (Open-ended progression logic)
            const diff = state.level - 7;
            s = 32 + (diff * 10);
            su1 = 4;
            su2 = 4;
            sp = 16 + (diff * 5);
            break;
    }

    // 4. Determine Target Numbers based on Side (Left vs. Right Mirror)
    let streets, su1_nums, su2_nums, splits;
    if (state.side === 'left') {
        streets  = [1, 4, 7, 10, 13];
        su1_nums = [3, 6, 9, 12, 15]; // Col 3 level
        su2_nums = [2, 5, 8, 11, 14]; // Col 2 level
        splits   = [[2, 3], [5, 6], [8, 9], [11, 12], [14, 15]]; // Col 2/3 splits
    } else {
        streets  = [22, 25, 28, 31, 34];
        su1_nums = [24, 27, 30, 33, 36]; // Col 3 level
        su2_nums = [23, 26, 29, 32, 35]; // Col 2 level
        splits   = [[23, 24], [26, 27], [29, 30], [32, 33], [35, 36]]; // Col 2/3 splits
    }

    // 5. Construct Bets Array
    let bets = [];

    const addBets = (type, valuesArray, units) => {
        if (units <= 0) return;
        let amount = units * unitSize;
        amount = Math.min(amount, maxBet); // Clamp to table maximum
        
        for (let val of valuesArray) {
            bets.push({ type: type, value: val, amount: amount });
        }
    };

    addBets('street', streets, s);
    addBets('number', su1_nums, su1);
    addBets('number', su2_nums, su2);
    addBets('split', splits, sp);

    // 6. Save State and Execute
    state.lastBets = bets;
    return bets;
}