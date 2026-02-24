/**
 * ROULETTE STRATEGY: Custom Innovate with Rebet Number Removal
 * * Source: User Custom Layout Variation
 * * The Logic:
 * The strategy builds a progressively larger board presence over the first 3 levels, 
 * starting from either the 'left' or 'right' side. 
 * *Variation:* If a win occurs but the bankroll target is not yet hit (triggering a Rebet), 
 * and the winning bet was a Straight-Up number, that specific number is removed from 
 * the layout for the remainder of the current sequence to lock in the advantage.
 * * The Progression:
 * - Level 1: Base bets (1 unit).
 * - Level 2 (Loss): Add second block of bets, all bets stay at 1 unit.
 * - Level 3 (Loss): Add third block of bets, double up all bets (2 units).
 * - Level 4 to 7 (Loss): Add 1 unit sequentially (3u, 4u, 5u, 6u).
 * - Level 8 to 9 (Loss): Double up previous bets (12u, 24u).
 * - On Win: Aim for +$20 over the last peak bankroll. 
 * -> If hit: Reset sequence to Level 1, flip sides.
 * -> If NOT hit (Rebet): Stay at current level/multiplier. If a straight bet hit, remove it.
 * - Sequence fails and resets after a Level 9 loss.
 * * The Goal:
 * To systematically grind out a +$20 profit over peak bankroll, using dynamic bet 
 * removal to reduce risk exposure during prolonged rebet phases.
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
        state.removedStraights = []; // Track numbers to exclude
    }

    // Helper function to reset sequence
    const resetSequence = (currentBankroll) => {
        state.level = 1;
        state.currentSide = state.currentSide === 'left' ? 'right' : 'left';
        state.peakBankroll = currentBankroll;
        state.targetBankroll = currentBankroll + 20;
        state.removedStraights = []; // Clear removed numbers on reset
    };

    // 2. Process Previous Spin Outcomes
    if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        
        let wonLastSpin = false;
        let hitStraight = null; // Track if a straight bet specifically hit

        for (const b of state.lastBets) {
            if (b.type === 'number' && b.value === winNum) {
                wonLastSpin = true;
                hitStraight = winNum;
            }
            if (b.type === 'split' && b.value.includes(winNum)) {
                wonLastSpin = true;
            }
        }

        if (wonLastSpin) {
            // Win condition check
            if (bankroll >= state.targetBankroll) {
                // Target hit! Reset and flip sides
                resetSequence(bankroll);
            } else {
                // Target NOT hit. Rebet condition.
                // Variation: Remove the straight bet that just hit
                if (hitStraight !== null && !state.removedStraights.includes(hitStraight)) {
                    state.removedStraights.push(hitStraight);
                }
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
            splits.push([26, 29]); 
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
    
    // Filter out removed straights
    straights.forEach(num => {
        if (!state.removedStraights.includes(num)) {
            activeBets.push({ type: 'number', value: num, amount: betAmount });
        }
    });
    
    // Splits are unaffected by straight removal
    splits.forEach(splitArr => {
        activeBets.push({ type: 'split', value: splitArr, amount: betAmount });
    });

    // Save bets to state for outcome detection on the next spin
    state.lastBets = activeBets;

    return activeBets;
}