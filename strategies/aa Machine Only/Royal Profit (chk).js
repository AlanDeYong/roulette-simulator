/**
 * ROYAL PROFIT ROULETTE SYSTEM
 * * Source: "The Roulette Master" on YouTube 
 * URL: https://www.youtube.com/watch?v=rX5S2ybphjs
 * * The Logic: 
 * The strategy starts by placing 6 distinct corner bets (covering 24 unique numbers). 
 * When a spin hits one of the covered numbers, that specific corner bet is removed 
 * from the active list for subsequent spins, effectively narrowing the board coverage 
 * as you win.
 * * The Progression: 
 * It utilizes a Modified Fibonacci sequence (1x, 2x, 3x, 5x, 8x, 13x...) applied to the 
 * base bet unit. 
 * - WIN (Partial Hit): If any active corner wins, remove the winning corner. DO NOT 
 * increase the bet amount on the remaining corners.
 * - LOSS (Total Miss): If none of the active corners hit, move one step up the Fibonacci 
 * sequence and apply the new higher bet amount to ALL remaining active corners.
 * * The Goal: 
 * Achieve steady, incremental gains while protecting the bankroll from runaway progressions. 
 * The strategy resets back to the initial 6 corners and the lowest Fibonacci tier whenever a 
 * new session high (profit) is reached, or if the active corners drop below 3 (12 numbers).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine the base unit based on configuration
    const unit = config.betLimits.min;

    // 2. Initialize State on first run
    if (!state.initialized) {
        // Standard Fibonacci sequence multipliers
        state.fibSeq = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];
        state.fibIndex = 0;
        
        // Define 6 non-overlapping corners (top-left numbers)
        // 1 (1,2,4,5), 8 (8,9,11,12), 13 (13,14,16,17), 
        // 20 (20,21,23,24), 25 (25,26,28,29), 32 (32,33,35,36)
        state.initialCorners = [1, 8, 13, 20, 25, 32];
        state.activeCorners = [...state.initialCorners];
        
        // Track the highest bankroll to determine profit resets
        state.referenceBankroll = bankroll;
        state.initialized = true;
    }

    // 3. Process the last spin outcome
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const result = lastSpin.winningNumber;

        // Helper function: Checks if a roulette number is covered by a specific corner bet
        // A corner defined by its top-left number (c) covers c, c+1, c+3, and c+4
        const cornerCovers = (cornerStart, num) => {
            const coveredNumbers = [cornerStart, cornerStart + 1, cornerStart + 3, cornerStart + 4];
            return coveredNumbers.includes(num);
        };

        // Determine if the last spin was a hit on any of our active corners
        let wonOnCorner = null;
        for (let i = 0; i < state.activeCorners.length; i++) {
            if (cornerCovers(state.activeCorners[i], result)) {
                wonOnCorner = state.activeCorners[i];
                break;
            }
        }

        if (wonOnCorner !== null) {
            // Partial Hit: Remove the winning corner from active rotation
            state.activeCorners = state.activeCorners.filter(c => c !== wonOnCorner);

            // Update high-water mark if we are currently in profit
            if (bankroll > state.referenceBankroll) {
                state.referenceBankroll = bankroll;
            }

            // Reset Condition: If we hit a new profit high, or we have too few corners left
            if (bankroll >= state.referenceBankroll || state.activeCorners.length < 3) {
                state.activeCorners = [...state.initialCorners];
                state.fibIndex = 0; // Reset progression
            }
        } else {
            // Total Miss: Increment progression level
            state.fibIndex++;
            
            // Prevent out-of-bounds error on the Fibonacci array
            if (state.fibIndex >= state.fibSeq.length) {
                state.fibIndex = state.fibSeq.length - 1; 
            }
        }
    }

    // 4. Calculate Current Bet Amount
    let multiplier = state.fibSeq[state.fibIndex];
    let amount = multiplier * unit;

    // Clamp to table limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Build and Return Bet Objects
    let bets = [];
    for (let corner of state.activeCorners) {
        bets.push({ type: 'corner', value: corner, amount: amount });
    }

    return bets;
}