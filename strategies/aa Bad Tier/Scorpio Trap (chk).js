/**
 * ============================================================================
 * ROULETTE STRATEGY: The "Scorpio" Roulette Trap
 * ============================================================================
 * Source: 
 *   - Video: https://youtu.be/Xrh8ZSuuTjo
 *   - Channel: The Lucky Felt (Todd Hoover)
 *
 * The Full Logic in Details:
 *   - The "Scorpio" strategy combines a grinding coverage base with a high-payout 
 *     "stinger" bet on the green zero.
 *   - Total base layout consists of 5 units distributed across 3 inside bets:
 *       1. The "Body": 2 units on a Six-Line / Double Street (e.g., 13–18).
 *          (Payout 5:1 -> Net win: +7 units)
 *       2. The "Tail": 2 units on a Corner bet (e.g., 26, 27, 29, 30).
 *          (Payout 8:1 -> Net win: +13 units)
 *       3. The "Stinger": 1 unit Straight-Up on Single Zero (0) [or 0/00 split].
 *          (Payout 35:1 -> Net win: +31 units)
 *
 * The Full Bet Progression in Details ("Lethal Escalation"):
 *   - Step 1 (Base, 1x): Run for up to 3 spins.
 *   - Step 2 (Double, 2x): If not in net session profit after Step 1, double 
 *     the bet size and run for up to 2 spins.
 *   - Step 3 (Double again, 4x): If still not in session profit, double again 
 *     and run for 1 spin.
 *   - Cycle Reset / Loss: If Step 3 finishes without achieving session profit, 
 *     reset progression back to Step 1.
 *   - Profit Reset: If at any point during any step the session achieves a 
 *     net profit (current bankroll > initial bankroll), immediately lock in 
 *     profits and reset back to Step 1 (1x).
 *
 * The Goal:
 *   - Target Profit: 20% of the starting bankroll (e.g., +$400 on a $2,000 bankroll).
 *   - Once the session target is reached, betting ceases (returns empty array).
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialBankroll = bankroll;
        state.targetProfit = bankroll * 0.20; // 20% session profit target
        state.progressionStep = 1; // Step 1 (1x), Step 2 (2x), Step 3 (4x)
        state.spinsAtCurrentStep = 0;
        state.maxSpinsPerStep = { 1: 3, 2: 2, 3: 1 };
        state.multipliers = { 1: 1, 2: 2, 3: 4 };
        state.initialized = true;
    }

    // 2. Target Profit Check
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        return []; // Target reached, lock in profits
    }

    // 3. Process Result of the Last Spin (if history exists)
    if (spinHistory && spinHistory.length > 0) {
        state.spinsAtCurrentStep++;

        // Reset if in net session profit
        if (bankroll > state.initialBankroll) {
            state.progressionStep = 1;
            state.spinsAtCurrentStep = 0;
        } else {
            // Check if current step spins are exhausted
            const maxSpins = state.maxSpinsPerStep[state.progressionStep];
            if (state.spinsAtCurrentStep >= maxSpins) {
                if (state.progressionStep < 3) {
                    state.progressionStep++;
                    state.spinsAtCurrentStep = 0;
                } else {
                    // Step 3 finished without profit -> restart cycle
                    state.progressionStep = 1;
                    state.spinsAtCurrentStep = 0;
                }
            }
        }
    }

    // 4. Calculate Bet Sizes Respecting Table Limits
    // Base unit for inside bets
    const baseUnit = config.betLimits && config.betLimits.min ? config.betLimits.min : 2;
    const stepMultiplier = state.multipliers[state.progressionStep] || 1;

    // Scorpio unit breakdown: 2 units on Line, 2 units on Corner, 1 unit on Zero
    let lineAmount = baseUnit * 2 * stepMultiplier;
    let cornerAmount = baseUnit * 2 * stepMultiplier;
    let zeroAmount = baseUnit * 1 * stepMultiplier;

    const minInside = config.betLimits ? config.betLimits.min : 1;
    const maxLimit = config.betLimits ? config.betLimits.max : 500;

    // Clamp inside bets to table limits
    lineAmount = Math.min(Math.max(lineAmount, minInside), maxLimit);
    cornerAmount = Math.min(Math.max(cornerAmount, minInside), maxLimit);
    zeroAmount = Math.min(Math.max(zeroAmount, minInside), maxLimit);

    const totalRequired = lineAmount + cornerAmount + zeroAmount;
    if (bankroll < totalRequired) {
        return []; // Insufficient bankroll to place the planned bet
    }

    // 5. Construct and Return the Scorpio Bet Placements
    return [
        { type: 'line', value: 13, amount: lineAmount },      // Double street 13-18
        { type: 'corner', value: 26, amount: cornerAmount },  // Corner 26, 27, 29, 30
        { type: 'number', value: 0, amount: zeroAmount }      // The green zero "stinger"
    ];
}