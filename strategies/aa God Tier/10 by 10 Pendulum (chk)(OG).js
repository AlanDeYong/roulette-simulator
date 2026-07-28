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
 * - Level 0 (Initial): 1 unit on each of the 10 splits, and 1 unit on each of the 11 active singles.
 * - Level 1 (1st loss): Add 2 units to all splits. (Splits: 3u, Singles: 1u).
 * - Level 2 (2nd loss): Add 2 units to all singles. (Splits: 3u, Singles: 3u).
 * - Level 3 (3rd loss): Stop betting. Spin until the covered area misses. Rebet and add 2 units to all splits. (Splits: 5u, Singles: 3u).
 * - Level 4 (4th loss): Add 2 units to all singles. (Splits: 5u, Singles: 5u).
 * - Level 5 (5th loss): Stop betting. Spin until the covered area misses. Rebet and add 2 units to all splits. (Splits: 7u, Singles: 5u).
 * - Level 6 (6th loss): Add 2 units to all singles. (Splits: 7u, Singles: 7u).
 * - Level 7 (7th loss): Stop betting. Spin until the covered area misses. Rebet and add 2 units to all splits. (Splits: 9u, Singles: 7u).
 * - Level 8 (8th loss): Add 2 units to all singles. (Splits: 9u, Singles: 9u).
 * - Level 9 (9th loss): Stop betting permanently (Session stop loss).
 * - On a win: (USER OVERRIDE APPLIED): You DO NOT swing the pendulum backwards (down a level) UNTIL the session's peak profit is reached. Once peak profit is reached or exceeded, you drop down 1 step in the ladder.
 * 
 * The Goal:
 * - Systematically extract 10-unit profit blocks (ratchets) using high board coverage and alternating momentum betting, swapping single sets upon each goal. Hard stop at the 9th loss.
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

    // Define the precise level-by-level progression multipliers
    const progressionLadder = [
        { splitUnits: 1, singleUnits: 1, waitMiss: false }, // L0: Base
        { splitUnits: 3, singleUnits: 1, waitMiss: false }, // L1: 1st loss
        { splitUnits: 3, singleUnits: 3, waitMiss: false }, // L2: 2nd loss
        { splitUnits: 5, singleUnits: 3, waitMiss: true },  // L3: 3rd loss (Wait for miss)
        { splitUnits: 5, singleUnits: 5, waitMiss: false }, // L4: 4th loss
        { splitUnits: 7, singleUnits: 5, waitMiss: true },  // L5: 5th loss (Wait for miss)
        { splitUnits: 7, singleUnits: 7, waitMiss: false }, // L6: 6th loss
        { splitUnits: 9, singleUnits: 7, waitMiss: true },  // L7: 7th loss (Wait for miss)
        { splitUnits: 9, singleUnits: 9, waitMiss: false }  // L8: 8th loss
    ];

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.activeSet = 'A';
        state.level = 0; // Tracks our position in the progressionLadder
        state.waitingForTrigger = true; // Initial trigger (2 hits or 2 misses)
        state.waitingForMissStreak = false; // Used for levels 3, 5, 7 pauses
        state.consecutiveHits = 0;
        state.consecutiveMisses = 0;
        state.ratchetFloor = bankroll;
        state.peakBankroll = bankroll;
        state.betActive = false; // Tracks if we placed bets on the previous spin
        state.stopped = false; // Triggered on 9th loss
    }

    // If strategy has hard stopped from 9 losses, don't bet anymore
    if (state.stopped) return [];

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

        // Handle initial table entry trigger
        if (state.waitingForTrigger) {
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
        } 
        // Handle waiting for a miss after severe losses (Levels 3, 5, 7)
        else if (state.waitingForMissStreak) {
            if (!hit) {
                // Miss occurred, resume betting
                state.waitingForMissStreak = false;
                state.betActive = true;
            }
        } 
        // Evaluate outcome of our active bet
        else if (state.betActive) {
            if (hit) {
                // WIN: Apply user override logic for going down a level
                if (isPeak) {
                    state.level = Math.max(0, state.level - 1);
                }
            } else {
                // LOSS: Move up the ladder
                state.level++;
                
                if (state.level >= 9) {
                    // 9th loss hit: hard stop
                    state.stopped = true;
                    return [];
                } else if (progressionLadder[state.level].waitMiss) {
                    // Enter waiting state for the wheel to miss
                    state.waitingForMissStreak = true;
                    state.betActive = false; // We aren't betting while waiting
                }
            }

            // Check Ratchet / Kill Zone Swap Condition
            // Target is a 10-unit overall profit over the last floor
            if (bankroll >= state.ratchetFloor + (10 * unit)) {
                state.ratchetFloor = bankroll;
                state.activeSet = state.activeSet === 'A' ? 'B' : 'A';
                
                // Reset for new phase
                state.waitingForTrigger = true;
                state.waitingForMissStreak = false;
                state.betActive = false;
                state.consecutiveHits = 0;
                state.consecutiveMisses = 0;
                state.level = 0; 
                
                return []; // Do not bet, wait for new initial trigger
            }
        }
    }

    // 4. Return Bets (If waiting for any condition, bet nothing)
    if (state.waitingForTrigger || state.waitingForMissStreak) {
        return [];
    }

    // Look up current multipliers based on ladder level
    const ladderStep = progressionLadder[state.level];
    
    let splitAmount = unit * ladderStep.splitUnits;
    splitAmount = Math.max(splitAmount, config.betLimits.min);
    splitAmount = Math.min(splitAmount, config.betLimits.max);

    let singleAmount = unit * ladderStep.singleUnits;
    singleAmount = Math.max(singleAmount, config.betLimits.min);
    singleAmount = Math.min(singleAmount, config.betLimits.max);

    const bets = [];
    
    splits.forEach(splitArray => {
        bets.push({
            type: 'split',
            value: splitArray,
            amount: splitAmount
        });
    });

    currentSingles.forEach(singleNumber => {
        bets.push({
            type: 'number',
            value: singleNumber,
            amount: singleAmount
        });
    });

    return bets;
}