/**
 * Roulette Strategy: R2-B2
 *
 * Source: https://youtu.be/Vu0rkmATP_M (Gamblers University)
 *
 * The Full Logic in details:
 * - The strategy focuses exclusively on Even-Money outside bets, specifically Colors (Red/Black).
 * - The player starts by placing a bet on one color (e.g., Black).
 * - The player remains betting on the same color until they experience exactly two consecutive losses on that specific color.
 * - Upon hitting two consecutive losses on a color, the strategy immediately switches the bet to the opposite color (Black to Red, or Red to Black) for the next spin.
 *
 * The Full Bet Progression in details:
 * - The betting utilizes a standard Martingale progression system.
 * - The base bet starts at 1 unit (the table minimum for outside bets).
 * - After every loss, the previous bet amount is doubled (1, 2, 4, 8, 16, 32, etc.).
 * - After any win, the bet size is immediately reset back to the base unit (1 unit).
 * - The doubling of the bet continues seamlessly even when the strategy dictates switching colors. The bet only resets to the base unit upon a win.
 *
 * The Goal:
 * - The session goal stated in the video is to make a $50 profit on a $500 initial buy-in (a 10% bankroll gain).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on the first run
    if (!state.initialized) {
        state.currentColor = 'black'; // Strategy in the video starts on Black
        state.currentBet = config.betLimits.minOutside;
        state.lossCount = 0;
        state.initialized = true;
    }

    // 2. Process the previous spin result to update progression and logic
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const isWin = lastSpin.winningColor === state.currentColor;

        if (isWin) {
            // Win: Reset bet to base unit, reset consecutive loss count, stay on the same color
            state.currentBet = config.betLimits.minOutside;
            state.lossCount = 0;
        } else {
            // Loss: Increment consecutive loss count, double the bet amount
            state.lossCount++;
            state.currentBet *= 2;

            // If two consecutive losses occur on the same color, switch to the opposite color
            if (state.lossCount >= 2) {
                state.currentColor = state.currentColor === 'black' ? 'red' : 'black';
                state.lossCount = 0; // Reset loss count for the newly selected color
            }
        }
    }

    // 3. Calculate and clamp the final bet amount to strictly respect table limits
    let amount = state.currentBet;
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 4. Return the correctly formatted bet array
    return [
        { type: state.currentColor, amount: amount }
    ];
}