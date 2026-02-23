/**
 * The Three Wise Kings Roulette Strategy (Corrected Placements)
 *
 * Source: The Roulette Master (http://www.youtube.com/watch?v=2VcFfQ_cPBk)
 *
 * The Logic:
 * - Begins with 6 targeted street bets (Level 1).
 * - Upon a loss, expands coverage dramatically by adding 9 double street (line) bets, 
 * overlapping with the original streets to maximize hit probability (Level 2).
 * - If deep drawdowns continue, a specific hedge on Zero is activated (Level 7).
 *
 * The Progression:
 * - Level 1: 1 unit on 6 specific streets.
 * - Level 2 (Loss 1): Add 1 unit on 9 specific double streets (total 15 bets, 1 unit each).
 * - Level 3 to 6: Add 1 unit to all 15 bets per loss (Multiplier scales with Level - 1).
 * - Level 7+: Add 1 unit to all 15 bets, PLUS place exactly 1 unit on Zero.
 * - On Win (Net Profit > 0 for spin): 
 * - If overall session is profitable or break-even, reset completely to Level 1.
 * - If overall session is still negative, retreat 1 Level (reduce unit multiplier or coverage).
 *
 * The Goal:
 * - Survive losing streaks by layering bets across the board, utilizing a slow climb 
 * in bet sizing, and dropping back immediately upon recovering session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.min;

    // 1. Initialize State Persistence
    if (state.sessionStartBankroll === undefined) {
        state.sessionStartBankroll = bankroll;
        state.level = 1;
        state.lastBankroll = bankroll;
    }

    const sessionProfit = bankroll - state.sessionStartBankroll;

    // 2. Evaluate Previous Spin to Determine Progression Level
    if (spinHistory.length > 0) {
        // A net positive return on the last spin constitutes a "win"
        const isWin = bankroll > state.lastBankroll;

        if (isWin) {
            if (sessionProfit >= 0) {
                // Recovered session profit: Reset
                state.level = 1;
            } else {
                // Still in drawdown: Retreat 1 level
                state.level = Math.max(1, state.level - 1);
            }
        } else {
            // Loss: Advance progression
            state.level++;
        }
    }

    // Update lastBankroll for the next spin's comparison
    state.lastBankroll = bankroll;

    // 3. Resolve Bet Configuration Based on Level
    let multiplier = 1;
    let useExpandedBets = false;
    let useZeroHedge = false;

    if (state.level === 1) {
        multiplier = 1;
        useExpandedBets = false;
    } else if (state.level === 2) {
        multiplier = 1;
        useExpandedBets = true;
    } else {
        // Level 3+
        multiplier = state.level - 1; 
        useExpandedBets = true;
        if (state.level >= 7) {
            useZeroHedge = true;
        }
    }

    // Calculate and Clamp the main unit amount
    let currentAmount = baseUnit * multiplier;
    currentAmount = Math.max(currentAmount, config.betLimits.min);
    currentAmount = Math.min(currentAmount, config.betLimits.max);

    const currentBets = [];

    // Base Level 1 Bets: Streets 4, 7, 16, 19, 28, 31
    const baseBets = [
        { type: 'street', value: 4 },
        { type: 'street', value: 7 },
        { type: 'street', value: 16 },
        { type: 'street', value: 19 },
        { type: 'street', value: 28 },
        { type: 'street', value: 31 }
    ];

    // Expanded Level 2+ Bets: Double Streets (Lines) 1/6, 4/9, 7/12, 13/18, 16/21, 19/24, 25/30, 28/33, 31/36
    const expandedBets = [
        { type: 'line', value: 1 },
        { type: 'line', value: 4 },
        { type: 'line', value: 7 },
        { type: 'line', value: 13 },
        { type: 'line', value: 16 },
        { type: 'line', value: 19 },
        { type: 'line', value: 25 },
        { type: 'line', value: 28 },
        { type: 'line', value: 31 }
    ];

    const selectedBets = useExpandedBets ? [...baseBets, ...expandedBets] : baseBets;

    // Map the selected layout to the final bet array
    for (const betDef of selectedBets) {
        currentBets.push({
            type: betDef.type,
            value: betDef.value,
            amount: currentAmount
        });
    }

    // 4. Level 7+ Zero Hedge
    if (useZeroHedge) {
        // Zero hedge is fixed at 1 base unit, clamped to limits
        let zeroAmount = baseUnit; 
        zeroAmount = Math.max(zeroAmount, config.betLimits.min);
        zeroAmount = Math.min(zeroAmount, config.betLimits.max);

        currentBets.push({
            type: 'number',
            value: 0,
            amount: zeroAmount
        });
    }

    return currentBets;
}