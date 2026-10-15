/**
 * The Roaring Twenties Strategy
 * 
 * Source:
 * - URL: https://youtu.be/TSnUKevJjug
 * - Channel: The Roulette Master (Submitted by subscriber Kevin Logan)
 * 
 * The Full Logic in Detail:
 * - The strategy places straight-up inside bets on every roulette number containing the digit "2".
 * - Exactly 12 numbers qualify: [2, 12, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 32].
 * - Each qualifying number receives an equal straight-up inside bet.
 * 
 * The Full Bet Progression in Detail:
 * - Base Bet: 1 unit per number (clamped to config.betLimits.min).
 * - While in Session Profit (bankroll >= initial starting bankroll):
 *   - Flat bet 1 unit across all 12 numbers.
 * - When in Deficit (bankroll < initial starting bankroll):
 *   - If a loss occurs while down, increase the bet by the base bet amount (+1 unit).
 *   - Upon any win, reset the progression multiplier back to base level (1x).
 * 
 * The Goal:
 * - Designed as a hit-and-run strategy to capitalize on positive variance across the "twenties" and "2" numbers,
 *   recovering deficits via linear unit increments while preserving bankroll via flat-betting when in profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish the 12 numbers containing the digit "2"
    const roaringTwentiesNumbers = [2, 12, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 32];

    // 2. Initialize persistent state
    if (state.initialBankroll === undefined) {
        state.initialBankroll = (config && config.startingBankroll) ? config.startingBankroll : bankroll;
        state.multiplier = 1;
    }

    // 3. Evaluate previous spin outcome if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        const wonLastSpin = roaringTwentiesNumbers.includes(lastNumber);

        if (wonLastSpin) {
            // Reset to base multiplier on any win
            state.multiplier = 1;
        } else {
            // On a loss: increase by 1 base unit only if currently below starting bankroll
            if (bankroll < state.initialBankroll) {
                state.multiplier += 1;
            } else {
                state.multiplier = 1;
            }
        }
    }

    // 4. Calculate unit size and bet amount adhering to bet limits
    const minInside = (config && config.betLimits && config.betLimits.min) ? config.betLimits.min : 2;
    const maxLimit = (config && config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;

    let betPerNumber = minInside * state.multiplier;
    betPerNumber = Math.max(betPerNumber, minInside);
    betPerNumber = Math.min(betPerNumber, maxLimit);

    // Ensure total required bankroll is available
    const totalRequired = betPerNumber * roaringTwentiesNumbers.length;
    if (bankroll < totalRequired) {
        // Adjust downward if bankroll cannot cover full set at current multiplier
        betPerNumber = Math.floor(bankroll / roaringTwentiesNumbers.length);
        if (betPerNumber < minInside) {
            return []; // Cannot meet table minimum
        }
    }

    // 5. Construct and return straight-up bet objects
    return roaringTwentiesNumbers.map(function(num) {
        return {
            type: 'number',
            value: num,
            amount: betPerNumber
        };
    });
}