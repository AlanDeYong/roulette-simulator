/**
 * Source: Roulette Strategy Lab (YouTube) - https://www.youtube.com/watch?v=gs2TeNf8crU
 *
 * The Logic: The strategy bets AGAINST the "perfect" pattern of 2 Reds, 2 Blacks (RRBBRRBB...).
 * 1. Hunt: Wait for two consecutive colors (e.g., Red, Red).
 * 2. Bet: The pattern expects the next spin to be Black. To break the pattern, we bet Red.
 * If we lose (Black appears), the pattern expects Black again. To break it, we bet Red.
 * If we lose again (Black appears), the pattern now expects Red. To break it, we bet Black.
 * The bet color alternates every 2 non-green losses (C1, C1, C2, C2, C1, C1...).
 * 3. Wait: After a win, wait for a color change before hunting for the next 2-in-a-row.
 *
 * The Progression: Standard Martingale. If a bet loses, the next bet is doubled. If a zero (Green)
 * hits, it is treated as a loss (bet doubles), but it does not advance the color-switching pattern.
 * Resets to base unit upon a win.
 *
 * The Goal: Win 1 base unit per betting sequence. The sequence ends immediately upon any win.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Machine
    if (!state.mode) {
        state.mode = 'HUNT';
        state.consecutiveColor = null;
        state.consecutiveCount = 0;
    }

    // 2. Process the most recent spin result to update the state
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastColor = lastSpin.winningColor; // 'red', 'black', or 'green'

        if (state.mode === 'WAIT_CHANGE') {
            // Wait until we see the target color before looking for a 2-in-a-row pattern again
            if (lastColor === state.waitColorTarget) {
                state.mode = 'HUNT';
                state.consecutiveColor = lastColor;
                state.consecutiveCount = 1;
            }
        } 
        else if (state.mode === 'HUNT') {
            if (lastColor === 'green') {
                state.consecutiveCount = 0;
                state.consecutiveColor = null;
            } else if (lastColor === state.consecutiveColor) {
                state.consecutiveCount++;
            } else {
                state.consecutiveColor = lastColor;
                state.consecutiveCount = 1;
            }

            // Trigger the betting phase if we hit 2 of the same color
            if (state.consecutiveCount >= 2) {
                state.mode = 'BET';
                state.initialTriggerColor = state.consecutiveColor;
                state.nonZeroLosses = 0;
                state.currentBetAmount = config.betLimits.minOutside;
                state.lastBetColor = null; // Will be set during the betting block
            }
        } 
        else if (state.mode === 'BET') {
            // Evaluate the result of the bet we just placed
            if (state.lastBetColor && lastColor === state.lastBetColor) {
                // WIN - Switch to waiting mode, look for the opposite color
                state.mode = 'WAIT_CHANGE';
                state.waitColorTarget = (lastColor === 'red') ? 'black' : 'red';
            } else if (state.lastBetColor) {
                // LOSS - Apply Martingale progression
                state.currentBetAmount *= 2; 
                
                // Zeroes are losses but do not advance the alternating pattern sequence
                if (lastColor !== 'green') {
                    state.nonZeroLosses++;
                }
            }
        }
    }

    // 3. Determine action based on current state
    if (state.mode === 'BET') {
        let color1 = state.initialTriggerColor;
        let color2 = (color1 === 'red') ? 'black' : 'red';

        // Alternate the bet color every 2 non-green losses
        let phase = Math.floor(state.nonZeroLosses / 2);
        let betColor = (phase % 2 === 0) ? color1 : color2;

        let amount = state.currentBetAmount;
        
        // CLAMP TO LIMITS
        amount = Math.max(amount, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);

        // Save exactly what is being bet to evaluate it on the next spin tick
        state.lastBetColor = betColor;
        state.currentBetAmount = amount; // Store clamped amount for the next progression

        return [{ type: betColor, amount: amount }];
    }

    // No active bets during HUNT or WAIT_CHANGE phases
    return []; 
}