/**
 * Roulette Strategy: Tesla 3-6-9
 * 
 * Source:
 * - Video: https://www.youtube.com/watch?v=0_u6eX_yRts
 * - Channel: "The Lucky Felt"
 * 
 * Full Logic:
 * 1. This strategy is based on Nikola Tesla's obsession with the numbers 3, 6, and 9.
 * 2. It covers the 3rd Column (the "anchor") and specific numbers associated with 3, 6, and 9.
 * 3. The numbers targeted include:
 *    - The core digits: 3, 6, 9.
 *    - Numbers containing these digits: 13, 16, 19, 23, 26, 29.
 *    - (Note: Numbers whose digits sum to 3, 6, or 9 like 12, 15, 21 etc., are already covered by the 3rd Column anchor).
 * 4. The 3, 6, and 9 are treated as "Jackpot" numbers with significantly higher payouts.
 * 
 * Bet Progression:
 * 1. Initial State: Starting progression level is 1.
 * 2. Loss 1: Double the entire bet (Progression Level 2).
 * 3. Subsequent Losses: Increment each bet by its initial base unit (Progression Level 3, 4, 5...).
 * 4. Win: If the session is in total profit (bankroll > starting bankroll) or very close to it, 
 *    reset to Progression Level 1.
 * 
 * Goal:
 * - Target 20% profit of the starting bankroll (e.g., $200 profit on a $1000 bankroll).
 * - Aggressive coverage to "blanket the board" while fishing for the 3-6-9 Jackpots.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;

    // 1. Initialize Strategy State
    if (state.startingBankroll === undefined) {
        state.startingBankroll = bankroll;
        state.progression = 1;
        state.lastBankroll = bankroll;
    }

    // 2. Check Result and Update Progression
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        
        // Determine if we won by comparing current bankroll to the bankroll before the spin
        // (Calculated inside the previous call's logic)
        const won = bankroll > state.lastBankroll;

        if (won) {
            // Reset to base if we reached session profit target or are above starting bankroll
            if (bankroll >= state.startingBankroll) {
                state.progression = 1;
            }
        } else {
            // Progression Logic from video:
            // First loss: Double (2 units)
            // Subsequent losses: Add 1 unit each time
            if (state.progression === 1) {
                state.progression = 2;
            } else {
                state.progression += 1;
            }
        }
    }

    // Record bankroll for win detection in the next spin
    state.lastBankroll = bankroll;

    // 3. Define Base Bets (per the video's relative ratios)
    // Relative units: Column (12), Jackpots (12), Numbers (1)
    const baseUnit = minInside;
    
    const column3Amount = 12 * baseUnit * state.progression;
    const jackpotAmount = 1 * baseUnit * state.progression;
    const numberAmount = 1 * baseUnit * state.progression;

    const bets = [];

    // Anchor Bet: 3rd Column
    bets.push({
        type: 'column',
        value: 3,
        amount: Math.min(Math.max(column3Amount, minOutside), config.betLimits.max)
    });

    // Jackpot Numbers: 3, 6, 9
    const jackpots = [3, 6, 9];
    jackpots.forEach(num => {
        bets.push({
            type: 'number',
            value: num,
            amount: Math.min(Math.max(jackpotAmount, minInside), config.betLimits.max)
        });
    });

    // Secondary Numbers: 13, 16, 19, 23, 26, 29
    const secondaries = [13, 16, 19, 23, 26, 29];
    secondaries.forEach(num => {
        bets.push({
            type: 'number',
            value: num,
            amount: Math.min(Math.max(numberAmount, minInside), config.betLimits.max)
        });
    });

    // Stop Loss / Profit Goal check (Simulated for function logic)
    const totalProfit = bankroll - state.startingBankroll;
    const profitGoal = state.startingBankroll * 0.2; // 20% Goal

    if (totalProfit >= profitGoal) {
        // Goal reached: Strategy would typically stop here or reset.
        // We reset to level 1 and continue for the sake of the loop.
        state.progression = 1;
        state.startingBankroll = bankroll; // Reset reference for next goal
    }

    // Safety check: ensure we have enough bankroll for the full bet
    const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalWager > bankroll) {
        return null; // Stop if we go bust
    }

    return bets;
}