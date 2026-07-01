/**
 * Source: https://www.youtube.com/watch?v=VN5kUJ6GKZo
 * YouTube Channel: CEG Dealer School
 *
 * The Full Logic in details:
 * - Observe Phase: Wait for 37 spins without betting.
 * - Hot Dozen Calculation: Evaluate the last 37 spins to find the hottest dozen(s).
 * - Betting Pattern: Place bets on 4 specific corners within the target dozen(s).
 *   - Dozen 1: Corners 1, 2, 7, 8
 *   - Dozen 2: Corners 13, 14, 19, 20 (as requested: 13/17, 14/18, 19/23, 20/24)
 *   - Dozen 3: Corners 25, 26, 31, 32
 * - Overlaps: Hitting the intersection of two corners (e.g., 14, 17, 20, 23 in Dozen 2) counts as 2 corners won.
 * 
 * The Full Bet Progression in details:
 * Step 1 (Grind): 
 * - Base bet is 1 unit on the 4 corners of the single hottest dozen.
 * - On Loss (0 corners hit): Increase all bets by 1 base unit.
 * - On Win (1 corner hit): Reduce all bets by 1 unit (minimum 1).
 * - On Win (2 corners hit): Transition immediately to Step 2.
 *
 * Step 2 (Jackpot):
 * - Calculate the 2 hottest dozens from the past 37 spins.
 * - Place 16 units on the 4 corners within EACH of the 2 dozens (8 corners total).
 * - On Loss (0 corners hit): Reset entirely back to Step 1 (re-evaluate 1 hottest dozen, reset progression).
 * - On Win (1 corner hit): Rebet (stay in Step 2 at 16 units).
 * - On Win (2 corners hit): Reset entirely back to Step 1.
 *
 * The Goal:
 * Grind the hottest section of the board, adjusting bets based on hits, until an overlapping 
 * "double hit" triggers a massive 16-unit strike on the two hottest dozens to capture large profits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Helper: Determine if a number falls within a specific corner (by top-left value)
    function isNumInCorner(num, cornerTopLeft) {
        return num === cornerTopLeft || 
               num === cornerTopLeft + 1 || 
               num === cornerTopLeft + 3 || 
               num === cornerTopLeft + 4;
    }

    // Helper: Find the top N hottest dozens from the last 37 spins
    function getHotDozens(history, count) {
        let counts = { 1: 0, 2: 0, 3: 0 };
        let recent = history.slice(-37);
        for (let spin of recent) {
            let n = spin.winningNumber;
            if (n >= 1 && n <= 12) counts[1]++;
            else if (n >= 13 && n <= 24) counts[2]++;
            else if (n >= 25 && n <= 36) counts[3]++;
        }
        // Sort descending by count
        let sorted = [1, 2, 3].sort((a, b) => counts[b] - counts[a]);
        return sorted.slice(0, count);
    }

    // Map dozens to their specific 4-corner pattern
    const DOZEN_CORNERS = {
        1: [1, 2, 7, 8],
        2: [13, 14, 19, 20],
        3: [25, 26, 31, 32]
    };

    // 1. Observe Phase: Wait for 37 spins
    if (spinHistory.length < 37) {
        return []; 
    }

    const inc = config.incrementMode === 'fixed' ? config.minIncrementalBet : 1;

    // 2. State Initialization / First Bet Transition
    if (!state.stage) {
        state.stage = 'GRIND';
        state.progression = 1;
        state.activeDozens = getHotDozens(spinHistory, 1);
        state.activeCorners = []; 
    } else {
        // 3. Evaluate the Previous Spin
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;
        
        let hitCount = 0;
        if (state.activeCorners && state.activeCorners.length > 0) {
            for (let c of state.activeCorners) {
                if (isNumInCorner(num, c)) {
                    hitCount++;
                }
            }
        }

        // 4. Progression Logic
        if (state.stage === 'GRIND') {
            if (hitCount === 0) {
                // Loss
                state.progression += inc;
            } else if (hitCount === 1) {
                // 1 Corner Won
                state.progression = Math.max(1, state.progression - inc);
            } else if (hitCount >= 2) {
                // 2 Corners Won -> Transition to Jackpot
                state.stage = 'JACKPOT';
                state.activeDozens = getHotDozens(spinHistory, 2);
            }
        } else if (state.stage === 'JACKPOT') {
            if (hitCount === 0 || hitCount >= 2) {
                // Loss OR 2 Corners Won -> Reset to Grind
                state.stage = 'GRIND';
                state.progression = 1;
                state.activeDozens = getHotDozens(spinHistory, 1);
            }
            // If hitCount === 1: Rebet (Do nothing, state stays on 'JACKPOT')
        }
    }

    // 5. Construct Bets
    let bets = [];
    state.activeCorners = []; // Reset tracked corners for the new spin

    // Calculate base unit limit
    const baseUnit = config.betLimits.min;
    let unitAmount = state.stage === 'GRIND' ? (baseUnit * state.progression) : (baseUnit * 16);

    // Clamp to table limits
    unitAmount = Math.max(unitAmount, config.betLimits.min);
    unitAmount = Math.min(unitAmount, config.betLimits.max);

    // Build the bet array based on active dozens
    for (let d of state.activeDozens) {
        let corners = DOZEN_CORNERS[d];
        for (let c of corners) {
            state.activeCorners.push(c); // Track for next spin evaluation
            bets.push({ type: 'corner', value: c, amount: unitAmount });
        }
    }

    // 6. Ensure Bankroll Coverage
    const totalWager = bets.reduce((sum, betObj) => sum + betObj.amount, 0);
    if (totalWager > bankroll) {
        return []; // Insufficient funds to place the required progression
    }

    return bets;
}