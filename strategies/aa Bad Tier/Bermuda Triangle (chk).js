/**
 * Strategy: The Bermuda Triangle
 * Source: https://youtu.be/qoEF2CmDuSc
 * YouTube Channel: The Roulette Master
 *
 * --- The Full Logic in Details ---
 * The "Bermuda Triangle" strategy covers 30 numbers on an American wheel (29 on European)
 * with a fixed 10 : 5 : 1 bet sizing ratio:
 * 1. Outside Dozen Bet (10 base units): Placed on the 3rd Dozen (or 1st Dozen).
 * 2. Outside Column Bets (5 base units each): Placed on Column 1 and Column 3.
 * 3. Inside Straight-Up Bets (1 base unit each): Placed on numbers 14, 17, 20, 23, 0 (and 00 if American).
 * Total Base Wager = 26 units (American) / 25 units (European).
 *
 * --- The Full Bet Progression in Details ---
 * - Base Bet Multiplier starts at 1.
 * - On Partial Loss (payout > 0, but payout < total wager):
 *   Increase multiplier by +1 (+1x initial base bet amount across all positions).
 * - On Total Loss (payout = 0):
 *   Double the current multiplier (multiplier * 2).
 * - On Win (net profit > 0):
 *   Reset multiplier back to 1.
 *
 * --- The Goal ---
 * - Bankroll Target: +250 units session profit target.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.multiplier = 1;
        state.initialBankroll = bankroll;
        state.highestBankroll = bankroll;
        state.targetProfit = 250;
        state.activeDozen = 3; // 3rd dozen by default
        state.lastBets = null;
        state.lastTotalWager = 0;
    }

    if (bankroll > state.highestBankroll) {
        state.highestBankroll = bankroll;
    }

    // 2. Evaluate Last Spin Results & Adjust Progression
    if (spinHistory && spinHistory.length > 0 && state.lastBets && state.lastTotalWager > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        let lastPayout = 0;
        for (const b of state.lastBets) {
            if (b.type === 'dozen') {
                const inDozen = (b.value === 1 && winningNum >= 1 && winningNum <= 12) ||
                                (b.value === 2 && winningNum >= 13 && winningNum <= 24) ||
                                (b.value === 3 && winningNum >= 25 && winningNum <= 36);
                if (inDozen) lastPayout += b.amount * 3;
            } else if (b.type === 'column') {
                if (winningNum > 0) {
                    const col = ((winningNum - 1) % 3) + 1;
                    if (col === b.value) lastPayout += b.amount * 3;
                }
            } else if (b.type === 'number') {
                if (b.value === winningNum || String(b.value) === String(winningNum)) {
                    lastPayout += b.amount * 36;
                }
            }
        }

        const netLastWin = lastPayout - state.lastTotalWager;

        if (netLastWin > 0) {
            // Full win: reset progression
            state.multiplier = 1;
        } else if (lastPayout === 0) {
            // Total loss: double progression
            state.multiplier *= 2;
        } else {
            // Partial loss: increase by +1 base unit level
            state.multiplier += 1;
        }
    }

    // Reset when session target profit is reached
    if (bankroll - state.initialBankroll >= state.targetProfit) {
        state.multiplier = 1;
    }

    // 3. Determine Base Unit (ensuring table limits are satisfied)
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const unit = Math.max(minInside, Math.ceil(minOutside / 5));

    const dozenBase = 10 * unit;
    const columnBase = 5 * unit;
    const numberBase = 1 * unit;

    const mult = state.multiplier;

    // 4. Scale and Clamp to Table Limits
    const clamp = (amt, isInside) => {
        const minLimit = isInside ? config.betLimits.min : config.betLimits.minOutside;
        const maxLimit = config.betLimits.max;
        return Math.min(Math.max(amt, minLimit), maxLimit);
    };

    const dozenAmount = clamp(dozenBase * mult, false);
    const col1Amount = clamp(columnBase * mult, false);
    const col3Amount = clamp(columnBase * mult, false);
    const numberAmount = clamp(numberBase * mult, true);

    // 5. Build Bets Array
    const bets = [
        { type: 'dozen', value: state.activeDozen, amount: dozenAmount },
        { type: 'column', value: 1, amount: col1Amount },
        { type: 'column', value: 3, amount: col3Amount },
        { type: 'number', value: 14, amount: numberAmount },
        { type: 'number', value: 17, amount: numberAmount },
        { type: 'number', value: 20, amount: numberAmount },
        { type: 'number', value: 23, amount: numberAmount },
        { type: 'number', value: 0, amount: numberAmount }
    ];

    if (config.tableType === 'american') {
        bets.push({ type: 'number', value: '00', amount: numberAmount });
    }

    // 6. Save State for Next Spin
    state.lastBets = bets;
    state.lastTotalWager = bets.reduce((sum, b) => sum + b.amount, 0);

    return bets;
}