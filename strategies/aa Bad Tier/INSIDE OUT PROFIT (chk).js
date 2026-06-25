/**
 * Inside Out Profit - Roulette Strategy
 * Source: https://youtu.be/pGcu1-j11xo (Bet With Mo)
 * * Logic:
 * The strategy covers specific streets on the roulette layout. It begins by covering 2 streets 
 * ("inside") and progressively adds more streets ("outwards") upon each loss. Once 10 streets 
 * are covered, it shifts to increasing the bet size on all 10 streets to recover losses.
 * * Bet Placements & Progression:
 * - Level 1: Place 3 units each on streets 10, 25 (Total: 6 units)
 * - Level 2 (Loss 1): Add 3 units each on streets 13, 22 (Total: 12 units)
 * - Level 3 (Loss 2): Add 3 units each on streets 7, 28 (Total: 18 units)
 * - Level 4 (Loss 3): Add 3 units each on streets 16, 19 (Total: 24 units)
 * - Level 5 (Loss 4): Add 3 units each on streets 4, 31 (Total: 30 units)
 * - Level 6 (Loss 5): Increase all bets by 5 units -> 8 units each on 10 streets (Total: 80 units)
 * - Level 7 (Loss 6): Increase all bets by 10 units -> 18 units each on 10 streets (Total: 180 units)
 * - Level 8 (Loss 7): Double up all bets -> 36 units each on 10 streets (Total: 360 units)
 * *Note: If a loss occurs on Level 8, the progression will reset to Level 1.
 * * Goal / Conditions:
 * - On Win: If the current bankroll is NOT at the session's peak profit, rebet (stay at the current level).
 * - On Win: If the current bankroll IS at or exceeds the session's peak profit, reset to Level 1.
 * - On Loss: Advance to the next progression level.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.progressionLevel === undefined) {
        state.progressionLevel = 1;
        state.initialBankroll = bankroll;
        state.sessionPeakProfit = 0;
        state.lastBankroll = bankroll;
    }

    // 2. Track Session Peak Profit
    let currentProfit = bankroll - state.initialBankroll;
    let hitNewPeak = false;

    if (currentProfit > state.sessionPeakProfit) {
        state.sessionPeakProfit = currentProfit;
        hitNewPeak = true;
    }

    // 3. Determine Win/Loss for Progression
    if (spinHistory.length > 0) {
        // Evaluate win/loss based on bankroll changes from the previous round
        if (bankroll > state.lastBankroll) {
            // Win condition
            if (hitNewPeak || currentProfit >= state.sessionPeakProfit) {
                state.progressionLevel = 1; // Reset if we reached/exceeded peak profit
            } else {
                // Rebet (progressionLevel remains the same)
            }
        } else {
            // Loss condition
            state.progressionLevel++;
            if (state.progressionLevel > 8) {
                state.progressionLevel = 1; // Reset to level 1 after failing the final level
            }
        }
    }

    // Record the bankroll prior to placing the new bets
    state.lastBankroll = bankroll;

    // 4. Define the Progression Data
    const progressionData = [
        { streets: [10, 25], amount: 3 },                                      // Level 1
        { streets: [10, 25, 13, 22], amount: 3 },                              // Level 2
        { streets: [10, 25, 13, 22, 7, 28], amount: 3 },                       // Level 3
        { streets: [10, 25, 13, 22, 7, 28, 16, 19], amount: 3 },               // Level 4
        { streets: [10, 25, 13, 22, 7, 28, 16, 19, 4, 31], amount: 3 },        // Level 5
        { streets: [10, 25, 13, 22, 7, 28, 16, 19, 4, 31], amount: 8 },        // Level 6
        { streets: [10, 25, 13, 22, 7, 28, 16, 19, 4, 31], amount: 18 },       // Level 7
        { streets: [10, 25, 13, 22, 7, 28, 16, 19, 4, 31], amount: 36 }        // Level 8
    ];

    // 5. Calculate Bet Amounts
    const currentLevelData = progressionData[state.progressionLevel - 1];
    let betAmount = currentLevelData.amount;

    // Respect Bet Limits (Ensure we meet table minimums without exceeding max)
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 6. Construct Bets
    let bets = [];
    for (let streetValue of currentLevelData.streets) {
        bets.push({ type: 'street', value: streetValue, amount: betAmount });
    }

    return bets;
}