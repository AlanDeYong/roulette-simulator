/**
 * STRATEGY: Tweaked Red/Black Perfect Pattern (CORRECTED)
 * * Source: WillVegas - "Red Black Tweaked to WIN!!💵💵 $350 TO 1250 Per Week!"
 * Channel: WillVegas (https://www.youtube.com/watch?v=4Wehy2vvuX8)
 * * The Logic:
 * The strategy assumes a "perfect pattern" (2 Reds, 2 Blacks, 2 Reds, 2 Blacks) is rare.
 * Phase 1: "Follow the Leader" - Flat bet on whatever color just hit.
 * Phase 2: "Progression" - If you lose Phase 1, the core strategy begins.
 * * The Progression:
 * - Martingale style: Double the bet size after every loss.
 * - Stay on the color that just triggered the loss for 2 consecutive spins.
 * - If you lose both spins on that color, switch to the opposite color for the next 2 spins.
 * - If a green (0/00) hits, treat it as a loss (double up), but do NOT count it toward the 2-spin color limit.
 * - Any win instantly resets the bet to the minimum and returns to "Follow the Leader" phase.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for at least one spin to establish a "leader" to follow
    if (spinHistory.length === 0) return null;

    const lastSpin = spinHistory[spinHistory.length - 1];

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.phase = 'FOLLOW'; // 'FOLLOW' or 'PROGRESSION'
        state.targetColor = lastSpin.winningColor === 'green' ? 'red' : lastSpin.winningColor; 
        state.currentBet = config.betLimits.minOutside;
        state.spinsOnColor = 0; // Tracks consecutive losses on current target color
    }

    const wonLast = lastSpin.winningColor === state.targetColor;

    // 3. Process the Result & Update State
    if (state.phase === 'FOLLOW') {
        if (wonLast) {
            // Won follow the leader. Keep base bet. Follow the new color.
            state.currentBet = config.betLimits.minOutside;
            if (lastSpin.winningColor !== 'green') {
                state.targetColor = lastSpin.winningColor;
            }
        } else {
            // Lost follow the leader. Enter Progression.
            state.phase = 'PROGRESSION';
            state.currentBet *= 2; 
            state.spinsOnColor = 0; // [FIXED]: Start counter at 0 for the new color
            
            // Switch to the color that just beat us, unless it was green
            if (lastSpin.winningColor !== 'green') {
                state.targetColor = lastSpin.winningColor;
            }
        }
    } else if (state.phase === 'PROGRESSION') {
        if (wonLast) {
            // Won during progression. Reset to Follow the Leader.
            state.phase = 'FOLLOW';
            state.currentBet = config.betLimits.minOutside;
            state.spinsOnColor = 0;
            if (lastSpin.winningColor !== 'green') {
                state.targetColor = lastSpin.winningColor;
            }
        } else {
            // Lost during progression. Double up.
            state.currentBet *= 2;
            
            // [FIXED]: Green doesn't count towards the 2-spin limit per color
            if (lastSpin.winningColor !== 'green') {
                state.spinsOnColor++;
            }

            // If we've suffered 2 consecutive losses on this color, switch.
            if (state.spinsOnColor >= 2) {
                state.targetColor = state.targetColor === 'red' ? 'black' : 'red';
                state.spinsOnColor = 0;
            }
        }
    }

    // 4. Clamp the Bet Amount to Config Limits
    let amount = Math.max(state.currentBet, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Execute Bet
    return [{ type: state.targetColor, amount: amount }];
}