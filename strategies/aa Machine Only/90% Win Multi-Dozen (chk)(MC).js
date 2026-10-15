/**
 * 90% Win Multi-Dozen Roulette Strategy (Corrected Bets)
 * * Source:
 * - URL: https://youtu.be/M4YEeBwkn1k
 * - Channel: WillVegas
 * * Full Logic Details:
 * - This strategy dynamically covers 34 out of 38 numbers (or 34 out of 37 on single zero)
 * to ensure a high win rate of approximately 90% per spin.
 * - It places identical flat bets across the 1st Dozen and 2nd Dozen.
 * - It covers 10 individual straight-up numbers in the 3rd Dozen to generate massive payouts
 * when hit, while turning what would normally be "pushes" in the 1st and 2nd dozen into steady gains.
 * - Specific numbers covered in the 3rd Dozen are: 25, 26, 27, 28, 29, 30, 31, 32, 33, 35 (omitting 34 and 36).
 * - Trigger: Bets are placed automatically on every single spin.
 * * Full Bet Progression Details:
 * - Level 1 (Base Bet Setup):
 * - 1st Dozen: 50 units ($50 base when unit is $1)
 * - 2nd Dozen: 50 units ($50 base when unit is $1)
 * - 10 Inside Straight-Up Numbers: 5 units each ($5 each)
 * - Total Exposure per spin at Level 1: 150 units ($150 total base)
 * - Behavior on Win:
 * - If any number in the 1st or 2nd dozen hits, it wins 50 units (pays 2:1, returns 150, leaves $5 net profit) and stays at Level 1.
 * - If any covered number in the 3rd dozen hits, it wins 30 units (pays 35:1, returns 180, leaves $30 net profit) and stays at Level 1.
 * - Behavior on Loss:
 * - If a missing number hits (0, 00, 34, 36), the strategy enters a Martingale recovery level.
 * - Level 2 (Doubled Progression):
 * - 1st Dozen: 100 units ($100)
 * - 2nd Dozen: 100 units ($100)
 * - 10 Inside Numbers: 10 units each ($10 each)
 * - Total Exposure at Level 2: 300 units ($300 total)
 * - Upon any winning spin at Level 2, the progression resets completely back to Level 1.
 * * The Goal:
 * - Target Profit: Stop playing once bankroll increases by $50 to $100 from the session start.
 * - Stop Loss: Standard protective limits dictated by config.betLimits.max or when progression limits are met.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Setup Strategy Targets and Parameters using standard 1-unit baseline scaling
    const baseUnit = config.minIncrementalBet || 1; 
    const targetProfit = 10000; // Aim for upper target of $100 session profit
    
    // Initialize Session Persistence 
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
    }
    if (!state.progressionLevel) {
        state.progressionLevel = 1;
    }

    // Check if goal has already been successfully accomplished
    if (bankroll - state.initialBankroll >= targetProfit) {
        return []; // Target met, halt further betting
    }

    // 2. Track Wins and Losses to Advance/Reset Progression Level
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Define our exact covered targets in the 3rd Dozen
        const coveredThirdDozen = [25, 26, 27, 28, 29, 30, 31, 32, 33, 35];
        
        const hitFirstDozen = (lastNumber >= 1 && lastNumber <= 12);
        const hitSecondDozen = (lastNumber >= 13 && lastNumber <= 24);
        const hitCoveredThirdDozen = coveredThirdDozen.includes(lastNumber);
        
        if (hitFirstDozen || hitSecondDozen || hitCoveredThirdDozen) {
            // Success! Reset progression down to base level
            state.progressionLevel = 1;
        } else {
            // Loss occurred on uncovered pocket. Shift up to recovery level
            state.progressionLevel = 2;
        }
    }

    // 3. Compute Scaling Coefficient based on Progression Level
    // Level 1 uses base multiplier 1x. Level 2 doubles bets to recover losses.
    const multiplier = state.progressionLevel === 2 ? 2 : 1;
    
    // Scale bets based on exact video rules: 50 units on dozens, 5 units on straight numbers
    let dozenBetAmount = 50 * baseUnit * multiplier; 
    let insideBetAmount = 5 * baseUnit * multiplier;  

    // Verify all allocations fall precisely within required casino bounds
    dozenBetAmount = Math.max(dozenBetAmount, config.betLimits.minOutside);
    dozenBetAmount = Math.min(dozenBetAmount, config.betLimits.max);
    
    insideBetAmount = Math.max(insideBetAmount, config.betLimits.min);
    insideBetAmount = Math.min(insideBetAmount, config.betLimits.max);

    // 4. Construct the Final Output Array of Bets
    const betsCollection = [
        { type: 'dozen', value: 1, amount: dozenBetAmount },
        { type: 'dozen', value: 2, amount: dozenBetAmount },
        { type: 'number', value: 25, amount: insideBetAmount },
        { type: 'number', value: 26, amount: insideBetAmount },
        { type: 'number', value: 27, amount: insideBetAmount },
        { type: 'number', value: 28, amount: insideBetAmount },
        { type: 'number', value: 29, amount: insideBetAmount },
        { type: 'number', value: 30, amount: insideBetAmount },
        { type: 'number', value: 31, amount: insideBetAmount },
        { type: 'number', value: 32, amount: insideBetAmount },
        { type: 'number', value: 33, amount: insideBetAmount },
        { type: 'number', value: 35, amount: insideBetAmount }
    ];

    // Compute total commitment to verify bankroll sufficiency
    const totalWager = (dozenBetAmount * 2) + (insideBetAmount * 10);
    if (bankroll < totalWager) {
        return []; // Insufficient bankroll remaining to execute full strategy layer
    }

    return betsCollection;
}