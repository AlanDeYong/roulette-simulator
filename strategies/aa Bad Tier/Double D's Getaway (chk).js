/**
 * Double D's Getaway Strategy
 * Source: CEG Dealer School (https://youtu.be/VS3NDJc-inE)
 *
 * The Full Logic:
 * - This strategy places a bet on a Dozen (pays 2:1). We consistently bet on Dozen 1.
 * - The primary goal is to win two bets in a row to "completely reset".
 *
 * The Full Bet Progression:
 * - The progression is structured in "Levels" and "Steps".
 * - Base unit is the table minimum for outside bets.
 * - Levels define the base multiplier: L1=1x, L2=3x, L3=9x, L4=27x, L5=81x.
 * - Step 1: Bet the current Level's base multiplier.
 * - Step 2: If Step 1 wins, stack all chips (bet 3x the Step 1 amount).
 * - If Step 2 wins (2 wins in a row), you reset to Level 1, Step 1.
 * - If ANY bet loses (Step 1 or Step 2), move to the next Level (Level + 1) and restart at Step 1.
 * - Example Progression ($10 unit):
 *   - L1S1: Bet $10. Win -> L1S2 ($30). Lose -> L2S1 ($30).
 *   - L1S2: Bet $30. Win -> Reset ($10). Lose -> L2S1 ($30).
 *   - L2S1: Bet $30. Win -> L2S2 ($90). Lose -> L3S1 ($90).
 *   - L2S2: Bet $90. Win -> Reset ($10). Lose -> L3S1 ($90).
 *   - L3S1: Bet $90. Win -> L3S2 ($270). Lose -> L4S1 ($270).
 *
 * The Goal:
 * - Target profit: The video authors recommend walking away when up +$250 to +$500.
 * - Stop-loss: None specified; bet scaling aggressively risks a busted bankroll or hitting table limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.minOutside;

    // 2. Initialize State
    if (!state.level) {
        state.level = 1;
        state.step = 1;
        state.targetDozen = 1; // Defaulting to the 1st Dozen
    }

    // 3. Process the last spin to update progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        let isWin = false;

        // Check if the winning number hit our targeted dozen
        if (num !== 0 && num !== '00') {
            const doz = Math.ceil(num / 12);
            isWin = (doz === state.targetDozen);
        }

        if (isWin) {
            if (state.step === 1) {
                state.step = 2; // Move to step 2 to try and hit 2 in a row
            } else {
                // Won 2 in a row! Completely reset progression
                state.level = 1;
                state.step = 1;
            }
        } else {
            // Lost. Move to the next level and restart at Step 1
            state.level++;
            state.step = 1;
        }
    }

    // 4. Calculate Bet Amount
    const baseMultiplier = Math.pow(3, state.level - 1);
    let currentMultiplier = baseMultiplier;

    if (state.step === 2) {
        currentMultiplier = baseMultiplier * 3;
    }

    let amount = unit * currentMultiplier;

    // 5. CLAMP TO LIMITS
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 6. Return Bet
    return [{ type: 'dozen', value: state.targetDozen, amount: amount }];
}