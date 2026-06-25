/**
 * Strategy: Bet Evolution (Roulette Strategy)
 * Source: https://youtu.be/LygR29GzxDY (YouTube Channel: Bet With Mo)
 *
 * The Full Logic in details:
 * This strategy is a 9-level progression system that targets inside bets (splits, corners, and double streets/lines) 
 * across the middle and top rows of the roulette board. It divides bets into 6 positional blocks that gradually 
 * activate upon consecutive losses. 
 * - Block 1: Split 3/6, Corner 2/6 (value 2), Double Street 1/6 (value 1)
 * - Block 2: Split 6/9, Corner 5/9 (value 5), Double Street 4/9 (value 4)
 * - Block 3: Split 9/12, Corner 8/12 (value 8), Double Street 7/12 (value 7)
 * - Block 4: Split 12/15, Corner 11/15 (value 11), Double Street 10/15 (value 10)
 * - Block 5: Split 15/18, Corner 14/18 (value 14), Double Street 13/18 (value 13)
 * - Block 6: Split 18/21, Corner 17/21 (value 17), Double Street 16/21 (value 16)
 *
 * The Full Bet Progression in details:
 * The strategy operates strictly over 9 levels of loss recovery (Total units: 7-14-21-42-56-70-84-178-356). 
 * - Level 1: Play Block 1 (Ratio: 1 unit split, 1 unit corner, 5 units line). Total = 7 units.
 * - Level 2 (Loss 1): Add Block 2. Total = 14 units.
 * - Level 3 (Loss 2): Add Block 3. Total = 21 units.
 * - Level 4 (Loss 3): Double the bet amount for Blocks 1-3. Total = 42 units.
 * - Level 5 (Loss 4): Maintain Level 4 bets, add Block 4 (doubled: 2 unit split/corner, 10 unit line). Total = 56 units.
 * - Level 6 (Loss 5): Maintain Level 5 bets, add Block 5 (doubled). Total = 70 units.
 * - Level 7 (Loss 6): Maintain Level 6 bets, add Block 6 (doubled). Total = 84 units.
 * - Level 8 (Loss 7): Double up all previous bets (multiplier x4), add 10 units on Zero. Total = 178 units.
 * - Level 9 (Loss 8): Double up all previous bets (multiplier x8), Zero becomes 20 units. Total = 356 units.
 * - On Win: If the bankroll reaches a new session peak, the progression resets to Level 1. 
 * If the bankroll has NOT reached a new session peak (partial recovery hit), rebet the exact same level.
 * - On Loss at Level 9: The progression resets to Level 1 to avoid full bankroll destruction.
 *
 * The Goal: 
 * Systematically recover losses by spreading inside bets and scaling stakes. The strategy resets only when 
 * achieving a new absolute peak bankroll, securing micro-profits over extended sessions.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit using the minimum allowed limit for inside bets
    const baseUnit = config.betLimits.min;

    // 2. Initialize State
    if (!state.level) {
        state.level = 1;
        state.peakBankroll = bankroll;
    }

    // 3. Process the last spin outcome to determine hit/loss
    if (spinHistory.length > 0 && state.lastBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        
        let isHit = false;
        
        // Determine if the winning number was covered by any of our last bets
        for (let b of state.lastBets) {
            if (b.type === 'number' && b.value === winningNum) {
                isHit = true;
            }
            if (b.type === 'split' && Array.isArray(b.value) && b.value.includes(winningNum)) {
                isHit = true;
            }
            if (b.type === 'corner') {
                let c = b.value; // The top-left number of the corner
                if ([c, c + 1, c + 3, c + 4].includes(winningNum)) isHit = true;
            }
            if (b.type === 'line' || b.type === 'street') {
                let l = b.value; // The starting number of the double street (line)
                if ([l, l + 1, l + 2, l + 3, l + 4, l + 5].includes(winningNum)) isHit = true;
            }
        }

        if (isHit) {
            // "On win, if not at session's peak profit rebet, When at session's peak profit reset"
            if (bankroll > state.peakBankroll) {
                state.peakBankroll = bankroll;
                state.level = 1; 
            } else {
                // Not at peak profit: level stays the same (Rebet)
            }
        } else {
            // Loss: advance the progression level
            state.level++;
            if (state.level > 9) {
                state.level = 1; // Reached the end of the 9 levels, reset progression.
            }
        }
    }
    
    // Catch-all to update peak bankroll if edge conditions caused an increase
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 4. Define the 6 positional blocks 
    const blocks = [
        { split: [3, 6], corner: 2, line: 1 },
        { split: [6, 9], corner: 5, line: 4 },
        { split: [9, 12], corner: 8, line: 7 },
        { split: [12, 15], corner: 11, line: 10 },
        { split: [15, 18], corner: 14, line: 13 },
        { split: [18, 21], corner: 17, line: 16 }
    ];

    // 5. Define progression levels mapping to unit counts
    const levelDefs = [
        { activeBlocks: 1, mult: 1, zero: 0 },   // L1: 7 total base units
        { activeBlocks: 2, mult: 1, zero: 0 },   // L2: 14 total base units
        { activeBlocks: 3, mult: 1, zero: 0 },   // L3: 21 total base units
        { activeBlocks: 3, mult: 2, zero: 0 },   // L4: 42 total base units
        { activeBlocks: 4, mult: 2, zero: 0 },   // L5: 56 total base units
        { activeBlocks: 5, mult: 2, zero: 0 },   // L6: 70 total base units
        { activeBlocks: 6, mult: 2, zero: 0 },   // L7: 84 total base units
        { activeBlocks: 6, mult: 4, zero: 10 },  // L8: 178 total base units
        { activeBlocks: 6, mult: 8, zero: 20 }   // L9: 356 total base units
    ];

    // Get current level configuration (Fallback to Level 1 if an error forces out of bounds)
    const configIdx = (state.level >= 1 && state.level <= 9) ? state.level - 1 : 0;
    const currentDef = levelDefs[configIdx];

    // 6. Construct the Bet Array
    let bets = [];
    
    // Distribute block bets based on current level definitions
    for (let i = 0; i < currentDef.activeBlocks; i++) {
        let b = blocks[i];
        bets.push({ type: 'split', value: b.split, amount: baseUnit * 1 * currentDef.mult });
        bets.push({ type: 'corner', value: b.corner, amount: baseUnit * 1 * currentDef.mult });
        bets.push({ type: 'line', value: b.line, amount: baseUnit * 5 * currentDef.mult });
    }

    // Add zero bet if required by the current level
    if (currentDef.zero > 0) {
        bets.push({ type: 'number', value: 0, amount: baseUnit * currentDef.zero });
    }

    // 7. Clamp to limits
    bets = bets.map(bet => {
        let amt = bet.amount;
        amt = Math.max(amt, config.betLimits.min);
        amt = Math.min(amt, config.betLimits.max);
        return { ...bet, amount: amt };
    });

    // 8. Save State & Return
    state.lastBets = bets;
    return bets;
}