/**
 * Junko's Revised Easy Street Strategy
 * 
 * Source:
 * - YouTube Video: "Junko's Revised Easy Street Strategy-How To Win At Roulette"
 * - Channel: Junko Bodie (https://youtu.be/JtzfYl-3u8M)
 * 
 * The Full Logic in Detail:
 * 1. Street Classification:
 *    The 12 roulette streets (rows of 3 consecutive numbers) are divided into:
 *    - "Odd Streets" (streets starting with 1, 7, 13, 19, 25, 31), each containing 2 odd numbers.
 *    - "Even Streets" (streets starting with 4, 10, 16, 22, 28, 34), each containing 2 even numbers.
 * 2. Board Placement:
 *    - The player selects a set (starting with Odd Streets or Even Streets) and places 1 unit 
 *      on each of the active streets in that set (covering 6 streets / 18 numbers).
 *    - Optionally, an outside hedge can be placed on the opposite parity (e.g., bet on 'even' 
 *      when betting Odd streets) to buy spins and mitigate misses.
 * 
 * The Full Bet Progression in Detail:
 * - Base Level: 1 unit per active street.
 * - Standard Progression on Losses:
 *   - After 1st loss: Double bet to 2 units per street.
 *   - After 2nd loss: Double bet to 4 units per street.
 * - Revised Recovery & Session Management:
 *   - When a hit occurs and net session profit target (e.g., +10 to +12 units) is reached:
 *     Session is Won! Reset all bets back to 1 unit, restore all 6 streets, and switch street sets (Odd <-> Even).
 *   - If a hit occurs before reaching the full session target profit:
 *     Remove the winning street (reducing exposure) and reset/manage remaining street bets to lower 
 *     units (1-2 units) until the target profit is hit.
 *   - If deep loss occurs past 4 units: Step up bet incrementally by +1 unit per street until a hit occurs.
 * 
 * The Goal:
 * - Profit Target: Hit a session profit of +10 to +12 units per session, then take profit and reset/switch.
 * - Stop Loss: Protected by table limits (`config.betLimits.max`) and remaining bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit respecting inside bet limits
    const unit = config.betLimits.min;

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.sessionStartBankroll = bankroll;
        state.targetSessionProfit = unit * 6; // Target profit of 6 to 12 units per session
        state.mode = 'odd'; // 'odd' or 'even' streets
        state.progressionStep = 1; // 1 -> 2 -> 4 -> recovery (+1)
        state.activeStreets = [1, 7, 13, 19, 25, 31];
        state.inRecovery = false;
    }

    const ODD_STREETS = [1, 7, 13, 19, 25, 31];
    const EVEN_STREETS = [4, 10, 16, 22, 28, 34];

    // Helper: Find which street a number belongs to (returns street starting number or null for 0/00)
    function getStreetStart(num) {
        if (num === 0 || num === '00' || num === null || num === undefined) return null;
        return Math.floor((num - 1) / 3) * 3 + 1;
    }

    // 3. Evaluate Previous Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;
        const hitStreet = getStreetStart(winningNumber);

        const currentSessionProfit = bankroll - state.sessionStartBankroll;

        // Check if session target profit is reached
        if (currentSessionProfit >= state.targetSessionProfit) {
            // Target achieved: Complete session reset and switch mode
            state.sessionStartBankroll = bankroll;
            state.mode = state.mode === 'odd' ? 'even' : 'odd';
            state.activeStreets = state.mode === 'odd' ? [...ODD_STREETS] : [...EVEN_STREETS];
            state.progressionStep = 1;
            state.inRecovery = false;
        } else {
            // Session continuing
            const wasHit = hitStreet !== null && state.activeStreets.includes(hitStreet);

            if (wasHit) {
                // A street hit occurred
                if (state.inRecovery || state.progressionStep > 1) {
                    // Revised recovery: Remove winning street to reduce exposure and reset unit size
                    state.activeStreets = state.activeStreets.filter(s => s !== hitStreet);
                    if (state.activeStreets.length === 0) {
                        state.activeStreets = state.mode === 'odd' ? [...ODD_STREETS] : [...EVEN_STREETS];
                    }
                    state.progressionStep = 1;
                    state.inRecovery = true;
                } else {
                    state.progressionStep = 1;
                }
            } else {
                // Missed spin: Advance progression
                if (state.progressionStep === 1) {
                    state.progressionStep = 2;
                } else if (state.progressionStep === 2) {
                    state.progressionStep = 4;
                } else {
                    // Past 4 units: Enter recovery with linear increment
                    state.inRecovery = true;
                    const inc = config.incrementMode === 'base' ? unit : (config.minIncrementalBet || 1);
                    state.progressionStep += Math.max(1, Math.floor(inc / unit));
                }
            }
        }
    }

    // Ensure active streets list is not empty
    if (!state.activeStreets || state.activeStreets.length === 0) {
        state.activeStreets = state.mode === 'odd' ? [...ODD_STREETS] : [...EVEN_STREETS];
    }

    // 4. Calculate Bet Amounts
    let streetBetAmount = unit * state.progressionStep;
    streetBetAmount = Math.max(streetBetAmount, config.betLimits.min);
    streetBetAmount = Math.min(streetBetAmount, config.betLimits.max);

    // 5. Build Bet Array
    const bets = [];
    for (const streetVal of state.activeStreets) {
        bets.push({
            type: 'street',
            value: streetVal,
            amount: streetBetAmount
        });
    }

    // Ensure total bet does not exceed available bankroll
    const totalBetCost = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBetCost > bankroll) {
        return []; // Insufficient bankroll to place full strategy
    }

    return bets;
}