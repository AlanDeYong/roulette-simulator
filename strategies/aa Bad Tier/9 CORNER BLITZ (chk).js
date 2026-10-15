/**
 * ============================================================================
 * STRATEGY DOCUMENTATION: THE NINE CORNER BLITZ
 * ============================================================================
 * * SOURCE:
 * - YouTube Channel: The Roulette Master
 * - Video URL: https://youtu.be/WBU9Gx6_mA0
 * - Strategy Origin: Billy Williams ("The Nine Corner Blitz")
 * * THE FULL LOGIC IN DETAIL:
 * - This strategy places bets on every single spin, creating wide table coverage
 * (covering 34 out of 37 numbers on a European wheel, or 34 out of 38 on American).
 * - Target / Winning Area:
 * - The main profit driver is Column 3 (the top row: 3, 6, 9, 12, 15, 18, 21,
 * 24, 27, 30, 33, 36), which pays 2:1.
 * - Defensive Coverage Area:
 * - 9 connecting Corner bets along the horizontal line dividing the 2nd row
 * and 1st row (covering numbers 4 through 32 across rows 1 and 2).
 * - 1 Straight-up bet on 0.
 * - Uncovered Numbers (Total Loss):
 * - Numbers 1, 2, 34, 35 (and 00 if played on an American wheel).
 * * BET POSITIONS & INITIAL SIZING:
 * - Base Unit Ratio: 1 unit on each of 9 Corners, 1 unit on Number 0, and 15 units on Column 3.
 * - Total base bet = 25 units ($25 in the video: $1 on each corner, $1 on 0, $15 on Col 3).
 * - 9 Corners:
 * 1. Corner 4  (covers 4, 5, 7, 8)
 * 2. Corner 7  (covers 7, 8, 10, 11)
 * 3. Corner 10 (covers 10, 11, 13, 14)
 * 4. Corner 13 (covers 13, 14, 16, 17)
 * 5. Corner 16 (covers 16, 17, 19, 20)
 * 6. Corner 19 (covers 19, 20, 22, 23)
 * 7. Corner 22 (covers 22, 23, 25, 26)
 * 8. Corner 25 (covers 25, 26, 28, 29)
 * 9. Corner 28 (covers 28, 29, 31, 32)
 * - 1 Straight Up: Number 0
 * - 1 Column: Column 3
 * * THE FULL BET PROGRESSION IN DETAIL:
 * - Outcome 1: WIN (Column 3 hits)
 * - Column 3 pays 2:1, producing a net session win.
 * - Reset bet multiplier back to 1 (base level: 25 units).
 * - Outcome 2: FULL / TOTAL LOSS (Uncovered numbers hit: 1, 2, 34, 35, or 00)
 * - A complete whiff where no bet is hit.
 * - Double the bet multiplier: multiplier = multiplier * 2.
 * - Outcome 3: PARTIAL LOSS (Any covered defensive number hits: 0 or numbers in corners)
 * - Payout recovers part of the total outlay, resulting in a minor loss.
 * - Increase the bet by the base starting amount: multiplier = multiplier + 1.
 * * THE GOAL:
 * - Profit Target: Typically +$300 (or +300 units) above the starting bankroll per session.
 * - Stop Loss: When bankroll drops below the minimum required capital to place the next bet.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Column 3 numbers and uncovered numbers definitions
    const column3Numbers = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
    const totalLossNumbers = [1, 2, 34, 35, '00', 37];
    const cornerRoots = [4, 7, 10, 13, 16, 19, 22, 25, 28];

    // 2. Initialize Persistent State
    if (!state.initialized) {
        state.initialized = true;
        state.multiplier = 1;
        state.initialBankroll = bankroll;
        state.targetProfit = 300; // Default session profit target (300 units)
    }

    // 3. Evaluate previous spin result (if any) to determine progression
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        if (column3Numbers.includes(lastNum)) {
            // Target hit: Full Win -> Reset to base
            state.multiplier = 1;
        } else if (totalLossNumbers.includes(lastNum)) {
            // Uncovered number: Total Loss -> Double current bet
            state.multiplier *= 2;
        } else {
            // Covered defensive number: Partial Loss -> Add 1 base unit
            state.multiplier += 1;
        }
    }

    // 4. Session Profit Target Check
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        // Target achieved; lock in profit and reset or pause
        state.multiplier = 1;
    }

    // 5. Determine Base Bet Units respecting config limits
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxLimit = config.betLimits.max || 500;

    // Ensure 1:15 ratio is preserved while meeting both inside and outside minimums
    const baseInsideUnit = Math.max(minInside, Math.ceil(minOutside / 15));
    const baseColumnUnit = Math.max(minOutside, baseInsideUnit * 15);

    // Calculate bet sizes scaled by the progression multiplier
    let insideBetAmount = baseInsideUnit * state.multiplier;
    let columnBetAmount = baseColumnUnit * state.multiplier;

    // Clamp bet amounts strictly within table limits
    insideBetAmount = Math.max(minInside, Math.min(insideBetAmount, maxLimit));
    columnBetAmount = Math.max(minOutside, Math.min(columnBetAmount, maxLimit));

    // 6. Check Total Required Bankroll for this spin
    const totalSpinCost = (insideBetAmount * 10) + columnBetAmount; // 9 corners + 1 straight up + 1 column
    if (bankroll < totalSpinCost) {
        // Insufficient funds to sustain current progression level
        return null;
    }

    // 7. Construct and return bets array
    const bets = [];

    // 9 Corner Bets
    for (let i = 0; i < cornerRoots.length; i++) {
        bets.push({
            type: 'corner',
            value: cornerRoots[i],
            amount: insideBetAmount
        });
    }

    // 1 Straight-up bet on 0
    bets.push({
        type: 'number',
        value: 0,
        amount: insideBetAmount
    });

    // 1 Column bet on Column 3
    bets.push({
        type: 'column',
        value: 3,
        amount: columnBetAmount
    });

    return bets;
}