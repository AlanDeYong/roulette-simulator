/*
 * SOURCE: https://youtu.be/7ByWVgZROvE
 * * LOGIC & TRIGGERS:
 * - Trigger: Wait for at least 1 spin to identify the most recent winning dozen.
 * - Initial Bet (Level 0): Identify the dozen that just won. Avoid it. Place 5 base units on the other two dozens.
 * - On Win: Check current bankroll against the session's peak bankroll. 
 * - If current bankroll >= peak bankroll: Reset to Level 0 (re-evaluate the dozen to avoid).
 * - If current bankroll < peak bankroll: Rebet the exact same amounts and positions.
 * - On Loss: Retain the same dozens and corners from the previous spin, but advance to the next level in the progression array.
 * * BET PROGRESSION:
 * - Level 0: 5 units on 2 dozens.
 * - Level 1: +3 units to dozens (8 units), add 1 unit to 2 non-overlapping corners within each dozen.
 * - Level 2: +3 units to dozens (11 units), +1 unit to corners (2 units).
 * - Level 3: +3 units to dozens (14 units), +1 unit to corners (3 units).
 * - Level 4: +3 units to dozens (17 units), +1 unit to corners (4 units).
 * - Level 5: Double all bets (Dozens = 34, Corners = 8).
 * - Level 6: Double all bets (Dozens = 68, Corners = 16).
 * - Level 7: +15 units to dozens (83 units), +5 units to corners (21 units).
 * * THE GOAL:
 * - Recover drawdown states aggressively by pairing dozens with internal corner hedges, capping the progression at Level 7 to chase a return to the peak profit waterline.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for at least one spin to determine the dozen to avoid
    if (spinHistory.length === 0) return [];

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    
    // 2. Initialize State
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;
    if (state.level === undefined) state.level = 0;
    if (state.activeDozens === undefined) state.activeDozens = [];
    if (state.activeCorners === undefined) state.activeCorners = [];

    // 3. Update Peak Bankroll High-Water Mark
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 4. Evaluate Previous Spin Outcome
    if (state.lastBets && state.lastBets.length > 0) {
        let wonLast = state.lastBets.some(b => {
            if (b.type === 'dozen') {
                if (b.value === 1 && lastNum >= 1 && lastNum <= 12) return true;
                if (b.value === 2 && lastNum >= 13 && lastNum <= 24) return true;
                if (b.value === 3 && lastNum >= 25 && lastNum <= 36) return true;
            }
            if (b.type === 'corner') {
                const c = b.value;
                const covered = [c, c + 1, c + 3, c + 4]; 
                if (covered.includes(lastNum)) return true;
            }
            return false;
        });

        if (wonLast) {
            if (bankroll >= state.peakBankroll) {
                state.level = 0; 
            }
            // If won but bankroll < peakBankroll, state.level remains the same (Rebet)
        } else {
            state.level++; 
        }
    }

    // 5. Progression Array (Units)
    const progression = [
        { d: 5, c: 0 },   // L0
        { d: 8, c: 1 },   // L1
        { d: 11, c: 2 },  // L2
        { d: 14, c: 3 },  // L3
        { d: 17, c: 4 },  // L4
        { d: 34, c: 8 },  // L5
        { d: 68, c: 16 }, // L6
        { d: 83, c: 21 }  // L7
    ];

    // Clamp level to max available in progression
    const currentLevel = Math.min(state.level, progression.length - 1);
    const p = progression[currentLevel];

    // 6. Determine Positions on Reset (Level 0)
    if (state.level === 0 || state.activeDozens.length === 0) {
        let lastDozen = 0;
        if (lastNum >= 1 && lastNum <= 12) lastDozen = 1;
        else if (lastNum >= 13 && lastNum <= 24) lastDozen = 2;
        else if (lastNum >= 25 && lastNum <= 36) lastDozen = 3;

        state.activeDozens = [1, 2, 3].filter(d => d !== lastDozen);
        // Default to dozens 1 & 2 if a 0/00 triggered the reset
        if (state.activeDozens.length === 3) state.activeDozens = [1, 2];

        const cornerMap = {
            1: [1, 8],
            2: [13, 20],
            3: [25, 32]
        };
        
        state.activeCorners = [];
        state.activeDozens.forEach(d => {
            state.activeCorners.push(...cornerMap[d]);
        });
    }

    let bets = [];

    // 7. Execute Dozen Bets (Clamped to limits)
    if (p.d > 0) {
        state.activeDozens.forEach(d => {
            let amt = p.d;
            amt = Math.max(amt, config.betLimits.minOutside);
            amt = Math.min(amt, config.betLimits.max);
            bets.push({ type: 'dozen', value: d, amount: amt });
        });
    }

    // 8. Execute Corner Bets (Clamped to limits)
    if (p.c > 0) {
        state.activeCorners.forEach(c => {
            let amt = p.c;
            amt = Math.max(amt, config.betLimits.min);
            amt = Math.min(amt, config.betLimits.max);
            bets.push({ type: 'corner', value: c, amount: amt });
        });
    }

    // Save for next spin evaluation
    state.lastBets = bets;
    return bets;
}