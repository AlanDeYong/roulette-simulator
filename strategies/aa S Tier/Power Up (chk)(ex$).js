/**
 * Power Up Roulette Strategy (Updated: Rebet on Partial Wins)
 * 
 * Source:
 * - Channel: Casino Matchmaker
 * - Video URL: https://youtu.be/odLw7k_HsBg
 * - Creator / Presenter: Brent (All Black Roulette) / OTS 1920
 * 
 * Full Logic Details:
 * 1. The strategy combines an outside bet on the top column (Column 3 covering 3, 6, 9, 12... 36)
 *    with a series of overlapping corner bets along the top section of the roulette grid (2-6, 5-9, 8-12, 11-15, 14-18).
 * 2. Numbers like 6, 9, and 12 act as "jackpot" numbers because they are covered by two corner bets simultaneously 
 *    as well as the top column bet.
 * 
 * Full Bet Progression Details:
 * - Level 1: Place 1 unit on Corner 2 (2, 3, 5, 6) and 1 unit on Column 3. (Total 2 units)
 * - Level 2: Add Corner 5 (5, 6, 8, 9) and +1 unit to Column 3, then double all bets.
 *   Result: Corner 2 (2 units), Corner 5 (2 units), Column 3 (4 units). (Total 8 units)
 * - Level 3: Add Corner 8 (8, 9, 11, 12) and +1 unit to Column 3, then double all bets.
 *   Result: Corners 2, 5, 8 (4 units each), Column 3 (12 units). (Total 24 units)
 * - Level 4: Add Corner 11 (11, 12, 14, 15) and +1 unit to Column 3, then double all bets.
 *   Result: Corners 2, 5, 8, 11 (8 units each), Column 3 (32 units). (Total 64 units)
 * - Level 5: Add Corner 14 (14, 15, 17, 18) and +1 unit to Column 3, then double all bets.
 *   Result: Corners 2, 5, 8, 11, 14 (16 units each), Column 3 (80 units). (Total 160 units)
 * - Level L (> 5): Straight Martingale — double all Level 5 bets for each additional loss level.
 * 
 * Reset & Progression Rules:
 * - Full Win / Session Peak (`bankroll > peakBankroll`): Reset level back to Level 1.
 * - Partial Win (`bankroll > prevBankroll` but `bankroll <= peakBankroll`): Rebet at current level (do not advance level).
 * - Loss (`bankroll <= prevBankroll`): Advance to the next progression level (`level + 1`).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize session state on first spin
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
        state.prevBankroll = bankroll;
        state.level = 1;
    }

    // 2. Evaluate previous spin result to adjust progression level
    if (spinHistory && spinHistory.length > 0) {
        if (bankroll > state.peakBankroll) {
            // New session high bankroll -> Reset to Level 1
            state.peakBankroll = bankroll;
            state.level = 1;
        } else if (bankroll > state.prevBankroll) {
            // Partial win -> Rebet current level (do not increase state.level)
        } else {
            // Loss -> Advance progression level
            state.level += 1;
        }
    }

    // Update bankroll tracker for the next spin comparison
    state.prevBankroll = bankroll;

    // 3. Determine base unit amounts according to table limits
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    const level = state.level;

    // Active corner bet positions by level
    const cornerPositions = [2, 5, 8, 11, 14];

    // Determine how many corners are active at current level
    const activeCornersCount = Math.min(level, 5);

    // Calculate unit multiplier for corners and column based on level
    let cornerMultiplier = 1;
    let columnMultiplier = 1;

    if (level === 1) {
        cornerMultiplier = 1;
        columnMultiplier = 1;
    } else if (level === 2) {
        cornerMultiplier = 2;
        columnMultiplier = 4;
    } else if (level === 3) {
        cornerMultiplier = 4;
        columnMultiplier = 12;
    } else if (level === 4) {
        cornerMultiplier = 8;
        columnMultiplier = 32;
    } else {
        // Level 5 and beyond (Level 5 base * 2^(level - 5))
        const doubleFactor = Math.pow(2, level - 5);
        cornerMultiplier = 16 * doubleFactor;
        columnMultiplier = 80 * doubleFactor;
    }

    const bets = [];

    // 4. Build Corner Bets (Inside Bets)
    for (let i = 0; i < activeCornersCount; i++) {
        let cornerAmount = minInside * cornerMultiplier;
        cornerAmount = Math.max(cornerAmount, minInside);
        cornerAmount = Math.min(cornerAmount, maxBet);

        bets.push({
            type: 'corner',
            value: cornerPositions[i],
            amount: cornerAmount
        });
    }

    // 5. Build Column Bet (Outside Bet on Column 3)
    let columnAmount = minOutside * columnMultiplier;
    columnAmount = Math.max(columnAmount, minOutside);
    columnAmount = Math.min(columnAmount, maxBet);

    bets.push({
        type: 'column',
        value: 3,
        amount: columnAmount
    });

    return bets;
}