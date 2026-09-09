/**
 * Roulette Strategy: "Color Code"
 * 
 * Source:
 * - Channel: Casino Gamester
 * - Video: 🔴⚫️ NEW Roulette Strategy! Can This RED & BLACK Pattern Give Us The WINNING CODE?! 💵💰
 * - URL: https://youtu.be/qMlP938id7o
 * 
 * The Full Logic in Details:
 * - The strategy reads a 16-spin history board to decipher the "Color Code" by checking
 *   three key anchor positions:
 *     1. Top (Most recent spin): spinHistory[length - 1]
 *     2. Bottom (Oldest spin on a 16-slot scoreboard): spinHistory[length - 16]
 *     3. Middle (Halfway tiebreaker, 8th spin back): spinHistory[length - 8]
 * - If fewer than 16 spins are in the history, the strategy waits until at least 16 spins are recorded.
 * - Green numbers handling (wheel neighbor rule as defined in video):
 *     - Single Zero (0) is adjacent to 2 (Black) and 28 (Black), treated as Black.
 *     - Double Zero (00) is adjacent to 1 (Red) and 27 (Red), treated as Red.
 * - Bet Selection:
 *     - If Top and Bottom have the same color, bet that color.
 *     - If Top and Bottom differ (chop), use the Middle position as the tiebreaker.
 *     - Whichever color holds the 2-out-of-3 majority is the color to bet.
 * 
 * The Full Bet Progression in Details:
 * - Initial Bet: 1 outside base unit (config.betLimits.minOutside).
 * - Progression: 5-step Martingale (1x, 2x, 4x, 8x, 16x).
 * - After a Win: Reset the progression level to 1.
 * - After a Loss: Double the bet (advance to the next Martingale level).
 * - If 5 consecutive losses occur (locked out), reset progression to level 1.
 * 
 * The Goal:
 * - Target Profit: +25% profit over starting bankroll (e.g., turning $20 into $25).
 * - Once target profit is hit, stop betting and lock in profits ("cash out, get out").
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish constants and base units
    const baseUnit = config.betLimits.minOutside || 5;
    const maxSteps = 5; // 5 chances before lockout

    // 2. Initialize persistent state
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.targetProfit = state.initialBankroll * 0.25; // 25% profit goal
        state.progressionStep = 1;
        state.lastBetColor = null;
        state.lastBetAmount = 0;
    }

    // 3. Check Profit Target ("Cash out, get out")
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        return [];
    }

    // 4. Update progression state based on previous outcome
    if (spinHistory.length > 0 && state.lastBetColor !== null) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWon = (lastSpin.winningColor === state.lastBetColor);

        if (lastWon) {
            state.progressionStep = 1;
        } else {
            state.progressionStep += 1;
            // Lockout rule: reset if exceeded 5 steps
            if (state.progressionStep > maxSteps) {
                state.progressionStep = 1;
            }
        }
    }

    // 5. Need at least 16 spins to read the 16-slot scoreboard
    if (spinHistory.length < 16) {
        return [];
    }

    // Helper: Resolve effective color for a spin (treating 0 as black, 00 as red)
    function getEffectiveColor(spin) {
        if (spin.winningColor === 'red') return 'red';
        if (spin.winningColor === 'black') return 'black';

        // Green resolution according to wheel neighbors
        if (spin.winningNumber === '00' || spin.winningNumber === 37) {
            return 'red'; // Between 1 and 27
        }
        return 'black'; // 0 is between 2 and 28
    }

    // 6. Extract the 3 key positions on the 16-spin scoreboard
    const topColor = getEffectiveColor(spinHistory[spinHistory.length - 1]);
    const bottomColor = getEffectiveColor(spinHistory[spinHistory.length - 16]);
    const middleColor = getEffectiveColor(spinHistory[spinHistory.length - 8]);

    // 7. Determine color code decision
    let targetColor;
    if (topColor === bottomColor) {
        targetColor = topColor;
    } else {
        // Tiebreaker in the middle
        targetColor = middleColor;
    }

    // 8. Calculate bet amount with Martingale progression multiplier
    const multiplier = Math.pow(2, state.progressionStep - 1);
    let betAmount = baseUnit * multiplier;

    // 9. Clamp to table limits and remaining bankroll
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);
    betAmount = Math.min(betAmount, bankroll);

    if (betAmount < config.betLimits.minOutside) {
        return [];
    }

    // 10. Record bet state for the next spin evaluation
    state.lastBetColor = targetColor;
    state.lastBetAmount = betAmount;

    return [{
        type: targetColor,
        amount: betAmount
    }];
}