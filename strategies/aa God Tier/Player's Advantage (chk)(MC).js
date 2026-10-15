/**
 * Roulette Strategy: Player's Advantage (Corrected Layout Bets)
 * 
 * Source: 
 * - Video URL: https://youtu.be/bp6C9Zm0qrE
 * - Channel: Gamblers University
 * 
 * Full Logic Details:
 * - The strategy places inside bets across 1 to 3 dozens using valid adjacent split coverage:
 *   - 1st Dozen (Level 1+): Straight up on 1, 3, 8; Splits on [4, 5] and [5, 6] (5 bets total).
 *   - 2nd Dozen (Level 2+): Mirrors 1st dozen -> Straight up on 13, 15, 20; Splits on [16, 17] and [17, 18] (adds 5 bets, total 10).
 *   - 3rd Dozen (Level 3+): Mirrors 1st & 2nd dozen -> Straight up on 25, 27, 32; Splits on [28, 29] and [29, 30] (adds 5 bets, total 15).
 * 
 * Bet Progression Details:
 * - Level 1 ($5 base): 5 bets of 1 unit in 1st Dozen ($1 each).
 * - Level 2 ($10 base): 10 bets of 1 unit across 1st & 2nd Dozens ($1 each).
 * - Level 3 ($30 base): 15 bets of 2 units across all 3 Dozens ($2 each).
 * - Level 4+ ($15 * (Level - 1)): 15 bets across all 3 Dozens, unit size = (Level - 1).
 * 
 * Win / Loss Rules:
 * - On Loss: Advance to the next level (Level = Level + 1).
 * - On Win: 
 *   - If current bankroll reaches a new session high (or target profit), reset to Level 1.
 *   - If a major win occurs while recovering, drop down to Level 3 to reduce volatility.
 * 
 * Goal:
 * - Target profit of $100 or new session high.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit from config
    const minUnit = config.betLimits.min || 1;
    const maxLimit = config.betLimits.max || 500;
    const winGoal = 100000;

    // 2. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.startingBankroll = bankroll;
        state.maxBankroll = bankroll;
    }

    // 3. Update Bankroll High and evaluate last spin
    if (spinHistory && spinHistory.length > 0) {
        const currentProfit = bankroll - state.startingBankroll;

        if (currentProfit >= winGoal) {
            return []; // Target goal reached
        }

        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastBets = state.lastBetsPlaced || [];
        let totalWon = 0;
        let totalBetAmount = 0;

        for (const b of lastBets) {
            totalBetAmount += b.amount;
            if (b.type === 'number' && b.value === lastSpin.winningNumber) {
                totalWon += b.amount * 36;
            } else if (b.type === 'split') {
                const vals = Array.isArray(b.value) ? b.value : [b.value];
                if (vals.includes(lastSpin.winningNumber)) {
                    totalWon += b.amount * 18;
                }
            }
        }

        const netProfitLastSpin = totalWon - totalBetAmount;

        if (bankroll > state.maxBankroll) {
            state.maxBankroll = bankroll;
            state.level = 1;
        } else if (netProfitLastSpin > 0) {
            if (state.level > 3) {
                state.level = 3;
            }
        } else if (netProfitLastSpin < 0) {
            state.level += 1;
        }
    }

    // 4. Calculate Unit Size
    let unitMultiplier = 1;
    if (state.level === 1 || state.level === 2) {
        unitMultiplier = 1;
    } else {
        unitMultiplier = state.level - 1;
    }

    let unit = Math.min(Math.max(minUnit * unitMultiplier, minUnit), maxLimit);

    // 5. Construct Corrected Bets
    const bets = [];

    // Level 1: 1st Dozen (Valid layout splits 4/5 and 5/6)
    bets.push({ type: 'number', value: 1, amount: unit });
    bets.push({ type: 'number', value: 3, amount: unit });
    bets.push({ type: 'number', value: 8, amount: unit });
    bets.push({ type: 'split', value: [4, 5], amount: unit });
    bets.push({ type: 'split', value: [5, 6], amount: unit });

    // Level 2+: 2nd Dozen (Valid layout splits 16/17 and 17/18)
    if (state.level >= 2) {
        bets.push({ type: 'number', value: 13, amount: unit });
        bets.push({ type: 'number', value: 15, amount: unit });
        bets.push({ type: 'number', value: 20, amount: unit });
        bets.push({ type: 'split', value: [16, 17], amount: unit });
        bets.push({ type: 'split', value: [17, 18], amount: unit });
    }

    // Level 3+: 3rd Dozen (Valid layout splits 28/29 and 29/30)
    if (state.level >= 3) {
        bets.push({ type: 'number', value: 25, amount: unit });
        bets.push({ type: 'number', value: 27, amount: unit });
        bets.push({ type: 'number', value: 32, amount: unit });
        bets.push({ type: 'split', value: [28, 29], amount: unit });
        bets.push({ type: 'split', value: [29, 30], amount: unit });
    }

    // Clamp limits
    for (let b of bets) {
        b.amount = Math.min(Math.max(b.amount, minUnit), maxLimit);
    }

    state.lastBetsPlaced = bets;
    return bets;
}