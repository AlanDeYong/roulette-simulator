/**
 * ROULETTE STRATEGY: Jackpot Hunter
 * 
 * SOURCE:
 * - Channel: CEG Dealer School
 * - Video URL: https://youtu.be/JzrtSxRRHL4
 * - Strategy Name: Jackpot Hunter (by Mick Molton)
 * 
 * FULL LOGIC:
 * 1. The player places a 2:1 Dozen bet (defaulting to 2nd Dozen: numbers 13-24).
 * 2. If the Dozen bet loses, the strategy steps up to the next level in a 6-level negative progression.
 * 3. If the Dozen bet wins:
 *    - The profit generated from the win is saved.
 *    - The strategy switches to "JACKPOT" mode for 1 spin.
 *    - It bets the earned profit directly on a single straight-up number (e.g., the last winning number).
 * 4. After the Jackpot spin (regardless of whether the straight-up bet hits or misses):
 *    - Progression level resets back to Level 1 ($15).
 *    - Strategy switches back to "DOZEN" mode.
 * 
 * BET PROGRESSION:
 * - Base Dozen progression sequence (6 levels): [$15, $20, $30, $40, $60, $90].
 * - On Dozen Loss: Advance level (0 -> 1 -> 2 -> 3 -> 4 -> 5). If level 5 loses, reset to level 0.
 * - On Dozen Win: Calculate profit, set jackpotBetAmount = net profit, reset Dozen level to 0, switch to JACKPOT mode.
 * - On Jackpot Spin: Bet jackpotBetAmount on target straight-up number. Reset mode to DOZEN after spin.
 * 
 * GOAL:
 * - Leverage Dozen wins to free-roll inside numbers for a 35:1 straight-up jackpot payout 
 *   without risking base bankroll capital. Target: Double buy-in ($255 -> $510+) or hit a straight-up jackpot.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define progression levels array (base amounts from strategy)
    const baseLevels = [15, 20, 30, 40, 60, 90];

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.mode = 'DOZEN';          // Modes: 'DOZEN' or 'JACKPOT'
        state.level = 0;               // Progression index (0 to 5)
        state.targetDozen = 2;         // 2nd Dozen (13-24)
        state.jackpotAmount = 0;       // Profit allocated for jackpot spin
        state.accumulatedLoss = 0;    // Losses accrued in current Dozen sequence
    }

    // 3. Process Last Spin Result (if history exists)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        if (state.mode === 'DOZEN') {
            // Determine if target dozen hit
            const dozenMin = (state.targetDozen - 1) * 12 + 1; // e.g. 13
            const dozenMax = state.targetDozen * 12;            // e.g. 24
            const isDozenWin = (lastNum >= dozenMin && lastNum <= dozenMax);

            // Get the amount that was bet on the last dozen spin
            let lastBetAmount = baseLevels[state.level];
            lastBetAmount = Math.max(config.betLimits.minOutside, Math.min(lastBetAmount, config.betLimits.max));

            if (isDozenWin) {
                // Dozen pays 2:1 (win payout = 2 * bet amount)
                const spinProfit = lastBetAmount * 2;
                const netProfit = spinProfit - state.accumulatedLoss;

                // Allocate net profit (or at least minimum inside bet) for jackpot hunt
                let profitToBet = netProfit > 0 ? netProfit : lastBetAmount;
                state.jackpotAmount = Math.max(config.betLimits.min, Math.min(profitToBet, config.betLimits.max));

                // Switch to Jackpot free-roll mode and reset progression level
                state.mode = 'JACKPOT';
                state.level = 0;
                state.accumulatedLoss = 0;
            } else {
                // Dozen bet lost: accumulate loss and advance progression
                state.accumulatedLoss += lastBetAmount;
                state.level++;

                // Reset progression if all 6 levels are exhausted
                if (state.level >= baseLevels.length) {
                    state.level = 0;
                    state.accumulatedLoss = 0;
                }
            }
        } else if (state.mode === 'JACKPOT') {
            // Jackpot free-roll completed; reset back to DOZEN mode
            state.mode = 'DOZEN';
            state.level = 0;
            state.accumulatedLoss = 0;
        }
    }

    // 4. Generate Bets for Current Turn
    if (state.mode === 'DOZEN') {
        // Calculate Dozen Bet Amount & Clamp to limits
        let amount = baseLevels[state.level];
        amount = Math.max(amount, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);

        return [{
            type: 'dozen',
            value: state.targetDozen,
            amount: amount
        }];
    } 
    else if (state.mode === 'JACKPOT') {
        // Calculate Jackpot Inside Bet Amount & Clamp to limits
        let amount = state.jackpotAmount || config.betLimits.min;
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        // Pick target straight-up number (use last winning number, default to 14 if 0/green)
        let targetNumber = 14;
        if (spinHistory && spinHistory.length > 0) {
            const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
            targetNumber = (lastNum >= 0 && lastNum <= 36) ? lastNum : 14;
        }

        return [{
            type: 'number',
            value: targetNumber,
            amount: amount
        }];
    }

    return [];
}