<<<<<<< HEAD
/**
 * STRATEGY: Sliding Dozens Stacked with Two-Story Corners
 * * SOURCE: 
 * URL: https://www.youtube.com/watch?v=73rpxyAnxPA
 * Channel: CEG Dealer School
 * * LOGIC:
 * This strategy combines two systems to balance volatility and recovery:
 * 1. Sliding Dozens (The "Float"):
 * - Always bet on 2 of the 3 Dozens.
 * - "Slide" Rule: If the ball lands in the dozen you did NOT bet on, you must move 
 * one of your bets to cover that dozen in the next spin.
 * 2. Two-Story Corners (The "Punch"):
 * - Bets on a set of 4-6 Corners to cover the board inside.
 * - These provide higher payouts to help recover the bankroll faster than dozens alone.
 * * PROGRESSION:
 * 1. Session Target:
 * - The strategy tracks a "High Water Mark" (highest bankroll achieved).
 * - If Current Bankroll >= High Water Mark, EVERYTHING resets to base units.
 * * 2. Dozen Progression:
 * - Win: Decrease bet by 1 unit (clamped to minimum).
 * - Loss (Zero or Uncovered Dozen): Increase bet by 1 unit.
 * * 3. Corner Progression (Two-Story):
 * - Tier 1: Base unit bets.
 * - Tier 2: If session is negative, double the corner units.
 * - Recycle: If Tier 2 loses for too long (defined here as 5 spins deep), 
 * "Recycle" back to Tier 1 to protect the bankroll from blowout.
 * * GOAL:
 * - Achieve a new session high (profit).
 * - Suggested stop-loss is flexible, but the "Recycle" mechanic is the built-in safety.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_OUTSIDE = config.betLimits.minOutside;
    const MIN_INSIDE = config.betLimits.min;
    const MAX_BET = config.betLimits.max;
    
    // We select 5 strategic corners to provide broad coverage
    // These cover: 1-5, 8-12, 14-18, 23-27, 29-33
    const CORNER_SET = [1, 8, 14, 23, 29]; 

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.initialized = true;
        state.highWaterMark = bankroll; // Track highest bankroll for reset
        
        // Dozen State
        state.activeDozens = [1, 2]; // Start betting Dozen 1 & 2
        state.dozenUnit = 1;         // Multiplier for base bet
        
        // Corner State
        state.cornerTier = 1;        // 1 = Base, 2 = High
        state.cornerLossCount = 0;   // Track consecutive failure to profit
        
        // Logging
        state.logs = [];
    }

    // --- 3. ANALYZE PREVIOUS SPIN (Logic & Progression) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        
        // Determine which dozen hit (1, 2, 3, or 0 for none)
        let winningDozen = 0;
        if (winNum >= 1 && winNum <= 12) winningDozen = 1;
        else if (winNum >= 13 && winNum <= 24) winningDozen = 2;
        else if (winNum >= 25 && winNum <= 36) winningDozen = 3;

        // --- RESET CHECK ---
        // If we reached a new high, reset everything
        if (bankroll >= state.highWaterMark) {
            state.highWaterMark = bankroll;
            state.dozenUnit = 1;
            state.cornerTier = 1;
            state.cornerLossCount = 0;
            // Note: We don't reset activeDozens placement, just the money
        } else {
            // --- DOZEN PROGRESSION ---
            const coveredDozen = state.activeDozens.includes(winningDozen);
            
            if (coveredDozen) {
                // Win on Dozens: Reduce unit
                state.dozenUnit = Math.max(1, state.dozenUnit - 1);
            } else {
                // Loss on Dozens (Zero or Miss): Increase unit
                state.dozenUnit++;
                
                // SLIDING LOGIC:
                // If we missed because it hit the 3rd dozen, we must slide to cover it.
                // We remove the dozen that has been active longest (first in array) and push the new one.
                if (winningDozen !== 0) {
                    state.activeDozens.shift(); // Remove first
                    state.activeDozens.push(winningDozen); // Add winner
                }
            }

            // --- CORNER PROGRESSION ("Two-Story") ---
            // If we are below High Water Mark, we increment pressure
            state.cornerLossCount++;

            // Logic: Stay on Tier 1 for first 3 losses in a sequence, then move to Tier 2.
            // If Tier 2 runs for 5 spins without recovering, RECYCLE (drop to Tier 1).
            if (state.cornerLossCount > 8) {
                // Recycle Phase (Safety Valve)
                state.cornerTier = 1;
                // Optional: Reset loss count partially to prevent immediate jump back
                state.cornerLossCount = 0; 
            } else if (state.cornerLossCount > 3) {
                // Second Story (Tier 2)
                state.cornerTier = 2;
            } else {
                // First Story (Tier 1)
                state.cornerTier = 1;
            }
        }
    }

    // --- 4. CALCULATE BET AMOUNTS ---
    // Calculate values respecting limits
    
    // Dozen Amount
    let rawDozenAmount = MIN_OUTSIDE * state.dozenUnit;
    let dozenAmount = Math.max(MIN_OUTSIDE, Math.min(rawDozenAmount, MAX_BET));

    // Corner Amount
    // Tier 1 = Min Inside
    // Tier 2 = Min Inside * 2
    let rawCornerAmount = MIN_INSIDE * state.cornerTier;
    let cornerAmount = Math.max(MIN_INSIDE, Math.min(rawCornerAmount, MAX_BET));

    // --- 5. LOGGING (Periodic) ---
    state.logs.push(`Bankroll: ${bankroll} | High: ${state.highWaterMark} | DozenUnit: ${state.dozenUnit} | CornerTier: ${state.cornerTier}`);
    
    if (spinHistory.length % 50 === 0 && spinHistory.length > 0) {
        utils.saveFile(`sliding-dozens-log-${spinHistory.length}.txt`, state.logs.join('\n'));
        state.logs = []; // Clear buffer
    }

    // --- 6. CONSTRUCT BETS ---
    const bets = [];

    // Add Dozen Bets
    state.activeDozens.forEach(d => {
        bets.push({
            type: 'dozen',
            value: d,
            amount: dozenAmount
        });
    });

    // Add Corner Bets
    CORNER_SET.forEach(c => {
        bets.push({
            type: 'corner',
            value: c,
            amount: cornerAmount
        });
    });

    return bets;
=======
/**
 * STRATEGY: Sliding Dozens Stacked with Two-Story Corners
 * * SOURCE: 
 * URL: https://www.youtube.com/watch?v=73rpxyAnxPA
 * Channel: CEG Dealer School
 * * LOGIC:
 * This strategy combines two systems to balance volatility and recovery:
 * 1. Sliding Dozens (The "Float"):
 * - Always bet on 2 of the 3 Dozens.
 * - "Slide" Rule: If the ball lands in the dozen you did NOT bet on, you must move 
 * one of your bets to cover that dozen in the next spin.
 * 2. Two-Story Corners (The "Punch"):
 * - Bets on a set of 4-6 Corners to cover the board inside.
 * - These provide higher payouts to help recover the bankroll faster than dozens alone.
 * * PROGRESSION:
 * 1. Session Target:
 * - The strategy tracks a "High Water Mark" (highest bankroll achieved).
 * - If Current Bankroll >= High Water Mark, EVERYTHING resets to base units.
 * * 2. Dozen Progression:
 * - Win: Decrease bet by 1 unit (clamped to minimum).
 * - Loss (Zero or Uncovered Dozen): Increase bet by 1 unit.
 * * 3. Corner Progression (Two-Story):
 * - Tier 1: Base unit bets.
 * - Tier 2: If session is negative, double the corner units.
 * - Recycle: If Tier 2 loses for too long (defined here as 5 spins deep), 
 * "Recycle" back to Tier 1 to protect the bankroll from blowout.
 * * GOAL:
 * - Achieve a new session high (profit).
 * - Suggested stop-loss is flexible, but the "Recycle" mechanic is the built-in safety.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_OUTSIDE = config.betLimits.minOutside;
    const MIN_INSIDE = config.betLimits.min;
    const MAX_BET = config.betLimits.max;
    
    // We select 5 strategic corners to provide broad coverage
    // These cover: 1-5, 8-12, 14-18, 23-27, 29-33
    const CORNER_SET = [1, 8, 14, 23, 29]; 

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.initialized = true;
        state.highWaterMark = bankroll; // Track highest bankroll for reset
        
        // Dozen State
        state.activeDozens = [1, 2]; // Start betting Dozen 1 & 2
        state.dozenUnit = 1;         // Multiplier for base bet
        
        // Corner State
        state.cornerTier = 1;        // 1 = Base, 2 = High
        state.cornerLossCount = 0;   // Track consecutive failure to profit
        
        // Logging
        state.logs = [];
    }

    // --- 3. ANALYZE PREVIOUS SPIN (Logic & Progression) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;
        
        // Determine which dozen hit (1, 2, 3, or 0 for none)
        let winningDozen = 0;
        if (winNum >= 1 && winNum <= 12) winningDozen = 1;
        else if (winNum >= 13 && winNum <= 24) winningDozen = 2;
        else if (winNum >= 25 && winNum <= 36) winningDozen = 3;

        // --- RESET CHECK ---
        // If we reached a new high, reset everything
        if (bankroll >= state.highWaterMark) {
            state.highWaterMark = bankroll;
            state.dozenUnit = 1;
            state.cornerTier = 1;
            state.cornerLossCount = 0;
            // Note: We don't reset activeDozens placement, just the money
        } else {
            // --- DOZEN PROGRESSION ---
            const coveredDozen = state.activeDozens.includes(winningDozen);
            
            if (coveredDozen) {
                // Win on Dozens: Reduce unit
                state.dozenUnit = Math.max(1, state.dozenUnit - 1);
            } else {
                // Loss on Dozens (Zero or Miss): Increase unit
                state.dozenUnit++;
                
                // SLIDING LOGIC:
                // If we missed because it hit the 3rd dozen, we must slide to cover it.
                // We remove the dozen that has been active longest (first in array) and push the new one.
                if (winningDozen !== 0) {
                    state.activeDozens.shift(); // Remove first
                    state.activeDozens.push(winningDozen); // Add winner
                }
            }

            // --- CORNER PROGRESSION ("Two-Story") ---
            // If we are below High Water Mark, we increment pressure
            state.cornerLossCount++;

            // Logic: Stay on Tier 1 for first 3 losses in a sequence, then move to Tier 2.
            // If Tier 2 runs for 5 spins without recovering, RECYCLE (drop to Tier 1).
            if (state.cornerLossCount > 8) {
                // Recycle Phase (Safety Valve)
                state.cornerTier = 1;
                // Optional: Reset loss count partially to prevent immediate jump back
                state.cornerLossCount = 0; 
            } else if (state.cornerLossCount > 3) {
                // Second Story (Tier 2)
                state.cornerTier = 2;
            } else {
                // First Story (Tier 1)
                state.cornerTier = 1;
            }
        }
    }

    // --- 4. CALCULATE BET AMOUNTS ---
    // Calculate values respecting limits
    
    // Dozen Amount
    let rawDozenAmount = MIN_OUTSIDE * state.dozenUnit;
    let dozenAmount = Math.max(MIN_OUTSIDE, Math.min(rawDozenAmount, MAX_BET));

    // Corner Amount
    // Tier 1 = Min Inside
    // Tier 2 = Min Inside * 2
    let rawCornerAmount = MIN_INSIDE * state.cornerTier;
    let cornerAmount = Math.max(MIN_INSIDE, Math.min(rawCornerAmount, MAX_BET));

    // --- 5. LOGGING (Periodic) ---
    state.logs.push(`Bankroll: ${bankroll} | High: ${state.highWaterMark} | DozenUnit: ${state.dozenUnit} | CornerTier: ${state.cornerTier}`);
    
    if (spinHistory.length % 50 === 0 && spinHistory.length > 0) {
        utils.saveFile(`sliding-dozens-log-${spinHistory.length}.txt`, state.logs.join('\n'));
        state.logs = []; // Clear buffer
    }

    // --- 6. CONSTRUCT BETS ---
    const bets = [];

    // Add Dozen Bets
    state.activeDozens.forEach(d => {
        bets.push({
            type: 'dozen',
            value: d,
            amount: dozenAmount
        });
    });

    // Add Corner Bets
    CORNER_SET.forEach(c => {
        bets.push({
            type: 'corner',
            value: c,
            amount: cornerAmount
        });
    });

    return bets;
>>>>>>> origin/main
}