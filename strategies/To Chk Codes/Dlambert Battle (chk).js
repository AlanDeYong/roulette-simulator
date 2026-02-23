/**
 * STRATEGY: D'alembert Battle (Modified Negative Progression)
 * * Source: CEG Dealer School (YouTube) - https://www.youtube.com/watch?v=BX5senepWs0
 * * Logic:
 * This strategy is a "Negative Aggression" system that covers a specific section of the wheel.
 * It primarily bets on the 1st Dozen (1-12) while hedging with "The Basket" (0, 00, 1, 2, 3) 
 * and a Top Line/Double Street (1-6). 
 * * Progression:
 * - This uses a D'alembert variation: Increase the bet size by 1 unit after TWO consecutive losses.
 * - Decrease the bet size by 1 unit after a "Partial Win" (e.g., hitting the dozen or double street).
 * - Full Reset: Reset to base units if the "Jackpot/G-Spot" is hit (The Basket/Number 2).
 * * The Goal:
 * - Target Profit: $500 (based on a $2,000 bankroll).
 * - Stop Loss: Total depletion of the $2,000 buy-in.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.unitLevel === undefined) {
        state.unitLevel = 1;
        state.consecutiveLosses = 0;
        state.targetProfit = 50000;
        state.initialBankroll = bankroll;
    }

    // 2. Check for Stop Conditions
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= state.targetProfit) {
        return null; // Target reached
    }

    // 3. Analyze Previous Result to Adjust Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Define Win Zones
        const isDozen1 = lastNum >= 1 && lastNum <= 12;
        const isLine1to6 = lastNum >= 1 && lastNum <= 6;
        const isBasket = [0, 37, 1, 2, 3].includes(lastNum); // 37 represents 00 for simulator logic

        // Logic for Progression Adjustment
        if (lastNum === 2 || isBasket) {
            // JACKPOT: Full Reset
            state.unitLevel = 1;
            state.consecutiveLosses = 0;
        } else if (isDozen1 || isLine1to6) {
            // PARTIAL WIN: Drop 1 Level (clamped at 1)
            state.unitLevel = Math.max(1, state.unitLevel - 1);
            state.consecutiveLosses = 0;
        } else {
            // LOSS
            state.consecutiveLosses++;
            // D'alembert Battle Rule: Increase 1 unit after every 2 losses
            if (state.consecutiveLosses >= 2) {
                state.unitLevel++;
                state.consecutiveLosses = 0;
            }
        }
    }

    // 4. Calculate Bet Amounts (Scaled by Unit Level)
    // Base setup: $15 on Dozen, $5 on Double Street, $10 on Basket (Total $30 base)
    // We scale these ratios based on the config.betLimits.min
    const baseUnit = config.betLimits.min; 
    
    // Proportional amounts from video (scaled to unit level)
    let dozenAmt = (baseUnit * 7.5) * state.unitLevel; // $15 base
    let lineAmt = (baseUnit * 2.5) * state.unitLevel;  // $5 base
    let basketAmt = (baseUnit * 5) * state.unitLevel; // $10 base (The Basket)

    // 5. Clamp to Table Limits
    const clamp = (amt, isOutside) => {
        const min = isOutside ? config.betLimits.minOutside : config.betLimits.min;
        return Math.min(Math.max(amt, min), config.betLimits.max);
    };

    const bets = [
        {
            type: 'dozen',
            value: 1,
            amount: clamp(dozenAmt, true)
        },
        {
            type: 'line',
            value: 1, // Covers 1-6
            amount: clamp(lineAmt, false)
        },
        {
            type: 'basket',
            value: 0, // Covers 0, 00, 1, 2, 3
            amount: clamp(basketAmt, false)
        }
    ];

    // Ensure we don't bet more than remaining bankroll
    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBet > bankroll) return null;

    return bets;
}