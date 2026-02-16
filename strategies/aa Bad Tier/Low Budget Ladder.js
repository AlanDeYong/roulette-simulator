/**
 * Strategy: Low Budget "Ladder" System (Dozen + Splits)
 * Source: ROULETTE JACKPOT - https://youtu.be/n7P-0UM0-q4
 * * Logic:
 * This strategy focuses on high board coverage using a specific ratio of bets:
 * 1. Main Bet: 4 Units on a chosen Dozen (pays 2:1).
 * 2. Hedge Bets: 4 Units total (1 Unit each) on 4 specific "Split" bets (pays 17:1) 
 * located in the OTHER two dozens.
 * * Total Coverage:
 * - 12 numbers from the Dozen.
 * - 8 numbers from the Splits (assuming no overlap).
 * - Total numbers covered: ~20/37.
 * * Progression (The "Ladder"):
 * - On Win: Reset to Level 1.
 * - On Loss: Increase Level by 1 (Add 1 base unit to splits, 4 base units to dozen).
 * - The video demonstrates "laddering" up to recover losses quickly.
 * * Recommended Configuration:
 * - Starting Bankroll: $200+
 * - Base Unit: $1 (Splits), $4 (Dozen)
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // Helper to get random integer between min and max (inclusive)
    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Helper to get valid splits excluding a specific dozen
    // This ensures we don't hedge on the winning dozen
    const getSplitsExcludingDozen = (excludedDozen) => {
        // A manual list of common vertical/horizontal splits for simplicity
        // mapped to their dozen location roughly.
        const allSplits = [
            // Dozen 1 area (1-12)
            { val: [1, 2], doz: 1 }, { val: [2, 3], doz: 1 }, { val: [4, 7], doz: 1 }, { val: [5, 6], doz: 1 }, { val: [8, 9], doz: 1 }, { val: [10, 11], doz: 1 },
            // Dozen 2 area (13-24)
            { val: [13, 14], doz: 2 }, { val: [14, 15], doz: 2 }, { val: [16, 19], doz: 2 }, { val: [17, 18], doz: 2 }, { val: [20, 21], doz: 2 }, { val: [22, 23], doz: 2 },
            // Dozen 3 area (25-36)
            { val: [25, 26], doz: 3 }, { val: [26, 27], doz: 3 }, { val: [28, 29], doz: 3 }, { val: [31, 32], doz: 3 }, { val: [32, 33], doz: 3 }, { val: [34, 35], doz: 3 }
        ];

        // Filter splits that are NOT in the excluded dozen
        const validSplits = allSplits.filter(s => s.doz !== excludedDozen);
        
        // Shuffle and pick 4
        for (let i = validSplits.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validSplits[i], validSplits[j]] = [validSplits[j], validSplits[i]];
        }
        return validSplits.slice(0, 4).map(s => s.val);
    };

    // --- 2. STATE INITIALIZATION ---
    if (state.level === undefined) state.level = 1;
    if (state.targetDozen === undefined) state.targetDozen = null; // 1, 2, or 3
    if (state.targetSplits === undefined) state.targetSplits = [];

    // --- 3. ANALYZE PREVIOUS SPIN ---
    // We need to determine if we won or lost the PREVIOUS bet to adjust the ladder
    if (spinHistory.length > 0 && state.targetDozen !== null) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let won = false;
        
        // Check Dozen Win
        if (state.targetDozen === 1 && lastNum >= 1 && lastNum <= 12) won = true;
        else if (state.targetDozen === 2 && lastNum >= 13 && lastNum <= 24) won = true;
        else if (state.targetDozen === 3 && lastNum >= 25 && lastNum <= 36) won = true;

        // Check Split Wins (if dozen didn't hit)
        if (!won) {
            for (let splitPair of state.targetSplits) {
                if (splitPair.includes(lastNum)) {
                    won = true;
                    break;
                }
            }
        }

        // Progression Logic
        if (won) {
            state.level = 1; // Reset on win
        } else {
            state.level += 1; // Ladder up on loss
        }
    }

    // --- 4. DETERMINE BET AMOUNTS ---
    // The strategy uses a 4:1 ratio. 
    // Split Bet = 1 unit * level
    // Dozen Bet = 4 units * level
    
    let baseUnit = minInside; // Usually $1 or $2
    
    let splitBetAmount = baseUnit * state.level;
    let dozenBetAmount = (baseUnit * 4) * state.level;

    // --- 5. CLAMP TO LIMITS ---
    // Ensure we don't go below minimums or above maximums
    // Note: Dozen bets are "Outside" bets, Splits are "Inside"
    
    // Check Max
    if (dozenBetAmount > maxBet) dozenBetAmount = maxBet;
    if (splitBetAmount > maxBet) splitBetAmount = maxBet;

    // Check Min (Dozen must usually be higher, typically 5 or 10)
    if (dozenBetAmount < minOutside) dozenBetAmount = minOutside;
    if (splitBetAmount < minInside) splitBetAmount = minInside;

    // Safety: If the progression gets ridiculous, cap the level to avoid draining bankroll instantly
    // (Optional logic, but good for simulators)
    const maxSafeBet = bankroll / 10; 
    if (dozenBetAmount > maxSafeBet) {
        // Soft reset if bet exceeds 10% of bankroll
        state.level = 1;
        splitBetAmount = baseUnit;
        dozenBetAmount = baseUnit * 4;
    }

    // --- 6. SELECT BETS ---
    // Pick a random dozen to attack (1, 2, or 3)
    const targetDozen = getRandomInt(1, 3);
    
    // Pick 4 random splits NOT in that dozen
    const targetSplits = getSplitsExcludingDozen(targetDozen);

    // Save to state for next spin verification
    state.targetDozen = targetDozen;
    state.targetSplits = targetSplits;

    // --- 7. CONSTRUCT BET ARRAY ---
    const bets = [];

    // Add Dozen Bet
    bets.push({
        type: 'dozen',
        value: targetDozen,
        amount: dozenBetAmount
    });

    // Add Split Bets
    targetSplits.forEach(splitPair => {
        bets.push({
            type: 'split',
            value: splitPair,
            amount: splitBetAmount
        });
    });

    return bets;
}