/**
 * Roulette Strategy: Triple Attack
 * 
 * Source:
 * - Channel: WillVegas
 * - Video URL: https://www.youtube.com/watch?v=ACEP9zwQwqg
 * 
 * The Full Logic in detail:
 * - This strategy places three independent 1:1 outside bets on every spin:
 *   1. 'low' (1-18)
 *   2. 'even'
 *   3. 'red'
 * - Each bet operates independently. After a spin, each bet outcome is evaluated separately
 *   against the winning number and color.
 * 
 * The Full Bet Progression in detail:
 * - Initial Bet: 1 base unit (minOutside limit) on 'low', 'even', and 'red'.
 * - On Win (per bet type): Reset that specific bet back to 1 base unit.
 * - On Loss (per bet type): Double the previous bet amount for that specific bet position (Martingale).
 * 
 * The Goal:
 * - Target Profit: +$50 net profit over starting bankroll.
 * - Stop-Loss: Cease betting if bankroll drops below the minimum required to fund the next set of bets or on total bankroll depletion.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minOutside = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    // 1. Initialize State Persistence
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.targetProfit = 50000; // Target profit of $50 as specified in the video
        state.betAmounts = {
            low: minOutside,
            even: minOutside,
            red: minOutside
        };
        state.initialized = true;
    }

    // 2. Target Profit & Stop-Loss Conditions
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= state.targetProfit) {
        // Target profit reached; stop betting
        return [];
    }

    // 3. Update Bet Progression based on Previous Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        const color = lastSpin.winningColor;

        // Helper boolean checks for winning positions (0 and 00 lose all 1:1 bets)
        const isLowWin = num >= 1 && num <= 18;
        const isEvenWin = num > 0 && num % 2 === 0;
        const isRedWin = color === 'red';

        // Update 'low' bet position
        if (isLowWin) {
            state.betAmounts.low = minOutside;
        } else {
            state.betAmounts.low *= 2;
        }

        // Update 'even' bet position
        if (isEvenWin) {
            state.betAmounts.even = minOutside;
        } else {
            state.betAmounts.even *= 2;
        }

        // Update 'red' bet position
        if (isRedWin) {
            state.betAmounts.red = minOutside;
        } else {
            state.betAmounts.red *= 2;
        }
    }

    // 4. Construct Bet Objects and Clamp to Table Limits
    const bets = [
        { type: 'low', amount: state.betAmounts.low },
        { type: 'even', amount: state.betAmounts.even },
        { type: 'red', amount: state.betAmounts.red }
    ];

    const clampedBets = bets.map(b => {
        let amt = Math.max(b.amount, minOutside);
        amt = Math.min(amt, maxBet);
        return { type: b.type, amount: amt };
    });

    // 5. Check Bankroll Availability
    const totalBetRequired = clampedBets.reduce((sum, b) => sum + b.amount, 0);
    if (bankroll < totalBetRequired) {
        // Insufficient funds to maintain full strategy progression
        return [];
    }

    return clampedBets;
}