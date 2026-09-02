/**
 * ============================================================================
 * Strategy Name: The Capricorn Climb (Capricorn System)
 * Source: https://youtu.be/q9kGMqHXKCI
 * YouTube Channel: The Lucky Felt (Todd Hoover)
 * ============================================================================
 * 
 * 1. THE FULL LOGIC:
 *    The Capricorn Climb is an algorithmic, low-volatility grinding system designed
 *    around discipline, structure, and pragmatic risk management. It establishes a 
 *    heavy anchor across the middle board flanked by two symmetrical split bets:
 *      - 3 Units on the 2nd Dozen (covers numbers 13 through 24).
 *      - 1 Unit on Split 8/11 (flank in the 1st Dozen).
 *      - 1 Unit on Split 26/29 (flank in the 3rd Dozen).
 *    Total layout per base cycle is 5 units (covering 16 numbers total).
 * 
 * 2. THE BET PROGRESSION (Delayed Double Progression):
 *    The progression uses a unique "delayed" progression structure [1x, 1x, 2x, 4x]:
 *      - Initial Bet: Step 0 (1x multiplier).
 *      - Loss 1: Do nothing, hold at 1x multiplier (delay step to absorb variance).
 *      - Loss 2: Double the base unit -> Step 2 (2x multiplier).
 *      - Loss 3: Double again -> Step 3 (4x multiplier).
 *      - Loss 4: Doubling limit reached. Take the loss and reset back to Step 0 (1x).
 *      - Any Win: Reset immediately back to Step 0 (1x) to lock in gains and grind safely.
 * 
 * 3. THE GOAL:
 *    - Profit Target: +20% of the initial session bankroll (e.g., +$200 on a $1,000 bankroll).
 *    - Stop-Loss: Stops betting if bankroll is depleted below table minimums.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.targetProfit = state.initialBankroll * 0.20; // 20% target profit
        state.stepIndex = 0; // Steps: 0 (1x), 1 (1x), 2 (2x), 3 (4x)
        state.initialized = true;
    }

    // 2. Check Session Profit Goal
    const currentProfit = bankroll - state.initialBankroll;
    if (currentProfit >= state.targetProfit) {
        // Goal achieved, stop betting
        return [];
    }

    // 3. Process the Last Spin Result (if spins exist)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;

        // Numbers covered: 2nd Dozen (13-24), Split 8/11 (8, 11), Split 26/29 (26, 29)
        const isSecondDozen = lastNumber >= 13 && lastNumber <= 24;
        const isSplit8_11 = lastNumber === 8 || lastNumber === 11;
        const isSplit26_29 = lastNumber === 26 || lastNumber === 29;
        const isWin = isSecondDozen || isSplit8_11 || isSplit26_29;

        if (isWin) {
            // Reset progression on win
            state.stepIndex = 0;
        } else {
            // Progress on loss: [1x -> 1x -> 2x -> 4x -> Reset]
            state.stepIndex++;
            if (state.stepIndex > 3) {
                state.stepIndex = 0; // Reset after failing the 4th attempt
            }
        }
    }

    // 4. Determine Multiplier based on Progression Step
    const progressionMultipliers = [1, 1, 2, 4];
    const multiplier = progressionMultipliers[state.stepIndex];

    // 5. Calculate Base Unit Size Respecting Bet Limits
    // Inside minimum applies to splits (1 unit each)
    // Outside minimum applies to 2nd dozen (3 units)
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    const baseUnit = Math.max(minInside, Math.ceil(minOutside / 3));

    // Calculate un-clamped bet amounts
    let dozenAmount = 3 * baseUnit * multiplier;
    let split811Amount = 1 * baseUnit * multiplier;
    let split2629Amount = 1 * baseUnit * multiplier;

    // 6. Clamp Amounts to Table Limits
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);

    split811Amount = Math.max(split811Amount, config.betLimits.min);
    split811Amount = Math.min(split811Amount, config.betLimits.max);

    split2629Amount = Math.max(split2629Amount, config.betLimits.min);
    split2629Amount = Math.min(split2629Amount, config.betLimits.max);

    const totalRequired = dozenAmount + split811Amount + split2629Amount;

    // Check if sufficient bankroll remains to place bets
    if (bankroll < totalRequired) {
        return [];
    }

    // 7. Return Bet Placements
    return [
        {
            type: 'dozen',
            value: 2,
            amount: dozenAmount
        },
        {
            type: 'split',
            value: [8, 11],
            amount: split811Amount
        },
        {
            type: 'split',
            value: [26, 29],
            amount: split2629Amount
        }
    ];
}