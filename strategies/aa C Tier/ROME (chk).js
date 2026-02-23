/**
 * STRATEGY: Rome Roulette Strategy
 * Source: https://www.youtube.com/watch?v=eL9VaZHhBkc (Channel: Unknown/Referenced via User)
 * * LOGIC:
 * The strategy divides the board into "Left," "Right," and "Middle" sectors using a mix of 
 * Straight Up, Splits, and Double Streets (Lines). It starts with the outer wings (Level 1)
 * and expands inward (Levels 2-4) or doubles down (Levels 5-6) based on losses.
 * * PROGRESSION:
 * 1. Level 1: Initial bets on Left and Right wings.
 * 2. Level 2: Add coverage for the first "middle" section.
 * 3. Level 3: Add coverage for the second "middle" section + increase existing Split/Line units.
 * 4. Level 4: Add coverage for the inner-most middle + increase Straight Up units.
 * 5. Level 5 & 6: Double total bet amounts from the previous level.
 * * TRIGGERING LEVELS:
 * - Move to the next level after 2 "Small Losses" (a win that doesn't cover the total bet).
 * - Move immediately to the next level on a "Full Loss" (zero return).
 * * GOAL:
 * Reach a session profit target. Reset to Level 1 upon reaching profit.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.level) state.level = 1;
    if (!state.smallLossCount) state.smallLossCount = 0;
    if (!state.targetProfit) state.targetProfit = 50; // Default goal
    if (state.initialBankroll === undefined) state.initialBankroll = bankroll;

    const min = config.betLimits.min;
    const max = config.betLimits.max;

    // 2. Analyze Last Spin to Update Progression Level
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastBets = state.lastBets || [];
        const winAmount = lastSpin.payout || 0;
        const totalWagered = lastBets.reduce((sum, b) => sum + b.amount, 0);

        const currentProfit = bankroll - state.initialBankroll;

        if (currentProfit >= state.targetProfit) {
            // Reset on overall session profit
            state.level = 1;
            state.smallLossCount = 0;
        } else if (winAmount === 0) {
            // Full Loss: Move level immediately
            state.level = Math.min(state.level + 1, 6);
            state.smallLossCount = 0;
        } else if (winAmount < totalWagered) {
            // Small Loss: Move level after 2 occurrences
            state.smallLossCount++;
            if (state.smallLossCount >= 2) {
                state.level = Math.min(state.level + 1, 6);
                state.smallLossCount = 0;
            }
        } else {
            // Significant Win but profit target not met: Stay at current level
            state.smallLossCount = 0;
        }
    }

    // 3. Define the Bet Construction Logic
    let bets = [];

    const addBet = (type, value, units) => {
        let amount = Math.max(units * min, min);
        amount = Math.min(amount, max);
        bets.push({ type, value, amount });
    };

    // --- LEVEL 1 COMPONENTS ---
    // Left Wing
    [6, 9, 4, 7].forEach(num => addBet('number', num, 1));
    addBet('split', [5, 8], 1);
    addBet('line', 4, 2); // 4-9 Double Street

    // Right Wing
    [30, 33, 28, 31].forEach(num => addBet('number', num, 1));
    addBet('split', [29, 32], 1);
    addBet('line', 28, 2); // 28-33 Double Street

    // --- LEVEL 2 ADD-ONS ---
    if (state.level >= 2) {
        [10, 12, 25, 27].forEach(num => addBet('number', num, 1));
        addBet('split', [8, 11], 1);
        addBet('split', [26, 29], 1);
        addBet('line', 7, 2);
        addBet('line', 25, 2);
    }

    // --- LEVEL 3 ADD-ONS & MODIFICATIONS ---
    if (state.level >= 3) {
        [13, 15, 22, 24].forEach(num => addBet('number', num, 1));
        addBet('split', [11, 14], 1);
        addBet('split', [23, 26], 1);
        addBet('line', 10, 2);
        addBet('line', 22, 2);

        // Modify existing: Increase ALL splits +1, ALL lines +2
        bets.forEach(b => {
            if (b.type === 'split') b.amount += (1 * min);
            if (b.type === 'line') b.amount += (2 * min);
        });
    }

    // --- LEVEL 4 ADD-ONS & MODIFICATIONS ---
    if (state.level >= 4) {
        [16, 18, 19, 21].forEach(num => addBet('number', num, 1));
        addBet('split', [14, 17], 2);
        addBet('split', [20, 23], 2);
        addBet('line', 13, 4);
        addBet('line', 19, 4);

        // Modify existing: Increase ALL straight ups +1
        bets.forEach(b => {
            if (b.type === 'number') b.amount += (1 * min);
        });
    }

    // --- LEVEL 5 & 6 (Double Up) ---
    if (state.level === 5) {
        bets.forEach(b => b.amount *= 2);
    }
    if (state.level === 6) {
        bets.forEach(b => b.amount *= 4); // Double of Level 5
    }

    // Final Clamp to Table Max
    bets.forEach(b => b.amount = Math.min(b.amount, max));

    state.lastBets = bets;
    return bets;
}