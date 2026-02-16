/**
 * Strategy: Rexma Roulette System
 * * * Source:
 * Video: "#1 MOST POPULAR NEW ROULETTE SYSTEM!"
 * Channel: The Roulette Master TV
 * URL: https://www.youtube.com/watch?v=sAF-CAI9xmA
 * * * The Logic:
 * - Fixed Betting Pattern: Covers ~50% of the board using 4 Corners and 1 Split.
 * 1. Corner 1-5 (Covers 1, 2, 4, 5)
 * 2. Corner 7-11 (Covers 7, 8, 10, 11)
 * 3. Corner 13-17 (Covers 13, 14, 16, 17)
 * 4. Corner 19-23 (Covers 19, 20, 22, 23)
 * 5. Split 25-26 (Covers 25, 26)
 * - Coverage: 18 numbers total.
 * * * The Progression (The Ladder):
 * - It uses a "Ladder" of bet multipliers: 1x, 2x, 4x, 8x, 16x...
 * - There are TWO STEPS at each ladder level (Step 1 and Step 2).
 * Example Ladder:
 * - Level 0: 1 Unit (Step 1), 1 Unit (Step 2)
 * - Level 1: 2 Units (Step 1), 2 Units (Step 2)
 * - Level 2: 4 Units (Step 1), 4 Units (Step 2)
 * * - MOVEMENT RULES:
 * - ON LOSS: Move UP the ladder.
 * - If on Step 1 -> Move to Step 2 of same level.
 * - If on Step 2 -> Move to Step 1 of NEXT level.
 * - ON WIN: Move DOWN the ladder.
 * - If on Step 2 -> Move to Step 1 of same level.
 * - If on Step 1 -> Move to Step 2 of PREVIOUS level.
 * * * The Goal & Reset:
 * - Target: Recover losses and make a profit.
 * - CRITICAL RULE: If the bankroll exceeds the starting bankroll (Session Profit) at any point,
 * IMMEDIATELY reset the ladder to Level 0, Step 1.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Base Unit (Use simulator minimum for inside bets)
    const baseUnit = config.betLimits.min;

    // 2. Initialize State
    if (state.ladderLevel === undefined) state.ladderLevel = 0;
    if (state.step === undefined) state.step = 0; // 0 = 1st attempt, 1 = 2nd attempt
    if (state.initialBankroll === undefined) state.initialBankroll = bankroll;

    // 3. Process Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Calculate the outcome of the specific Rexma bets to determine Win/Loss logic
        // We can't rely solely on 'lastSpin.totalPayout' because we need to know if we netted positive
        // relative to the specific bet we placed.
        // However, in this system, any hit on the 5 bets results in a Net Profit.
        // Cost: 5 units. 
        // Corner Win: Pays 8:1 (+ original 1) = 9 return. Net +4.
        // Split Win: Pays 17:1 (+ original 1) = 18 return. Net +13.
        // Therefore: Any payout > 0 is a "Win" for progression purposes.

        const isWin = lastSpin.totalPayout > 0;
        const inSessionProfit = bankroll > state.initialBankroll;

        if (inSessionProfit) {
            // PROFIT TAKING RESET (Crucial Rule)
            // If we are profitable overall, reset to base to protect gains.
            state.ladderLevel = 0;
            state.step = 0;
        } else if (isWin) {
            // LOGIC ON WIN: Move DOWN the ladder
            if (state.step === 1) {
                // If on 2nd attempt, go to 1st attempt of SAME level
                state.step = 0;
            } else {
                // If on 1st attempt, go to 2nd attempt of PREVIOUS level
                if (state.ladderLevel > 0) {
                    state.ladderLevel--;
                    state.step = 1;
                }
                // If already at Level 0 Step 0, stay there.
            }
        } else {
            // LOGIC ON LOSS: Move UP the ladder
            if (state.step === 0) {
                // If on 1st attempt, go to 2nd attempt of SAME level
                state.step = 1;
            } else {
                // If on 2nd attempt, go to 1st attempt of NEXT level
                state.ladderLevel++;
                state.step = 0;
            }
        }
    }

    // 4. Calculate Current Bet Amount
    // Multiplier doubles every level: 2^level
    // Level 0 = 1x, Level 1 = 2x, Level 2 = 4x...
    const multiplier = Math.pow(2, state.ladderLevel);
    let betPerSpot = baseUnit * multiplier;

    // 5. Check Limits
    // Clamp individual bet to max
    betPerSpot = Math.min(betPerSpot, config.betLimits.max);

    // Safety Check: Total Bet = 5 * betPerSpot. 
    // If bankroll is too low, we stop or bet what we can. 
    // Returning empty array stops the run gracefully if bust.
    if (betPerSpot * 5 > bankroll) return [];

    // 6. Define The 5 Bets
    // Note: Corner values are usually the top-left number.
    // Split values are an array of the two numbers.
    const bets = [
        // Corner 1-2-4-5 (Top-left 1)
        { type: 'corner', value: 1, amount: betPerSpot },
        
        // Corner 7-8-10-11 (Top-left 7)
        { type: 'corner', value: 7, amount: betPerSpot },
        
        // Corner 13-14-16-17 (Top-left 13)
        { type: 'corner', value: 13, amount: betPerSpot },
        
        // Corner 19-20-22-23 (Top-left 19)
        { type: 'corner', value: 19, amount: betPerSpot },
        
        // Split 25-26
        { type: 'split', value: [25, 26], amount: betPerSpot }
    ];

    return bets;
}