/**
 * STRATEGY: Streets of Gold
 * SOURCE: Roulette Master TV (https://www.youtube.com/watch?v=XM5Yo1lDOBg)
 *
 * THE LOGIC:
 * This strategy is a high-coverage "grind" system. It covers 27 numbers (approx. 73% of the board)
 * by placing bets on 9 specific Streets. The goal is to accumulate small wins frequently while
 * managing losses with a specific "up-and-down" progression ladder rather than a steep Martingale.
 *
 * BET SETUP:
 * - Placed on 9 Streets (3 numbers each).
 * - Selection: 3 streets per Dozen to spread coverage.
 * - Dozen 1: Streets starting 1, 4, 7
 * - Dozen 2: Streets starting 13, 16, 19
 * - Dozen 3: Streets starting 25, 28, 31
 *
 * THE PROGRESSION (Unit Ladder):
 * 1. Base Bet: 1 unit per street.
 * 2. On LOSS: Increase bet by +3 units per street.
 * 3. On WIN:
 * - If at Base (1 unit): Stay at 1.
 * - If in Recovery (>1 unit): Decrease the bet level using an alternating sequence:
 * - 1st Win: Decrease by -1 unit.
 * - 2nd Win: Decrease by -2 units.
 * - 3rd Win: Decrease by -1 unit.
 * - 4th Win: Decrease by -2 units.
 * (Repeats until back to Base level).
 *
 * NOTE: A loss during recovery interrupts the sequence, requiring a +3 unit increase and
 * restarting the reduction pattern (next win will be -1).
 *
 * CAVEATS:
 * - Requires a significant bankroll relative to the base bet to withstand the +3 jumps.
 * - Bet limits are strictly enforced; if the progression exceeds the table max, it caps there.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define the 9 Streets (Start numbers)
    // Strategy calls for "3 streets in each 12".
    const targetStreets = [
        1, 4, 7,      // Dozen 1 (Skips 10)
        13, 16, 19,   // Dozen 2 (Skips 22)
        25, 28, 31    // Dozen 3 (Skips 34)
    ];

    // 2. Initialize State
    if (state.unitLevel === undefined) {
        state.unitLevel = 1;        // Current number of units per street
        state.winSequence = 0;      // Tracks consecutive wins during recovery (0 = start)
    }

    // 3. Process Previous Spin (if exists)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        // Determine if we won
        // A number N is in a street starting at S if: S <= N <= S+2
        const isWin = targetStreets.some(start => num >= start && num <= start + 2);

        if (!isWin) {
            // --- LOSS CONDITION ---
            // Rule: Increase by 3 units on loss
            state.unitLevel += 3;
            // Reset the "win sequence" because the recovery pattern restarts
            state.winSequence = 0;
        } else {
            // --- WIN CONDITION ---
            if (state.unitLevel > 1) {
                // Increment win sequence to determine if we drop 1 or 2 units
                state.winSequence++;

                // Rule: Alternate dropping 1 unit and 2 units
                // Sequence 1 (Odd): -1
                // Sequence 2 (Even): -2
                const dropAmount = (state.winSequence % 2 !== 0) ? 1 : 2;
                
                state.unitLevel -= dropAmount;

                // Clamp: Cannot go below 1 unit
                if (state.unitLevel <= 1) {
                    state.unitLevel = 1;
                    state.winSequence = 0; // Reset sequence once fully recovered
                }
            } else {
                // Base level win - stay at base
                state.unitLevel = 1;
                state.winSequence = 0;
            }
        }
    }

    // 4. Calculate Bet Amounts
    // Determine the monetary value of "1 unit" based on table minimum
    const baseChipValue = config.betLimits.min; 
    
    // Calculate raw bet amount based on progression level
    let rawBetAmount = state.unitLevel * baseChipValue;

    // 5. CLAMP TO LIMITS
    // Ensure bet is at least the table minimum (Inside bet)
    let actualBetAmount = Math.max(rawBetAmount, config.betLimits.min);
    // Ensure bet does not exceed table maximum
    actualBetAmount = Math.min(actualBetAmount, config.betLimits.max);

    // 6. Stop-Loss / Bankroll Check
    // Total cost = 9 streets * bet amount
    const totalCost = actualBetAmount * targetStreets.length;
    
    // If we can't afford the full spread, stop betting (or return empty to preserve funds)
    if (totalCost > bankroll) {
        // Optional: You could try to bet fewer streets, but that breaks the strategy logic.
        // We will return empty to prevent partial strategy execution.
        return [];
    }

    // 7. Construct Bet Objects
    const bets = targetStreets.map(streetStart => {
        return {
            type: 'street',
            value: streetStart,
            amount: actualBetAmount
        };
    });

    return bets;
}