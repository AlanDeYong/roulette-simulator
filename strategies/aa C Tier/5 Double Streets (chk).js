/**
 * STRATEGY: Five Double Streets
 * * Source: The Roulette Master (YouTube)
 * * URL: https://www.youtube.com/watch?v=xYOqdm3qN-4
 * * THE LOGIC:
 * A high-coverage system targeting 30 numbers on the board.
 * 1. Place identical bets on 5 out of the 6 available double streets (lines).
 * (This script consistently covers the first 5 double streets: numbers 1-30, 
 * leaving 31-36 and the zeros uncovered).
 * * THE PROGRESSION:
 * - Base bet is 1 unit (scaled to table minimums) on each of the 5 lines.
 * - Upon a loss, the bet amount on EACH line is doubled.
 * - Recovery Phase: After a loss, you enter a recovery mode. To fully recover and 
 * reset the bet back to the base level, you MUST achieve THREE consecutive wins 
 * at the current doubled bet level.
 * - If you lose at any point during the recovery phase, you double the bet AGAIN 
 * and your consecutive win counter resets to 0.
 * * THE GOAL:
 * - Generate frequent, small wins and strictly manage the Martingale risk by 
 * forcing the system to win three times before stepping down the progression.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.multiplier === undefined) state.multiplier = 1;
    if (state.recoveryWins === undefined) state.recoveryWins = 0;
    if (state.inRecovery === undefined) state.inRecovery = false;
    if (state.lastBets === undefined) state.lastBets = [];

    // 2. Evaluate previous spin to update progression
    if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        let lastNumStr = lastSpin.winningNumber;
        let won = false;

        // Safely parse number. Treat '0' or '00' as 0.
        let actualNum = (lastNumStr === '00' || lastNumStr === 0 || lastNumStr === '0') ? 0 : parseInt(lastNumStr, 10);

        // Manually check if any of our 5 line bets covered the winning number
        for (let b of state.lastBets) {
            if (b.type === 'line') {
                if (actualNum >= b.value && actualNum <= b.value + 5) {
                    won = true;
                    break;
                }
            }
        }

        // Apply 3-Win Recovery Progression Logic
        if (won) {
            if (state.inRecovery) {
                state.recoveryWins++;
                // Check if we hit the 3 consecutive wins required to reset
                if (state.recoveryWins >= 3) {
                    state.multiplier = 1;
                    state.recoveryWins = 0;
                    state.inRecovery = false;
                }
            } else {
                // Standard base level win, keep everything flat
                state.multiplier = 1;
                state.recoveryWins = 0;
            }
        } else {
            // Loss occurred. Double up and enter/restart recovery phase
            state.multiplier *= 2;
            state.recoveryWins = 0;
            state.inRecovery = true;
        }
    }

    // 3. Calculate Bet Amounts and strictly clamp to Limits
    let unit = config.betLimits.minOutside || 5; 
    let amount = unit * state.multiplier;

    amount = Math.max(amount, config.betLimits.minOutside || config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    let bets = [];

    // 4. Place Bets on 5 Double Streets
    // Using starting values for the first 5 double streets: 1 (1-6), 7 (7-12), 13 (13-18), 19 (19-24), 25 (25-30)
    const linesToCover = [1, 7, 13, 19, 25];

    for (let lineStart of linesToCover) {
        bets.push({
            type: 'line',
            value: lineStart,
            amount: amount
        });
    }

    // 5. Store for the next iteration and return
    state.lastBets = bets;
    return bets;
}