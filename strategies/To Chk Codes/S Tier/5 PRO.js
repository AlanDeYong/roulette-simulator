<<<<<<< HEAD
/**
 * Strategy: "5 Pro" Roulette System
 * Source: Bet With Mo (YouTube) - https://www.youtube.com/watch?v=54Skimo6xW4
 * * THE LOGIC:
 * This strategy focuses on high coverage within the First Dozen (1-12) to secure frequent small wins, 
 * utilizing specific "Hedge" numbers to boost payout on hits.
 * * 1. The Setup:
 * - Main Bet: First Dozen (Numbers 1-12).
 * - Hedge Bets: Two specific Straight Up numbers within that dozen to amplify wins.
 * - Side A: Dozen 1 + Numbers 5 & 6.
 * - Side B: Dozen 1 + Numbers 11 & 12.
 * * 2. The Trigger & Flow:
 * - Start on Level 1, Side A.
 * - The player switches "Sides" (A <-> B) after every successful profit goal (or every win, 
 * simplified for this simulation to keep momentum).
 * - Switching sides keeps the Dozen bet the same but rotates the specific hedge numbers.
 * * 3. The Progression (Recovery):
 * - The strategy uses an 8-Level progression to recover losses.
 * - On Loss: Move up one Level (increasing bet sizes).
 * - On Win: Reset to Level 1 and Switch Sides.
 * - Deep Recovery (Level 6+): If the strategy goes deep into the progression, it requires 
 * two consecutive wins to reset (simulated here by a simple reset on win for stability, 
 * or abiding by the strict video logic if bankroll permits).
 * * 4. The Goal:
 * - Generate consistent profit with small unit sizes.
 * - Stop Loss: Managed by bankroll limits.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & LEVELS ---
    
    // Define the progression levels (Dozen Units, Spot Units)
    // Ratios derived from video: Level 1 (3:1:1), Level 4 (6:2:2)
    const levels = [
        { doz: 3, spot: 1 },  // Level 1: Total 5u
        { doz: 4, spot: 1 },  // Level 2: Total 6u
        { doz: 5, spot: 1 },  // Level 3: Total 7u
        { doz: 6, spot: 2 },  // Level 4: Total 10u
        { doz: 9, spot: 3 },  // Level 5: Total 15u
        { doz: 12, spot: 4 }, // Level 6: Total 20u
        { doz: 18, spot: 6 }, // Level 7: Total 30u
        { doz: 24, spot: 8 }  // Level 8: Total 40u
    ];

    // Determine Base Unit based on Table Limits
    // We use the minimum inside bet as the base unit (usually $1 or $2)
    const baseUnit = config.betLimits.min;

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 0;
    if (state.side === undefined) state.side = 'A'; // 'A' = 5/6, 'B' = 11/12
    if (state.currentBankroll === undefined) state.currentBankroll = bankroll;

    // --- 3. PROCESS LAST SPIN (If applicable) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Win Condition: Since we bet Dozen 1 AND numbers inside Dozen 1,
        // any number 1-12 is a win. 0 or 13-36 is a loss.
        const won = (lastNum >= 1 && lastNum <= 12);

        if (won) {
            // WIN LOGIC: Reset Level, Switch Side
            state.level = 0;
            state.side = (state.side === 'A') ? 'B' : 'A';
        } else {
            // LOSS LOGIC: Increase Level
            state.level++;
            // Cap at max level (loop back to max or stay at max?)
            // We will clamp to the highest defined level to prevent crash
            if (state.level >= levels.length) {
                state.level = levels.length - 1; 
            }
        }
    }

    // --- 4. CONSTRUCT BETS ---
    
    // Get current progression settings
    const currentProgression = levels[state.level];

    // Calculate Raw Amounts
    let dozenAmount = currentProgression.doz * baseUnit;
    let spotAmount = currentProgression.spot * baseUnit;

    // --- 5. CLAMP TO LIMITS (CRITICAL) ---
    // Ensure Dozen bet meets Outside Minimum
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    // Ensure Spot bet meets Inside Minimum
    spotAmount = Math.max(spotAmount, config.betLimits.min);
    
    // Ensure bets do not exceed Table Max
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);
    spotAmount = Math.min(spotAmount, config.betLimits.max);

    // Stop if bankroll is too low for the total bet
    const totalBet = dozenAmount + (spotAmount * 2);
    if (bankroll < totalBet) {
        // Not enough funds to complete the full strategy structure
        return null; 
    }

    // Define Numbers based on Side
    // Side A: 5 & 6
    // Side B: 11 & 12
    let spot1, spot2;
    if (state.side === 'A') {
        spot1 = 5;
        spot2 = 6;
    } else {
        spot1 = 11;
        spot2 = 12;
    }

    const bets = [
        // The Dozen Bet (Dozen 1 covers 1-12)
        { type: 'dozen', value: 1, amount: dozenAmount },
        
        // The Hedge Spots
        { type: 'number', value: spot1, amount: spotAmount },
        { type: 'number', value: spot2, amount: spotAmount }
    ];

    return bets;
=======
/**
 * Strategy: "5 Pro" Roulette System
 * Source: Bet With Mo (YouTube) - https://www.youtube.com/watch?v=54Skimo6xW4
 * * THE LOGIC:
 * This strategy focuses on high coverage within the First Dozen (1-12) to secure frequent small wins, 
 * utilizing specific "Hedge" numbers to boost payout on hits.
 * * 1. The Setup:
 * - Main Bet: First Dozen (Numbers 1-12).
 * - Hedge Bets: Two specific Straight Up numbers within that dozen to amplify wins.
 * - Side A: Dozen 1 + Numbers 5 & 6.
 * - Side B: Dozen 1 + Numbers 11 & 12.
 * * 2. The Trigger & Flow:
 * - Start on Level 1, Side A.
 * - The player switches "Sides" (A <-> B) after every successful profit goal (or every win, 
 * simplified for this simulation to keep momentum).
 * - Switching sides keeps the Dozen bet the same but rotates the specific hedge numbers.
 * * 3. The Progression (Recovery):
 * - The strategy uses an 8-Level progression to recover losses.
 * - On Loss: Move up one Level (increasing bet sizes).
 * - On Win: Reset to Level 1 and Switch Sides.
 * - Deep Recovery (Level 6+): If the strategy goes deep into the progression, it requires 
 * two consecutive wins to reset (simulated here by a simple reset on win for stability, 
 * or abiding by the strict video logic if bankroll permits).
 * * 4. The Goal:
 * - Generate consistent profit with small unit sizes.
 * - Stop Loss: Managed by bankroll limits.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & LEVELS ---
    
    // Define the progression levels (Dozen Units, Spot Units)
    // Ratios derived from video: Level 1 (3:1:1), Level 4 (6:2:2)
    const levels = [
        { doz: 3, spot: 1 },  // Level 1: Total 5u
        { doz: 4, spot: 1 },  // Level 2: Total 6u
        { doz: 5, spot: 1 },  // Level 3: Total 7u
        { doz: 6, spot: 2 },  // Level 4: Total 10u
        { doz: 9, spot: 3 },  // Level 5: Total 15u
        { doz: 12, spot: 4 }, // Level 6: Total 20u
        { doz: 18, spot: 6 }, // Level 7: Total 30u
        { doz: 24, spot: 8 }  // Level 8: Total 40u
    ];

    // Determine Base Unit based on Table Limits
    // We use the minimum inside bet as the base unit (usually $1 or $2)
    const baseUnit = config.betLimits.min;

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 0;
    if (state.side === undefined) state.side = 'A'; // 'A' = 5/6, 'B' = 11/12
    if (state.currentBankroll === undefined) state.currentBankroll = bankroll;

    // --- 3. PROCESS LAST SPIN (If applicable) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Win Condition: Since we bet Dozen 1 AND numbers inside Dozen 1,
        // any number 1-12 is a win. 0 or 13-36 is a loss.
        const won = (lastNum >= 1 && lastNum <= 12);

        if (won) {
            // WIN LOGIC: Reset Level, Switch Side
            state.level = 0;
            state.side = (state.side === 'A') ? 'B' : 'A';
        } else {
            // LOSS LOGIC: Increase Level
            state.level++;
            // Cap at max level (loop back to max or stay at max?)
            // We will clamp to the highest defined level to prevent crash
            if (state.level >= levels.length) {
                state.level = levels.length - 1; 
            }
        }
    }

    // --- 4. CONSTRUCT BETS ---
    
    // Get current progression settings
    const currentProgression = levels[state.level];

    // Calculate Raw Amounts
    let dozenAmount = currentProgression.doz * baseUnit;
    let spotAmount = currentProgression.spot * baseUnit;

    // --- 5. CLAMP TO LIMITS (CRITICAL) ---
    // Ensure Dozen bet meets Outside Minimum
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    // Ensure Spot bet meets Inside Minimum
    spotAmount = Math.max(spotAmount, config.betLimits.min);
    
    // Ensure bets do not exceed Table Max
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);
    spotAmount = Math.min(spotAmount, config.betLimits.max);

    // Stop if bankroll is too low for the total bet
    const totalBet = dozenAmount + (spotAmount * 2);
    if (bankroll < totalBet) {
        // Not enough funds to complete the full strategy structure
        return null; 
    }

    // Define Numbers based on Side
    // Side A: 5 & 6
    // Side B: 11 & 12
    let spot1, spot2;
    if (state.side === 'A') {
        spot1 = 5;
        spot2 = 6;
    } else {
        spot1 = 11;
        spot2 = 12;
    }

    const bets = [
        // The Dozen Bet (Dozen 1 covers 1-12)
        { type: 'dozen', value: 1, amount: dozenAmount },
        
        // The Hedge Spots
        { type: 'number', value: spot1, amount: spotAmount },
        { type: 'number', value: spot2, amount: spotAmount }
    ];

    return bets;
>>>>>>> origin/main
}