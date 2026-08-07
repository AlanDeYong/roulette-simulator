/**
 * Strategy Name: Trace Desparacer (Tres Desaparecer)
 * Source: https://youtu.be/EBvptyVbRk4
 * Channel: The Roulette Master (Created by Juan)
 * 
 * THE FULL LOGIC IN DETAILS:
 * - Layout / Bet Selection:
 *   Initial bet covers 29 straight-up numbers:
 *   - Zero / Double Zero (or 0 depending on table type)
 *   - 9 numbers chosen from the 1st Dozen (1-12)
 *   - 9 numbers chosen from the 2nd Dozen (13-24)
 *   - 9 numbers chosen from the 3rd Dozen (25-36)
 * - How Bet Placements work:
 *   - Bets are placed straight-up on active numbers.
 *   - When a win occurs during progression/recovery, 3 numbers ("tres desaparecer") 
 *     associated with the hit group/street are removed from the active set to lock in gains.
 * 
 * THE FULL BET PROGRESSION IN DETAILS:
 * - Starts at base unit (1 unit per active straight-up number, clamped to config.betLimits.min).
 * - On Win at Base Level: Maintain active set and rebet base unit.
 * - On Loss: Double the bet size per active number (Martingale progression on remaining active numbers).
 * - On Win during Progression: Remove 3 numbers (the winning number's group of 3) from active bets,
 *   and continue betting on the remaining active numbers.
 * 
 * THE GOAL:
 * - Target Profit / Reset: Reset back to initial 29 numbers and base unit whenever reaching new session 
 *   profit peak, or when profit target (~$100-$150 above start) is achieved / active set gets down to ~17 numbers.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit for inside straight-up bets
    const unit = config.betLimits.min;

    // Helper: Generate default 29 numbers (0, 00 if American/0, plus 9 in each dozen)
    function getDefaultNumbers() {
        const numbers = [];
        // Add zero(s)
        numbers.push(0);
        if (config.tableType === 'american') {
            numbers.push(37); // 37 represents 00 in standard roulette simulators
        }

        // Pick 9 numbers in 1st dozen (1-9)
        for (let i = 1; i <= 9; i++) numbers.push(i);
        // Pick 9 numbers in 2nd dozen (13-21)
        for (let i = 13; i <= 21; i++) numbers.push(i);
        // Pick 9 numbers in 3rd dozen (25-33)
        for (let i = 25; i <= 33; i++) numbers.push(i);

        return numbers;
    }

    // Helper: Find group of 3 numbers (street/group) to remove on win
    function getGroupOfThree(num) {
        if (num === 0 || num === 37) return [0, 37]; // remove zeros together if hit
        const start = Math.floor((num - 1) / 3) * 3 + 1;
        return [start, start + 1, start + 2];
    }

    // 2. Initialize State
    if (!state.initialized) {
        state.startingBankroll = bankroll;
        state.highWaterMark = bankroll;
        state.multiplier = 1;
        state.activeNumbers = getDefaultNumbers();
        state.initialized = true;
    }

    // 3. Process previous spin result if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const winningNum = lastResult.winningNumber;

        // Track net profit peak
        if (bankroll > state.highWaterMark) {
            state.highWaterMark = bankroll;
        }

        const currentProfit = bankroll - state.startingBankroll;
        const targetReached = currentProfit >= 100;
        const lowCoverage = state.activeNumbers.length <= 17;

        // Reset condition: Peak profit hit or target reached or too few numbers left
        if (targetReached || (lowCoverage && currentProfit > 0) || bankroll >= state.highWaterMark) {
            state.activeNumbers = getDefaultNumbers();
            state.multiplier = 1;
        } else {
            const wasHit = state.activeNumbers.includes(winningNum);

            if (wasHit) {
                // "Tres Desaparecer" - Remove the 3 numbers associated with the win
                const toRemove = getGroupOfThree(winningNum);
                state.activeNumbers = state.activeNumbers.filter(n => !toRemove.includes(n));

                // If active numbers drop too low, reset active set
                if (state.activeNumbers.length <= 12) {
                    state.activeNumbers = getDefaultNumbers();
                    state.multiplier = 1;
                }
            } else {
                // On loss: Double the multiplier
                state.multiplier *= 2;
            }
        }
    }

    // 4. Calculate Bet Amount per active straight-up number
    let betAmount = unit * state.multiplier;
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 5. Construct Bets
    const bets = [];
    for (const num of state.activeNumbers) {
        // Ensure bankroll can cover total bet
        if (bankroll < betAmount) break;
        bets.push({
            type: 'number',
            value: num,
            amount: betAmount
        });
    }

    return bets;
}