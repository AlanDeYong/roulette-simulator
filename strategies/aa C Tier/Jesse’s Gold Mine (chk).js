/**
 * Jesse's Gold Mine Roulette Strategy (Alternating Target & No-Overlap Variant)
 * Source: https://www.youtube.com/watch?v=e8VzI_8YgDs (The Roulette Master)
 * * * The Logic:
 * - Targets a specific zone: either the 1st Dozen (Low Side) or the 3rd Dozen (High Side).
 * - Places precise Corner and Split bets within the target dozen. 
 * - CRITICAL UPDATE: Splits are specifically selected so they DO NOT overlap with the Corner bets, maximizing board coverage within the dozen.
 * * * The Progression:
 * - Level 0: Bet base units on two non-overlapping Corners in the targeted dozen.
 * - Level 1 (Loss): Keep corners, add base units on two non-overlapping Splits.
 * - Level 2 (Loss): Keep previous, add base units on the targeted Dozen.
 * - Level 3 (Loss): Keep previous, add base units on the Even-Money bet (Low or High).
 * - Level 4+: For every subsequent spin without a reset, increase all active bets linearly by their base multiplier (Corners +2, Splits +1, Dozen +6, Even +6).
 * * * The Goal:
 * - Reset the progression ONLY when a new Peak Bankroll is achieved. 
 * - CRITICAL UPDATE: Upon a successful reset, the strategy automatically flips to the OPPOSITE side (e.g., from High to Low) to start the new cycle.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State & Peak Bankroll Tracker
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.level = 0;
        // Start randomly for the very first cycle
        state.side = Math.random() < 0.5 ? 'low' : 'high';
    }

    // 2. Check for Reset vs. Progression
    if (spinHistory.length > 0) {
        if (bankroll > state.peakBankroll) {
            // Achieved a new peak bankroll! Reset cycle and FLIP sides.
            state.peakBankroll = bankroll;
            state.level = 0;
            state.side = (state.side === 'low') ? 'high' : 'low'; 
        } else {
            // Did not achieve peak bankroll -> Escalate the progression
            state.level++;
        }
    }

    // 3. Determine Base Units (respecting table minimum limits)
    const baseCorner = Math.max(2, config.betLimits.min);
    const baseSplit  = Math.max(1, config.betLimits.min);
    const baseDozen  = Math.max(6, config.betLimits.minOutside);
    const baseEven   = Math.max(6, config.betLimits.minOutside);

    // 4. Define Exact Placements (Ensuring zero overlap between Corners and Splits)
    let c1, c2, s1, s2, doz, evenType;
    if (state.side === 'low') {
        // LOW SIDE (1st Dozen)
        // Corners: 1 covers (1,2,4,5) | 8 covers (8,9,11,12)
        c1 = 1; 
        c2 = 8;               
        // Splits: Cover the remaining numbers (3,6) and (7,10)
        s1 = [3, 6]; 
        s2 = [7, 10];   
        
        doz = 1;                      // 1st Dozen
        evenType = 'low';             // 1-18
    } else {
        // HIGH SIDE (3rd Dozen)
        // Corners: 25 covers (25,26,28,29) | 32 covers (32,33,35,36)
        c1 = 25; 
        c2 = 32;             
        // Splits: Cover the remaining numbers (27,30) and (31,34)
        s1 = [27, 30]; 
        s2 = [31, 34]; 
        
        doz = 3;                      // 3rd Dozen
        evenType = 'high';            // 19-36
    }

    // 5. Calculate Multiplier (Linear scaling starts scaling UP at Level 4)
    // Level 0, 1, 2, and 3 use base multiplier 1. Level 4 uses 2, Level 5 uses 3, etc.
    let m = state.level >= 3 ? (state.level - 2) : 1;

    // 6. Build Bet Array Based on Current Level
    let currentBets = [];

    // Level 0+: Corners
    if (state.level >= 0) {
        currentBets.push({ type: 'corner', value: c1, amount: baseCorner * m });
        currentBets.push({ type: 'corner', value: c2, amount: baseCorner * m });
    }
    // Level 1+: Splits
    if (state.level >= 1) {
        currentBets.push({ type: 'split', value: s1, amount: baseSplit * m });
        currentBets.push({ type: 'split', value: s2, amount: baseSplit * m });
    }
    // Level 2+: Dozen
    if (state.level >= 2) {
        currentBets.push({ type: 'dozen', value: doz, amount: baseDozen * m });
    }
    // Level 3+: Even-Money
    if (state.level >= 3) {
        currentBets.push({ type: evenType, amount: baseEven * m });
    }

    // 7. Clamp to Maximum Limits and Verify Funds
    let totalCost = 0;
    for (let b of currentBets) {
        b.amount = Math.min(b.amount, config.betLimits.max);
        totalCost += b.amount;
    }

    if (totalCost > bankroll) {
        // Insufficient funds to continue sequence - triggers simulator stop
        return []; 
    }

    return currentBets;
}