/**
 * STRATEGY: Carry Over Strategy
 * SOURCE: Bet With Mo (YouTube: https://www.youtube.com/watch?v=8xkeN9w69tA)
 * * THE LOGIC:
 * A sequential spatial expansion strategy that starts from the left side (Street 1) or right side (Street 12).
 * It uses a combination of random Straight Number (SN) bets and Street (St) bets to cover blocks of the board.
 * Changes direction (Left-To-Right -> Right-To-Left) after every full reset.
 * * THE PROGRESSION (9 Levels):
 * - L1: 2x random SN in St 1 + 1x St bet on St 2.
 * - L2: Rebet L1 + 2x random SN in St 3 + 1x St on St 4. Increase all Street units by 1.
 * - L3: Rebet L2 + 2x random SN in St 5 + 1x St on St 6. Increase all Street units by 1.
 * - L4: Rebet L3 + 2x random SN in St 7 + 1x St on St 8. Increase all Street units by 1, then DOUBLE all bets.
 * - L5: Rebet L4 + 2x random SN in St 9 (at 2 units each).
 * - L6: Rebet L5 + Add 1 unit to all positions + Add 2 units to all Streets.
 * - L7: Double Level 6.
 * - L8: Double Level 7.
 * - L9: Add 1 unit to all + 2 units to Streets + 2 units on 0 (Zero) as a hedge.
 * * THE RESET & RECOVERY (RST):
 * - TR: Move to next level after any loss (1L).
 * - RST: If session profit >= PG, reset to L1, clear random numbers, switch table direction.
 * - DL (Drop Level): If a win occurs at L6-L9 but PG is not met, drop 1-2 levels.
 * - RBT (Rebet): If a win occurs at L1-L5 but PG is not met, stay at current level.
 */

function bet(spinHistory, bankroll, config, state) {
    // 1. Initialize State
    if (!state.level) state.level = 1;
    if (!state.highestBankroll) state.highestBankroll = bankroll;
    if (!state.sessionStartBankroll) state.sessionStartBankroll = bankroll;
    if (!state.direction) state.direction = 'LTR'; // LTR (Left-To-Right) or RTL (Right-To-Left)
    if (!state.levelSNs) state.levelSNs = {}; // Persist random SNs per level during the cycle

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
                // RESET & SWITCH DIRECTION
                state.level = 1;
                state.sessionStartBankroll = bankroll;
                state.direction = state.direction === 'LTR' ? 'RTL' : 'LTR';
                state.levelSNs = {}; // Clear random numbers for new cycle
            } else {
                // RECOVERY LOGIC
                if (state.level >= 6) {
                    state.level = Math.max(1, state.level - 2); // DL: Drop Level
                    // Clear stored SNs for levels above current to generate fresh ones if we climb back up
                    for (let k = state.level + 1; k <= 9; k++) delete state.levelSNs[k];
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
    let unitBets = [];

    const setBet = (type, value, units) => {
        unitBets.push({ type, value, units });
    };

    // Helper functions for directional logic & randomizing SNs
    const getStreetNum = (lvl, isSN) => {
        return state.direction === 'LTR' 
            ? (isSN ? (lvl * 2 - 1) : (lvl * 2)) 
            : (isSN ? (13 - (lvl * 2 - 1)) : (13 - (lvl * 2)));
    };

    const getStreetLowestValue = (street) => (street - 1) * 3 + 1;

    const getSNsForLevel = (lvl, street) => {
        if (!state.levelSNs[lvl]) {
            const startVal = getStreetLowestValue(street);
            let nums = [startVal, startVal + 1, startVal + 2];
            // Fisher-Yates shuffle to pick 2 random numbers
            for (let i = nums.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [nums[i], nums[j]] = [nums[j], nums[i]];
            }
            state.levelSNs[lvl] = [nums[0], nums[1]];
        }
        return state.levelSNs[lvl];
    };

    // Progression Builder (Iterative unit construction to preserve multipliers)
    
    // Level 1
    const snSt1 = getStreetNum(1, true);
    const stSt1 = getStreetNum(1, false);
    const [l1_n1, l1_n2] = getSNsForLevel(1, snSt1);
    setBet('number', l1_n1, 1);
    setBet('number', l1_n2, 1);
    setBet('street', getStreetLowestValue(stSt1), 1);

    // Level 2
    if (state.level >= 2) {
        const snSt2 = getStreetNum(2, true);
        const stSt2 = getStreetNum(2, false);
        const [l2_n1, l2_n2] = getSNsForLevel(2, snSt2);
        setBet('number', l2_n1, 1);
        setBet('number', l2_n2, 1);
        setBet('street', getStreetLowestValue(stSt2), 1);
        
        // Increase all Street units by 1
        unitBets.forEach(b => { if (b.type === 'street') b.units += 1; });
    }

    // Level 3
    if (state.level >= 3) {
        const snSt3 = getStreetNum(3, true);
        const stSt3 = getStreetNum(3, false);
        const [l3_n1, l3_n2] = getSNsForLevel(3, snSt3);
        setBet('number', l3_n1, 1);
        setBet('number', l3_n2, 1);
        setBet('street', getStreetLowestValue(stSt3), 1);
        
        // Increase all Street units by 1
        unitBets.forEach(b => { if (b.type === 'street') b.units += 1; });
    }

    // Level 4
    if (state.level >= 4) {
        const snSt4 = getStreetNum(4, true);
        const stSt4 = getStreetNum(4, false);
        const [l4_n1, l4_n2] = getSNsForLevel(4, snSt4);
        setBet('number', l4_n1, 1);
        setBet('number', l4_n2, 1);
        setBet('street', getStreetLowestValue(stSt4), 1);
        
        // Increase all Street units by 1
        unitBets.forEach(b => { if (b.type === 'street') b.units += 1; });
        
        // Double all accumulated bets at the end of Level 4
        unitBets.forEach(b => b.units *= 2);
    }

    // Level 5
    if (state.level >= 5) {
        const snSt5 = getStreetNum(5, true);
        const [l5_n1, l5_n2] = getSNsForLevel(5, snSt5);
        setBet('number', l5_n1, 2);
        setBet('number', l5_n2, 2);
    }

    // L6 - L9 Meta-Modifiers
    if (state.level >= 6) {
        // Level 6: Add 1 unit to all + Add 2 units to all Streets
        unitBets.forEach(b => {
            b.units += 1;
            if (b.type === 'street') b.units += 2;
        });
    }

    if (state.level >= 7) {
        // Level 7: Double Level 6
        unitBets.forEach(b => b.units *= 2);
    }

    if (state.level >= 8) {
        // Level 8: Double Level 7
        unitBets.forEach(b => b.units *= 2);
    }

    if (state.level === 9) {
        // Level 9: Add 1 unit to all + 2 units to Streets + 2 units on 0
        unitBets.forEach(b => {
            b.units += 1;
            if (b.type === 'street') b.units += 2;
        });
        setBet('number', 0, 2); // Hedge
    }

    // Convert abstract units to final bet amounts based on configuration limits
    let bets = [];
    unitBets.forEach(b => {
        let amt = b.units * UB_INSIDE;
        amt = Math.max(amt, config.betLimits.min);
        amt = Math.min(amt, config.betLimits.max);
        bets.push({ type: b.type, value: b.value, amount: amt });
    });

    state.lastBets = bets;
    return bets;
}