/**
 * STRATEGY: Money Chase (Custom Progression Variation)
 * * SOURCE: 
 * - Video: "MONEY CHASE - ROULETTE STRATEGY | HIGH COVERAGE | HUGE WIN PROFIT POTENTIAL SYSTEM"
 * - Channel: Bet With Mo
 * - URL: https://www.youtube.com/watch?v=VSDjm41vOGA
 * * * THE LOGIC:
 * This strategy uses a multi-layered progression that increases coverage and bet size significantly 
 * upon losses. It focuses on the 2nd column and specific "Street + Straight" patterns to 
 * cover the top and middle sections of the board.
 * * * THE PROGRESSION (Loss Ladders):
 * - Level 0 (Start): 
 * - 1st Street (1-3): 2u
 * - Numbers 4, 6: 1u each
 * - 2nd Column: 3u
 * - Level 1 (1st Loss): 
 * - Add 3rd Street (7-9): 2u
 * - Add Numbers 10, 12: 1u each
 * - Increase 2nd Column by 3u (Total 6u)
 * - Level 2 (2nd Loss): 
 * - Add 5th Street (13-15): 2u
 * - Add Numbers 16, 18: 1u each
 * - Increase 2nd Column by 3u (Total 9u)
 * - THEN Double ALL bets
 * - Level 3 (3rd Loss):
 * - Add 7th Street (19-21): 4u
 * - Add Numbers 22, 24: 2u each
 * - Increase 2nd Column by 6u
 * - Increase ALL Street bets by 1u
 * - Level 4 & 5 (4th/5th Loss): 
 * - Double ALL bets from the previous level.
 * - Level 6 (6th Loss - "All In"): 
 * - Add 5u to all straight number bets.
 * - Add 2u to all street bets.
 * - Add 15u to 2nd Column.
 * * * THE GOAL:
 * - Target: Reach a new session high profit.
 * - Win Condition: On any win, check if the bankroll is close to the session high (within 2%). 
 * If yes, reset to Level 0. If no (partial recovery), rebet same level.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & UNIT SIZE ---
    const UNIT = config.betLimits.min; 

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 0;
    if (state.maxBankroll === undefined) state.maxBankroll = bankroll;

    // Update high-water mark for "Session Profit" check
    if (bankroll > state.maxBankroll) {
        state.maxBankroll = bankroll;
    }

    // --- 3. ANALYZE PREVIOUS SPIN ---
    if (spinHistory.length > 0) {
        const lastBankroll = state.lastBankroll || config.startingBankroll;
        
        if (bankroll > lastBankroll) {
            // --- WIN ---
            // "On win, reset if session profit hit or within 2%, else rebet"
            // We check if current bankroll is >= 98% of the session high
            const threshold = state.maxBankroll * 0.98;

            if (bankroll >= threshold) {
                state.level = 0; // Reset to start
            } else {
                // Partial win/recovery: Stay at current level (Rebet)
            }
        } else if (bankroll < lastBankroll) {
            // --- LOSS ---
            // Progress to next level
            state.level++;
            
            // Safety clamp: if we exceed Level 6, reset to 0 (or loop 6)
            if (state.level > 6) state.level = 0; 
        } else {
            // --- PUSH ---
            // (bankroll === lastBankroll)
            // Do NOT progress. Stay at current level (Rebet).
            // No changes to state.level.
        }
    }
    
    // Store current bankroll for next spin comparison
    state.lastBankroll = bankroll;

    // --- 4. DEFINE BETS BASED ON LEVEL ---
    
    // Level 0 Definition (Base)
    let currentBets = [
        { type: 'street', value: 1, units: 2 },
        { type: 'number', value: 4, units: 1 },
        { type: 'number', value: 6, units: 1 },
        { type: 'column', value: 2, units: 3 }
    ];

    // Level 1 Modifications (Applied if level >= 1)
    if (state.level >= 1) {
        // Add 3rd Street (2u)
        currentBets.push({ type: 'street', value: 7, units: 2 });
        // Add Str Nos 10, 12 (1u each)
        currentBets.push({ type: 'number', value: 10, units: 1 });
        currentBets.push({ type: 'number', value: 12, units: 1 });
        // Increase 2nd Column by 3u
        currentBets.find(b => b.type === 'column' && b.value === 2).units += 3;
    }

    // Level 2 Modifications (Applied if level >= 2)
    if (state.level >= 2) {
        // Add 5th Street (2u)
        currentBets.push({ type: 'street', value: 13, units: 2 });
        // Add Str Nos 16, 18 (1u each)
        currentBets.push({ type: 'number', value: 16, units: 1 });
        currentBets.push({ type: 'number', value: 18, units: 1 });
        // Increase 2nd Column by 3u
        currentBets.find(b => b.type === 'column' && b.value === 2).units += 3;

        // "THEN Double ALL bets"
        currentBets.forEach(b => b.units *= 2);
    }

    // Level 3 Modifications (Applied if level >= 3)
    if (state.level >= 3) {
        // Add 7th Street (4u)
        currentBets.push({ type: 'street', value: 19, units: 4 });
        
        // Add Numbers 22, 24: 2u each
        currentBets.push({ type: 'number', value: 22, units: 2 });
        currentBets.push({ type: 'number', value: 24, units: 2 });

        // Increase 2nd Column by 6u
        currentBets.find(b => b.type === 'column' && b.value === 2).units += 6;

        // Increase ALL Street bets by 1u (This affects the newly added St 19 as well)
        currentBets.forEach(b => {
            if (b.type === 'street') b.units += 1;
        });
    }

    // Level 4 Modifications (Applied if level >= 4)
    if (state.level >= 4) {
        // Double ALL bets
        currentBets.forEach(b => b.units *= 2);
    }

    // Level 5 Modifications (Applied if level >= 5)
    if (state.level >= 5) {
        // Double ALL bets
        currentBets.forEach(b => b.units *= 2);
    }

    // Level 6 Modifications (Applied if level >= 6)
    if (state.level >= 6) {
        // Add 5u to all straight number bets
        currentBets.forEach(b => {
            if (b.type === 'number') b.units += 5;
        });
        
        // Add 2u to all street bets
        currentBets.forEach(b => {
            if (b.type === 'street') b.units += 2;
        });

        // Add 15u to 2nd Column
        currentBets.find(b => b.type === 'column' && b.value === 2).units += 15;
    }

    // --- 5. AGGREGATE & CONVERT TO FINAL OUTPUT ---
    
    // Consolidate bets (e.g. if logic ever produces overlapping bets)
    let rawBets = {};
    currentBets.forEach(b => {
        const key = `${b.type}_${b.value}`;
        if (!rawBets[key]) {
            rawBets[key] = { type: b.type, value: b.value, units: 0, isOutside: (b.type === 'column') };
        }
        rawBets[key].units += b.units;
    });

    const finalBets = [];
    for (const key in rawBets) {
        const b = rawBets[key];
        
        let amount = b.units * UNIT;

        // Respect Table Limits
        const min = b.isOutside ? config.betLimits.minOutside : config.betLimits.min;
        amount = Math.max(amount, min);
        amount = Math.min(amount, config.betLimits.max);

        finalBets.push({
            type: b.type,
            value: b.value,
            amount: amount
        });
    }

    return finalBets;
}