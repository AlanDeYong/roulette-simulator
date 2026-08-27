/**
 * ============================================================================
 * ROULETTE STRATEGY: The Gold Mine Strategy
 * Source: "Strike it Rich!!! (The Gold Mine Strategy)" by Todd Hoover (The Lucky Felt)
 * Video URL: https://youtu.be/-berDrJ8yPg
 * ============================================================================
 * 
 * THE FULL LOGIC IN DETAIL:
 * -------------------------
 * The Gold Mine Strategy focuses coverage on the lower and middle numbers using
 * three simultaneous outside bets:
 *   1. Low (1-18)
 *   2. 1st Dozen (1-12)
 *   3. 2nd Dozen (13-24)
 * 
 * Outcome Zones:
 *   - Motherload (1-12): Hits both 1-18 and 1st Dozen (massive win).
 *   - Safe Digging (13-18): Hits both 1-18 and 2nd Dozen (solid win).
 *   - Drag / Zone 3 (19-24): Hits 2nd Dozen, but misses 1-18 and 1st Dozen.
 *   - Mine Collapse (25-36 or 0/00): Complete miss across all three bets.
 * 
 * THE FULL BET PROGRESSION IN DETAIL:
 * -----------------------------------
 * Base Units:
 *   - Initial bet consists of 1 base unit on 'low', 1 unit on 'dozen 1', and 1 unit on 'dozen 2'.
 * 
 * Progression Rules per Outcome:
 *   - On Total Loss (Mine Collapse - 25 to 36, 0, or 00):
 *       Increase ALL three bets ('low', 'dozen 1', 'dozen 2') by 1 unit.
 *   - On Any Dozen Hit:
 *       1. Reset the winning dozen back down to 1 base unit.
 *       2. Add 1 base unit to the losing dozen.
 *       3. Keep the 1-18 ('low') bet at its current level (never raise 1-18 on dozen hits, even in 19-24).
 *   - Session Profit Reset:
 *       Whenever the current bankroll reaches a new session high in profit (or crosses the target threshold),
 *       all three bets are reset back to 1 base unit.
 * 
 * THE GOAL:
 * ---------
 * Target profit: +40 units (e.g., $400 on $10 units with $2,000 starting bankroll).
 * Stop or reset to base upon crossing the target profit threshold.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit sizing respecting table limits
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;
    const unitIncrement = config.minIncrementalBet || 1;

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.startingBankroll = bankroll;
        state.peakBankroll = bankroll;
        state.unitsLow = 1;
        state.unitsDozen1 = 1;
        state.unitsDozen2 = 1;
    }

    // 3. Process previous spin if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Check for session high / new profit peak to reset
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
            state.unitsLow = 1;
            state.unitsDozen1 = 1;
            state.unitsDozen2 = 1;
        } else {
            // Evaluate outcome zones
            const isDozen1 = lastNum >= 1 && lastNum <= 12;
            const isDozen2 = lastNum >= 13 && lastNum <= 24;
            const isDozen3OrZero = (lastNum >= 25 && lastNum <= 36) || lastNum === 0 || lastNum === -1 || lastNum === '00';

            if (isDozen3OrZero) {
                // Total loss: Reinforce all positions by 1 unit
                state.unitsLow += unitIncrement;
                state.unitsDozen1 += unitIncrement;
                state.unitsDozen2 += unitIncrement;
            } else if (isDozen1) {
                // Dozen 1 hit: Reset Dozen 1, add 1 unit to losing Dozen 2
                state.unitsDozen1 = 1;
                state.unitsDozen2 += unitIncrement;
            } else if (isDozen2) {
                // Dozen 2 hit: Reset Dozen 2, add 1 unit to losing Dozen 1
                state.unitsDozen2 = 1;
                state.unitsDozen1 += unitIncrement;
            }
        }
    }

    // 4. Calculate and clamp bet amounts
    const calcBetAmount = (units) => {
        let amount = minOutside * units;
        amount = Math.max(amount, minOutside);
        amount = Math.min(amount, maxBet);
        return amount;
    };

    const betLow = calcBetAmount(state.unitsLow);
    const betDozen1 = calcBetAmount(state.unitsDozen1);
    const betDozen2 = calcBetAmount(state.unitsDozen2);

    // 5. Return bet objects
    return [
        { type: 'low', amount: betLow },
        { type: 'dozen', value: 1, amount: betDozen1 },
        { type: 'dozen', value: 2, amount: betDozen2 }
    ];
}