/**
 * "2+3" Roulette Strategy
 * * Source: https://youtu.be/NAu8_rlW530 (Channel: WillVegas)
 * * The Full Logic in details:
 * The strategy uses a combination of two double streets (lines) and three corners, covering a large portion of the board. 
 * The base bets are placed as follows:
 * - 1 unit on the 1-6 Line (Double Street)
 * - 1 unit on the 31-36 Line (Double Street)
 * - 1 unit on the 10, 11, 13, 14 Corner
 * - 1 unit on the 16, 17, 19, 20 Corner
 * - 1 unit on the 23, 24, 26, 27 Corner
 * Total base bet = 5 units.
 * * The Full Bet Progression in details:
 * The strategy uses a multi-level progression system triggered by losses.
 * - Level 1: Lines = 1 unit each, Corners = 1 unit each. Green = 0.
 * - On any losing spin, the level increases by 1.
 * - Progression Rule per Level (N):
 * - Line bets increase by +2 units per level (1, 3, 5, 7, ...).
 * - Corner bets increase by +1 unit per level (1, 2, 3, 4, ...).
 * - Green (0) is covered starting from Level 2, increasing by +1 unit per level (0, 1, 2, 3, ...).
 * - On a winning spin:
 * - If the win fully recovers the bankroll to the cycle's starting amount (or higher), the progression resets to Level 1.
 * - If the win is only a partial recovery (bankroll is still below the cycle's starting amount), the level STAYS THE SAME. 
 * You do not increment or reset until full recovery is achieved.
 * * The Goal:
 * Target profit is typically 30 to 50 units (set to 30 units for this implementation).
 * Stop-loss is set to a 500 unit drawdown to protect the bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.minIncrementalBet || config.betLimits.min;

    // 2. Initialize State
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.cycleStartBankroll = bankroll;
        state.level = 1;
        state.lastBankroll = bankroll;
    }

    // 3. Check session goals
    const currentSessionProfit = bankroll - state.initialBankroll;
    if (currentSessionProfit >= 30000 * unit) {
        return []; // Target profit reached
    }
    if (currentSessionProfit <= -500 * unit) {
        return []; // Stop loss reached
    }

    // 4. Update Level based on previous result
    if (bankroll < state.lastBankroll) {
        // We lost the last spin
        state.level++;
    } else if (bankroll > state.lastBankroll) {
        // We won the last spin
        if (bankroll >= state.cycleStartBankroll) {
            // Full recovery
            state.level = 1;
            state.cycleStartBankroll = bankroll;
        }
        // If partial recovery, state.level remains unchanged
    }
    
    // Update last bankroll for the next spin's comparison
    state.lastBankroll = bankroll;

    // 5. Calculate Multipliers based on current Level (N)
    const N = state.level;
    const lineMultiplier = 1 + (N - 1) * 2;
    const cornerMultiplier = 1 + (N - 1) * 1;
    const greenMultiplier = (N - 1) * 1;

    // 6. Calculate Bet Amounts
    const lineBet = unit * lineMultiplier;
    const cornerBet = unit * cornerMultiplier;
    const greenBet = unit * greenMultiplier;

    // 7. Helper to safely push clamped bets
    const bets = [];
    const pushBet = (type, value, amount) => {
        if (amount <= 0) return;
        
        let finalAmount = Math.max(amount, config.betLimits.min);
        finalAmount = Math.min(finalAmount, config.betLimits.max);
        
        bets.push({ type, value, amount: finalAmount });
    };

    // 8. Place Bets
    pushBet('line', 1, lineBet);      // Double street 1-6
    pushBet('line', 31, lineBet);     // Double street 31-36
    pushBet('corner', 10, cornerBet); // Corner 10, 11, 13, 14
    pushBet('corner', 16, cornerBet); // Corner 16, 17, 19, 20
    pushBet('corner', 23, cornerBet); // Corner 23, 24, 26, 27

    if (greenBet > 0) {
        pushBet('number', 0, greenBet); // Green coverage
    }

    return bets;
}