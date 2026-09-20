/**
 * OLD SCHOOL ROULETTE STRATEGY
 *
 * Source:
 *   - Video: "OLD SCHOOL - BEST ROULETTE WINNING STRATEGY | PROFITABLE SYSTEM PROGRESSION - Bet With MO"
 *   - URL: https://youtu.be/HMzurFaHWbY
 *   - Channel: Bet With Mo
 *
 * The Full Logic in Detail:
 *   - Bet Placement:
 *       Places bets on 5 non-overlapping corner positions across the roulette layout,
 *       covering a total of 20 numbers (more than 50% table coverage).
 *   - Pattern Switching:
 *       Two alternating sets of 5 corners are used:
 *         Pattern A: Corners at [2, 8, 14, 20, 26]
 *         Pattern B: Corners at [5, 11, 17, 23, 29]
 *       The player switches between patterns after every 2 consecutive wins at Step 1,
 *       or upon recovering back to a new bankroll peak / restarting the progression.
 *
 * The Full Bet Progression in Detail (8-Step Tiered Recovery):
 *   - Bankroll Required: 755 units total (5 units starting bet per spin).
 *   - Units per corner across the 8 levels: [1, 2, 5, 9, 14, 23, 37, 60].
 *     (Total bet per level = 5 corners × units: 5, 10, 25, 45, 70, 115, 185, 300 = 755 total units).
 *   - On Loss:
 *       Advance to the next step (+1 level) in the progression:
 *         Step 1 (1u) -> Step 2 (+1u = 2u)
 *         Step 2 (2u) -> Step 3 (+3u = 5u)
 *         Step 3 (5u) -> Step 4 (+4u = 9u)
 *         Step 4 (9u) -> Step 5 (+5u = 14u)
 *         Step 5 (14u) -> Step 6 (23u)
 *         Step 6 (23u) -> Step 7 (37u)
 *         Step 7 (37u) -> Step 8 (60u)
 *       If Step 8 loses, reset back to Step 1 to prevent complete ruin.
 *   - On Win:
 *       - If at Step 1: Stay at Step 1. Track consecutive wins; after 2 consecutive wins, switch corner patterns.
 *       - If bankroll exceeds or matches previous peak bankroll: Full reset to Step 1 and switch corner patterns.
 *       - Otherwise (during recovery): Drop down 1 level (e.g., Step 5 -> Step 4, Step 4 -> Step 3, Step 3 -> Step 2, Step 2 -> Step 1).
 *
 * The Goal:
 *   - Generate consistent steady gains by taking advantage of 20-number corner coverage (52.6% - 54.1% win rate).
 *   - Target profit: Lock in profits per session or cycle.
 *   - Stop-loss: End of 8-step progression (755 units maximum drawdown allocation).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Progression levels (units per corner for 5 corners)
    const PROGRESSION_UNITS = [1, 2, 5, 9, 14, 23, 37, 60];
    const MAX_STEP = PROGRESSION_UNITS.length - 1;

    // Corner patterns (top-left number defining each 4-number corner)
    const PATTERNS = [
        [2, 8, 14, 20, 26], // Pattern 0: covers [2,3,5,6], [8,9,11,12], [14,15,17,18], [20,21,23,24], [26,27,29,30]
        [5, 11, 17, 23, 29]  // Pattern 1: covers [5,6,8,9], [11,12,14,15], [17,18,20,21], [23,24,26,27], [29,30,32,33]
    ];

    // Helper: Determine if a winning number is covered by a corner (top-left index n)
    function isNumberInCorner(n, cornerTopLeft) {
        // In standard European/American roulette grid (3 rows):
        // Top-left number c covers [c, c+1, c+3, c+4]
        return n === cornerTopLeft ||
               n === cornerTopLeft + 1 ||
               n === cornerTopLeft + 3 ||
               n === cornerTopLeft + 4;
    }

    // 2. Initialize State
    if (state.currentStep === undefined) {
        state.currentStep = 0;
        state.patternIndex = 0;
        state.consecutiveWins = 0;
        state.peakBankroll = bankroll;
        state.initialBankroll = bankroll;
    }

    // 3. Process Previous Spin Result if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNumber = lastSpin.winningNumber;
        const currentCorners = PATTERNS[state.patternIndex];

        // Check if last spin was a hit
        const won = currentCorners.some(corner => isNumberInCorner(lastWinningNumber, corner));

        if (won) {
            state.consecutiveWins++;

            // If bankroll reaches or surpasses peak, reset to step 0 and switch pattern
            if (bankroll >= state.peakBankroll) {
                state.peakBankroll = bankroll;
                state.currentStep = 0;
                state.consecutiveWins = 0;
                state.patternIndex = 1 - state.patternIndex;
            } else if (state.currentStep === 0) {
                // At base step, switch pattern after 2 consecutive wins
                if (state.consecutiveWins >= 2) {
                    state.patternIndex = 1 - state.patternIndex;
                    state.consecutiveWins = 0;
                }
            } else {
                // Drop down 1 level during recovery
                state.currentStep = Math.max(0, state.currentStep - 1);
            }
        } else {
            // Loss: advance to next level in progression
            state.consecutiveWins = 0;
            if (state.currentStep < MAX_STEP) {
                state.currentStep++;
            } else {
                // Reached end of 8-step progression: reset to protect bankroll
                state.currentStep = 0;
                state.patternIndex = 1 - state.patternIndex;
            }
        }
    }

    // Update peak bankroll tracker
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 4. Calculate Bet Sizing
    // Corner is an inside bet, so base unit is config.betLimits.min
    const baseUnit = config.betLimits && config.betLimits.min ? config.betLimits.min : 1;
    const unitsMultiplier = PROGRESSION_UNITS[state.currentStep];
    let amountPerCorner = baseUnit * unitsMultiplier;

    // Respect table limits
    const minBet = config.betLimits && config.betLimits.min ? config.betLimits.min : 1;
    const maxBet = config.betLimits && config.betLimits.max ? config.betLimits.max : 500;
    amountPerCorner = Math.max(minBet, Math.min(amountPerCorner, maxBet));

    // Check if player has enough bankroll for 5 corners
    const activeCorners = PATTERNS[state.patternIndex];
    const totalRequired = amountPerCorner * activeCorners.length;
    if (bankroll < totalRequired) {
        // Scale down if bankroll is insufficient for full bet
        amountPerCorner = Math.floor(bankroll / activeCorners.length);
        if (amountPerCorner < minBet) {
            return []; // Stop betting if below table minimum
        }
    }

    // 5. Construct Bet Output
    return activeCorners.map(cornerVal => ({
        type: 'corner',
        value: cornerVal,
        amount: amountPerCorner
    }));
}