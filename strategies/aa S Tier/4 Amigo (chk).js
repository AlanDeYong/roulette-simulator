/**
 * 4 Amigo Roulette Strategy (Peak Profit Reset Variant)
 * 
 * Source:
 * - Channel: Casino Matchmaker
 * - URL: https://youtu.be/gtTvVs04eVA
 * - Creator: Ice00789
 * 
 * Strategy Logic:
 * - Covers 24 numbers (1-24) using 4 distinct bet positions ("The 4 Amigos"):
 *   1. Outside Bet: Low (1-18) -> 4 units
 *   2. Outside Bet: 1st Dozen (1-12) -> 4 units
 *   3. Outside Bet: 2nd Dozen (13-24) -> 4 units
 *   4. Inside Bet: Six-Line (19-24) -> 2 units
 * - Base Bet Ratio: 4 : 4 : 4 : 2 (Total = 14 units per level).
 * 
 * Target & Reset Conditions:
 * - Peak Profit Reset Rule: Do NOT reset progression levels until session's peak profit (peak bankroll) is reached/exceeded.
 * 
 * Bet Progression Rules:
 * - Level 1: Base bet ($14 total).
 * - First Loss: Increase level by +1 (goes to Level 2).
 * - Subsequent Losses: Increase level by +2 (Level 2 -> 4 -> 6 -> 8...).
 * - Jackpot Win (Numbers 19-24): Decrease progression by 1 level immediately unless session peak profit is reached (which triggers a full reset).
 * - Regular Win (Numbers 1-18): Requires 2 consecutive wins in a row to decrease progression by 1 level unless session peak profit is reached (which triggers a full reset).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize Strategy State & Track Peak Bankroll
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.peakBankroll = bankroll;
        state.targetBankroll = bankroll + 10000; // Default $100 profit target
        state.level = 1;
        state.consecutiveWins = 0;
    }

    // Target profit achieved check
    if (bankroll >= state.targetBankroll) {
        return [];
    }

    // 2. Process Past Spin History
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;

        // Winning condition check (1 to 24)
        const isWin = winNum >= 1 && winNum <= 24;
        const isJackpot = winNum >= 19 && winNum <= 24;

        if (isWin) {
            state.consecutiveWins = (state.consecutiveWins || 0) + 1;

            // Check if we hit or exceeded the session's peak bankroll
            if (bankroll >= state.peakBankroll) {
                state.peakBankroll = bankroll; // Update peak profit
                state.level = 1;               // Reset to base level
                state.consecutiveWins = 0;
            } 
            // Jackpot Win (19-24): Step down 1 level immediately
            else if (isJackpot) {
                state.level = Math.max(1, state.level - 1);
                state.consecutiveWins = 0;
            } 
            // Regular Win (1-18): Step down 1 level after 2 consecutive wins
            else if (state.consecutiveWins >= 2) {
                state.level = Math.max(1, state.level - 1);
                state.consecutiveWins = 0;
            }
        } else {
            // Loss Condition
            state.consecutiveWins = 0;
            if (state.level === 1) {
                state.level = 2; // First loss: +1 unit level
            } else {
                state.level += 2; // Subsequent losses: +2 unit levels
            }
        }
    }

    // Ensure peak bankroll tracks highest point reached
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 3. Calculate Bet Unit Amounts Respecting Bet Limits
    const minOutside = config.betLimits.minOutside || 5;
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;

    // Scale unit so min outside and inside bets satisfy table limits
    const unitScale = Math.max(
        minOutside / 4,
        minInside / 2,
        1
    );

    const currentLevel = state.level || 1;

    // Base amounts for each position at current level
    let lowAmount = Math.round(4 * unitScale * currentLevel);
    let dozen1Amount = Math.round(4 * unitScale * currentLevel);
    let dozen2Amount = Math.round(4 * unitScale * currentLevel);
    let lineAmount = Math.round(2 * unitScale * currentLevel);

    // Clamp each bet to table limits
    lowAmount = Math.min(Math.max(lowAmount, minOutside), maxBet);
    dozen1Amount = Math.min(Math.max(dozen1Amount, minOutside), maxBet);
    dozen2Amount = Math.min(Math.max(dozen2Amount, minOutside), maxBet);
    lineAmount = Math.min(Math.max(lineAmount, minInside), maxBet);

    // Total required for this spin
    const totalBet = lowAmount + dozen1Amount + dozen2Amount + lineAmount;

    // Stop placing bets if bankroll cannot cover the total required wager
    if (bankroll < totalBet) {
        return [];
    }

    // 4. Return The 4 Amigo Bets
    return [
        { type: 'low', amount: lowAmount },
        { type: 'dozen', value: 1, amount: dozen1Amount },
        { type: 'dozen', value: 2, amount: dozen2Amount },
        { type: 'line', value: 19, amount: lineAmount }
    ];
}