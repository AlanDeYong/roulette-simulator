/**
 * STRATEGY: 10-Street Search-Back with Stay-and-Recover Progression
 * * Logic:
 * 1. SELECTION: Exclude the 2 most recent unique streets hit (Search-Back).
 * 2. BETTING: Cover 10 target streets using Double Street (Line) or Street bets.
 * - Line bets are used for adjacent streets.
 * - Single Street bets are used for isolated streets.
 * - Double Street amount is always 2x the Single Street amount.
 * 3. PROGRESSION (Recovery Logic):
 * - ON LOSS: Double the current multiplier.
 * - ON WIN (Below Peak): Keep the current multiplier (Rebet).
 * - ON WIN (At/Above Peak): Reset multiplier to 1 and update the Peak.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. INITIALIZE STATE ---
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;
    if (state.lastBankroll === undefined) state.lastBankroll = bankroll;
    if (state.multiplier === undefined) state.multiplier = 1;

    const minInside = config.betLimits.min;
    const maxBet = config.betLimits.max;

    // --- 2. PROGRESSION LOGIC ---
    if (bankroll < state.lastBankroll) {
        // We just lost: Double Up
        state.multiplier *= 2;
    } else if (bankroll >= state.peakBankroll) {
        // We reached or exceeded the peak: Reset
        state.multiplier = 1;
        state.peakBankroll = bankroll;
    } 
    // ELSE: It was a win but we are still below peak. 
    // state.multiplier remains the same (Rebet).

    // Update lastBankroll for the next spin's comparison
    state.lastBankroll = bankroll;

    // --- 3. STREET SELECTION ---
    if (spinHistory.length < 2) return [];

    const getStreetStart = (num) => {
        if (num === 0 || num === '00') return null;
        return Math.floor((num - 1) / 3) * 3 + 1;
    };

    let excludedStreets = [];
    
    // Find the 2 most recent unique streets
    for (let i = spinHistory.length - 1; i >= 0; i--) {
        let s = getStreetStart(spinHistory[i].winningNumber);
        if (s !== null && !excludedStreets.includes(s)) {
            excludedStreets.push(s);
        }
        if (excludedStreets.length === 2) break;
    }

    if (excludedStreets.length < 2) return []; // Wait for data

    // --- 4. TARGET MAPPING ---
    const allStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    const targetStreets = allStreets.filter(s => !excludedStreets.includes(s));

    // --- 5. BET CONSTRUCTION ---
    let bets = [];
    let i = 0;
    const ssAmount = minInside * state.multiplier;
    const dsAmount = ssAmount * 2;

    while (i < targetStreets.length) {
        let current = targetStreets[i];
        let next = targetStreets[i + 1];

        if (next && next === current + 3) {
            bets.push({
                type: 'line',
                value: current,
                amount: Math.min(dsAmount, maxBet)
            });
            i += 2;
        } else {
            bets.push({
                type: 'street',
                value: current,
                amount: Math.min(ssAmount, maxBet)
            });
            i += 1;
        }
    }

    return bets;
}