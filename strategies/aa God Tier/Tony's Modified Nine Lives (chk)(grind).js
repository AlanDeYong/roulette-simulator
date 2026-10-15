/**
 * Roulette Strategy: Tony's Modified Nine Lives Strategy
 * 
 * Source:
 *   - Video: https://youtu.be/wxzfoYdw8Dg
 *   - Channel: The Roulette Master
 * 
 * Full Logic in Detail:
 *   1. Initial Bet Layout:
 *      - Places street bets covering 27 numbers across 9 specific streets:
 *        [1-3, 4-6, 10-12, 13-15, 19-21, 25-27, 28-30, 31-33, 34-36].
 *      - These streets are selected specifically because they cluster heavily around 
 *        the single and double zeros on the wheel.
 *   2. Win Handling (Street Removal / "Pulling Streets"):
 *      - When a spin hits one of the active covered streets while in recovery/progression,
 *        that specific street is removed from the active bet list for subsequent spins.
 *   3. Reset Condition:
 *      - Once session net profit reaches or exceeds the target profit (or returns to positive profit),
 *        the active bet list resets back to all 9 streets at 1 base unit.
 * 
 * Full Bet Progression in Detail:
 *   - Base Bet Level: 1 unit per active street.
 *   - Progression Rule: Instead of Fibonacci or doubling, Tony's modification adds +1 unit to 
 *     EVERY remaining active street on EACH spin (win OR loss) while attempting recovery.
 *   - When a street hits and is pulled off, the remaining active streets continue increasing by +1 unit.
 *   - Once the session profit target is satisfied, units reset back to 1 base unit across all 9 streets.
 * 
 * Goal:
 *   - Target profit per session: +200 to +300 units (or session target relative to starting bankroll).
 *   - Stop-loss: Recommended stop-loss if bankroll drops below 50% of starting bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define active streets (starting numbers for street bets around zero layout)
    const ALL_STREETS = [1, 4, 10, 13, 19, 25, 28, 31, 34];
    
    // Determine base unit for inside bets (clamped to min inside bet limit)
    const baseUnit = Math.max(config.betLimits.min || 2, 1);
    
    // 2. Initialize State
    if (state.startingBankroll === undefined) {
        state.startingBankroll = bankroll;
        state.activeStreets = [...ALL_STREETS];
        state.unitLevel = 1;
        state.targetProfit = 250; // Standard session target profit ($250 with $5 units)
    }

    const currentProfit = bankroll - state.startingBankroll;

    // 3. Process previous spin result if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Check if winning number falls inside one of our active streets
        let hitStreetIndex = -1;
        for (let i = 0; i < state.activeStreets.length; i++) {
            const streetStart = state.activeStreets[i];
            if (winningNum >= streetStart && winningNum <= streetStart + 2) {
                hitStreetIndex = i;
                break;
            }
        }

        // Check reset condition (target profit reached or all streets removed)
        if (currentProfit >= state.targetProfit || state.activeStreets.length === 0) {
            state.activeStreets = [...ALL_STREETS];
            state.unitLevel = 1;
        } else {
            if (hitStreetIndex !== -1) {
                // Remove the winning street from active bets
                state.activeStreets.splice(hitStreetIndex, 1);
            }

            // Tony's progression: Increase level by +1 unit win or loss while in recovery
            state.unitLevel += 1;

            // Secondary reset check if session returns to profit during recovery
            if (currentProfit >= 0 && state.activeStreets.length < ALL_STREETS.length) {
                state.activeStreets = [...ALL_STREETS];
                state.unitLevel = 1;
            }
        }
    }

    // 4. Calculate Bet Amount with Limits Clamping
    let rawAmount = baseUnit * state.unitLevel;
    let clampedAmount = Math.max(rawAmount, config.betLimits.min || 1);
    clampedAmount = Math.min(clampedAmount, config.betLimits.max || 500);

    // 5. Construct return array of bet objects
    const bets = state.activeStreets.map(streetValue => ({
        type: 'street',
        value: streetValue,
        amount: clampedAmount
    }));

    return bets;
}