/**
 * LAVOIE MATRIX ROULETTE STRATEGY
 *
 * Source:
 *   Channel: The Roulette Master
 *   Video: "THE LAVOIE MATRIX IS PURE GENIUS! #best #roulette #viralvideo #gaming #money #business #trending #1"
 *   URL: https://youtu.be/O5jpltUeYcw
 *   System Creator: Richard Lavoie
 *
 * The Full Logic in Detail:
 *   1. Board Partitioning: Roulette numbers (1-36) form a matrix of 12 three-number streets:
 *      [1-3], [4-6], [7-9], [10-12], [13-15], [16-18], [19-21], [22-24], [25-27], [28-30], [31-33], [34-36].
 *   2. Bet Placement & Triggers:
 *      - The player inspects past spins and identifies the 4 most recently hit unique streets.
 *      - Marker bets are placed to identify and exclude these 4 recent streets.
 *      - The remaining 8 streets (24 numbers = 2/3 of the wheel) are actively bet on.
 *      - Insurance bets are placed on 0 (and 00 on American tables) to guard against house zeroes.
 *
 * The Full Bet Progression in Detail:
 *   1. Modified Fibonacci Progression:
 *      - Unit multipliers: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...
 *      - On the first loss, double the base unit (from 1x to 2x).
 *      - On subsequent losses, advance through the Fibonacci sequence (2x -> 3x -> 5x -> 8x -> 13x -> 21x...).
 *   2. Street Elimination on Wins:
 *      - When an active street wins, that specific street is removed from the active bet set.
 *      - The remaining active streets are spun again at the current progression bet level. This reduces
 *        the total capital wagered while multiplying the net payout if another active street hits.
 *   3. Reset Condition:
 *      - When overall session profit target is reached, or when the system recovers into net positive profit
 *        after high-tier bets, reset progression to level 0 and re-evaluate the 4 most recent hit streets to build
 *        a fresh 8-street matrix.
 *
 * The Goal:
 *   - Target profit: +$100 to +$300 (or config profit target).
 *   - Protect capital via high coverage (8 streets + 0/00 insurance) and steady multi-stage Fibonacci recovery.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    const FIBONACCI_MULTIPLIERS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233];

    // Helper: Map winning number to its street starting value (1, 4, 7... 34)
    function getStreetStart(num) {
        if (num >= 1 && num <= 36) {
            return Math.floor((num - 1) / 3) * 3 + 1;
        }
        return null;
    }

    // Helper: Find the 4 most recent unique hit streets from spinHistory
    function getRecentHitStreets(history) {
        const hitStreets = [];
        for (let i = history.length - 1; i >= 0; i--) {
            const num = history[i].winningNumber;
            const street = getStreetStart(num);
            if (street !== null && !hitStreets.includes(street)) {
                hitStreets.push(street);
                if (hitStreets.length === 4) break;
            }
        }
        return hitStreets;
    }

    // Helper: Reset the matrix and select 8 active streets
    function resetMatrix() {
        const excludedStreets = getRecentHitStreets(spinHistory);
        // If history has fewer than 4 unique streets, pick remaining from end of table to make 4 excluded
        for (let s of ALL_STREETS) {
            if (excludedStreets.length >= 4) break;
            if (!excludedStreets.includes(s)) excludedStreets.push(s);
        }
        state.activeStreets = ALL_STREETS.filter(s => !excludedStreets.includes(s));
        state.progressionIndex = 0;
        state.hedgeZero = true;
    }

    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.targetProfit = 300;
        state.progressionIndex = 0;
        state.hedgeZero = true;
        state.activeStreets = [];
        state.lastPlacedStreets = [];
        resetMatrix();
    }

    // 2. Evaluate Previous Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastStreet = getStreetStart(lastNum);

        const currentProfit = bankroll - state.initialBankroll;

        // Check if session profit reached or recovered into net profit after progression
        if (currentProfit >= state.targetProfit || (state.progressionIndex > 1 && currentProfit > 0)) {
            resetMatrix();
        } else if (lastStreet !== null && state.lastPlacedStreets.includes(lastStreet)) {
            // WIN on an active street: Remove that winning street from active list
            state.activeStreets = state.activeStreets.filter(s => s !== lastStreet);

            // If active streets drop below 3, reset matrix to reload 8 streets
            if (state.activeStreets.length < 3) {
                resetMatrix();
            }
        } else if (lastNum === 0 || lastNum === 37) {
            // Zero hit
            state.hedgeZero = false; // Zero hit, remove hedge until matrix reset
        } else {
            // LOSS: Advance modified Fibonacci progression
            if (state.progressionIndex < FIBONACCI_MULTIPLIERS.length - 1) {
                state.progressionIndex++;
            }
            // If active streets have been reduced, replenish them back to the standard 8 streets
            if (state.activeStreets.length < 6) {
                const excluded = getRecentHitStreets(spinHistory);
                state.activeStreets = ALL_STREETS.filter(s => !excluded.includes(s));
            }
        }
    }

    // 3. Compute Bet Amounts respecting Limits
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;
    const multiplier = FIBONACCI_MULTIPLIERS[state.progressionIndex] || 1;

    let streetBetAmount = minInside * multiplier;
    streetBetAmount = Math.max(streetBetAmount, minInside);
    streetBetAmount = Math.min(streetBetAmount, maxBet);

    let zeroBetAmount = Math.max(minInside, Math.min(Math.round(streetBetAmount * 0.3), maxBet));

    // 4. Construct Bet Objects
    const bets = [];

    // Place bets on all active streets
    for (let streetStart of state.activeStreets) {
        bets.push({
            type: 'street',
            value: streetStart,
            amount: streetBetAmount
        });
    }

    // Place Zero Insurance if enabled
    if (state.hedgeZero) {
        bets.push({
            type: 'number',
            value: 0,
            amount: zeroBetAmount
        });

        if (config.tableType === 'american') {
            bets.push({
                type: 'number',
                value: 37, // 00 in standard roulette simulator notation
                amount: zeroBetAmount
            });
        }
    }

    // Save currently placed streets in state for next spin evaluation
    state.lastPlacedStreets = [...state.activeStreets];

    return bets;
}