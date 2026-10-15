/**
 * CASH GATE Roulette Strategy (Updated Progression)
 * Source: https://www.youtube.com/watch?v=hsWxRllWMHE&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=66&t=38s
 * * The Logic: 
 * A pattern of inside bets (splits and streets) covering a large portion of the board.
 * Starts with 1 unit on specific splits (8/9, 11/12, 14/15, 17/18, 20/21, 23/24, 26/27, 29/30) 
 * and 2 units on specific streets (7, 28).
 * * The Progression:
 * - Level 1: Splits @ 1u. Streets (7, 28) @ 2u.
 * - Level 2 (Loss): Splits +1u (2u). Add Streets (10, 25) @ 2u. (All active streets = 2u).
 * - Level 3 (Loss): Splits +1u (3u). Add Streets (13, 22) @ 2u, then all streets +2u. (All active streets = 4u).
 * - Level 4 (Loss): Splits +1u (4u). Add Streets (16, 19) @ 4u, then all streets +2u. (All active streets = 6u).
 * - Level 5 (Loss): All streets +2u. (All active streets = 8u). Splits remain 4u.
 * - Level 6 (Loss): Splits +1u (5u). All streets +2u. (All active streets = 10u).
 * - Level 7 (Loss): Double all bets. (Splits = 10u, Streets = 20u).
 * - Level 8+ (Loss): Splits +5u. All streets +10u.
 * - Win: Rebet at the exact same level, EXCEPT:
 * - Win at L7: Go down 1 level (to L6).
 * - Win at L8+: Go down 2 levels.
 * - Push: Rebet at current level.
 * * The Goal: 
 * Aim for a 20-unit profit ($20) increment above the last peak bankroll, then reset to Level 1.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;

    // 1. Initialize State and High-Water Mark (Peak Bankroll)
    if (state.level === undefined) {
        state.level = 1;
        state.peakBankroll = bankroll;
        state.lastBankroll = bankroll;
    }

    // 2. Process Previous Spin Outcome
    if (spinHistory.length > 0) {
        if (bankroll > state.lastBankroll) {
            // WIN CONDITION
            if (bankroll >= state.peakBankroll + (20 * unit)) {
                // Goal reached: Reset cycle and establish new peak
                state.level = 1;
                state.peakBankroll = bankroll;
            } else {
                // Goal not reached yet: Update peak if current is higher, handle progression drops
                state.peakBankroll = Math.max(state.peakBankroll, bankroll);
                
                if (state.level === 7) {
                    state.level = 6;
                } else if (state.level >= 8) {
                    state.level = Math.max(1, state.level - 2);
                }
                // Other levels: rebet (state.level remains unchanged)
            }
        } else if (bankroll < state.lastBankroll) {
            // LOSS CONDITION
            state.level++;
        }
        // PUSH CONDITION (bankroll === state.lastBankroll): state.level remains unchanged
    }

    // Update last bankroll for the next spin evaluation
    state.lastBankroll = bankroll;

    // 3. Determine Unit Amounts and Active Streets Based on Exact Current Level
    let splitUnits = 1;
    let streetUnits = 2;
    let activeStreets = [];

    if (state.level === 1) {
        splitUnits = 1; 
        activeStreets = [7, 28]; 
        streetUnits = 2;
    } else if (state.level === 2) {
        splitUnits = 2; 
        activeStreets = [7, 28, 10, 25]; 
        streetUnits = 2;
    } else if (state.level === 3) {
        splitUnits = 3; 
        activeStreets = [7, 28, 10, 25, 13, 22]; 
        streetUnits = 4;
    } else if (state.level === 4) {
        splitUnits = 4; 
        activeStreets = [7, 28, 10, 25, 13, 22, 16, 19]; 
        streetUnits = 6;
    } else if (state.level === 5) {
        splitUnits = 4; // Splits don't increase here
        activeStreets = [7, 28, 10, 25, 13, 22, 16, 19]; 
        streetUnits = 8;
    } else if (state.level === 6) {
        splitUnits = 5; 
        activeStreets = [7, 28, 10, 25, 13, 22, 16, 19]; 
        streetUnits = 10;
    } else if (state.level === 7) {
        splitUnits = 10; 
        activeStreets = [7, 28, 10, 25, 13, 22, 16, 19]; 
        streetUnits = 20;
    } else if (state.level >= 8) {
        let additions = state.level - 7;
        splitUnits = 10 + (5 * additions);
        activeStreets = [7, 28, 10, 25, 13, 22, 16, 19]; 
        streetUnits = 20 + (10 * additions);
    }

    // 4. Construct the Bets Array safely clamped to table limits
    let bets = [];
    const splitPairs = [
        [8,9], [11,12], [14,15], [17,18], 
        [20,21], [23,24], [26,27], [29,30]
    ];
    
    // Calculate and clamp split amounts
    let finalSplitAmount = splitUnits * unit;
    finalSplitAmount = Math.max(finalSplitAmount, config.betLimits.min);
    finalSplitAmount = Math.min(finalSplitAmount, config.betLimits.max);

    for (let pair of splitPairs) {
        bets.push({ type: 'split', value: pair, amount: finalSplitAmount });
    }

    // Calculate and clamp street amounts
    let finalStreetAmount = streetUnits * unit;
    finalStreetAmount = Math.max(finalStreetAmount, config.betLimits.min);
    finalStreetAmount = Math.min(finalStreetAmount, config.betLimits.max);

    for (let streetNum of activeStreets) {
        bets.push({ type: 'street', value: streetNum, amount: finalStreetAmount });
    }

    return bets;
}