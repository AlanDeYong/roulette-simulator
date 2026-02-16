/**
 * STRATEGY: The "Ladder" Aggressive Progression (Roulette Jackpot)
 * * SOURCE:
 * - Video: "EASY WIN AFTER WIN..I TOOK A TINY BANKROLL AND MADE A COOL $325 BUCKS"
 * - Channel: ROULETTE JACKPOT
 * - URL: https://www.youtube.com/watch?v=Yx6QzC-MX-4
 * * THE LOGIC:
 * - This is a high-coverage, aggressive strategy designed to "ladder" up bets to recover losses quickly.
 * - Bet Selection:
 * 1. Four Corner Bets (8:1 payout) covering spread clusters.
 * 2. Two Split Bets (17:1 payout), specifically one in the First Dozen and one in the Last Dozen.
 * * THE PROGRESSION (The Ladder):
 * - Start: 1 Unit on all 6 positions.
 * - On LOSS: "Ladder Up" (Increase bet by 1 unit). Keep "foot on the gas" to recover.
 * - On CORNER WIN (Small Win): "Ladder Down" (Decrease bet by 1 unit). Secure profit.
 * - On SPLIT WIN (Big Win): RESET to base unit. The 17:1 payout acts as the jackpot/reset trigger.
 * * THE GOAL:
 * - Rapidly grow a small bankroll (Video: $150 to ~$478).
 * - Target Profit: +100% of session bankroll recommended due to volatility.
 * - Stop Loss: Entire bankroll (High risk strategy).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Configuration & Setup
    // ----------------------------------------------------------------
    // Define the specific numbers for the strategy based on the video
    // Corners are defined by their top-left number (e.g., 1 covers 1,2,4,5)
    // Splits are defined by pairs of numbers
    const STRATEGY_BETS = {
        corners: [1, 10, 22, 31], // Spreads coverage across the board
        splits: [
            [8, 11],   // First Dozen Split
            [26, 29]   // Last Dozen Split
        ]
    };

    const MIN_BET = config.betLimits.min || 1;
    const MAX_BET = config.betLimits.max || 500;

    // Helper to check if a number is covered by a corner
    const isCornerHit = (winningNum, cornerStart) => {
        // A corner covers: n, n+1, n+3, n+4
        const covered = [cornerStart, cornerStart + 1, cornerStart + 3, cornerStart + 4];
        return covered.includes(winningNum);
    };

    // Helper to check if a number is covered by a split
    const isSplitHit = (winningNum, splitArray) => {
        return splitArray.includes(winningNum);
    };

    // 2. State Initialization
    // ----------------------------------------------------------------
    if (state.ladderLevel === undefined) {
        state.ladderLevel = 1; // Start at 1 unit
        state.totalProfit = 0;
        state.startBankroll = bankroll;
    }

    // 3. Process Last Spin (Determine Progression)
    // ----------------------------------------------------------------
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        let hitSplit = false;
        let hitCorner = false;

        // Check Splits
        for (const split of STRATEGY_BETS.splits) {
            if (isSplitHit(lastNum, split)) hitSplit = true;
        }

        // Check Corners
        for (const corner of STRATEGY_BETS.corners) {
            if (isCornerHit(lastNum, corner)) hitCorner = true;
        }

        if (hitSplit) {
            // JACKPOT HIT (17:1): Reset to base to lock in big profit
            // console.log(`Last Spin ${lastNum}: SPLIT HIT! Resetting Ladder.`);
            state.ladderLevel = 1;
        } else if (hitCorner) {
            // STANDARD HIT (8:1): Ladder Down (Decrease risk)
            // console.log(`Last Spin ${lastNum}: CORNER HIT. Ladder Down.`);
            state.ladderLevel = Math.max(1, state.ladderLevel - 1);
        } else {
            // MISS: Ladder Up (Increase risk/reward)
            // console.log(`Last Spin ${lastNum}: MISS. Ladder Up.`);
            state.ladderLevel += 1;
        }
    }

    // 4. Calculate Bet Amount
    // ----------------------------------------------------------------
    // Calculate raw amount based on ladder level
    let rawAmount = MIN_BET * state.ladderLevel;

    // Clamp to table limits
    let betAmount = Math.max(rawAmount, MIN_BET);
    betAmount = Math.min(betAmount, MAX_BET);
    
    // Safety check: Do we have enough money?
    // Total cost = 6 bets * betAmount
    const totalCost = 6 * betAmount;
    if (totalCost > bankroll) {
        // If we can't afford the ladder, reset to 1 or stop
        state.ladderLevel = 1;
        betAmount = MIN_BET;
        if ((6 * betAmount) > bankroll) return []; // Stop if busted
    }

    // 5. Construct Bets
    // ----------------------------------------------------------------
    const bets = [];

    // Add Corner Bets
    for (const cornerVal of STRATEGY_BETS.corners) {
        bets.push({
            type: 'corner',
            value: cornerVal,
            amount: betAmount
        });
    }

    // Add Split Bets
    for (const splitVal of STRATEGY_BETS.splits) {
        bets.push({
            type: 'split',
            value: splitVal,
            amount: betAmount
        });
    }

    return bets;
}