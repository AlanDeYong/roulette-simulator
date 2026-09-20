/**
 * ============================================================================
 * STRATEGY: Five Split Streets Roulette Strategy
 * ============================================================================
 * Source: 
 *   - Video: "Five Split Streets Roulette Strategy: Safer Than Martingale?"
 *   - URL: https://youtu.be/23EB2AdSQqE
 *   - Channel: Ninja Gamblers (based on the Jack Ace / CEG 5 Split Street system)
 *
 * The Full Logic:
 *   - The strategy places bets across 25 distinct numbers (covering ~67.6% of 
 *     a European roulette wheel) using 10 simultaneous inside bets:
 *       * 5 Street bets (each covering 3 numbers, paying 11:1)
 *       * 5 Split bets (each covering 2 numbers, paying 17:1)
 *   - Streets and splits never overlap, ensuring 25 individual numbers are covered.
 *   - At base bet (1 unit per position = 10 units total):
 *       * Split Win: Pays 17:1 (+8 units net profit)
 *       * Street Win: Pays 11:1 (+2 units net profit)
 *       * Miss / Loss: -10 units
 *
 * Bet Progression (D'Alembert-style Negative Progression):
 *   - Initial bet: Tier 1 (1 unit per position, 10 units total).
 *   - On Loss: Increase bet size by 1 unit on every position (Tier 1 -> Tier 2 -> Tier 3 -> Tier 4).
 *   - On Split Win: Always resets progression back to Tier 1 (1 unit per position), as the 
 *     17:1 payout recovers losses.
 *   - On Street Win: Lowers the progression by 1 unit (step-down towards Tier 1), preserving profit.
 *   - If already at Tier 1 and a win occurs, remain at Tier 1.
 *
 * Goal & Limits:
 *   - Target Profit: +$100 profit target (or 100 units).
 *   - Stop-Loss / Cap: Progression capped at 4 units (Tier 4 / 4 pieces max). Stop if 
 *     bankroll drops below the total bet requirement.
 * ============================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish base unit respecting inside bet limits
    const unit = config.betLimits && config.betLimits.min ? config.betLimits.min : 1;
    const maxAllowed = config.betLimits && config.betLimits.max ? config.betLimits.max : 500;

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.tier = 1; // Current tier (1 to 4)
        state.targetProfit = 10000 * (unit / 1); // Scaled target profit ($100 target at $1 base unit)
        state.maxTier = 4; // Built-in stopping limit of 4 tiers
        state.lastBankroll = bankroll;
    }

    // Check target profit condition
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        return []; // Target reached: stop betting
    }

    // 3. Evaluate previous spin outcome to adjust progression
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const bankrollDelta = bankroll - state.lastBankroll;

        // Covered sets (must match bet positions below)
        const streetSets = [
            [1, 2, 3],
            [7, 8, 9],
            [13, 14, 15],
            [19, 20, 21],
            [25, 26, 27]
        ];
        const splitSets = [
            [4, 5],
            [10, 11],
            [16, 17],
            [22, 23],
            [28, 29]
        ];

        const isSplitHit = splitSets.some(pair => pair.includes(lastNum));
        const isStreetHit = streetSets.some(row => row.includes(lastNum));

        if (isSplitHit) {
            // Split hit recovers drawdown -> reset to tier 1
            state.tier = 1;
        } else if (isStreetHit) {
            // Street hit provides partial recovery -> step down 1 tier (min 1)
            state.tier = Math.max(1, state.tier - 1);
        } else {
            // Complete miss / loss -> increase progression by 1 unit (up to max tier)
            state.tier = Math.min(state.maxTier, state.tier + 1);
        }
    }

    // 4. Calculate Bet Amount per position
    let betPerSpot = unit * state.tier;

    // Clamp bet amounts to table limits
    betPerSpot = Math.max(betPerSpot, config.betLimits.min);
    betPerSpot = Math.min(betPerSpot, maxAllowed);

    // Total required for 10 positions
    const totalRequired = betPerSpot * 10;
    if (bankroll < totalRequired) {
        return []; // Insufficient bankroll to place all 10 bets
    }

    // Update state tracking for next spin evaluation
    state.lastBankroll = bankroll;

    // 5. Construct Bet Placements (5 Streets and 5 Non-Overlapping Splits)
    const bets = [
        // 5 Street bets
        { type: 'street', value: 1, amount: betPerSpot },   // 1, 2, 3
        { type: 'street', value: 7, amount: betPerSpot },   // 7, 8, 9
        { type: 'street', value: 13, amount: betPerSpot },  // 13, 14, 15
        { type: 'street', value: 19, amount: betPerSpot },  // 19, 20, 21
        { type: 'street', value: 25, amount: betPerSpot },  // 25, 26, 27

        // 5 Split bets
        { type: 'split', value: [4, 5], amount: betPerSpot },
        { type: 'split', value: [10, 11], amount: betPerSpot },
        { type: 'split', value: [16, 17], amount: betPerSpot },
        { type: 'split', value: [22, 23], amount: betPerSpot },
        { type: 'split', value: [28, 29], amount: betPerSpot }
    ];

    return bets;
}