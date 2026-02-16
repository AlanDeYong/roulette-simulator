<<<<<<< HEAD
/**
 * Todd Hoover's "Gold Mine" Roulette Strategy (with "No Boss" Trigger)
 *
 * Source: "DON'T MISS THIS ONE! BEST VS BEST IN A HEAD TO HEAD MATCHUP!" by The Roulette Master
 * Video URL: https://www.youtube.com/watch?v=LNpVDVMKKVM
 *
 * --- STRATEGY LOGIC ---
 *
 * 1. THE TREND (GOLD MINE CORE):
 * - The strategy follows the trend of High (19-36) vs Low (1-18).
 * - If the trend is HIGH: Bet High (19-36) + Dozen 2 + Dozen 3.
 * - If the trend is LOW: Bet Low (1-18) + Dozen 1 + Dozen 2.
 * - Note: This creates a heavy overlap coverage.
 *
 * 2. THE BET SIZING (UNITS):
 * - Base Unit (u) = config.betLimits.minOutside.
 * - Outside Bet (High/Low): Starts at 3 units.
 * - Dozen Bets: Start at 1 unit each.
 *
 * 3. THE PROGRESSION (ON LOSS):
 * - Independent progression for each bet spot.
 * - If the High/Low bet loses: Increase by 3 units.
 * - If a Dozen bet loses: Increase by 1 unit.
 * - If a bet wins: It stays at the current level (does not reset immediately).
 * - Trend Switching: If the trend flips (e.g., from High to Low), the current progression
 * values are carried over to the new corresponding spots (e.g., High bet amount moves to Low).
 *
 * 4. THE GOAL (SESSION PROFIT RESET):
 * - The primary reset condition is "New Session Profit".
 * - We track the maximum bankroll achieved.
 * - If Current Bankroll > Max Bankroll: RESET all bets to base levels.
 *
 * 5. THE "NO BOSS" TRIGGER (OVERLAY):
 * - Condition: 3 consecutive hits of the SAME Dozen (e.g., 1st, 1st, 1st).
 * - Action: Place a large bet on the OTHER two Dozens.
 * - Progression: One recovery step (Martingale) allowed.
 * - Step 1: 20 units on each of the two dozens.
 * - Step 2: 50 units on each (if Step 1 loses).
 * - Stop: If Step 2 loses, stop No Boss and resume Gold Mine.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const unit = config.betLimits.minOutside || 5;
    const baseHighLowUnits = 3;
    const baseDozenUnits = 1;

    // No Boss Bet Sizes (in units)
    const noBossLevel1 = 20; 
    const noBossLevel2 = 50;

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.maxBankroll = bankroll;
        state.trend = 'high'; // Default start
        
        // Progression trackers (in Units)
        state.progression = {
            highLow: baseHighLowUnits,
            dozenA: baseDozenUnits, // The lower of the two active dozens (e.g., Dozen 1 or 2)
            dozenB: baseDozenUnits  // The higher of the two active dozens (e.g., Dozen 2 or 3)
        };

        // Track last active bets to determine wins/losses
        state.lastBets = null;
        
        // No Boss State
        state.noBoss = {
            active: false,
            level: 0,
            targetDozens: []
        };

        state.initialized = true;
    }

    // Helper to clamp bets
    const clamp = (amt, type) => {
        const min = (type === 'dozen' || type === 'column' || type === 'high' || type === 'low') 
                    ? config.betLimits.minOutside 
                    : config.betLimits.min;
        return Math.min(Math.max(amt, min), config.betLimits.max);
    };

    // Helper to get Dozen info (1, 2, or 3)
    const getDozen = (num) => {
        if (num === 0 || num === '00') return 0;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    };

    // --- 3. PROCESS LAST SPIN (LOGIC & PROGRESSION) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDozen = getDozen(lastNum);
        
        // 3a. Check Session Profit (The "Gold Mine" Reset)
        if (bankroll > state.maxBankroll) {
            state.maxBankroll = bankroll;
            // Reset Gold Mine progressions
            state.progression.highLow = baseHighLowUnits;
            state.progression.dozenA = baseDozenUnits;
            state.progression.dozenB = baseDozenUnits;
            // utils.log("New Session Profit! Resetting progressions.");
        } else {
            // 3b. Update Gold Mine Progressions (If not resetting)
            // We only update if we actually placed Gold Mine bets last time (and No Boss wasn't active)
            if (state.lastBets && !state.noBoss.active) {
                const wonHighLow = (state.trend === 'high' && lastNum >= 19 && lastNum <= 36) ||
                                   (state.trend === 'low' && lastNum >= 1 && lastNum <= 18);
                
                // Determine which dozens were active
                const activeDozens = state.trend === 'high' ? [2, 3] : [1, 2];
                const wonDozA = activeDozens[0] === lastDozen;
                const wonDozB = activeDozens[1] === lastDozen;

                // Update High/Low: Increase by 3 units on loss, stay on win
                if (!wonHighLow && lastNum !== 0 && lastNum !== '00') {
                    state.progression.highLow += 3;
                }

                // Update Dozens: Increase by 1 unit on loss, stay on win
                if (!wonDozA && lastNum !== 0 && lastNum !== '00') state.progression.dozenA += 1;
                if (!wonDozB && lastNum !== 0 && lastNum !== '00') state.progression.dozenB += 1;
            }
        }

        // 3c. Update Trend
        // If 0, keep previous trend. Otherwise, update.
        if (lastNum >= 1 && lastNum <= 18) state.trend = 'low';
        if (lastNum >= 19 && lastNum <= 36) state.trend = 'high';

        // 3d. Check "No Boss" Trigger Conditions
        // Need last 3 spins to be the same dozen
        if (spinHistory.length >= 3) {
            const h = spinHistory;
            const d1 = getDozen(h[h.length-1].winningNumber);
            const d2 = getDozen(h[h.length-2].winningNumber);
            const d3 = getDozen(h[h.length-3].winningNumber);

            // If triggered and not already active
            if (d1 !== 0 && d1 === d2 && d2 === d3 && !state.noBoss.active) {
                state.noBoss.active = true;
                state.noBoss.level = 1;
                // Target the OTHER two dozens
                state.noBoss.targetDozens = [1, 2, 3].filter(d => d !== d1);
            }
        }
        
        // 3e. Manage Active No Boss Progression
        if (state.noBoss.active && state.lastBets) {
             // Did we win the No Boss bet?
             // We won if the result is in one of our target dozens
             if (state.noBoss.targetDozens.includes(lastDozen)) {
                 // Win -> Reset No Boss
                 state.noBoss.active = false;
                 state.noBoss.level = 0;
             } else {
                 // Loss -> Increase level or Give Up
                 if (state.noBoss.level === 1) {
                     state.noBoss.level = 2;
                 } else {
                     // Lost level 2 -> Give up
                     state.noBoss.active = false;
                     state.noBoss.level = 0;
                 }
             }
        }
    }

    // --- 4. CONSTRUCT BETS ---
    const bets = [];

    // Priority 1: No Boss Overlay (Overrides Gold Mine if active)
    if (state.noBoss.active) {
        const amount = (state.noBoss.level === 1 ? noBossLevel1 : noBossLevel2) * unit;
        
        // Safety check: Do we have enough bankroll? 
        // If not, fall back to normal strategy or just stop No Boss.
        if (bankroll > amount * 2) {
            state.noBoss.targetDozens.forEach(d => {
                bets.push({
                    type: 'dozen',
                    value: d,
                    amount: clamp(amount, 'dozen')
                });
            });
            state.lastBets = 'no_boss'; // Marker to skip Gold Mine progression logic next turn
            return bets;
        } else {
            // Not enough money, cancel No Boss
            state.noBoss.active = false; 
        }
    }

    // Priority 2: Gold Mine Strategy
    
    // Determine active zones based on Trend
    // High Trend -> High (19-36), Dozen 2, Dozen 3
    // Low Trend -> Low (1-18), Dozen 1, Dozen 2
    
    const outsideType = state.trend; // 'high' or 'low'
    const activeDozens = state.trend === 'high' ? [2, 3] : [1, 2];

    // Calculate Amounts
    const amtHighLow = clamp(state.progression.highLow * unit, 'high');
    const amtDozA = clamp(state.progression.dozenA * unit, 'dozen');
    const amtDozB = clamp(state.progression.dozenB * unit, 'dozen');

    // Add Bets
    bets.push({ type: outsideType, amount: amtHighLow });
    bets.push({ type: 'dozen', value: activeDozens[0], amount: amtDozA });
    bets.push({ type: 'dozen', value: activeDozens[1], amount: amtDozB });

    state.lastBets = 'gold_mine';
    return bets;
=======
/**
 * Todd Hoover's "Gold Mine" Roulette Strategy (with "No Boss" Trigger)
 *
 * Source: "DON'T MISS THIS ONE! BEST VS BEST IN A HEAD TO HEAD MATCHUP!" by The Roulette Master
 * Video URL: https://www.youtube.com/watch?v=LNpVDVMKKVM
 *
 * --- STRATEGY LOGIC ---
 *
 * 1. THE TREND (GOLD MINE CORE):
 * - The strategy follows the trend of High (19-36) vs Low (1-18).
 * - If the trend is HIGH: Bet High (19-36) + Dozen 2 + Dozen 3.
 * - If the trend is LOW: Bet Low (1-18) + Dozen 1 + Dozen 2.
 * - Note: This creates a heavy overlap coverage.
 *
 * 2. THE BET SIZING (UNITS):
 * - Base Unit (u) = config.betLimits.minOutside.
 * - Outside Bet (High/Low): Starts at 3 units.
 * - Dozen Bets: Start at 1 unit each.
 *
 * 3. THE PROGRESSION (ON LOSS):
 * - Independent progression for each bet spot.
 * - If the High/Low bet loses: Increase by 3 units.
 * - If a Dozen bet loses: Increase by 1 unit.
 * - If a bet wins: It stays at the current level (does not reset immediately).
 * - Trend Switching: If the trend flips (e.g., from High to Low), the current progression
 * values are carried over to the new corresponding spots (e.g., High bet amount moves to Low).
 *
 * 4. THE GOAL (SESSION PROFIT RESET):
 * - The primary reset condition is "New Session Profit".
 * - We track the maximum bankroll achieved.
 * - If Current Bankroll > Max Bankroll: RESET all bets to base levels.
 *
 * 5. THE "NO BOSS" TRIGGER (OVERLAY):
 * - Condition: 3 consecutive hits of the SAME Dozen (e.g., 1st, 1st, 1st).
 * - Action: Place a large bet on the OTHER two Dozens.
 * - Progression: One recovery step (Martingale) allowed.
 * - Step 1: 20 units on each of the two dozens.
 * - Step 2: 50 units on each (if Step 1 loses).
 * - Stop: If Step 2 loses, stop No Boss and resume Gold Mine.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const unit = config.betLimits.minOutside || 5;
    const baseHighLowUnits = 3;
    const baseDozenUnits = 1;

    // No Boss Bet Sizes (in units)
    const noBossLevel1 = 20; 
    const noBossLevel2 = 50;

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.maxBankroll = bankroll;
        state.trend = 'high'; // Default start
        
        // Progression trackers (in Units)
        state.progression = {
            highLow: baseHighLowUnits,
            dozenA: baseDozenUnits, // The lower of the two active dozens (e.g., Dozen 1 or 2)
            dozenB: baseDozenUnits  // The higher of the two active dozens (e.g., Dozen 2 or 3)
        };

        // Track last active bets to determine wins/losses
        state.lastBets = null;
        
        // No Boss State
        state.noBoss = {
            active: false,
            level: 0,
            targetDozens: []
        };

        state.initialized = true;
    }

    // Helper to clamp bets
    const clamp = (amt, type) => {
        const min = (type === 'dozen' || type === 'column' || type === 'high' || type === 'low') 
                    ? config.betLimits.minOutside 
                    : config.betLimits.min;
        return Math.min(Math.max(amt, min), config.betLimits.max);
    };

    // Helper to get Dozen info (1, 2, or 3)
    const getDozen = (num) => {
        if (num === 0 || num === '00') return 0;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    };

    // --- 3. PROCESS LAST SPIN (LOGIC & PROGRESSION) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDozen = getDozen(lastNum);
        
        // 3a. Check Session Profit (The "Gold Mine" Reset)
        if (bankroll > state.maxBankroll) {
            state.maxBankroll = bankroll;
            // Reset Gold Mine progressions
            state.progression.highLow = baseHighLowUnits;
            state.progression.dozenA = baseDozenUnits;
            state.progression.dozenB = baseDozenUnits;
            // utils.log("New Session Profit! Resetting progressions.");
        } else {
            // 3b. Update Gold Mine Progressions (If not resetting)
            // We only update if we actually placed Gold Mine bets last time (and No Boss wasn't active)
            if (state.lastBets && !state.noBoss.active) {
                const wonHighLow = (state.trend === 'high' && lastNum >= 19 && lastNum <= 36) ||
                                   (state.trend === 'low' && lastNum >= 1 && lastNum <= 18);
                
                // Determine which dozens were active
                const activeDozens = state.trend === 'high' ? [2, 3] : [1, 2];
                const wonDozA = activeDozens[0] === lastDozen;
                const wonDozB = activeDozens[1] === lastDozen;

                // Update High/Low: Increase by 3 units on loss, stay on win
                if (!wonHighLow && lastNum !== 0 && lastNum !== '00') {
                    state.progression.highLow += 3;
                }

                // Update Dozens: Increase by 1 unit on loss, stay on win
                if (!wonDozA && lastNum !== 0 && lastNum !== '00') state.progression.dozenA += 1;
                if (!wonDozB && lastNum !== 0 && lastNum !== '00') state.progression.dozenB += 1;
            }
        }

        // 3c. Update Trend
        // If 0, keep previous trend. Otherwise, update.
        if (lastNum >= 1 && lastNum <= 18) state.trend = 'low';
        if (lastNum >= 19 && lastNum <= 36) state.trend = 'high';

        // 3d. Check "No Boss" Trigger Conditions
        // Need last 3 spins to be the same dozen
        if (spinHistory.length >= 3) {
            const h = spinHistory;
            const d1 = getDozen(h[h.length-1].winningNumber);
            const d2 = getDozen(h[h.length-2].winningNumber);
            const d3 = getDozen(h[h.length-3].winningNumber);

            // If triggered and not already active
            if (d1 !== 0 && d1 === d2 && d2 === d3 && !state.noBoss.active) {
                state.noBoss.active = true;
                state.noBoss.level = 1;
                // Target the OTHER two dozens
                state.noBoss.targetDozens = [1, 2, 3].filter(d => d !== d1);
            }
        }
        
        // 3e. Manage Active No Boss Progression
        if (state.noBoss.active && state.lastBets) {
             // Did we win the No Boss bet?
             // We won if the result is in one of our target dozens
             if (state.noBoss.targetDozens.includes(lastDozen)) {
                 // Win -> Reset No Boss
                 state.noBoss.active = false;
                 state.noBoss.level = 0;
             } else {
                 // Loss -> Increase level or Give Up
                 if (state.noBoss.level === 1) {
                     state.noBoss.level = 2;
                 } else {
                     // Lost level 2 -> Give up
                     state.noBoss.active = false;
                     state.noBoss.level = 0;
                 }
             }
        }
    }

    // --- 4. CONSTRUCT BETS ---
    const bets = [];

    // Priority 1: No Boss Overlay (Overrides Gold Mine if active)
    if (state.noBoss.active) {
        const amount = (state.noBoss.level === 1 ? noBossLevel1 : noBossLevel2) * unit;
        
        // Safety check: Do we have enough bankroll? 
        // If not, fall back to normal strategy or just stop No Boss.
        if (bankroll > amount * 2) {
            state.noBoss.targetDozens.forEach(d => {
                bets.push({
                    type: 'dozen',
                    value: d,
                    amount: clamp(amount, 'dozen')
                });
            });
            state.lastBets = 'no_boss'; // Marker to skip Gold Mine progression logic next turn
            return bets;
        } else {
            // Not enough money, cancel No Boss
            state.noBoss.active = false; 
        }
    }

    // Priority 2: Gold Mine Strategy
    
    // Determine active zones based on Trend
    // High Trend -> High (19-36), Dozen 2, Dozen 3
    // Low Trend -> Low (1-18), Dozen 1, Dozen 2
    
    const outsideType = state.trend; // 'high' or 'low'
    const activeDozens = state.trend === 'high' ? [2, 3] : [1, 2];

    // Calculate Amounts
    const amtHighLow = clamp(state.progression.highLow * unit, 'high');
    const amtDozA = clamp(state.progression.dozenA * unit, 'dozen');
    const amtDozB = clamp(state.progression.dozenB * unit, 'dozen');

    // Add Bets
    bets.push({ type: outsideType, amount: amtHighLow });
    bets.push({ type: 'dozen', value: activeDozens[0], amount: amtDozA });
    bets.push({ type: 'dozen', value: activeDozens[1], amount: amtDozB });

    state.lastBets = 'gold_mine';
    return bets;
>>>>>>> origin/main
}