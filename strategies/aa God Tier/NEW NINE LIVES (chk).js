/**
 * ============================================================================
 * ROULETTE STRATEGY: NEW NINE LIVES STRATEGY
 * ============================================================================
 * Source: https://youtu.be/kZFK_t4bPEI
 * Channel: The Roulette Master
 *
 * THE FULL LOGIC IN DETAIL:
 * -------------------------
 * - The "New Nine Lives" strategy covers 9 out of 12 streets on the layout
 *   (27 total numbers out of 36 main numbers, providing ~73% coverage).
 * - Target Streets (Row Starts): 1, 7, 10, 13, 22, 25, 28, 31, 34.
 * - Base State: Place 1 base unit on each of the 9 active streets.
 * - Target / Reset Condition: Whenever bankroll reaches or exceeds the highest
 *   recorded session bankroll, reset all 9 streets back to 1 base unit.
 *
 * THE FULL BET PROGRESSION IN DETAIL:
 * ------------------------------------
 * 1. Initial Bets:
 *    - Place 1 base unit (config.betLimits.min) on each of the 9 streets.
 * 2. On Loss (When a spin misses all currently active streets):
 *    - Enter/advance progression mode by adding step increments to each active street:
 *      * Tier 1 (up to 9 units/street): Add 2 units per street per loss.
 *      * Tier 2 (up to 30 units/street): Add 4 units per street per loss.
 *      * Tier 3 (above 30 units/street): Add 10 units per street per loss.
 * 3. On Win during Progression:
 *    - Remove the winning street from the active bets array ("kill a life").
 *    - Continue spinning on the remaining active streets at their current bet size.
 *    - Repeat until the bankroll recovers to starting/peak level, then RESET back
 *      to all 9 streets at 1 base unit.
 *
 * GOAL:
 * ------
 * Complete recovery or reach profit target, then reset progression to start fresh.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define base unit and default street coverage
    const baseUnit = config.betLimits.min;
    const maxLimit = config.betLimits.max;
    const defaultStreets = [1, 7, 10, 13, 22, 25, 28, 31, 34];

    // 2. State Initialization
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.activeStreets = [...defaultStreets];
        state.inProgression = false;
        state.currentBetPerStreet = baseUnit;
    }

    // 3. Process Spin History
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;

        // Check if last winning number landed on any active street
        const hitStreetIndex = state.activeStreets.findIndex(streetStart => {
            return winningNumber >= streetStart && winningNumber <= streetStart + 2;
        });

        // Reset condition: Bankroll recovered or reached new session peak
        if (bankroll >= state.initialBankroll) {
            state.initialBankroll = bankroll;
            state.activeStreets = [...defaultStreets];
            state.inProgression = false;
            state.currentBetPerStreet = baseUnit;
        } else if (hitStreetIndex !== -1) {
            // A bet won during active play
            if (state.inProgression) {
                // Remove the street that won ("kill a life")
                state.activeStreets.splice(hitStreetIndex, 1);

                // If all active streets were pulled off, reset layout
                if (state.activeStreets.length === 0) {
                    state.activeStreets = [...defaultStreets];
                    state.inProgression = false;
                    state.currentBetPerStreet = baseUnit;
                }
            }
        } else {
            // A bet lost -> enter / advance progression tier
            state.inProgression = true;

            let stepIncrement = 2 * baseUnit;
            if (state.currentBetPerStreet >= 30 * baseUnit) {
                stepIncrement = 10 * baseUnit;
            } else if (state.currentBetPerStreet >= 9 * baseUnit) {
                stepIncrement = 4 * baseUnit;
            }

            state.currentBetPerStreet += stepIncrement;
        }
    }

    // 4. Clamp bet amount to limits
    let betAmount = Math.max(state.currentBetPerStreet, config.betLimits.min);
    betAmount = Math.min(betAmount, maxLimit);

    // 5. Construct return bet array
    return state.activeStreets.map(streetStart => ({
        type: 'street',
        value: streetStart,
        amount: betAmount
    }));
}