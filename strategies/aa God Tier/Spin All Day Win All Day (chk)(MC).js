/**
 * Roulette Strategy: "Spin All Day Win All Day" (Waiting for 3 Unique Winners -> Bet on Remaining 3 Sleepers)
 * * Source:
 * - Video URL: https://youtu.be/WpiY-QamBIY?si=EL_rvb_EnIE12xPG
 * - YouTube Channel: The Roulette Master
 * * The Full Logic in Detail:
 * 1. Wait Condition:
 * - The strategy remains idle and does NOT place any bets until 3 unique Double Streets have won/hit in the spin history.
 * 2. Selection Trigger (Inverse Selection Modification):
 * - Once 3 unique winning Double Streets are found, the strategy calculates the remaining 3 Double Streets that have NOT won during that recent window.
 * - These remaining 3 "sleeper" Double Streets are selected as the target betting spots.
 * 3. Lock Conditions:
 * - You remain locked on these chosen 3 sleeper spots throughout any losses or non-qualifying wins until a "Session Profit" condition is reached.
 * - A new session initialization (waiting for 3 unique Double Streets to hit) only occurs at the start of the game or immediately after resetting a session on a profit milestone.
 * * The Full Bet Progression in Detail:
 * 1. Initial/Base Bet:
 * - Every betting session begins at the base progression tier (Level 1).
 * - 1 Unit is placed on each of the selected 3 Double Streets (Total 3 Units active).
 * 2. After a Loss:
 * - Increase the bet amount for each individual Double Street position by 1 Unit for the next spin (e.g., tier goes from 1 to 2, making it 2 units per position).
 * 3. After a Win:
 * - If the cycle profit is NOT enough to hit a new all-time high lifetime balance, the bet amounts for the 3 Double Streets stay exactly the same as the last spin (flat-betting at the current tier).
 * * The Goal:
 * - A session successfully resets if the net balance becomes strictly greater than the baseline balance captured right before that betting cycle started (session profit >= 1 unit over the previous high watermark).
 * - Upon reaching this goal, the strategy clears its cycle flags, saves the new high bankroll peak, resets the bet tier back to 1 unit, and returns to the idle waiting state until another 3 unique Double Streets win.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Determine the baseline chip size based on the table's inside bet constraints
    const baseUnit = config.betLimits.min;

    // Defined standard layout mappings for the 6 standard Double Streets on a roulette table
    const doubleStreets = [
        { value: 1,  numbers: [1, 2, 3, 4, 5, 6] },
        { value: 7,  numbers: [7, 8, 9, 10, 11, 12] },
        { value: 13, numbers: [13, 14, 15, 16, 17, 18] },
        { value: 19, numbers: [19, 20, 21, 22, 23, 24] },
        { value: 25, numbers: [25, 26, 27, 28, 29, 30] },
        { value: 31, numbers: [31, 32, 33, 34, 35, 36] }
    ];

    // Helper function to find which Double Street value a number belongs to
    function getStreetValue(num) {
        const street = doubleStreets.find(s => s.numbers.includes(num));
        return street ? street.value : null;
    }

    // Initialize foundational tracker records for a brand-new engine state
    if (state.maxBankroll === undefined) {
        state.maxBankroll = bankroll;
    }
    if (state.progressionTier === undefined) {
        state.progressionTier = 1;
    }
    if (state.activeStreetValues === undefined) {
        state.activeStreetValues = null;
    }

    // Process game outcomes if spin history data is present
    if (spinHistory && spinHistory.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const winningNum = lastResult.winningNumber;

        // Only evaluate progression adjustments if we were actively betting
        if (state.activeStreetValues) {
            const spinWasWin = state.activeStreetValues.includes(getStreetValue(winningNum));

            if (bankroll > state.maxBankroll) {
                // Milestone achieved: Reset tracking indicators back to idle waiting status
                state.maxBankroll = bankroll;
                state.progressionTier = 1;
                state.activeStreetValues = null; 
            } else if (!spinWasWin) {
                // Step up the bet scale incrementally on missed rounds
                state.progressionTier += 1;
            }
        }
    }

    // If idle, look back through history to find 3 unique double streets that won, then bet on the OTHER 3
    if (!state.activeStreetValues && spinHistory && spinHistory.length > 0) {
        const uniqueWinners = [];
        
        // Scan backwards through history to find the 3 most recent unique double street winners
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const streetVal = getStreetValue(spinHistory[i].winningNumber);
            if (streetVal !== null && !uniqueWinners.includes(streetVal)) {
                uniqueWinners.push(streetVal);
            }
            if (uniqueWinners.length === 3) {
                break;
            }
        }

        // If we found 3 unique winners, select the 3 double streets that have NOT won
        if (uniqueWinners.length === 3) {
            state.activeStreetValues = doubleStreets
                .map(s => s.value)
                .filter(val => !uniqueWinners.includes(val));

            // Update maxBankroll right before entering the betting cycle to establish the new benchmark
            state.maxBankroll = bankroll;
        }
    }

    // Return empty array (no bets) if still waiting for the 3 unique winner condition
    if (!state.activeStreetValues) {
        return [];
    }

    // Calculate structural bet sizing limits
    let finalBetAmount = baseUnit * state.progressionTier;
    finalBetAmount = Math.max(finalBetAmount, config.betLimits.min);
    finalBetAmount = Math.min(finalBetAmount, config.betLimits.max);

    // Format structural bet transaction orders for deployment to table spots
    return state.activeStreetValues.map(streetVal => {
        return {
            type: 'line',
            value: streetVal,
            amount: finalBetAmount
        };
    });
}