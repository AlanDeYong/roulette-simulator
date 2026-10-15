/**
 * ROULETTE STRATEGY: Dozen High / Low Bankroll Hi Coverage
 *
 * Source: https://youtu.be/bSvljqrkAOQ
 * Channel: WillVegas
 *
 * The Full Logic in details:
 * - The strategy requires no specific triggers and bets on every spin.
 * - It places bets simultaneously on the 1st Dozen (numbers 1-12) and the High half (numbers 19-36).
 * - This creates high table coverage: 30 winning numbers vs. 8 losing numbers 
 *   (0, 00, and the gap of 13-18).
 * - The bet ratio MUST strictly be 2 units on the 1st Dozen and 3 units on High 
 *   to ensure either winning condition results in a positive net profit. 
 *
 * The Full Bet Progression in details:
 * - Initial bets: 2 units on 1st Dozen, 3 units on High.
 * - On a Loss: The strategy uses a Martingale approach, doubling the bet multiplier 
 *   (1x -> 2x -> 4x -> 8x) to recover the loss.
 * - On a Win: Because recovery happens slowly at higher tiers (e.g., grinding $4 profit 
 *   per win against a $15 deficit), the strategy maintains the current multiplied bet size 
 *   until the entire sequence deficit is cleared (>= 0), at which point it resets to the base bet.
 *
 * The Goal:
 * - A slow, high-win-rate grinding strategy. The video targets a modest session 
 *   profit (e.g., $30 on a $200 bankroll) by capitalizing on 78%+ table coverage 
 *   while managing the occasional double-loss streak through limit clamping.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish strict 2:3 ratio ensuring both meet the outside minimum
    const baseRatioDozen = 2;
    const baseRatioHigh = 3;
    
    // By dividing the minimum by the smaller ratio (2), we guarantee both bets are >= minOutside
    const baseUnit = Math.ceil(config.betLimits.minOutside / baseRatioDozen);

    // 2. Initialize State
    if (state.multiplier === undefined) state.multiplier = 1;
    if (state.deficit === undefined) state.deficit = 0;

    // 3. Process the last spin to handle progression
    if (spinHistory.length > 0 && state.lastBet) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const number = lastSpin.winningNumber;

        // Check if winning number falls in our coverage
        const wonDozen = (number >= 1 && number <= 12);
        const wonHigh = (number >= 19 && number <= 36);

        const totalBet = state.lastBet.dozen + state.lastBet.high;
        let profit = 0;

        if (wonDozen) {
            // 1st Dozen pays 2:1 (returns bet + 2x profit, total payout is 3x the bet)
            profit = (state.lastBet.dozen * 3) - totalBet;
        } else if (wonHigh) {
            // High pays 1:1 (returns bet + 1x profit, total payout is 2x the bet)
            profit = (state.lastBet.high * 2) - totalBet;
        } else {
            profit = -totalBet;
        }

        // Track the current progression's net loss/profit
        state.deficit += profit;

        // Apply Progression Rules
        if (profit < 0) {
            // Video strictly doubles up on loss (Martingale)
            state.multiplier *= 2;
        } else {
            // On win, we either reset if recovered, or grind at current multiplier
            if (state.deficit >= 0) {
                state.multiplier = 1;
                state.deficit = 0; // Reset sequence
            }
        }
    }

    // 4. Calculate Current Bet Amounts
    let dozenAmount = baseRatioDozen * baseUnit * state.multiplier;
    let highAmount = baseRatioHigh * baseUnit * state.multiplier;

    // 5. CLAMP TO LIMITS (Crucial)
    // Respect Max Limit but MUST preserve the 2:3 ratio mathematically
    if (dozenAmount > config.betLimits.max || highAmount > config.betLimits.max) {
        const maxMultD = Math.floor(config.betLimits.max / (baseRatioDozen * baseUnit));
        const maxMultH = Math.floor(config.betLimits.max / (baseRatioHigh * baseUnit));
        const capMult = Math.min(maxMultD, maxMultH);
        
        dozenAmount = baseRatioDozen * baseUnit * capMult;
        highAmount = baseRatioHigh * baseUnit * capMult;
        state.multiplier = capMult; // Update state to reflect forced cap
    }

    // Ensure Bankroll can afford the total bet while preserving ratio
    const totalRequired = dozenAmount + highAmount;
    if (totalRequired > bankroll) {
        const affordableMult = Math.floor(bankroll / ((baseRatioDozen + baseRatioHigh) * baseUnit));
        if (affordableMult < 1) {
            return []; // Cannot afford the minimum base bet ratio
        }
        dozenAmount = baseRatioDozen * baseUnit * affordableMult;
        highAmount = baseRatioHigh * baseUnit * affordableMult;
        state.multiplier = affordableMult;
    }

    // 6. Record bet for next spin's processing
    state.lastBet = { dozen: dozenAmount, high: highAmount };

    // 7. Return Bets
    return [
        { type: 'dozen', value: 1, amount: dozenAmount },
        { type: 'high', amount: highAmount }
    ];
}