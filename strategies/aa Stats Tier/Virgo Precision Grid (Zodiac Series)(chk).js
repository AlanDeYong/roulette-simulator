/**
 * Strategy: Virgo Precision Grid (Zodiac Series)
 * Source: "The Roulette Trap That Neutralizes the Green Zero (Virgo Precision Grid)"
 * YouTube Channel: The Lucky Felt (Todd Hoover)
 * URL: https://youtu.be/mHZN5Cx-mnE
 *
 * The Full Logic in Detail:
 * - A defensive, high-coverage comp-grinding grid designed to neutralize the house edge
 *   on zero and provide frequent wash spins across 28 numbers.
 * - Bet layout per base cycle (6 units total):
 *     1. Column 1: 2 units (Outside bet)
 *     2. Column 3: 2 units (Outside bet)
 *     3. Split 17/20: 1 unit (Inside bet covering middle column keys)
 *     4. Green Zero Hedge: 1 unit (Split 0/00 on American, or Straight Up 0 on European)
 * - Outcomes per spin:
 *     - Column 1 or Column 3 hit: Pays 2:1 (returns 6 units). Net profit = 0 (Wash spin).
 *     - 17, 20, or 0/00 hit: Pays 17:1 on split (returns 18 units). Net profit = +12 units.
 *     - Other Column 2 number (2, 5, 8, 11, 14, 23, 26, 29, 32, 35): Loss of total bet.
 *
 * The Full Bet Progression in Detail (Delayed Escalation Matrix):
 * - Bets escalate strictly based on cycle spin counts rather than win/loss chasing:
 *     - Level 1 (1x multiplier): Exactly 3 spins.
 *     - Level 2 (2x multiplier): Exactly 3 spins.
 *     - Level 3 (4x multiplier): Exactly 1 spin (jackpot hunt).
 *     - If Level 3 concludes without a profit hit, the progression resets back to Level 1.
 * - Reset Condition:
 *     - Hitting any profit number (17, 20, 0, or 00) secures a net win and resets the progression
 *       immediately back to Level 1, spin count 1.
 *
 * The Goal:
 * - Target Profit: +20% of the starting bankroll (e.g., +$100 on a $500 bankroll).
 * - Stop-loss: If bankroll falls below the minimum required table cost.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish session baseline & profit target
    if (state.initialBankroll === undefined) {
        state.initialBankroll = bankroll;
        state.targetProfit = (config.startingBankroll || bankroll) * 0.20;
    }

    // Check if target profit reached
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        return [];
    }

    // 2. Initialize progression state
    if (state.progressionStep === undefined) {
        state.progressionStep = 0; // 0: 1x (3 spins), 1: 2x (3 spins), 2: 4x (1 spin)
        state.spinsAtLevel = 0;
    }

    // 3. Process previous spin result (if any)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Key winning jackpot numbers
        const isProfitWin = (lastNum === 17 || lastNum === 20 || lastNum === 0 || lastNum === '00');

        if (isProfitWin) {
            // Reset progression on a profit hit
            state.progressionStep = 0;
            state.spinsAtLevel = 0;
        } else {
            // Increment spin count at the current progression level
            state.spinsAtLevel += 1;

            if (state.progressionStep === 0 && state.spinsAtLevel >= 3) {
                state.progressionStep = 1;
                state.spinsAtLevel = 0;
            } else if (state.progressionStep === 1 && state.spinsAtLevel >= 3) {
                state.progressionStep = 2;
                state.spinsAtLevel = 0;
            } else if (state.progressionStep === 2 && state.spinsAtLevel >= 1) {
                // Completed the 1-spin attempt at level 3, revert to level 1
                state.progressionStep = 0;
                state.spinsAtLevel = 0;
            }
        }
    }

    // 4. Calculate unit sizing and multipliers
    const multipliers = [1, 2, 4];
    const currentMultiplier = multipliers[state.progressionStep];

    // Determine unit sizing respecting both Inside and Outside minimums
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    const baseUnit = Math.max(minInside, Math.ceil(minOutside / 2));

    // Calculate individual bet amounts
    let columnBetAmount = baseUnit * 2 * currentMultiplier;
    let splitBetAmount = baseUnit * 1 * currentMultiplier;

    // Clamp to table limits
    columnBetAmount = Math.max(columnBetAmount, minOutside);
    columnBetAmount = Math.min(columnBetAmount, config.betLimits.max);

    splitBetAmount = Math.max(splitBetAmount, minInside);
    splitBetAmount = Math.min(splitBetAmount, config.betLimits.max);

    // Verify bankroll sufficiency
    const totalCost = (columnBetAmount * 2) + (splitBetAmount * 2);
    if (bankroll < totalCost) {
        return [];
    }

    // 5. Construct bets
    const bets = [
        { type: 'column', value: 1, amount: columnBetAmount },
        { type: 'column', value: 3, amount: columnBetAmount },
        { type: 'split', value: [17, 20], amount: splitBetAmount }
    ];

    // Zero hedge adaptation depending on table format
    if (config.tableType === 'american') {
        bets.push({ type: 'split', value: [0, '00'], amount: splitBetAmount });
    } else {
        bets.push({ type: 'number', value: 0, amount: splitBetAmount });
    }

    return bets;
}