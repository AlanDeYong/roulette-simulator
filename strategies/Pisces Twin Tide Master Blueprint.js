/**
 * ============================================================================
 * Strategy: Pisces Twin Tide Master Blueprint
 * Source: https://youtu.be/_K0XChsZvkk
 * Channel: The Lucky Felt (Todd Hoover)
 * ============================================================================
 * 
 * THE FULL LOGIC IN DETAILS:
 * - The Pisces Twin Tide system is a dual-anchor layout representing the two
 *   swimming fish of Pisces covering opposite extremities of the roulette board,
 *   anchored by the "deep water" zero.
 * - Bet positions on every active spin:
 *     1. Line (Double Street) covering 1 to 6 (starts at 1): 2 units
 *     2. Line (Double Street) covering 31 to 36 (starts at 31): 2 units
 *     3. Straight-Up bet on single number 0: 1 unit
 *   Base bet per spin = 5 units total.
 * 
 * THE FULL BET PROGRESSION IN DETAILS:
 * - The strategy uses an organic Fibonacci multiplier sequence across 5 steps:
 *     Step 1: 1x multiplier (2 units on 1-6, 2 units on 31-36, 1 unit on 0)  -> 5 units
 *     Step 2: 2x multiplier (4 units on 1-6, 4 units on 31-36, 2 units on 0) -> 10 units
 *     Step 3: 3x multiplier (6 units on 1-6, 6 units on 31-36, 3 units on 0) -> 15 units
 *     Step 4: 5x multiplier (10 units on 1-6, 10 units on 31-36, 5 units on 0)-> 25 units
 *     Step 5: 8x multiplier (16 units on 1-6, 16 units on 31-36, 8 units on 0)-> 40 units
 * - After ANY win:
 *     Reset progression immediately back to Step 1 (1x multiplier).
 * - After a loss:
 *     Advance to the next step in the sequence [1, 2, 3, 5, 8].
 * - After losing Step 5 (8x multiplier):
 *     Execute hard stop: accept the sequence variance (95 total units) and reset
 *     back to Step 1.
 * 
 * THE GOAL:
 * - Target Profit: 20% gain above the session starting bankroll (e.g., +$400 on a
 *   $2,000 starting bankroll). Once reached, the session locks and stops betting.
 * - Stop Loss: Protected by the 5-step hard-stop reset cycle and minimum bankroll limits.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Progression multiplier definitions
    const MULTIPLIERS = [1, 2, 3, 5, 8];
    const TARGET_PROFIT_RATIO = 0.20; // 20% profit target per session

    // 2. Initialize persistent state
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.stepIndex = 0;
        state.targetReached = false;
    }

    // 3. Stop-rule: Target profit reached
    const profitTarget = state.initialBankroll * TARGET_PROFIT_RATIO;
    if (bankroll >= state.initialBankroll + profitTarget) {
        state.targetReached = true;
        return [];
    }

    // 4. Update progression state based on previous spin result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winNum = lastSpin.winningNumber;

        // Check if winning number hit our coverage:
        // Top Fish: 1-6, Bottom Fish: 31-36, Deep Water: 0
        const isWin = (winNum === 0) || (winNum >= 1 && winNum <= 6) || (winNum >= 31 && winNum <= 36);

        if (isWin) {
            // Reset to Step 1 on any win
            state.stepIndex = 0;
        } else {
            // Advance progression on loss
            state.stepIndex++;
            // Hard stop if step 5 (8x) failed; reset to Step 1
            if (state.stepIndex >= MULTIPLIERS.length) {
                state.stepIndex = 0;
            }
        }
    }

    // 5. Determine base unit and multipliers
    const baseUnit = config.betLimits.min;
    const currentMultiplier = MULTIPLIERS[state.stepIndex];

    // Compute raw bet amounts: 2 units on each double street, 1 unit on zero
    let line1to6Amount = baseUnit * 2 * currentMultiplier;
    let line31to36Amount = baseUnit * 2 * currentMultiplier;
    let zeroAmount = baseUnit * 1 * currentMultiplier;

    // 6. Respect table limits (min and max constraints)
    line1to6Amount = Math.max(config.betLimits.min, Math.min(line1to6Amount, config.betLimits.max));
    line31to36Amount = Math.max(config.betLimits.min, Math.min(line31to36Amount, config.betLimits.max));
    zeroAmount = Math.max(config.betLimits.min, Math.min(zeroAmount, config.betLimits.max));

    const totalRequired = line1to6Amount + line31to36Amount + zeroAmount;

    // 7. Check bankroll availability
    if (bankroll < totalRequired) {
        // Cannot afford full sequence bet
        return [];
    }

    // 8. Return bet layout
    return [
        { type: 'line', value: 1, amount: line1to6Amount },
        { type: 'line', value: 31, amount: line31to36Amount },
        { type: 'number', value: 0, amount: zeroAmount }
    ];
}