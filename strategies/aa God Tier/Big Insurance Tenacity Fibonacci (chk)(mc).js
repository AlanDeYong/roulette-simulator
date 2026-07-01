/**
 * Big Insurance Tenacity Fibonacci
 * 
 * Source: https://youtu.be/MjQazyLpkVo
 * 
 * The Full Logic in details:
 * - The strategy places a single outside bet on High (19-36).
 * - On a loss, the bet amount on High increases following the Fibonacci sequence.
 * - If the sequence of losses hits exactly 3 consecutive losses, an insurance "basket" bet 
 *   (covering 0, 1, 2, 3) is introduced, starting at 5 units (the 5th step in the Fibonacci sequence).
 * - If further losses occur, the basket bet also progresses up the Fibonacci sequence 
 *   independently (5, 8, 13, 21, etc.) alongside the High bet.
 * - A win is defined as the ball landing on High (19-36) or, if active, the Basket (0-3).
 * 
 * The Full Bet Progression in details:
 * - Base unit for High is the table's minimum outside bet.
 * - Base unit for the Basket is the table's minimum inside bet.
 * - Start by betting 1 base unit on the High outside bet.
 * - On loss: Progress to the next Fibonacci number for the High bet (1, 1, 2, 3, 5, 8...).
 * - On 3rd consecutive loss: Activate the basket bet (0/1/2/3) starting at 5 inside base units.
 * - On subsequent losses: The basket bet follows its own Fibonacci progression from 5 upwards.
 * - On win: 
 *     - If the bankroll reaches a new session peak, the entire progression and basket bet reset to baseline.
 *     - If the bankroll is NOT at a new session peak, the progression freezes (rebet): the exact same 
 *       bet sizes are placed again without resetting or increasing.
 * 
 * The Goal:
 * - Continuously achieve a new peak bankroll. The session safely resets its risk profile every time 
 *   a new peak profit is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Fibonacci sequence extended to safely cover standard maximum bet limits
    const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765];
    
    // 1. Initialize State
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.fibIndex = 0;
        state.basketFibIndex = 4; // Index 4 in the array corresponds to the value 5
        state.consecutiveLosses = 0;
        state.basketActive = false;
    }

    // 2. Evaluate Win/Loss and Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        // Determine if the last spin was a win for our active bets
        const wonHigh = (num >= 19 && num <= 36);
        const wonBasket = (state.basketActive && num >= 0 && num <= 3);
        const isWin = wonHigh || wonBasket;

        // Check if we reached a new session peak
        const isSessionPeak = bankroll >= state.peakBankroll;
        
        // Update peak bankroll watermark
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
        }

        if (isWin) {
            if (isSessionPeak) {
                // Hard reset if we hit a new profit peak
                state.fibIndex = 0;
                state.basketFibIndex = 4;
                state.consecutiveLosses = 0;
                state.basketActive = false;
            } else {
                // Rebet (freeze progression) if we won but aren't at peak profit yet.
                // We reset consecutive losses so it doesn't artificially trigger the basket again,
                // but we keep the current fib indices and basket active state intact.
                state.consecutiveLosses = 0; 
            }
        } else {
            // Loss progression
            state.consecutiveLosses++;
            
            // Advance High bet Fibonacci index
            state.fibIndex = Math.min(state.fibIndex + 1, fib.length - 1);
            
            // Advance Basket bet Fibonacci index if it is already active
            if (state.basketActive) {
                state.basketFibIndex = Math.min(state.basketFibIndex + 1, fib.length - 1);
            }

            // Trigger the basket bet upon hitting the 3rd consecutive loss
            if (state.consecutiveLosses === 3) {
                state.basketActive = true;
            }
        }
    }

    // 3. Calculate Bet Amounts and Construct Bet Array
    const bets = [];
    const outsideUnit = config.betLimits.minOutside; 
    const insideUnit = config.betLimits.min;

    // Calculate High bet amount and clamp to table limits
    let highAmount = fib[state.fibIndex] * outsideUnit;
    highAmount = Math.max(highAmount, config.betLimits.minOutside);
    highAmount = Math.min(highAmount, config.betLimits.max);

    bets.push({ type: 'high', amount: highAmount });

    // Calculate and place Basket bet amount if active
    if (state.basketActive) {
        let basketAmount = fib[state.basketFibIndex] * insideUnit;
        basketAmount = Math.max(basketAmount, config.betLimits.min);
        basketAmount = Math.min(basketAmount, config.betLimits.max);
        
        bets.push({ type: 'basket', value: 0, amount: basketAmount });
    }

    return bets;
}