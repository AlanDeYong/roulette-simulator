/*
 * Source: Modified "Triple Nickel" Strategy
 * * Strategy Logic:
 * - Pattern A (1st Dozen): 2 corners (5/9, 7/11) @ 5 units; 3 straight (6,8,10) @ 1 unit.
 * - Pattern B (2nd Dozen): 2 corners (17/21, 19/23) @ 5 units; 3 straight (18,20,22) @ 1 unit.
 * - Pattern C (3rd Dozen): 2 corners (29/33, 31/35) @ 5 units; 3 straight (30,32,34) @ 1 unit.
 * * Bet Progression:
 * - Start Play (Level 0): Place Pattern A.
 * - On Win: If bankroll >= session's peak profit, reset to Level 0. Else, rebet current level.
 * - On Loss: Rebet.
 * - On 2 Consecutive Losses (at current level): 
 * - Level 1: Add Pattern B, double all bets.
 * - Level 2: Add Pattern C, double all bets.
 * - Level 3+: Double all bets.
 * * Goal:
 * - Aggressively cover the board on losses and reset progression only when reaching a new peak bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (state.level === undefined) state.level = 0;
    if (state.losses === undefined) state.losses = 0;
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;
    
    // Update peak bankroll watermark
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    const lastSpin = spinHistory[spinHistory.length - 1];
    
    // 2. Manage Progression (Check win/loss based on bankroll fluctuation)
    if (lastSpin) {
        const isWin = state.previousBankroll !== undefined && bankroll > state.previousBankroll;

        if (isWin) {
            if (bankroll >= state.peakBankroll) {
                // Win AND reached/exceeded peak profit -> Reset
                state.level = 0;
                state.losses = 0;
            } else {
                // Win but below peak profit -> Rebet (reset consecutive loss counter)
                state.losses = 0;
            }
        } else {
            // Loss
            state.losses++;
            
            // Move up a level on 2 consecutive losses
            if (state.losses >= 2) {
                state.level++;
                state.losses = 0; 
            }
        }
    }
    
    // Track bankroll to determine win/loss on the next spin
    state.previousBankroll = bankroll;

    // 3. Calculate Bets
    let rawBets = [];
    const baseUnit = config.betLimits.min; 
    const multiplier = Math.pow(2, state.level); // Lvl 0: 1x, Lvl 1: 2x, Lvl 2: 4x, etc.
    
    function addBet(type, value, units) {
        let amount = units * baseUnit * multiplier;
        amount = Math.max(amount, config.betLimits.min);
        rawBets.push({ type: type, value: value, amount: amount });
    }

    // --- LEVEL 0+: Pattern A (1st Dozen) ---
    addBet('corner', 5, 5); // Corner 5/9 (top-left is 5)
    addBet('corner', 7, 5); // Corner 7/11 (top-left is 7)
    addBet('number', 6, 1);
    addBet('number', 8, 1);
    addBet('number', 10, 1);

    // --- LEVEL 1+: Add Pattern B (2nd Dozen) ---
    if (state.level >= 1) {
        addBet('corner', 17, 5); // Corner 17/21 (top-left is 17)
        addBet('corner', 19, 5); // Corner 19/23 (top-left is 19)
        addBet('number', 18, 1);
        addBet('number', 20, 1);
        addBet('number', 22, 1);
    }

    // --- LEVEL 2+: Add Pattern C (3rd Dozen) ---
    if (state.level >= 2) {
        addBet('corner', 29, 5); // Corner 29/33 (top-left is 29)
        addBet('corner', 31, 5); // Corner 31/35 (top-left is 31)
        addBet('number', 30, 1);
        addBet('number', 32, 1);
        addBet('number', 34, 1);
    }

    // 4. Consolidate and Clamp Bets
    let finalBets = [];
    rawBets.forEach(b => {
        let existing = finalBets.find(e => e.type === b.type && e.value === b.value);
        if (existing) {
            existing.amount += b.amount;
            existing.amount = Math.min(existing.amount, config.betLimits.max);
        } else {
            b.amount = Math.min(b.amount, config.betLimits.max);
            finalBets.push(b);
        }
    });

    return finalBets;
}