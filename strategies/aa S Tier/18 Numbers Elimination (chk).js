/**
 * ============================================================================
 * 18 NUMBERS ELIMINATION STRATEGY
 * ============================================================================
 * Source:
 *   - Video URL: https://youtu.be/JJi6gpstz5c
 *   - Channel: The Roulette Factory ("18# vs Clivio-1 Strategy ELIMINATED!")
 *
 * Full Logic & Placements:
 *   - Board Coverage: 18 straight-up numbers covering half the board.
 *     The standard layout demonstrated covers all Low Red numbers (1, 3, 5, 7, 9, 12, 14, 16, 18)
 *     and all High Black numbers (20, 22, 24, 26, 28, 29, 31, 33, 35).
 *   - Elimination Mechanism ("Peeling Off"):
 *     - If a winning number is hit during a recovery run (below session high bankroll),
 *       that winning number is eliminated (peeled off) from the active betting list for the next spin.
 *     - Once a new session high bankroll is achieved, all 18 numbers are restored back to the board.
 *
 * Bet Progression:
 *   - Base Bet: 1 unit on each active number.
 *   - Loss Tracking: The strategy accumulates losses. After every 2 losses encountered before reaching
 *     a new session high, the bet size doubles (or increases by 1 unit multiplier).
 *   - Win Handling:
 *     - If the win brings bankroll to a new session high (or session profit), the progression resets to
 *       1 unit, the loss counter resets to 0, and all 18 numbers are placed.
 *     - If the win does not beat the session high, the winning number is peeled off and bets continue
 *       at the current progression level.
 *
 * Goal:
 *   - Achieve consistent profit peaks by covering ~50% of the wheel while eliminating hit numbers
 *     to lock in profit during recovery runs until reaching a new session high bankroll.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define standard 18-number set (Low Red + High Black)
    const DEFAULT_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 20, 22, 24, 26, 28, 29, 31, 33, 35];

    // 2. Initialize Persistent State
    if (state.sessionHigh === undefined) {
        state.sessionHigh = bankroll;
        state.multiplier = 1;
        state.lossCount = 0;
        state.activeNumbers = [...DEFAULT_NUMBERS];
    }

    // 3. Process Previous Spin Results if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNumber = lastSpin.winningNumber;

        // Check if last spin hit one of our actively bet numbers
        const wasHit = state.activeNumbers.includes(lastWinningNumber);

        if (bankroll > state.sessionHigh) {
            // Reached new session high: Full reset
            state.sessionHigh = bankroll;
            state.multiplier = 1;
            state.lossCount = 0;
            state.activeNumbers = [...DEFAULT_NUMBERS];
        } else if (wasHit) {
            // Hit during recovery: Peel off the winning number
            state.activeNumbers = state.activeNumbers.filter(num => num !== lastWinningNumber);
            
            // If all numbers were eliminated or empty, restore them
            if (state.activeNumbers.length === 0) {
                state.activeNumbers = [...DEFAULT_NUMBERS];
            }
        } else {
            // Loss occurred
            state.lossCount += 1;
            
            // Double up / increase multiplier after 2 losses
            if (state.lossCount >= 2) {
                state.multiplier *= 2;
                state.lossCount = 0;
            }
        }
    }

    // 4. Calculate Bet Unit and Clamp to Limits
    const minInside = config.betLimits.min || 1;
    let betAmount = minInside * state.multiplier;
    
    // Ensure bet respects table limits
    betAmount = Math.max(betAmount, minInside);
    betAmount = Math.min(betAmount, config.betLimits.max || 500);

    // Check if total required bet exceeds bankroll
    const totalRequired = betAmount * state.activeNumbers.length;
    if (bankroll < totalRequired) {
        betAmount = Math.max(Math.floor(bankroll / state.activeNumbers.length), minInside);
        if (bankroll < betAmount * state.activeNumbers.length) {
            return []; // Cannot afford minimal spread
        }
    }

    // 5. Construct and Return Bet Objects
    return state.activeNumbers.map(number => ({
        type: 'number',
        value: number,
        amount: betAmount
    }));
}