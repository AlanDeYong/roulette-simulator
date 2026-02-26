/**
 * VICTORY FLAGS LOW ROLLER Roulette Strategy
 * * Source: https://www.youtube.com/watch?v=XCrBTB4KEdE&list=PLGUAp9smAZCCOtZ0fnP_tFSCw5fPzYNa5&index=57
 * * The Logic:
 * 1. Observation Phase: Waits for 37 spins to determine "hot" and "cold" numbers.
 * 2. Target Selection: Identifies the dozen with the most hits in the last 37 spins.
 * 3. Flag Pattern: Within the chosen dozen, finds the "hottest" corner that is NOT in the middle 
 * of the dozen. Places a "Flag" pattern consisting of:
 * - 1 unit on the chosen corner.
 * - 1 unit straight up on each of the 4 numbers in that corner.
 * - 1 unit on 3 horizontal splits in the OTHER double street within the same dozen.
 * * The Progression:
 * - Level 1: Places the Flag pattern on the Best Dozen.
 * - Level 2 (Loss): Adds the Flag pattern on the 2nd Best Dozen (both 1 base unit).
 * - Level 3 (Loss): Doubles up all bets (2 base units on Best and 2nd Best Dozens).
 * - Level 4 (Loss): Keeps Level 3 inside bets, and adds a 30 base units outside bet on the Last (Worst) Dozen.
 * - Level 5+ (Loss): Increases all inside bets by 1 base unit, and the outside dozen bet by 30 base units linearly.
 * * The Goal: Target $20 increment from the last peak bankroll. Resets progression to level 1 and recalculates hot numbers only when met.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Observation Phase: Wait for 37 spins
    if (spinHistory.length < 37) {
        return [];
    }

    const baseUnit = config.betLimits.min;
    const TARGET_INCREMENT = 20; // Exact target increment value ($20)

    // Initialize state on first active bet spin
    if (state.peakBankroll === undefined) {
        state.peakBankroll = config.startingBankroll;
        state.targetBankroll = state.peakBankroll + TARGET_INCREMENT;
        state.currentLevel = 1;
        state.lastBankroll = bankroll;
        state.placedBet = false;
    }

    // 2. Evaluate Win/Loss from the previous spin to determine progression
    // We only advance progression if we actually placed a bet AND lost money
    if (state.placedBet) {
        if (bankroll < state.lastBankroll) {
            // Net loss -> Advance progression
            state.currentLevel++;
        }
        // If bankroll >= state.lastBankroll, it's a win or push.
        // We STAY at the current level until the target bankroll is met.
    }

    // 3. Goal Check: Reset progression and target if we reached the peak target
    if (bankroll >= state.targetBankroll) {
        state.peakBankroll = bankroll;
        state.targetBankroll = state.peakBankroll + TARGET_INCREMENT;
        state.currentLevel = 1;
        state.patterns = null; // Force recalculation of patterns for the new session
    }

    // 4. Calculate Hot/Cold Patterns (calculated once per session/target hit)
    if (!state.patterns) {
        state.patterns = calculatePatterns(spinHistory.slice(-37));
    }

    // 5. Determine Multipliers based on Progression Level
    let L = state.currentLevel;
    let m1 = 0, m2 = 0, m3 = 0; // m1: Best Doz, m2: 2nd Best Doz, m3: Worst Doz (Outside)

    if (L === 1) { 
        m1 = 1; m2 = 0; m3 = 0; 
    } else if (L === 2) { 
        m1 = 1; m2 = 1; m3 = 0; 
    } else if (L === 3) { 
        m1 = 2; m2 = 2; m3 = 0; 
    } else if (L === 4) { 
        m1 = 2; m2 = 2; m3 = 30; 
    } else if (L >= 5) {
        m1 = L - 2; 
        m2 = L - 2; 
        m3 = (L - 3) * 30;
    }

    // 6. Construct Bets based on Multipliers and Limits
    let bets = [];

    // Helper function to add Flag Bets safely clamped to limits
    function addFlagBets(flag, unitMultiplier) {
        let amount = unitMultiplier * baseUnit;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        // Add 1 Corner Bet
        bets.push({ type: 'corner', value: flag.cornerValue, amount: amount });

        // Add 4 Straight Up Bets
        for (let num of flag.straightUps) {
            bets.push({ type: 'number', value: num, amount: amount });
        }

        // Add 3 Split Bets
        for (let split of flag.splits) {
            bets.push({ type: 'split', value: split, amount: amount });
        }
    }

    if (m1 > 0) addFlagBets(state.patterns.flag1, m1);
    if (m2 > 0) addFlagBets(state.patterns.flag2, m2);
    
    // Add Last Dozen Outside Bet if applicable
    if (m3 > 0) {
        let dozAmount = m3 * baseUnit;
        dozAmount = Math.max(dozAmount, config.betLimits.minOutside);
        dozAmount = Math.min(dozAmount, config.betLimits.max);
        bets.push({ type: 'dozen', value: state.patterns.doz3 + 1, amount: dozAmount });
    }

    // Store state for the next spin's win/loss evaluation
    state.lastBankroll = bankroll;
    state.placedBet = bets.length > 0;
    
    return bets;

    // --- HELPER FUNCTIONS ---

    function calculatePatterns(history) {
        // Count frequencies of all numbers
        let counts = new Array(37).fill(0);
        for (let spin of history) {
            if (spin.winningNumber >= 1 && spin.winningNumber <= 36) {
                counts[spin.winningNumber]++;
            }
        }

        // Aggregate by dozen (0: 1-12, 1: 13-24, 2: 25-36)
        let dozFreq = [0, 0, 0];
        for (let i = 1; i <= 36; i++) {
            let d = Math.floor((i - 1) / 12);
            dozFreq[d] += counts[i];
        }

        // Sort dozens by hotness (frequency descending)
        let sortedDozens = [0, 1, 2].sort((a, b) => dozFreq[b] - dozFreq[a]);

        return {
            flag1: getFlagPattern(sortedDozens[0], counts),
            flag2: getFlagPattern(sortedDozens[1], counts),
            doz3: sortedDozens[2] // The last (coldest) dozen
        };
    }

    function getFlagPattern(dozenIndex, counts) {
        let offset = dozenIndex * 12;
        
        // Define corners strictly at the top and bottom of the dozen to avoid the middle
        let c1 = [1, 2, 4, 5].map(x => x + offset);     // Top-left
        let c2 = [2, 3, 5, 6].map(x => x + offset);     // Top-right
        let c3 = [7, 8, 10, 11].map(x => x + offset);   // Bottom-left
        let c4 = [8, 9, 11, 12].map(x => x + offset);   // Bottom-right

        let corners = [c1, c2, c3, c4];
        let maxFreq = -1;
        let bestCorner = null;
        let bestCornerIdx = 0;

        // Find the hottest corner
        for (let i = 0; i < corners.length; i++) {
            let freq = corners[i].reduce((sum, num) => sum + counts[num], 0);
            if (freq > maxFreq) {
                maxFreq = freq;
                bestCorner = corners[i];
                bestCornerIdx = i;
            }
        }

        // Determine splits on the *other* double street within the same dozen
        let splits = [];
        if (bestCornerIdx <= 1) {
            // Chosen corner is in the Top half (1-6). Splits go to Bottom half (7-12)
            splits = [[7, 10], [8, 11], [9, 12]].map(s => [s[0] + offset, s[1] + offset]);
        } else {
            // Chosen corner is in the Bottom half (7-12). Splits go to Top half (1-6)
            splits = [[1, 4], [2, 5], [3, 6]].map(s => [s[0] + offset, s[1] + offset]);
        }

        return {
            cornerValue: bestCorner[0], 
            straightUps: bestCorner,
            splits: splits
        };
    }
}