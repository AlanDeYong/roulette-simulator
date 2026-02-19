/**
 * STRATEGY: Bankrupt the Casino (Chip Tracy System)
 * * Source: https://www.youtube.com/watch?v=pOWR22G3oM4 (Channel: THEROULETTEMASTERTV)
 * * The Logic:
 * The strategy alternates between two sides of the table (Side A and Side B).
 * Each side consists of two outside bets and nine straight-up number bets.
 * - Side A: Low (1-18), Even, and all even numbers 2 through 18.
 * - Side B: High (19-36), Odd, and all odd numbers 19 through 35.
 * * The Progression:
 * This uses a "Two-Loss Double" progression.
 * 1. Start at a base multiplier (1x).
 * 2. If a spin is a loss, stay at the current multiplier for one more spin.
 * 3. If two consecutive losses occur, double the multiplier (1, 1, 2, 2, 4, 4, 8, 8...).
 * 4. After any win, reset the progression to 1x and switch sides.
 * * The Goal: 
 * Accumulate daily profits by utilizing the large payouts from straight-up 
 * number hits during higher progression levels to offset losses.
 */

function bet(spinHistory, bankroll, config, state) {
    // 1. Initialize State
    if (!state.initialized) {
        state.level = 1;         // Current progression multiplier
        state.lossStreak = 0;    // Number of consecutive losses at current level
        state.currentSide = 'A'; // Start with Side A
        state.initialized = true;
    }

    // 2. Logic to evaluate previous spin result
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastNum = lastResult.winningNumber;
        
        let won = false;
        if (state.currentSide === 'A') {
            // Side A Wins if: (1-18) OR (Even)
            // Note: 0 is neither even nor in 1-18.
            if ((lastNum >= 1 && lastNum <= 18) || (lastNum > 0 && lastNum % 2 === 0)) {
                won = true;
            }
        } else {
            // Side B Wins if: (19-36) OR (Odd)
            if ((lastNum >= 19 && lastNum <= 36) || (lastNum % 2 !== 0)) {
                won = true;
            }
        }

        if (won) {
            // Reset on win
            state.level = 1;
            state.lossStreak = 0;
            // Switch sides after a win
            state.currentSide = (state.currentSide === 'A') ? 'B' : 'A';
        } else {
            // Handle Loss
            state.lossStreak++;
            if (state.lossStreak >= 2) {
                state.level *= 2;      // Double after two consecutive losses
                state.lossStreak = 0;  // Reset counter for the new level
            }
        }
    }

    // 3. Define Bet Amounts and Clamp to Limits
    // The strategy uses 1 unit for 11 different spots (2 outside, 9 inside).
    const insideUnit = Math.max(config.betLimits.min, 1) * state.level;
    const outsideUnit = Math.max(config.betLimits.minOutside, 1) * state.level;

    const bets = [];

    if (state.currentSide === 'A') {
        // --- SIDE A ---
        // Outside Bets
        bets.push({ type: 'low', amount: Math.min(outsideUnit, config.betLimits.max) });
        bets.push({ type: 'even', amount: Math.min(outsideUnit, config.betLimits.max) });
        
        // Inside Bets (Even numbers 2-18)
        for (let i = 2; i <= 18; i += 2) {
            bets.push({ 
                type: 'number', 
                value: i, 
                amount: Math.min(insideUnit, config.betLimits.max) 
            });
        }
    } else {
        // --- SIDE B ---
        // Outside Bets
        bets.push({ type: 'high', amount: Math.min(outsideUnit, config.betLimits.max) });
        bets.push({ type: 'odd', amount: Math.min(outsideUnit, config.betLimits.max) });
        
        // Inside Bets (Odd numbers 19-35)
        for (let i = 19; i <= 35; i += 2) {
            bets.push({ 
                type: 'number', 
                value: i, 
                amount: Math.min(insideUnit, config.betLimits.max) 
            });
        }
    }

    // 4. Final Bankroll Check (Stop if we can't afford the total bet)
    const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBetAmount > bankroll) {
        return null; // or []
    }

    return bets;
}