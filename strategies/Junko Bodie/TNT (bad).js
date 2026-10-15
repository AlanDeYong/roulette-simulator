/**
 * ============================================================================
 * ROUTETTE STRATEGY FUNCTION: TNT (Teens & 20s)
 * ============================================================================
 * 
 * SOURCE:
 * - Video URL: https://youtu.be/OSMDjiiWsQA
 * - Channel: Junko Bodie
 * 
 * FULL LOGIC:
 * - "TNT" stands for "Teens and 20s". The strategy covers all 20 numbers from 10 to 29.
 * - Efficient Coverage Layout (Base 1 Unit = $20 total bet):
 *   1) 2nd Dozen (numbers 13–24): 12 units
 *   2) Straight-up on 10: 1 unit
 *   3) Straight-up on 11: 1 unit
 *   4) Straight-up on 12: 1 unit
 *   5) Straight-up on 25: 1 unit
 *   6) Straight-up on 26: 1 unit
 *   7) Straight-up on 27: 1 unit
 *   8) Straight-up on 28: 1 unit
 *   9) Straight-up on 29: 1 unit
 * - Any winning number from 10 to 29 yields a 36-unit total payout, resulting in a 
 *   +16 unit net profit per base spin.
 * 
 * FULL BET PROGRESSION:
 * - Base progression follows a 1x -> 2x -> 4x doubling progression on losses.
 * - After a WIN:
 *   - If bankroll reaches or exceeds the highest recorded session bankroll (Session High), 
 *     reset progression level back to 1x.
 * - After a LOSS:
 *   - Double the bet multiplier (1x -> 2x -> 4x).
 * - Recovery Mode (if 3 consecutive losses occur):
 *   - Continue doubling or increase unit size (e.g. 8x / split recovery) until 
 *     the loss is recovered, then reset back to 1x upon reaching a new session high.
 * 
 * GOAL:
 * - Reach a target profit (e.g., +$100 to +$300 or 1-2 session highs) per session and exit.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
        state.multiplier = 1;
        state.lossStreak = 0;
    }

    // Update Session High & Progression Logic after spins
    if (spinHistory.length > 0) {
        // If bankroll reaches or exceeds previous high, reset progression
        if (bankroll >= state.sessionHigh) {
            state.sessionHigh = bankroll;
            state.multiplier = 1;
            state.lossStreak = 0;
        } else {
            // Check if last spin was a win or loss for our covered numbers (10 to 29)
            const lastSpin = spinHistory[spinHistory.length - 1];
            const winningNum = lastSpin.winningNumber;
            const isWin = (winningNum >= 10 && winningNum <= 29);

            if (isWin) {
                // On win without reaching new session high, maintain or step down multiplier
                if (state.multiplier > 1) {
                    state.multiplier = Math.max(1, Math.floor(state.multiplier / 2));
                }
            } else {
                // On loss, double multiplier
                state.lossStreak++;
                state.multiplier *= 2;
            }
        }
    }

    // 2. Base Unit Calculation
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // Unit multiplier applied to base units
    const mult = state.multiplier;

    // Calculate raw bet amounts
    let insideBetAmount = minInside * mult;
    let dozenBetAmount = Math.max(minInside * 12 * mult, minOutside);

    // Clamp amounts to table limits
    insideBetAmount = Math.max(insideBetAmount, minInside);
    insideBetAmount = Math.min(insideBetAmount, maxBet);

    dozenBetAmount = Math.max(dozenBetAmount, minOutside);
    dozenBetAmount = Math.min(dozenBetAmount, maxBet);

    // 3. Construct Bet Array
    const bets = [
        // 2nd Dozen covers 13 to 24
        { type: 'dozen', value: 2, amount: dozenBetAmount },
        
        // Remaining Teens (10, 11, 12)
        { type: 'number', value: 10, amount: insideBetAmount },
        { type: 'number', value: 11, amount: insideBetAmount },
        { type: 'number', value: 12, amount: insideBetAmount },
        
        // Remaining 20s (25, 26, 27, 28, 29)
        { type: 'number', value: 25, amount: insideBetAmount },
        { type: 'number', value: 26, amount: insideBetAmount },
        { type: 'number', value: 27, amount: insideBetAmount },
        { type: 'number', value: 28, amount: insideBetAmount },
        { type: 'number', value: 29, amount: insideBetAmount }
    ];

    // Optional Zeros coverage during high recovery streak (e.g. lossStreak >= 3)
    if (state.lossStreak >= 3) {
        bets.push({ type: 'number', value: 0, amount: insideBetAmount });
        if (config.tableType === 'american') {
            bets.push({ type: 'number', value: '00', amount: insideBetAmount });
        }
    }

    return bets;
}