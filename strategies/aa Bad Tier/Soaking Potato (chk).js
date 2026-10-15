/**
 * Strategy: Soaking Potato
 * Source: CEG Dealer School (https://youtu.be/z3bU4MOlUjk)
 * 
 * The Full Logic in details:
 * This is a 3-step compound parlay strategy designed for players on a budget.
 * - Step 1: Bet on 5 non-touching splits. 
 * - Step 2: If Step 1 wins, use the total return to bet proportionally on two Dozens. 
 *   A larger bet is placed on one dozen (the "biggie") and a smaller bet on another (the "push").
 * - Step 3: If the "biggie" dozen hits in Step 2, pocket half the return and use the 
 *   remaining half to bet a mix of an Even-Money bet, a Basket, and 3 splits.
 * 
 * The Full Bet Progression in details:
 * The strategy uses a fixed base unit (u) and parlays winnings instead of increasing bets on a loss.
 * - Step 1: Bet 1u on 5 different splits (Total: 5u). 
 *   - If lose: Repeat Step 1 (Flat bet).
 *   - If win: Move to Step 2.
 * - Step 2: Bet 12u on Dozen 3 and 6u on Dozen 2 (Total: 18u).
 *   - If Dozen 3 hits (the biggie): Move to Step 3.
 *   - If Dozen 2 hits (the push): Repeat Step 2.
 *   - If lose (Dozen 1 or Zero): Reset to Step 1.
 * - Step 3: Bet 10u on Black, 2u on Basket, and 2u on 3 Red splits (Total: 18u).
 *   - Regardless of win or loss on Step 3, reset back to Step 1 to secure profits.
 * 
 * The Goal: 
 * Turn a small initial split bet (5u) into a large compounded payout across 3 successful stages, 
 * locking in profits before resetting. There is no set stop-loss or profit target.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine Base Unit (u)
    // We must ensure that the smallest outside bet in Step 2 (6u) meets the table's minOutside limit.
    let u = config.betLimits.min;
    if (6 * u < config.betLimits.minOutside) {
        u = Math.ceil(config.betLimits.minOutside / 6);
    }

    // 2. Initialize State
    if (state.step === undefined) {
        state.step = 1;
    }

    // 3. Check Previous Spin to Determine Next Step
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        if (state.step === 1) {
            // Check if one of our 5 splits hit ([1,2], [4,5], [7,8], [10,11], [13,14])
            const step1Numbers = [1, 2, 4, 5, 7, 8, 10, 11, 13, 14];
            if (step1Numbers.includes(num)) {
                state.step = 2; // Win -> Progress
            } else {
                state.step = 1; // Lose -> Rebet
            }
        } else if (state.step === 2) {
            // We bet Dozen 3 and Dozen 2
            if (num >= 25 && num <= 36) {
                state.step = 3; // Hit the Dozen 3 "biggie" -> Progress
            } else if (num >= 13 && num <= 24) {
                state.step = 2; // Hit the Dozen 2 "push" -> Rebet
            } else {
                state.step = 1; // Lose -> Reset
            }
        } else if (state.step === 3) {
            // After Step 3, we always reset to Step 1 to lock in the remaining profits
            state.step = 1;
        }
    }

    // 4. Construct Bets Based on Current Step
    let bets = [];

    if (state.step === 1) {
        let amount = Math.min(u, config.betLimits.max);
        
        bets.push({ type: 'split', value: [1, 2], amount: amount });
        bets.push({ type: 'split', value: [4, 5], amount: amount });
        bets.push({ type: 'split', value: [7, 8], amount: amount });
        bets.push({ type: 'split', value: [10, 11], amount: amount });
        bets.push({ type: 'split', value: [13, 14], amount: amount });
        
    } else if (state.step === 2) {
        // 12u on Dozen 3, 6u on Dozen 2
        let doz3Amount = Math.max(12 * u, config.betLimits.minOutside);
        doz3Amount = Math.min(doz3Amount, config.betLimits.max);
        
        let doz2Amount = Math.max(6 * u, config.betLimits.minOutside);
        doz2Amount = Math.min(doz2Amount, config.betLimits.max);
        
        bets.push({ type: 'dozen', value: 3, amount: doz3Amount });
        bets.push({ type: 'dozen', value: 2, amount: doz2Amount });
        
    } else if (state.step === 3) {
        // 10u on Black, 2u on Basket, 2u on 3 Red splits
        let blackAmount = Math.max(10 * u, config.betLimits.minOutside);
        blackAmount = Math.min(blackAmount, config.betLimits.max);
        
        let basketAmount = Math.min(2 * u, config.betLimits.max);
        let splitAmount = Math.min(2 * u, config.betLimits.max);
        
        bets.push({ type: 'black', amount: blackAmount });
        bets.push({ type: 'basket', value: 0, amount: basketAmount });
        
        // Covering 3 Red splits as a hedge for the Black bet
        bets.push({ type: 'split', value: [9, 12], amount: splitAmount });
        bets.push({ type: 'split', value: [16, 19], amount: splitAmount });
        bets.push({ type: 'split', value: [27, 30], amount: splitAmount });
    }

    return bets;
}