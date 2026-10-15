/**
 * Roulette Strategy: Double Up Hopscotch
 * Source: https://youtu.be/aBPJVLyRkWk (Channel: WillVegas)
 * * The Full Logic in details:
 * This strategy aims to build profit using high-coverage inside bets across 4 parlay steps.
 * By using the profit generated from a hit to fund the increased coverage on the next step,
 * the actual risk remains limited to the initial base unit, creating a low-stress progression.
 * * The Full Bet Progression in details:
 * - Step 1: Bet 5 non-overlapping Corners at 1 unit each (covers 20 numbers).
 * - Step 2: Bet 9 Streets at 1 unit each (covers 27 numbers).
 * - Step 3: Bet 6 non-overlapping Corners at 2 units each (covers 24 numbers).
 * - Step 4: Bet 9 Streets at 2 units each (covers 27 numbers).
 * * Progression Rules:
 * - If a spin wins: Progress to the next step.
 * - If a spin loses: Reset to Step 1.
 * - If Step 4 is completed and won: Reset to Step 1 and bank the profit.
 * * The Goal:
 * Target profit is roughly +30 units. It uses a short starting bankroll (e.g., 50 units) 
 * acting as a built-in stop-loss if a bad run occurs.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.min;

    // 2. Initialize State and Track Progression
    if (state.step === undefined) {
        state.step = 1;
        state.lastBankroll = bankroll;
    } else if (spinHistory.length > 0) {
        // Compare current bankroll against last known bankroll to detect a win or loss
        if (bankroll > state.lastBankroll) {
            state.step++;
            if (state.step > 4) {
                state.step = 1; // Reset after successfully completing all 4 steps
            }
        } else {
            state.step = 1; // Reset on any loss
        }
        state.lastBankroll = bankroll;
    }

    // 3. Define Bet Amounts and Clamp to Limits
    let amount1x = Math.max(unit, config.betLimits.min);
    amount1x = Math.min(amount1x, config.betLimits.max);

    let amount2x = Math.max(unit * 2, config.betLimits.min);
    amount2x = Math.min(amount2x, config.betLimits.max);

    let bets = [];

    // 4. Place bets according to current step
    switch (state.step) {
        case 1:
            // 5 Corners (non-overlapping)
            [1, 8, 16, 23, 32].forEach(val => {
                bets.push({ type: 'corner', value: val, amount: amount1x });
            });
            break;
        case 2:
            // 9 Streets
            [1, 4, 7, 10, 13, 16, 19, 22, 25].forEach(val => {
                bets.push({ type: 'street', value: val, amount: amount1x });
            });
            break;
        case 3:
            // 6 Corners (non-overlapping)
            [1, 7, 13, 19, 25, 31].forEach(val => {
                bets.push({ type: 'corner', value: val, amount: amount2x });
            });
            break;
        case 4:
            // 9 Streets
            [1, 4, 7, 10, 13, 16, 19, 22, 25].forEach(val => {
                bets.push({ type: 'street', value: val, amount: amount2x });
            });
            break;
    }

    return bets;
}