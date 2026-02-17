/**
 * STRATEGY: Money Chase (Custom Progression Variation)
 * * SOURCE: 
 * - Video: "MONEY CHASE - ROULETTE STRATEGY | HIGH COVERAGE | HUGE WIN PROFIT POTENTIAL SYSTEM"
 * - Channel: Bet With Mo
 * - URL: https://www.youtube.com/watch?v=VSDjm41vOGA
 * * THE LOGIC:
 * This strategy uses a multi-layered progression that increases coverage and bet size significantly 
 * upon losses. It focuses on the 2nd column and specific "Street + Split/Straight" patterns to 
 * cover the top and middle sections of the board.
 * * THE PROGRESSION (Loss Ladders):
 * - Level 0 (Start): 
 * - 1st Street (1-3): 2u
 * - Numbers 4, 6: 1u each
 * - 2nd Column: 3u
 * - Level 1 (1st Loss): 
 * - Add 3rd Street (7-9): 2u
 * - Add Numbers 10, 12: 1u each
 * - Increase 2nd Column by 3u (Total 6u)
 * - (Original bets remain: 1st St @ 2u, #4/6 @ 1u)
 * - Level 2 (2nd Loss): 
 * - Add 5th Street (13-15): 2u
 * - Add Numbers 16, 18: 1u each
 * - Increase 2nd Column by 3u (Total 9u)
 * - THEN Double ALL bets (e.g., 2nd Col becomes 18u, Streets become 4u, etc.)
 * - Level 3 (3rd Loss):
 * - Add 7th Street (19-21): 4u
 * - Add Numbers 16, 18 (Note: specific instruction says 16/18 again): 2u each
 * - Increase 2nd Column by 6u
 * - Increase ALL Street bets by 1u
 * - Level 4 & 5 (4th/5th Loss): 
 * - Double ALL bets from the previous level.
 * - Level 6 (6th Loss - "All In"): 
 * - Add 5u to all straight number bets.
 * - Add 2u to all street bets.
 * - Add 15u to 2nd Column.
 * * THE GOAL:
 * - Target: Reach a new session high profit.
 * - Win Condition: On any win, check if the session profit target is hit. If yes, reset to Level 0.
 * If no (partial recovery or net loss still), rebet same level or continue (logic here assumes reset on net profit, otherwise rebet/continue progression). 
 * *Implementation Note*: Standard "Money Chase" logic often resets on any significant profit. 
 * This script resets if current bankroll > highest bankroll seen so far (session profit hit).
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
        const lastSpin = spinHistory[spinHistory.length - 1];
        // Calculate the result of the previous spin to determine Win/Loss
        // Since we don't have the exact bet object from history easily, we infer 'Win' 
        // by checking if Bankroll increased compared to previous state.
        // However, 'state' doesn't automatically store prevBankroll. 
        // We will assume a simple rule: Did bankroll go up?
        
        const lastBankroll = state.lastBankroll || config.startingBankroll;
        const wonSpin = bankroll > lastBankroll;

        if (wonSpin) {
            // "On win, reset if session profit hit, else rebet"
            if (bankroll >= state.maxBankroll) {
                state.level = 0; // Reset to start
            } else {
                // "Else rebet" implies staying at the same level to try and recover the rest
                // No change to state.level
            }
        } else {
            // Loss: Progress to next level
            state.level++;
            // Cap level to prevent index errors (though logic covers up to 6 specifically)
            // If we lose at Level 6, typically strategies loop or reset. 
            // We will clamp at 6 to keep applying the final "Hail Mary" add-ons or reset.
            // Let's reset if it goes beyond defined logic to save bankroll.
            if (state.level > 6) state.level = 0; 
        }
    }
    
    // Store current bankroll for next spin comparison
    state.lastBankroll = bankroll;

    // --- 4. DEFINE BETS BASED ON LEVEL ---
    
    // We will build a 'rawBets' object first to aggregate overlapping bets easily, 
    // then convert to the final array.
    // Structure: { key: { type, value, units } }
    let rawBets = {};

    const addRawBet = (type, value, units) => {
        const key = `${type}_${value}`;
        if (!rawBets[key]) {
            rawBets[key] = { type, value, units: 0, isOutside: (type === 'column') };
        }
        rawBets[key].units += units;
    };

    // Apply Logic Step-by-Step based on Level

    // --- BASE BETS (Applied at ALL Levels initially, then modified) ---
    // But the prompt describes "adding" things. It's cleaner to build up from scratch based on the level rules.
    
    // Level 0 Definition
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

        // "Then double up ALL bets"
        currentBets.forEach(b => b.units *= 2);
    }

    // Level 3 Modifications (Applied if level >= 3)
    if (state.level >= 3) {
        // Add 7th Street (4u)
        currentBets.push({ type: 'street', value: 19, units: 4 });
        
        // Add Str Nos 16, 18 (2u each). 
        // Note: We already have 16/18 from Level 2. We add MORE to them or new entries? 
        // Aggregating is safest.
        currentBets.push({ type: 'number', value: 16, units: 2 });
        currentBets.push({ type: 'number', value: 18, units: 2 });

        // Increase 2nd Column by 6u
        currentBets.find(b => b.type === 'column' && b.value === 2).units += 6;

        // Increase ALL Street bets by 1u
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
        // Add 5 units to all straight numbers
        currentBets.forEach(b => {
            if (b.type === 'number') b.units += 5;
        });
        
        // Add 2 units to all streets
        currentBets.forEach(b => {
            if (b.type === 'street') b.units += 2;
        });

        // Add 15 units to 2nd column
        currentBets.find(b => b.type === 'column' && b.value === 2).units += 15;
    }

    // --- 5. AGGREGATE & CONVERT TO FINAL OUTPUT ---
    
    // We process the 'currentBets' array into a map to combine duplicates 
    // (e.g., adding to 16/18 in Level 3)
    currentBets.forEach(b => {
        addRawBet(b.type, b.value, b.units);
    });

    const finalBets = [];
    
    for (const key in rawBets) {
        const b = rawBets[key];
        
        let amount = b.units * UNIT;

        // Respect Limits
        const min = b.isOutside ? config.betLimits.minOutside : config.betLimits.min;
        
        // Ensure Min
        amount = Math.max(amount, min);
        
        // Ensure Max
        amount = Math.min(amount, config.betLimits.max);

        finalBets.push({
            type: b.type,
            value: b.value,
            amount: amount
        });
    }

    return finalBets;
}