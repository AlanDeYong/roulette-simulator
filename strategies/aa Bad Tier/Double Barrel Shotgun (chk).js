/**
 * Double Barrel Shotgun Roulette Strategy
 * * Source: https://www.youtube.com/watch?v=EE_-Y2KR-b4 (CEG Dealer School)
 * * The Logic: A high-coverage, low-margin "hit and run" system. The strategy covers 30 
 * out of 38 numbers on the wheel, deliberately leaving 8 numbers uncovered to minimize 
 * variance: 0, 00, 5, 6, 17, 18, 31, and 32. 
 * * The 30 covered numbers are mathematically grouped into 15 disjoint adjacent pairs (splits) 
 * on the betting felt. A single bet is placed on each of the 15 splits, AND a straight-up 
 * bet is placed on every single one of the 30 numbers. 
 * Total cost = 45 units per spin (15 splits + 30 straight-ups).
 * * If any of the 30 covered numbers hit, the player wins exactly one straight-up bet (35:1) 
 * and exactly one split bet (17:1). This returns 52 units in profit, plus the 2 original 
 * winning bet units, yielding a total return of 54 units. 
 * Net profit per winning spin is precisely 9 units.
 * * The Progression: Flat betting only. The asymmetrical risk is too high (risking 45 units 
 * to win 9) to safely support a Martingale or any positive progression. Bets remain fixed.
 * * The Goal: The strategy's creator explicitly recommends stopping after 2 or 3 wins 
 * (18 to 27 units profit) before the math catches up to the player. This function 
 * implements a hard session stop after achieving +3 wins (27 units profit) or if the 
 * bankroll drops below the required 45-unit buy-in.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    // The strategy is designed around a 45-unit spread.
    const unit = Math.max(config.betLimits.min, 1);
    const totalBetCost = 45 * unit;

    // 2. Initialize Session State
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.active = true;
    }

    // Calculate current progress against our goals
    const currentProfit = bankroll - state.initialBankroll;
    const targetProfit = 27000 * unit; // Hard stop goal: 3 wins (9 units profit each)

    // 3. Stop Conditions
    // Halt betting if we hit our target profit, or if we suffer a total wipeout loss 
    // and can no longer afford the heavy 45-unit spread.
    if (!state.active || currentProfit >= targetProfit || bankroll < totalBetCost) {
        state.active = false;
        return []; // End session
    }

    // 4. Define the 15 specific board splits that safely cover the 30 target numbers.
    // Explicitly avoids: 0, 00, 5, 6, 17, 18, 31, 32
    const pairs = [
        [1, 4], [2, 3],               // Covers 1, 2, 3, 4
        [7, 10], [8, 11], [9, 12],    // Covers 7, 8, 9, 10, 11, 12
        [13, 16], [14, 15],           // Covers 13, 14, 15, 16
        [19, 22], [20, 23], [21, 24], // Covers 19, 20, 21, 22, 23, 24
        [25, 28], [26, 29], [27, 30], // Covers 25, 26, 27, 28, 29, 30
        [33, 36], [34, 35]            // Covers 33, 34, 35, 36
    ];

    let bets = [];

    // 5. Place Bets and Clamp to Configured Limits
    const betAmount = Math.min(unit, config.betLimits.max);

    for (let i = 0; i < pairs.length; i++) {
        const [numA, numB] = pairs[i];
        
        // Place the Split bet
        bets.push({ type: 'split', value: [numA, numB], amount: betAmount });
        
        // Place the Straight-up bets on both numbers inside the split
        bets.push({ type: 'number', value: numA, amount: betAmount });
        bets.push({ type: 'number', value: numB, amount: betAmount });
    }

    return bets;
}