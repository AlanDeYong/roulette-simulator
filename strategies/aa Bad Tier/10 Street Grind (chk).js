/**
 * 10 Street Grind Roulette Strategy
 *
 * Source: THEROULETTEMASTERTV (https://www.youtube.com/watch?v=8UUNMLk9j1E)
 *
 * The Logic:
 * - The roulette table is divided into 12 "streets" (rows of 3 numbers).
 * - We bet on 10 streets, deliberately omitting the last 2 unique streets that have hit.
 * - This provides massive table coverage (30 out of 37/38 numbers).
 * * The Progression:
 * - NORMAL Phase: Bet 1 base unit on 10 streets. If it wins, update the 2 omitted streets to the last 2 unique winning streets.
 * - RECOVERY 10 Phase: If we lose (hit a 0 or an omitted street), we double the bet size (Martingale). We keep betting the SAME 10 streets for the next spin.
 * - RECOVERY 9 Phase: Once we get a win in Recovery 10, we peel off (omit) the street that just hit, dropping to 9 streets covered. The bet size remains doubled.
 * - If we win on 9 streets, the recovery is complete. We reset the multiplier back to base and return to 10 streets.
 * - If we lose during either recovery phase, we continue doubling the current bet size.
 *
 * The Goal:
 * - A steady, high-win-rate grind aimed at generating a fast $200-$300 profit. Stop-loss is effectively bankroll ruin or hitting table limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- Helper Functions ---
    // Converts a winning number to the starting number of its street (e.g., 14 -> 13)
    const getStreetStart = (num) => Math.ceil(num / 3) * 3 - 2;

    // Scans history backwards to find the last 'count' unique streets
    const getLastUniqueStreets = (history, count) => {
        const unique = [];
        for (let i = history.length - 1; i >= 0; i--) {
            const num = history[i].winningNumber;
            // Ignore zeros as they don't belong to standard streets
            if (num === 0 || num === '00' || num === '0') continue;
            
            const street = getStreetStart(num);
            if (!unique.includes(street)) {
                unique.push(street);
            }
            if (unique.length === count) break;
        }
        return unique;
    };

    // --- State Initialization ---
    if (!state.phase) {
        state.phase = 'NORMAL';
        state.mult = 1;
        state.lastProcessedSpin = spinHistory.length;
        
        // Try to sync with existing history if strategy is toggled mid-game
        const initialOmitted = getLastUniqueStreets(spinHistory, 2);
        if (initialOmitted.length === 2) {
            state.omitted = initialOmitted;
        } else {
            // Default arbitrary streets if history is empty
            state.omitted = [1, 34]; 
        }
    }

    // --- State Machine Logic (Evaluates previous spin) ---
    if (spinHistory.length > state.lastProcessedSpin) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastNum = lastResult.winningNumber;
        const isZero = (lastNum === 0 || lastNum === '00' || lastNum === '0');
        const lastStreet = isZero ? null : getStreetStart(lastNum);

        // It's a win if it wasn't a zero AND wasn't one of our omitted streets
        const wasWin = !isZero && !state.omitted.includes(lastStreet);

        if (state.phase === 'NORMAL') {
            if (wasWin) {
                state.mult = 1;
                // Dynamically update to the most recent 2 distinct streets
                const lastTwo = getLastUniqueStreets(spinHistory, 2);
                if (lastTwo.length === 2) state.omitted = lastTwo;
            } else {
                state.phase = 'RECOVERY_10';
                state.mult *= 2; // Double the bet
            }
        } 
        else if (state.phase === 'RECOVERY_10') {
            if (wasWin) {
                state.phase = 'RECOVERY_9';
                // Add the street that just hit to omitted list (now betting 9 streets)
                if (lastStreet !== null && !state.omitted.includes(lastStreet)) {
                    state.omitted.push(lastStreet);
                }
            } else {
                state.mult *= 2; // Lose again, double again
            }
        } 
        else if (state.phase === 'RECOVERY_9') {
            if (wasWin) {
                state.phase = 'NORMAL';
                state.mult = 1; // Reset multiplier
                const lastTwo = getLastUniqueStreets(spinHistory, 2);
                if (lastTwo.length === 2) {
                    state.omitted = lastTwo;
                } else {
                    state.omitted = state.omitted.slice(0, 2); // Fallback
                }
            } else {
                state.mult *= 2; // Lose on 9 streets, double again
            }
        }

        state.lastProcessedSpin = spinHistory.length;
    }

    // --- Bet Calculation ---
    const baseUnit = config.betLimits.min; 
    let amount = baseUnit * state.mult;

    // Crucial: Clamp bet to table limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // --- Bet Generation ---
    const bets = [];
    // Array of all 12 street starting numbers
    const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    for (const street of ALL_STREETS) {
        if (!state.omitted.includes(street)) {
            bets.push({ type: 'street', value: street, amount: amount });
        }
    }

    return bets;
}