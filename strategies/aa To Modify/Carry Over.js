/**
 * STRATEGY: Carry Over Strategy
 * SOURCE: Bet With Mo (YouTube: https://www.youtube.com/watch?v=8xkeN9w69tA)
 * * THE LOGIC:
 * A sequential spatial expansion strategy that starts from the left side of the table (Street 1).
 * It uses a combination of Straight Number (SN) bets and Street (St) bets to cover blocks of the board.
 * * THE PROGRESSION (9 Levels):
 * - L1: 2x SN on St 1 + 1x St bet on St 2.
 * - L2: Rebet L1 + 2x SN on St 3 + 1x St on St 4. Increase all Street units by 1.
 * - L3: Rebet L2 + 2x SN on St 5 + 1x St on St 6. Increase all Street units by 1.
 * - L4: Rebet L3 + 2x SN on St 7 + 1x St on St 8. Increase all Street units by 1, then DOUBLE all bets.
 * - L5: Rebet L4 + 2x SN on St 9 (at 2 units each).
 * - L6: Rebet L5 + Add 1 unit to all positions + Add 2 units to all Streets.
 * - L7: Double Level 6.
 * - L8: Double Level 7.
 * - L9: Add 1 unit to all + 2 units to Streets + 2 units on 0 (Zero) as a hedge.
 * * THE RESET & RECOVERY (RST):
 * - TR: Move to next level after any loss (1L).
 * - RST: If session profit >= PG, reset to L1.
 * - DL (Drop Level): If a win occurs at L6-L9 but PG is not met, drop 1-2 levels.
 * - RBT (Rebet): If a win occurs at L1-L5 but PG is not met, stay at current level.
 */

function bet(spinHistory, bankroll, config, state) {
    // 1. Initialize State
    if (!state.level) state.level = 1;
    if (!state.highestBankroll) state.highestBankroll = bankroll;
    if (!state.sessionStartBankroll) state.sessionStartBankroll = bankroll;

    const UB_INSIDE = config.betLimits.min;
    const PG = 20; // Default Profit Goal in currency units

    // 2. Determine Outcome of Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastBets = state.lastBets || [];
        let won = false;

        // Check if any of our bets covered the winning number
        lastBets.forEach(b => {
            if (b.type === 'number' && b.value === lastSpin.winningNumber) won = true;
            if (b.type === 'street' && lastSpin.winningNumber >= b.value && lastSpin.winningNumber <= b.value + 2) won = true;
        });

        const currentProfit = bankroll - state.sessionStartBankroll;

        if (won) {
            if (currentProfit >= PG) {
                // RESET
                state.level = 1;
                state.sessionStartBankroll = bankroll;
            } else {
                // RECOVERY LOGIC
                if (state.level >= 6) {
                    state.level = Math.max(1, state.level - 2); // DL: Drop Level
                } else {
                    // RBT: Rebet current level to continue grind
                }
            }
        } else {
            // 1L: Move to next level on loss
            state.level = Math.min(9, state.level + 1);
        }
    }

    // 3. Define Bet Logic based on Level
    let bets = [];

    // Base Helper to handle unit scaling and limits
    const addBet = (type, value, units) => {
        let amt = units * UB_INSIDE;
        amt = Math.max(amt, config.betLimits.min);
        amt = Math.min(amt, config.betLimits.max);
        bets.push({ type, value, amount: amt });
    };

    // Progression Builder
    // Note: This logic constructs the "Carry Over" footprint based on the Level
    
    // Level 1: St 1 (SN 1,2) + St 2
    addBet('number', 1, 1);
    addBet('number', 2, 1);
    let st2Units = (state.level >= 2) ? 2 : 1;
    if (state.level >= 3) st2Units++;
    if (state.level >= 4) st2Units++;
    addBet('street', 4, st2Units);

    // Level 2 adds: St 3 (SN 7,8) + St 4
    if (state.level >= 2) {
        addBet('number', 7, 1);
        addBet('number', 8, 1);
        let st4Units = (state.level >= 3) ? 2 : 1;
        if (state.level >= 4) st4Units++;
        addBet('street', 10, st4Units);
    }

    // Level 3 adds: St 5 (SN 13,14) + St 6
    if (state.level >= 3) {
        addBet('number', 13, 1);
        addBet('number', 14, 1);
        let st6Units = (state.level >= 4) ? 2 : 1;
        addBet('street', 16, st6Units);
    }

    // Level 4 adds: St 7 (SN 19,20) + St 8 + DBL
    if (state.level >= 4) {
        addBet('number', 19, 1);
        addBet('number', 20, 1);
        addBet('street', 22, 1);
        // Double logic applied at end of level 4 construction
    }

    // Level 5 adds: St 9 (SN 25,26)
    if (state.level >= 5) {
        addBet('number', 25, 2);
        addBet('number', 26, 2);
    }

    // Level 4 Multiplier
    if (state.level === 4) {
        bets.forEach(b => b.amount *= 2);
    }

    // L6 - L9 Meta-Modifiers
    if (state.level >= 6) {
        bets.forEach(b => {
            b.amount += UB_INSIDE; // +1U all
            if (b.type === 'street') b.amount += (UB_INSIDE * 2); // +2U Streets
        });
    }

    if (state.level === 7) bets.forEach(b => b.amount *= 2);
    if (state.level === 8) bets.forEach(b => b.amount *= 4); // Double L7

    if (state.level === 9) {
        bets.forEach(b => {
            b.amount += UB_INSIDE;
            if (b.type === 'street') b.amount += (UB_INSIDE * 2);
        });
        addBet('number', 0, 2); // Hedge
    }

    // Ensure all bets stay within global max
    bets.forEach(b => {
        b.amount = Math.min(b.amount, config.betLimits.max);
    });

    state.lastBets = bets;
    return bets;
}