/**
 * Roulette Strategy: 1-2-3 Ladder (Peak Bankroll Recovery)
 * Source: https://www.youtube.com/watch?v=rmqBkteVw4M (ROULETTE JACKPOT) - Modified
 * * The Logic: 
 * - Uses a 3:1 betting ratio.
 * - Side A: 3 units on Low (1-18) and 1 unit each on Streets 28, 31, 34.
 * - Side B: 3 units on High (19-36) and 1 unit each on Streets 1, 4, 7.
 * - Starts on Side A if the last spun number was Low, otherwise Side B.
 * * The Progression:
 * - Tracks the 'peakBankroll' (highest recorded bankroll of the session).
 * - On a loss (Net < 0), the bet multiplier level increases by 1.
 * - On a safety (Net == 0), the level remains unchanged.
 * - On a win (Net > 0), the logic checks if the current bankroll exceeds 'peakBankroll'. 
 * - If YES: Reset level to 1, toggle betting side, and update peakBankroll.
 * - If NO: Maintain the current level and side to continue recovering the session deficit.
 * * The Goal:
 * - Only drop the bet multiplier and switch sides when the overall session reaches a new high-water mark, ensuring temporary wins during a drawdown don't prematurely kill the recovery momentum.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State and Track Peak Bankroll
    if (!state.initialized) {
        state.level = 1;
        state.lastBetTotal = 0;
        state.lastBets = [];
        state.peakBankroll = bankroll; // Record starting bankroll as initial peak
        
        if (spinHistory.length > 0) {
            const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
            state.currentSide = (lastSpin >= 1 && lastSpin <= 18) ? 'A' : 'B'; 
        } else {
            state.currentSide = 'B'; 
        }
        state.initialized = true;
    } 
    // 2. Process Previous Spin (High-Water Mark Logic)
    else if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        let winAmount = 0;

        for (const b of state.lastBets) {
            if (b.type === 'low' && lastSpin >= 1 && lastSpin <= 18) {
                winAmount += b.amount * 2;
            } else if (b.type === 'high' && lastSpin >= 19 && lastSpin <= 36) {
                winAmount += b.amount * 2;
            } else if (b.type === 'street') {
                if (lastSpin >= b.value && lastSpin <= b.value + 2) {
                    winAmount += b.amount * 12; 
                }
            }
        }

        const netProfit = winAmount - state.lastBetTotal;

        if (netProfit > 0) {
            // Check if the win pushed the overall session into profit
            if (bankroll > state.peakBankroll) {
                state.level = 1; 
                state.currentSide = state.currentSide === 'A' ? 'B' : 'A'; // Switch side
            }
            // If bankroll <= state.peakBankroll, level remains unchanged to fight the deficit
        } else if (netProfit < 0) {
            state.level += 1; 
        }

        // Always update peak bankroll if the current bankroll hits a new high
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
        }
    }

    // 3. Determine Base Unit
    const baseUnit = Math.max(
        config.betLimits.min, 
        Math.ceil(config.betLimits.minOutside / 3)
    );

    // 4. Calculate desired bet amounts
    let outsideAmount = 3 * baseUnit * state.level;
    let insideAmount = 1 * baseUnit * state.level;

    // 5. Clamp to Limits
    const maxLevelByOutside = Math.floor(config.betLimits.max / (3 * baseUnit));
    const maxLevelByInside = Math.floor(config.betLimits.max / baseUnit);
    const maxAllowedLevel = Math.min(maxLevelByOutside, maxLevelByInside);

    if (state.level > maxAllowedLevel) {
        state.level = Math.max(1, maxAllowedLevel);
    }

    outsideAmount = Math.max(config.betLimits.minOutside, Math.min(3 * baseUnit * state.level, config.betLimits.max));
    insideAmount = Math.max(config.betLimits.min, Math.min(1 * baseUnit * state.level, config.betLimits.max));

    // 6. Construct Bets based on Current Side
    let currentBets = [];
    if (state.currentSide === 'A') {
        currentBets = [
            { type: 'low', amount: outsideAmount },
            { type: 'street', value: 28, amount: insideAmount },
            { type: 'street', value: 31, amount: insideAmount },
            { type: 'street', value: 34, amount: insideAmount }
        ];
    } else {
        currentBets = [
            { type: 'high', amount: outsideAmount },
            { type: 'street', value: 1, amount: insideAmount },
            { type: 'street', value: 4, amount: insideAmount },
            { type: 'street', value: 7, amount: insideAmount }
        ];
    }

    // 7. Save to state for next spin's evaluation
    state.lastBetTotal = outsideAmount + (insideAmount * 3);
    state.lastBets = currentBets;

    // 8. Bankroll Check
    if (state.lastBetTotal > bankroll) {
        return []; 
    }

    return currentBets;
}