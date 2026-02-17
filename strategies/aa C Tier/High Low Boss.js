<<<<<<< HEAD
/**
 * Strategy: High Low Boss Roulette System
 * Source: The Roulette Master TV (YouTube)
 * Video URL: https://www.youtube.com/watch?v=qLP-CnwMH18
 * * THE LOGIC:
 * This strategy operates on two distinct levels:
 * * 1. Level 1 (The Waiting Room): 
 * - The goal is to "tread water" with small bets while waiting for a specific pattern trigger.
 * - Bet: Two Dozens (covering ~66% of the board). Usually the two dozens that did NOT hit last.
 * - Progression: Aggressive recovery (Triple Martingale) to ensure small profits or break-even while waiting.
 * (e.g., 1 unit -> 3 units -> 9 units).
 * - Reset: If a win occurs in Level 1, reset to base bet.
 * * 2. The Trigger:
 * - Watch for ONE Dozen hitting 3 times in a row (e.g., Dozen 2, Dozen 2, Dozen 2).
 * - When this happens, immediately pause Level 1 and switch to Level 2.
 * * 3. Level 2 (The Attack):
 * - Bet: Heavy bets on the TWO Dozens that are NOT the streak dozen.
 * (e.g., if Dozen 2 hit 3x, Bet Heavy on Dozen 1 & 3).
 * - Bet Size: significantly higher than Level 1 (approx 20x base unit).
 * - Progression: 2-Step Martingale. (e.g., 100 -> 250). 
 * - Exit: 
 * - If Win: Return to Level 1. IMPORTANT: The strategy "remembers" where it was in the Level 1 progression
 * and continues from the next step to recover previous Level 1 losses.
 * - If Lose (both steps): Stop loss for the sequence, reset everything to base.
 * * BET LIMITS:
 * - Code automatically scales based on config.betLimits.minOutside.
 * - Multipliers used: 
 * - Level 1: [1, 3, 9, 27...]
 * - Level 2: [20, 50] (approximating the $5->$100 jump seen in video).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPERS ---
    
    // Define multipliers based on video ($5 base -> $15 -> $45 | Jump to $100 -> $250)
    const L1_MULTIPLIERS = [1, 3, 9, 27, 81]; 
    const L2_MULTIPLIERS = [20, 50]; 
    
    const MIN_BET = config.betLimits.minOutside;
    const MAX_BET = config.betLimits.max;

    // Helper to determine Dozen (1, 2, 3) or 0
    const getDozen = (num) => {
        if (num === 0 || num === '00') return 0;
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 1;                // Current Strategy Level (1 or 2)
        state.l1_step = 0;              // Progression step for Level 1
        state.l2_step = 0;              // Progression step for Level 2
        state.saved_l1_step = 0;        // To remember L1 status when jumping to L2
        state.streakDozen = null;       // Which dozen is currently streaking
        state.streakCount = 0;          // How long is the streak
        state.lastBetWasWin = false;
        state.initialized = true;
    }

    // --- 3. ANALYZE HISTORY & MANAGE STATE ---
    
    // If we have history, process the result of the LAST spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDozen = getDozen(lastNum);

        // Update Streak Logic
        if (lastDozen !== 0) {
            if (state.streakDozen === lastDozen) {
                state.streakCount++;
            } else {
                state.streakDozen = lastDozen;
                state.streakCount = 1;
            }
        } else {
            // Zero hits reset the streak logic usually, or maintain if ignoring 0. 
            // We reset for safety.
            state.streakCount = 0; 
            state.streakDozen = null;
        }

        // Determine if we won the previous bet
        // (We assume we bet on 2 dozens, so if the number is in one of them, we won)
        // However, exact win calculation depends on what we actually placed. 
        // Simple logic: Did the last progression step increase or reset?
        
        // We need to know what we bet on to know if we won. 
        // Instead of storing complex bet history, we infer logic:
        
        if (state.level === 2) {
            // Logic for Level 2 outcome
            // In L2, we bet AGAINST the streakDozen. 
            // So if lastDozen !== state.streakDozen (and not 0), we won.
            // Note: We check the streak BEFORE the last spin added to it. 
            // Actually, simplest is: If lastDozen is NOT the target of the attack, we lost.
            
            // Re-deriving the target of the PREVIOUS spin:
            // We were attacking `state.streakDozen` (which was >= 3). 
            // If `lastDozen` != `state.streakDozen` and `lastDozen` != 0, we won.
            
            // Wait, careful: If we just spun, streakCount updated. 
            // If we won, the streak is broken. 
            
            // Let's rely on standard progression logic:
            // If the streak BROKE (lastDozen != streakDozen), we won the L2 bet.
            const streakJustBroke = (lastDozen !== state.streakDozen && lastDozen !== 0); // 0 is loss
            
            if (streakJustBroke) {
                // WON LEVEL 2
                // Return to Level 1.
                // Video logic: "Remember where we were".
                // If we were at step 0, stay 0. If we were at step 1 ($15), go to step 2 ($45).
                // We assume the L2 win is a bonus, but we still need to clear the L1 loss 
                // that pushed us here if applicable.
                state.level = 1;
                state.l2_step = 0;
                
                // If we saved a loss step, we increment it to continue recovery
                // If saved step was 0, we stay 0.
                if (state.saved_l1_step > 0) {
                     state.l1_step = state.saved_l1_step + 1;
                } else {
                    state.l1_step = 0;
                }
                state.saved_l1_step = 0;
            } else {
                // LOST LEVEL 2 (Streak continued or Zero hit)
                state.l2_step++;
                
                // Check L2 Stop Loss
                if (state.l2_step >= L2_MULTIPLIERS.length) {
                    // We busted Level 2. Full Reset.
                    state.level = 1;
                    state.l2_step = 0;
                    state.l1_step = 0;
                    state.saved_l1_step = 0;
                }
            }
        } 
        else {
            // Logic for Level 1 outcome
            // We usually bet on the 2 dozens that didn't hit previously.
            // We can't easily know if we won without tracking exact bets, 
            // but we can check if the TRIGGER happened.
            
            // TRIGGER CHECK: Do we have 3 in a row?
            if (state.streakCount >= 3) {
                // SWITCH TO LEVEL 2
                state.level = 2;
                state.l2_step = 0;
                
                // Save current L1 state.
                // Note: The bet we JUST made likely lost (because the streak continued).
                // So we save the CURRENT step, which effectively "pauses" the loss.
                state.saved_l1_step = state.l1_step; 
                
                // We do not increment L1 step here, we pause it.
            } else {
                // NORMAL LEVEL 1 PROGRESSION
                // Did we win?
                // We bet on 2 dozens. 1/3 chance to lose.
                // If we just lost, we increment. If we won, reset.
                
                // Simplification: We bet on the 2 dozens that did NOT hit 2 spins ago.
                // If lastDozen is one of those, we won.
                // To avoid complexity, let's assume if we didn't trigger, we assume standard Martingale behavior.
                // We need to know if the last spin matched our bet.
                
                // Reconstruct previous bet target:
                // If history length >= 2, we bet against history[len-2].
                // If history length == 1, we bet arbitrary (say 1 & 2).
                
                let wonL1 = false;
                if (spinHistory.length < 2) {
                     // First spin, we usually bet Dozen 1 & 2. 
                     if (lastDozen === 1 || lastDozen === 2) wonL1 = true;
                } else {
                    const prevPrevDozen = getDozen(spinHistory[spinHistory.length - 2].winningNumber);
                    // We bet against prevPrevDozen.
                    // If prevPrev was 1, we bet 2 & 3. 
                    // If prevPrev was 0, we bet 1 & 2 (default).
                    
                    if (prevPrevDozen === 0) {
                        if (lastDozen === 1 || lastDozen === 2) wonL1 = true;
                    } else {
                        if (lastDozen !== prevPrevDozen && lastDozen !== 0) wonL1 = true;
                    }
                }

                if (wonL1) {
                    state.l1_step = 0;
                } else {
                    state.l1_step++;
                    // Safety Clamp for L1
                    if (state.l1_step >= L1_MULTIPLIERS.length) state.l1_step = 0; // Reset if L1 busts
                }
            }
        }
    }

    // --- 4. DETERMINE BETS ---

    let bets = [];
    let unitSize = 0;
    let targets = []; // Array of Dozen numbers (1, 2, 3)

    if (state.level === 2) {
        // --- LEVEL 2 STRATEGY ---
        // Bet against the streak.
        // If streak is Dozen 2, Bet Dozen 1 and 3.
        
        // Calculate amount
        let multiplier = L2_MULTIPLIERS[state.l2_step];
        unitSize = multiplier * MIN_BET;
        
        // Determine targets (Everything except streakDozen)
        if (state.streakDozen === 1) targets = [2, 3];
        else if (state.streakDozen === 2) targets = [1, 3];
        else if (state.streakDozen === 3) targets = [1, 2];
        else targets = [1, 2]; // Fallback if streak is somehow 0 (shouldn't happen in L2)

    } else {
        // --- LEVEL 1 STRATEGY ---
        // Bet against the last result (avoid repeating numbers), or default 1 & 2.
        
        // Calculate amount
        let multiplier = L1_MULTIPLIERS[state.l1_step];
        unitSize = multiplier * MIN_BET;

        let avoidDozen = 3; // Default avoid
        if (spinHistory.length > 0) {
            avoidDozen = getDozen(spinHistory[spinHistory.length - 1].winningNumber);
            if (avoidDozen === 0) avoidDozen = 3; // Default if 0 hits
        }

        if (avoidDozen === 1) targets = [2, 3];
        else if (avoidDozen === 2) targets = [1, 3];
        else targets = [1, 2];
    }

    // --- 5. CONSTRUCT & CLAMP BETS ---
    
    // Clamp checks
    unitSize = Math.max(unitSize, config.betLimits.minOutside);
    unitSize = Math.min(unitSize, config.betLimits.max);

    // Bankroll Check (Simple check to see if we can afford both bets)
    if (bankroll < unitSize * 2) {
        // Not enough funds, maybe place one or stop? 
        // For simulation stability, we stop betting if we can't place the full strategy.
        return []; 
    }

    // Push bets
    targets.forEach(dozenVal => {
        bets.push({
            type: 'dozen',
            value: dozenVal,
            amount: unitSize
        });
    });

    return bets;
=======
/**
 * Strategy: High Low Boss Roulette System
 * Source: The Roulette Master TV (YouTube)
 * Video URL: https://www.youtube.com/watch?v=qLP-CnwMH18
 * * THE LOGIC:
 * This strategy operates on two distinct levels:
 * * 1. Level 1 (The Waiting Room): 
 * - The goal is to "tread water" with small bets while waiting for a specific pattern trigger.
 * - Bet: Two Dozens (covering ~66% of the board). Usually the two dozens that did NOT hit last.
 * - Progression: Aggressive recovery (Triple Martingale) to ensure small profits or break-even while waiting.
 * (e.g., 1 unit -> 3 units -> 9 units).
 * - Reset: If a win occurs in Level 1, reset to base bet.
 * * 2. The Trigger:
 * - Watch for ONE Dozen hitting 3 times in a row (e.g., Dozen 2, Dozen 2, Dozen 2).
 * - When this happens, immediately pause Level 1 and switch to Level 2.
 * * 3. Level 2 (The Attack):
 * - Bet: Heavy bets on the TWO Dozens that are NOT the streak dozen.
 * (e.g., if Dozen 2 hit 3x, Bet Heavy on Dozen 1 & 3).
 * - Bet Size: significantly higher than Level 1 (approx 20x base unit).
 * - Progression: 2-Step Martingale. (e.g., 100 -> 250). 
 * - Exit: 
 * - If Win: Return to Level 1. IMPORTANT: The strategy "remembers" where it was in the Level 1 progression
 * and continues from the next step to recover previous Level 1 losses.
 * - If Lose (both steps): Stop loss for the sequence, reset everything to base.
 * * BET LIMITS:
 * - Code automatically scales based on config.betLimits.minOutside.
 * - Multipliers used: 
 * - Level 1: [1, 3, 9, 27...]
 * - Level 2: [20, 50] (approximating the $5->$100 jump seen in video).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPERS ---
    
    // Define multipliers based on video ($5 base -> $15 -> $45 | Jump to $100 -> $250)
    const L1_MULTIPLIERS = [1, 3, 9, 27, 81]; 
    const L2_MULTIPLIERS = [20, 50]; 
    
    const MIN_BET = config.betLimits.minOutside;
    const MAX_BET = config.betLimits.max;

    // Helper to determine Dozen (1, 2, 3) or 0
    const getDozen = (num) => {
        if (num === 0 || num === '00') return 0;
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0;
    };

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 1;                // Current Strategy Level (1 or 2)
        state.l1_step = 0;              // Progression step for Level 1
        state.l2_step = 0;              // Progression step for Level 2
        state.saved_l1_step = 0;        // To remember L1 status when jumping to L2
        state.streakDozen = null;       // Which dozen is currently streaking
        state.streakCount = 0;          // How long is the streak
        state.lastBetWasWin = false;
        state.initialized = true;
    }

    // --- 3. ANALYZE HISTORY & MANAGE STATE ---
    
    // If we have history, process the result of the LAST spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastDozen = getDozen(lastNum);

        // Update Streak Logic
        if (lastDozen !== 0) {
            if (state.streakDozen === lastDozen) {
                state.streakCount++;
            } else {
                state.streakDozen = lastDozen;
                state.streakCount = 1;
            }
        } else {
            // Zero hits reset the streak logic usually, or maintain if ignoring 0. 
            // We reset for safety.
            state.streakCount = 0; 
            state.streakDozen = null;
        }

        // Determine if we won the previous bet
        // (We assume we bet on 2 dozens, so if the number is in one of them, we won)
        // However, exact win calculation depends on what we actually placed. 
        // Simple logic: Did the last progression step increase or reset?
        
        // We need to know what we bet on to know if we won. 
        // Instead of storing complex bet history, we infer logic:
        
        if (state.level === 2) {
            // Logic for Level 2 outcome
            // In L2, we bet AGAINST the streakDozen. 
            // So if lastDozen !== state.streakDozen (and not 0), we won.
            // Note: We check the streak BEFORE the last spin added to it. 
            // Actually, simplest is: If lastDozen is NOT the target of the attack, we lost.
            
            // Re-deriving the target of the PREVIOUS spin:
            // We were attacking `state.streakDozen` (which was >= 3). 
            // If `lastDozen` != `state.streakDozen` and `lastDozen` != 0, we won.
            
            // Wait, careful: If we just spun, streakCount updated. 
            // If we won, the streak is broken. 
            
            // Let's rely on standard progression logic:
            // If the streak BROKE (lastDozen != streakDozen), we won the L2 bet.
            const streakJustBroke = (lastDozen !== state.streakDozen && lastDozen !== 0); // 0 is loss
            
            if (streakJustBroke) {
                // WON LEVEL 2
                // Return to Level 1.
                // Video logic: "Remember where we were".
                // If we were at step 0, stay 0. If we were at step 1 ($15), go to step 2 ($45).
                // We assume the L2 win is a bonus, but we still need to clear the L1 loss 
                // that pushed us here if applicable.
                state.level = 1;
                state.l2_step = 0;
                
                // If we saved a loss step, we increment it to continue recovery
                // If saved step was 0, we stay 0.
                if (state.saved_l1_step > 0) {
                     state.l1_step = state.saved_l1_step + 1;
                } else {
                    state.l1_step = 0;
                }
                state.saved_l1_step = 0;
            } else {
                // LOST LEVEL 2 (Streak continued or Zero hit)
                state.l2_step++;
                
                // Check L2 Stop Loss
                if (state.l2_step >= L2_MULTIPLIERS.length) {
                    // We busted Level 2. Full Reset.
                    state.level = 1;
                    state.l2_step = 0;
                    state.l1_step = 0;
                    state.saved_l1_step = 0;
                }
            }
        } 
        else {
            // Logic for Level 1 outcome
            // We usually bet on the 2 dozens that didn't hit previously.
            // We can't easily know if we won without tracking exact bets, 
            // but we can check if the TRIGGER happened.
            
            // TRIGGER CHECK: Do we have 3 in a row?
            if (state.streakCount >= 3) {
                // SWITCH TO LEVEL 2
                state.level = 2;
                state.l2_step = 0;
                
                // Save current L1 state.
                // Note: The bet we JUST made likely lost (because the streak continued).
                // So we save the CURRENT step, which effectively "pauses" the loss.
                state.saved_l1_step = state.l1_step; 
                
                // We do not increment L1 step here, we pause it.
            } else {
                // NORMAL LEVEL 1 PROGRESSION
                // Did we win?
                // We bet on 2 dozens. 1/3 chance to lose.
                // If we just lost, we increment. If we won, reset.
                
                // Simplification: We bet on the 2 dozens that did NOT hit 2 spins ago.
                // If lastDozen is one of those, we won.
                // To avoid complexity, let's assume if we didn't trigger, we assume standard Martingale behavior.
                // We need to know if the last spin matched our bet.
                
                // Reconstruct previous bet target:
                // If history length >= 2, we bet against history[len-2].
                // If history length == 1, we bet arbitrary (say 1 & 2).
                
                let wonL1 = false;
                if (spinHistory.length < 2) {
                     // First spin, we usually bet Dozen 1 & 2. 
                     if (lastDozen === 1 || lastDozen === 2) wonL1 = true;
                } else {
                    const prevPrevDozen = getDozen(spinHistory[spinHistory.length - 2].winningNumber);
                    // We bet against prevPrevDozen.
                    // If prevPrev was 1, we bet 2 & 3. 
                    // If prevPrev was 0, we bet 1 & 2 (default).
                    
                    if (prevPrevDozen === 0) {
                        if (lastDozen === 1 || lastDozen === 2) wonL1 = true;
                    } else {
                        if (lastDozen !== prevPrevDozen && lastDozen !== 0) wonL1 = true;
                    }
                }

                if (wonL1) {
                    state.l1_step = 0;
                } else {
                    state.l1_step++;
                    // Safety Clamp for L1
                    if (state.l1_step >= L1_MULTIPLIERS.length) state.l1_step = 0; // Reset if L1 busts
                }
            }
        }
    }

    // --- 4. DETERMINE BETS ---

    let bets = [];
    let unitSize = 0;
    let targets = []; // Array of Dozen numbers (1, 2, 3)

    if (state.level === 2) {
        // --- LEVEL 2 STRATEGY ---
        // Bet against the streak.
        // If streak is Dozen 2, Bet Dozen 1 and 3.
        
        // Calculate amount
        let multiplier = L2_MULTIPLIERS[state.l2_step];
        unitSize = multiplier * MIN_BET;
        
        // Determine targets (Everything except streakDozen)
        if (state.streakDozen === 1) targets = [2, 3];
        else if (state.streakDozen === 2) targets = [1, 3];
        else if (state.streakDozen === 3) targets = [1, 2];
        else targets = [1, 2]; // Fallback if streak is somehow 0 (shouldn't happen in L2)

    } else {
        // --- LEVEL 1 STRATEGY ---
        // Bet against the last result (avoid repeating numbers), or default 1 & 2.
        
        // Calculate amount
        let multiplier = L1_MULTIPLIERS[state.l1_step];
        unitSize = multiplier * MIN_BET;

        let avoidDozen = 3; // Default avoid
        if (spinHistory.length > 0) {
            avoidDozen = getDozen(spinHistory[spinHistory.length - 1].winningNumber);
            if (avoidDozen === 0) avoidDozen = 3; // Default if 0 hits
        }

        if (avoidDozen === 1) targets = [2, 3];
        else if (avoidDozen === 2) targets = [1, 3];
        else targets = [1, 2];
    }

    // --- 5. CONSTRUCT & CLAMP BETS ---
    
    // Clamp checks
    unitSize = Math.max(unitSize, config.betLimits.minOutside);
    unitSize = Math.min(unitSize, config.betLimits.max);

    // Bankroll Check (Simple check to see if we can afford both bets)
    if (bankroll < unitSize * 2) {
        // Not enough funds, maybe place one or stop? 
        // For simulation stability, we stop betting if we can't place the full strategy.
        return []; 
    }

    // Push bets
    targets.forEach(dozenVal => {
        bets.push({
            type: 'dozen',
            value: dozenVal,
            amount: unitSize
        });
    });

    return bets;
>>>>>>> origin/main
}