/**
 * ============================================================================
 * ROULETTE STRATEGY: Roulette EZ (The EASIEST Roulette Strategy)
 * ============================================================================
 * 
 * SOURCE:
 * - YouTube Video: https://youtu.be/5m0dNGhD_2A
 * - Channel: WillVegas (Strategy created and submitted by Kevin)
 * 
 * THE FULL LOGIC IN DETAIL:
 * 1. The strategy covers 2 out of the 3 columns on the roulette table using an 
 *    asymmetric 2:1 unit ratio:
 *    - 2 units on the 2nd Column (Center Column: numbers 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35).
 *    - 1 unit on the 3rd Column (Top Column: numbers 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36).
 *    - 1st Column (numbers 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34) and 0/00 are uncovered.
 * 2. Spin Outcomes:
 *    - WIN (2nd Column hits): The 2-unit bet pays 2:1 (+4 units profit), while the 1-unit bet
 *      on the 3rd column is lost. Net outcome is a gain of +3 units (+1 full base cycle).
 *    - PUSH (3rd Column hits): The 1-unit bet pays 2:1 (+2 units profit), while the 2-unit bet
 *      on the 2nd column is lost. Net outcome is $0 (break-even push).
 *    - LOSS (1st Column or 0/00 hits): Both bets are lost (-3 units).
 * 
 * THE FULL BET PROGRESSION IN DETAIL:
 * - Initial Bet: Level 1 (Base bet = 2 units on Col 2, 1 unit on Col 3).
 * - After a WIN (2nd Column): Reset progression multiplier back to base level 1.
 * - After a PUSH (3rd Column): Keep bet amounts exactly the same (do not increase or reset).
 * - After a LOSS (1st Column / 0 / 00): Double the bet multiplier (Martingale: Level 1 -> 2 -> 4 -> 8 -> 16...).
 * 
 * THE GOAL:
 * - Target Profit: +$30 to +$50 above starting bankroll in a short session (approx. 15 minutes).
 * - Stop-Loss: Stop betting if remaining bankroll cannot cover the minimum required bets.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Column Number Mappings
    const COLUMNS = {
        1: [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
        2: [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
        3: [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
    };

    // Helper to identify which column a winning number belongs to
    function getWinningColumn(number) {
        if (number === 0 || number === '00' || number === 37) return 0;
        if (COLUMNS[1].includes(number)) return 1;
        if (COLUMNS[2].includes(number)) return 2;
        if (COLUMNS[3].includes(number)) return 3;
        return 0;
    }

    // 2. Initialize State Variables
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
    }
    if (state.multiplier === undefined) {
        state.multiplier = 1;
    }
    if (state.targetProfit === undefined) {
        // Standard session target profit ($30 to $50)
        state.targetProfit = 3000;
    }

    // 3. Check Session Profit Goal
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= state.targetProfit) {
        // Target profit reached; halt session
        return [];
    }

    // 4. Update Progression Based on Last Spin
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        const lastCol = getWinningColumn(lastNumber);

        if (lastCol === 2) {
            // WIN: Profit column hit -> Reset progression to base level
            state.multiplier = 1;
        } else if (lastCol === 3) {
            // PUSH: Hedge column hit -> Maintain current progression level
            // state.multiplier remains unchanged
        } else {
            // LOSS: 1st column or Zero hit -> Double the progression
            state.multiplier *= 2;
        }
    }

    // 5. Calculate Base Unit and Bet Amounts
    const minOutside = config.betLimits.minOutside || 5;
    const maxLimit = config.betLimits.max || 500;

    // Base ratio: 2 units on Col 2, 1 unit on Col 3
    let betCol2Amount = 2 * minOutside * state.multiplier;
    let betCol3Amount = 1 * minOutside * state.multiplier;

    // Respect table bet limits
    betCol2Amount = Math.max(minOutside, Math.min(betCol2Amount, maxLimit));
    betCol3Amount = Math.max(minOutside, Math.min(betCol3Amount, maxLimit));

    const totalRequired = betCol2Amount + betCol3Amount;

    // 6. Check Bankroll Sufficiency
    if (bankroll < totalRequired) {
        // Insufficient funds to place full bets
        return [];
    }

    // 7. Return Bet Placement
    return [
        { type: 'column', value: 2, amount: betCol2Amount },
        { type: 'column', value: 3, amount: betCol3Amount }
    ];
}