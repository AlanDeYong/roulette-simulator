/**
 * Strategy: Gemini Twin Split Master Blueprint ($1 Base Unit)
 * Source: https://youtu.be/LFgsWUuTzCQ
 * YouTube Channel: The Lucky Felt (Todd Hoover)
 *
 * Full Logic in Details:
 * ----------------------
 * The Gemini Twin strategy is a symmetrical inside split-betting system inspired
 * by the Gemini zodiac archetype (extreme duality, symmetry, and rapid burst profits).
 * It places 5 mirrored split bets across the layout, covering exactly 10 numbers:
 *   1. Split [2, 3]   (Low section)
 *   2. Split [5, 6]   (Low section)
 *   3. Split [17, 18] (Center pivot)
 *   4. Split [32, 33] (High section)
 *   5. Split [35, 36] (High section)
 *
 * Betting Progression:
 * --------------------
 * Base bet is fixed at $1 per split ($5 total per spin at base level).
 * The system operates on a controlled 5-spin progression sequence consisting of 3 tiers:
 *   - Level 1: 1 unit ($1 per split / $5 total). Up to 2 attempts.
 *   - Level 2: 2 units ($2 per split / $10 total). Up to 2 attempts.
 *   - Level 3: 4 units ($4 per split / $20 total). 1 attempt.
 *
 * Rules on Win/Loss:
 *   - On ANY Win: Immediately reset progression back to Level 1, Attempt 1.
 *   - On Loss: Advance to the next attempt or tier:
 *       * Level 1, Attempt 1 loss -> Level 1, Attempt 2
 *       * Level 1, Attempt 2 loss -> Level 2, Attempt 1
 *       * Level 2, Attempt 1 loss -> Level 2, Attempt 2
 *       * Level 2, Attempt 2 loss -> Level 3, Attempt 1
 *       * Level 3, Attempt 1 loss -> Sequence cycle loss (50 units total).
 *         Hard reset back to Level 1, Attempt 1.
 *
 * The Goal:
 * ---------
 * Target Profit: +20% session profit over starting bankroll (e.g., +$100 on a $500 bankroll).
 * Stops betting once the target is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Target & Bankroll Management
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.targetBankroll = state.initialBankroll * 1.20; // +20% session profit target
    }

    // Stop if target profit is met or exceeded
    if (bankroll >= state.targetBankroll) {
        return [];
    }

    // 2. Progression Setup
    // Multipliers for the 5-spin sequence:
    // [Level 1 Att 1, Level 1 Att 2, Level 2 Att 1, Level 2 Att 2, Level 3 Att 1]
    const progressionMultipliers = [1, 1, 2, 2, 4];

    if (state.progressionIndex === undefined) {
        state.progressionIndex = 0;
    }

    // 3. Evaluate Previous Spin Result
    const coveredNumbers = [2, 3, 5, 6, 17, 18, 32, 33, 35, 36];
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const won = coveredNumbers.includes(lastSpin.winningNumber);

        if (won) {
            // Win resets progression back to start
            state.progressionIndex = 0;
        } else {
            // Advance progression on loss
            state.progressionIndex++;
            // If the 5-spin sequence fails (50 units total loss), hard reset back to 0
            if (state.progressionIndex >= progressionMultipliers.length) {
                state.progressionIndex = 0;
            }
        }
    }

    // 4. Determine Unit Size ($1 Base Unit clamped to config limits)
    const minInside = config.betLimits.min;
    const maxLimit = config.betLimits.max;

    const baseUnit = Math.max(1, minInside);
    const currentMultiplier = progressionMultipliers[state.progressionIndex];
    let splitBetAmount = baseUnit * currentMultiplier;

    // Clamp to table limits
    splitBetAmount = Math.max(splitBetAmount, minInside);
    splitBetAmount = Math.min(splitBetAmount, maxLimit);

    // 5. Total Cost & Bankroll Feasibility Check
    const totalRequired = splitBetAmount * 5;
    if (bankroll < totalRequired) {
        splitBetAmount = Math.floor(bankroll / 5);
        if (splitBetAmount < minInside) {
            return []; // Insufficient funds to meet table minimum
        }
    }

    // 6. Return Bet Placements (5 Symmetrical Gemini Splits)
    return [
        { type: 'split', value: [2, 3], amount: splitBetAmount },
        { type: 'split', value: [5, 6], amount: splitBetAmount },
        { type: 'split', value: [17, 18], amount: splitBetAmount },
        { type: 'split', value: [32, 33], amount: splitBetAmount },
        { type: 'split', value: [35, 36], amount: splitBetAmount }
    ];
}