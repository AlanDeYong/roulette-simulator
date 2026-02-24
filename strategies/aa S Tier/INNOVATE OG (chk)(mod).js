/**
 * ROULETTE STRATEGY: Custom Innovate Progression (Corrected Placements)
 * * Source: User Custom Layout
 * * The Logic:
 * The strategy builds a progressively larger board presence over the first 3 levels, 
 * starting from either the 'left' or 'right' side of the number layout. 
 * Bets are placed on specific Straight and Split positions.
 * * The Progression:
 * - Level 1: Base bets (1 unit).
 * - Level 2 (Loss): Add second block of bets, all bets stay at 1 unit.
 * - Level 3 (Loss): Add third block of bets, double up all bets (2 units).
 * - Level 4 to 7 (Loss): Add 1 unit to all active bets sequentially (3u, 4u, 5u, 6u).
 * - Level 8 to 9 (Loss): Double up previous bets (12u, 24u).
 * - On Win: If the current bankroll hits $20 above the last peak, the sequence resets 
 * to Level 1 on the opposite side of the board. If the target is NOT hit, the exact 
 * same bets and level are replayed (Rebet). 
 * - Sequence fails and resets after a Level 9 loss.
 * * The Goal:
 * To grind out a strict +$20 profit over the peak bankroll using expanding coverage 
 * and a deep recovery ladder.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;
        state.currentSide = 'left'; 
        state.peakBankroll = bankroll;
        state.targetBankroll = bankroll + 20; 
        state.lastBets = [];
    }

    // Helper function to reset sequence
    const resetSequence = (currentBankroll) => {
        state.level = 1;
        state.currentSide = state.currentSide === 'left' ? 'right' : 'left';
        state.peakBankroll = currentBankroll;
        state.targetBankroll = currentBankroll + 20;
    };

    // 2. Process Previous Spin Outcomes
    if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        
        // Determine if we won the last spin
        let wonLastSpin = false;
        for (const b of state.lastBets) {
            if (b.type === 'number' && b.value === winNum) wonLastSpin = true;
            if (b.type === 'split' && b.value.includes(winNum)) wonLastSpin = true;
        }

        if (wonLastSpin) {
            // Win condition check
            if (bankroll >= state.targetBankroll) {
                // Target hit! Reset and flip sides
                resetSequence(bankroll);
            } else {
                // Target NOT hit. Rebet condition.
                // By doing nothing to state.level, the next spin uses the exact same setup.
            }
        } else {
            // Loss condition
            state.level++;
            
            // Check for sequence failure (Loss on Level 9)
            if (state.level > 9) {
                resetSequence(bankroll);
            }
        }
    }

    // 3. Determine Multiplier based on Level
    // Indices: 0(unused), L1, L2, L3, L4, L5, L6, L7, L8, L9
    const multipliers = [0, 1, 1, 2, 3, 4, 5, 6, 12, 24];
    const mult = multipliers[state.level];

    // 4. Calculate Bet Amount clamped to limits
    let baseUnit = config.betLimits.min;
    let betAmount = baseUnit * mult;
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 5. Construct Board Layout
    let straights = [];
    let splits = [];

    if (state.currentSide === 'left') {
        // Level 1 Base (Left Side)
        straights.push(1, 4, 9, 12);
        splits.push([2, 5], [8, 11]);
        
        // Level 2 Additions
        if (state.level >= 2) {
            straights.push(13, 16, 21, 24);
            splits.push([14, 17], [20, 23]);
        }
        
        // Level 3 Additions
        if (state.level >= 3) {
            straights.push(25, 28);
            splits.push([26, 29]); // Corrected: Added 26/29 split
        }
    } else {
        // Level 1 Base (Right Side)
        straights.push(27, 30, 31, 34);
        splits.push([26, 29], [32, 35]);
        
        // Level 2 Additions
        if (state.level >= 2) {
            straights.push(15, 18, 19, 22);
            splits.push([14, 17], [20, 23]);
        }
        
        // Level 3 Additions
        if (state.level >= 3) {
            straights.push(7, 10);
            splits.push([8, 11]);
        }
    }

    // 6. Generate Bets Array
    let activeBets = [];
    
    straights.forEach(num => {
        activeBets.push({ type: 'number', value: num, amount: betAmount });
    });
    
    splits.forEach(splitArr => {
        activeBets.push({ type: 'split', value: splitArr, amount: betAmount });
    });

    // Save bets to state for outcome detection on the next spin
    state.lastBets = activeBets;

    return activeBets;
}