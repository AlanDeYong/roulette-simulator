/**
 * PROFIT DASHER Strategy
 * * Source: https://youtu.be/AK4-MYcHeXE (Bet With Mo)
 * * The Full Logic in details:
 * - The strategy targets two dozens and places straight-up bets on specific numbers within them.
 * - Base Pattern (6 numbers per dozen): offsets +3, +5, +6, +7, +8, +10 within the dozen.
 * - If the session's peak profit is reached, reset the progression to Level 1.
 * - On reset, shift the targeted dozens to avoid the dozen that just won (e.g., if Dozen 3 won, target Dozens 1 & 2).
 * * The Full Bet Progression in details:
 * - Level 1: 1 unit on base pattern (12 numbers).
 * - Level 2 (Loss 1): Add 1 unit to base pattern (2 units on 12 numbers).
 * - Level 3 (Loss 2): Add 2 units on 3 new numbers per dozen (offsets +9, +11, +12).
 * - Level 4 (Loss 3): Add 2 units on remaining 3 numbers per dozen (offsets +1, +2, +4). All 24 numbers are now covered.
 * - Level 5 (Loss 4): Double all bets (4 units on 24 numbers).
 * - Level 6 (Loss 5): Double all bets (8 units on 24 numbers).
 * - Level 7 (Loss 6): Increase all bets by 5 units (13 units on 24 numbers).
 * - On win (if not peak profit): Drop down 1 level in the progression.
 * - On win (if peak profit): Reset to Level 1.
 * * The Goal:
 * - Target profit is achieved by compounding frequent small wins through progression levels. 
 * - Stop-loss is bankroll depletion (no explicit hard stop).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.peakProfit = bankroll;
        state.targetDozens = [0, 1]; // Default to Dozen 1 and Dozen 2
    }

    // 2. Process Last Spin & Adjust Progression
    if (spinHistory.length > 0) {
        if (bankroll > state.peakProfit) {
            // Peak Profit Reached: Reset
            state.peakProfit = bankroll;
            state.level = 1;
            
            // Avoid placing bets on the dozen which just won
            const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
            if (lastNum !== 0) {
                const winningDozen = Math.floor((lastNum - 1) / 12);
                state.targetDozens = [0, 1, 2].filter(d => d !== winningDozen).slice(0, 2);
            }
        } else if (state.lastBankroll !== undefined) {
            // Not at Peak Profit: Check if previous bet won or lost
            if (bankroll > state.lastBankroll) {
                // Win (Partial Recovery)
                state.level = Math.max(1, state.level - 1);
            } else {
                // Loss
                state.level = Math.min(7, state.level + 1);
            }
        }
    }
    state.lastBankroll = bankroll;

    // 3. Define Progression Data
    const progressionData = {
        1: { base: 1, l3: 0, l4: 0 },
        2: { base: 2, l3: 0, l4: 0 },
        3: { base: 2, l3: 2, l4: 0 },
        4: { base: 2, l3: 2, l4: 2 },
        5: { base: 4, l3: 4, l4: 4 },
        6: { base: 8, l3: 8, l4: 8 },
        7: { base: 13, l3: 13, l4: 13 }
    };

    const currentProgression = progressionData[state.level];
    
    // Determine the base unit according to config modes
    const unit = config.incrementMode === 'fixed' && config.minIncrementalBet 
        ? config.minIncrementalBet 
        : config.betLimits.min;

    const bets = [];

    // 4. Bet Placement Helper
    function placeBetsForPattern(patternOffsets, multiplier) {
        if (multiplier === 0) return;
        
        let amount = multiplier * unit;
        
        // Clamp to limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        state.targetDozens.forEach(dozenIndex => {
            patternOffsets.forEach(offset => {
                const num = dozenIndex * 12 + offset + 1;
                bets.push({ type: 'number', value: num, amount: amount });
            });
        });
    }

    // 5. Execute Bet Placements based on 0-indexed dozen offsets
    // Base: 3, 5, 6, 7, 8, 10
    placeBetsForPattern([2, 4, 5, 6, 7, 9], currentProgression.base);
    
    // L3 Expansion: 9, 11, 12
    placeBetsForPattern([8, 10, 11], currentProgression.l3);
    
    // L4 Expansion: 1, 2, 4
    placeBetsForPattern([0, 1, 3], currentProgression.l4);

    return bets;
}