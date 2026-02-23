/**
 * ROULETTE STRATEGY: "Maximize" 9-Level Progression (Corrected with L9 Cap)
 * * Source: "MAXIMIZE - BEST ROULETTE STRATEGY" by Bet With Mo (https://www.youtube.com/watch?v=pXAVzANfOXQ)
 * * The Logic: 
 * A hedging strategy placing a primary outside bet (Low/High) and specific inside street bets. 
 * If betting Low, it covers streets 7, 10 (plus 13, 16). If betting High, it covers streets 25, 28 (plus 19, 22).
 * Units are multiplied by the table's minimum limits to ensure validity.
 * * The Progression: 
 * A strict 9-level matrix defining specific unit additions on losses.
 * - MAX LEVEL CAP: If a loss occurs at Level 9, the progression stops advancing and simply rebets Level 9.
 * - RECOVERY: On any win (including Level 9), it drops down exactly 1 level to grind out of the drawdown.
 * * The Goal: 
 * Achieve exactly a $25 profit from the last peak bankroll. Once hit, the strategy resets to Level 1 
 * and switches the outside bet to the opposite side (e.g., Low -> High).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (state.level === undefined) {
        state.level = 0; // Index 0 represents Level 1
        state.side = 'low'; // Alternates 'low' and 'high'
        state.peakBankroll = bankroll; // The anchor point for the $25 profit target
        state.lastBankroll = bankroll;
    }

    // 2. Evaluate Previous Spin (Win/Loss/Target Detection)
    if (spinHistory.length > 0) {
        const isWin = bankroll > state.lastBankroll;
        
        if (isWin) {
            // Check if we hit the explicit $25 profit target from the last peak
            if (bankroll >= state.peakBankroll + 25) {
                state.level = 0;
                state.side = state.side === 'low' ? 'high' : 'low';
                state.peakBankroll = bankroll; // Set new high-water mark
            } else {
                // Won a spin but haven't reached the +$25 target.
                // RECOVERY: Drops down exactly 1 level on every win (e.g., L9 -> L8).
                state.level = Math.max(0, state.level - 1);
            }
        } else if (bankroll < state.lastBankroll) {
            // Loss: Move up the progression ladder
            // LEVEL 9 CAP: Math.min limits the index to 8 (Level 9). 
            // If at Level 9 and a loss occurs, it will "just rebet" index 8.
            state.level = Math.min(8, state.level + 1); 
        }
    }
    
    // Update bankroll tracker for the next spin evaluation
    state.lastBankroll = bankroll;

    // 3. Define the Corrected 9-Level Progression Matrix (Absolute Units)
    // out: Total unit multiplier for the outside bet
    // streets: How many street bets to place (2 for L1, 4 for L2+)
    // strBet: Total unit multiplier for each individual street bet
    const progression = [
        { out: 4,   strBet: 1,  streets: 2 }, // Level 1: 4 out, 1 on two streets
        { out: 9,   strBet: 1,  streets: 4 }, // Level 2: +5 out, add two streets
        { out: 15,  strBet: 2,  streets: 4 }, // Level 3: +6 out, +1 to all streets
        { out: 22,  strBet: 3,  streets: 4 }, // Level 4: +7 out, +1 to all streets
        { out: 30,  strBet: 4,  streets: 4 }, // Level 5: +8 out, +1 to all streets
        { out: 40,  strBet: 5,  streets: 4 }, // Level 6: +10 out, +1 to all streets
        { out: 80,  strBet: 10, streets: 4 }, // Level 7: Rebet & Double Up
        { out: 160, strBet: 20, streets: 4 }, // Level 8: Rebet & Double Up
        { out: 260, strBet: 30, streets: 4 }  // Level 9: +100 out, +10 to all streets
    ];

    const currentTier = progression[state.level];
    const bets = [];

    // 4. Calculate and Clamp Outside Bet
    const outBaseUnit = config.betLimits.minOutside;
    let outAmount = currentTier.out * outBaseUnit;
    outAmount = Math.max(outAmount, config.betLimits.minOutside); // Ensure minimum
    outAmount = Math.min(outAmount, config.betLimits.max);        // Ensure maximum limit
    
    bets.push({ type: state.side, amount: outAmount });

    // 5. Calculate, Assign, and Clamp Target Street Bets
    const inBaseUnit = config.betLimits.min;
    let strAmount = currentTier.strBet * inBaseUnit;
    strAmount = Math.max(strAmount, config.betLimits.min);
    strAmount = Math.min(strAmount, config.betLimits.max);

    // Map the specific streets based on the user's explicit rules.
    // Order matters: Index 0 and 1 are used for Level 1. Index 2 and 3 are added for Level 2+.
    const lowStreets = [7, 10, 13, 16]; 
    const highStreets = [25, 28, 19, 22]; 
    const activeStreets = state.side === 'low' ? lowStreets : highStreets;

    for (let i = 0; i < currentTier.streets; i++) {
        bets.push({ 
            type: 'street', 
            value: activeStreets[i], 
            amount: strAmount 
        });
    }

    return bets;
}