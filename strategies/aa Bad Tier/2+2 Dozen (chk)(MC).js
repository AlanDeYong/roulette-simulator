/**
 * @file roulette_2_plus_2_dozen_v3.js
 * ============================================================================
 * ROULETTE STRATEGY DOCUMENTATION
 * ============================================================================
 * Source: WillVegas (Modified)
 * * * Full Logic Details:
 * - This strategy places simultaneous bets on two separate roulette dozens.
 * - Dozen 2 is the 'Constant Dozen' and stays put on every single spin.
 * - The 'Alternating Dozen' follows the winner. It shifts to match whichever 
 * dozen won on the previous spin (unless Dozen 2 won, in which case it stays put).
 * * * Full Bet Progression Details:
 * - Base Level: Starts at a multiplier of 1 (1x the table minimum).
 * - After a LOSS: The bet level increases by 2 (+2 levels) on BOTH dozens.
 * - After a WIN: 
 * - If the bankroll has reached a NEW peak, the bet resets completely to Level 1.
 * - If the bankroll is still below its peak (drawdown), the bet only decreases 
 * by 1 level (-1 level) to continue recovering.
 * * * The Goal:
 * - Target Profit: Target is set to $50 profit above the starting bankroll. 
 * - Stop Condition: The script stops returning bets if the profit goal is reached 
 * or if the bankroll lacks the funds to cover the next escalated bet.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State & Track Peak Bankroll
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.peakBankroll = bankroll;
        
        state.constantDozen = 2;     // Set Dozen 2 as the fixed bet
        state.alternatingDozen = 1;  // Start the dynamic bet on Dozen 1
        state.multiplierLevel = 1;   // Start at level 1
    }

    // Always update the high watermark if the bankroll reaches a new peak
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Check Session Profit Targets
    const targetProfit = 5000;
    if (bankroll - state.initialBankroll >= targetProfit) {
        return []; 
    }

    // 3. Process Previous Spin Outcome & Adjust Progression
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Force integer parsing for safety
        let lastNumber = 0;
        if (lastSpin.winningNumber !== '00' && lastSpin.winningNumber !== '0') {
            lastNumber = parseInt(lastSpin.winningNumber, 10);
        }
        
        // Determine which dozen hit
        let lastDozen = 0;
        if (lastNumber >= 1 && lastNumber <= 12) lastDozen = 1;
        else if (lastNumber >= 13 && lastNumber <= 24) lastDozen = 2;
        else if (lastNumber >= 25 && lastNumber <= 36) lastDozen = 3;

        const isWin = (lastDozen === state.constantDozen || lastDozen === state.alternatingDozen);

        if (isWin) {
            // New Rule: Step down 1 level if not at peak, else fully reset
            if (bankroll < state.peakBankroll) {
                state.multiplierLevel = Math.max(1, state.multiplierLevel - 1);
            } else {
                state.multiplierLevel = 1;
            }
        } else {
            // Add 2 levels on a loss
            state.multiplierLevel += 2; 
        }

        // Move the dynamic dozen to follow the winner
        if (lastDozen >= 1 && lastDozen <= 3) {
            if (lastDozen !== state.constantDozen) {
                state.alternatingDozen = lastDozen;
            }
            // If lastDozen is the constant dozen (2), the alternating dozen stays exactly where it was
        }
    }

    // 4. Calculate Final Wagers
    // Determine unit size based on table configuration
    let unitSize = config.betLimits.minOutside;
    if (config.incrementMode === 'fixed' && config.minIncrementalBet) {
        // If your simulator uses a specific fixed increment, scale the base appropriately
        // Defaulting to standard multiplier logic
    }
    
    let finalAmount = unitSize * state.multiplierLevel;
    finalAmount = Math.max(finalAmount, config.betLimits.minOutside);
    finalAmount = Math.min(finalAmount, config.betLimits.max);

    // Stop execution if bankroll cannot sustain the two bets
    if (bankroll < (finalAmount * 2)) {
        return [];
    }

    // 5. Place Bets
    return [
        { type: 'dozen', value: state.constantDozen, amount: finalAmount },
        { type: 'dozen', value: state.alternatingDozen, amount: finalAmount }
    ];
}