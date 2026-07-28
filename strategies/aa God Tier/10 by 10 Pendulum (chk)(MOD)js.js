/**
 * Source: The Lucky Felt - https://youtu.be/bZ8o3G_UKE8
 *
 * The Full Logic in details:
 * - The strategy uses a fixed set of 10 splits combined with an alternating set of 11 single numbers (straight up).
 * - To prevent tracking, the strategy alternates between two sets of single numbers (Set A and Set B) after each reset.
 * - Covered Splits: 2/3, 4/7, 12/15, 17/20, 18/21, 19/22, 25/26, 28/29, 31/32, 34/35
 * - Singles Set A: 0, 3, 7, 15, 20, 21, 22, 26, 29, 32, 34
 * - Singles Set B: 0, 2, 4, 12, 17, 18, 19, 25, 28, 31, 34
 * - Trigger Condition: Wait and observe. Do not place a bet until the currently covered numbers either hit twice in a row OR miss twice in a row. 
 * - The Ratchet (Kill Zone Swap): Every time you lock in a 10-unit profit above your current floor, you establish a new floor, swap the singles set (A <-> B), and wait for a new trigger.
 * 
 * The Full Bet Progression in details:
 * - Initial Bet: 1 unit on each of the 10 splits, and 1 unit on each of the 11 single numbers of the active set.
 * - Pendulum Ladder: 
 *   - On a loss (or partial loss): Move up the ladder by 1 step (+1 unit per position).
 *   - On a win: (USER OVERRIDE APPLIED): You DO NOT swing the pendulum backwards (down a level) UNTIL the session's peak profit is reached. Once peak profit is reached or exceeded, you drop down 1 step. 
 * 
 * The Goal:
 * - Systematically extract 10-unit profit blocks (ratchets) using high board coverage and momentum betting, swapping single sets upon each goal to hide your footprint.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.min;

    // Define the fixed splits and alternating single number sets
    const splits = [
        [2, 3], [4, 7], [12, 15], [17, 20], [18, 21], 
        [19, 22], [25, 26], [28, 29], [31, 32], [34, 35]
    ];
    const singlesA = [0, 3, 7, 15, 20, 21, 22, 26, 29, 32, 34];
    const singlesB = [0, 2, 4, 12, 17, 18, 19, 25, 28, 31, 34];

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.activeSet = 'A';
        state.progression = 1;
        state.waitingForTrigger = true;
        state.consecutiveHits = 0;
        state.consecutiveMisses = 0;
        state.ratchetFloor = bankroll;
        state.peakBankroll = bankroll;
        state.betActive = false; // Tracks if we placed bets on the previous spin
    }

    // Check if current bankroll is a new peak
    const isPeak = bankroll >= state.peakBankroll;
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    const currentSingles = state.activeSet === 'A' ? singlesA : singlesB;

    // Helper: Check if a winning number is covered by our current splits or singles
    const isHit = (number) => {
        if (currentSingles.includes(number)) return true;
        return splits.some(split => split.includes(number));
    };

    // 3. Process Last Spin
    if (spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1].winningNumber;
        const hit = isHit(lastResult);

        if (state.waitingForTrigger) {
            // Observing for entry point (2 hits or 2 misses in a row)
            if (hit) {
                state.consecutiveHits++;
                state.consecutiveMisses = 0;
            } else {
                state.consecutiveMisses++;
                state.consecutiveHits = 0;
            }

            if (state.consecutiveHits >= 2 || state.consecutiveMisses >= 2) {
                state.waitingForTrigger = false;
                state.betActive = true;
            }
        } else if (state.betActive) {
            // Evaluate outcome of our active bet
            if (hit) {
                // WIN: Apply user override logic for progression
                if (isPeak) {
                    state.progression = Math.max(1, state.progression - 1);
                }
            } else {
                // LOSS: Move up the ladder
                state.progression++;
            }

            // Check Ratchet / Kill Zone Swap Condition
            // Target is a 10-unit overall profit over the last floor
            if (bankroll >= state.ratchetFloor + (10 * unit)) {
                state.ratchetFloor = bankroll;
                state.activeSet = state.activeSet === 'A' ? 'B' : 'A';
                
                // Reset for new phase
                state.waitingForTrigger = true;
                state.betActive = false;
                state.consecutiveHits = 0;
                state.consecutiveMisses = 0;
                state.progression = 1; 
                
                return []; // Do not bet, wait for new trigger
            }
        }
    }

    // 4. Return Bets (If not waiting)
    if (state.waitingForTrigger) {
        return [];
    }

    // Calculate clamped bet amount per position
    let amount = unit * state.progression;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // Generate bet array for current phase
    const bets = [];
    
    splits.forEach(splitArray => {
        bets.push({
            type: 'split',
            value: splitArray,
            amount: amount
        });
    });

    currentSingles.forEach(singleNumber => {
        bets.push({
            type: 'number',
            value: singleNumber,
            amount: amount
        });
    });

    return bets;
}