/**
 * ============================================================================
 * ROULETTE STRATEGY: Tiger's Pyramid (Peak Profit Reset & Dynamic Coverage)
 * ============================================================================
 * @source  YouTube Video: https://youtu.be/ThdwqIlXKzs
 * @channel The Roulette Master (Silent Tiger System with custom user adaptations)
 * 
 * ----------------------------------------------------------------------------
 * 1. THE FULL LOGIC IN DETAIL:
 * ----------------------------------------------------------------------------
 * - Initial Bet:
 *   - Randomly chooses 9 consecutive streets from the roulette board layout.
 *   - Places 1 base unit bet each on these 9 consecutive streets.
 * 
 * - Win Conditions & Transitions:
 *   - In Streets phase (9 streets): On a street win:
 *     - If at/above session peak bankroll: Reset back to base level and choose 9 new consecutive streets.
 *     - If not at peak: Rebet active streets and add 1 unit bet each to 3 random,
 *       non-overlapping corners located strictly within the 9 selected streets.
 *   - In Pyramid phase (9 streets + 3 corners): On a corner win:
 *     - If at/above session peak bankroll: Full reset (clear corners, reset to 1 unit, choose 9 new consecutive streets).
 *     - If not at session peak: Rebet active layout.
 * 
 * - Push Condition (Pyramid Phase):
 *   - If the spin hits one of the 9 streets but misses all 3 corners (net 0 push), rebet without changing bet sizes.
 * 
 * - Loss Condition (Miss / 0 / 00):
 *   - Rebet active layout, increasing all current active bets by their respective base bet amount.
 * 
 * ----------------------------------------------------------------------------
 * 2. THE FULL BET PROGRESSION:
 * ----------------------------------------------------------------------------
 * - Loss: Increase all active bet positions by their base unit amount.
 * - Push: Maintain current bet levels and rebet.
 * - Win (below peak): Advance to pyramid phase or rebet active layout.
 * - Win (at session peak): Reset unit level to 1, clear corners, and pick 9 fresh consecutive streets.
 * 
 * ----------------------------------------------------------------------------
 * 3. THE GOAL:
 * ----------------------------------------------------------------------------
 * - Secure new session peak bankrolls via high coverage and corner multipliers,
 *   resetting risk exposure upon achieving peak profit.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;
    const allStreetStarts = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    // Helper: Select 9 consecutive streets
    function pick9ConsecutiveStreets() {
        const startIdx = Math.floor(Math.random() * (allStreetStarts.length - 9 + 1));
        return allStreetStarts.slice(startIdx, startIdx + 9);
    }

    // Helper: Pick 3 non-overlapping corners within the selected 9 streets
    function pick3NonOverlappingCorners(streets) {
        const minStreet = streets[0];
        const maxStreet = streets[streets.length - 1];

        const validCorners = [];
        for (let s of streets) {
            if (s + 3 <= maxStreet + 2) {
                validCorners.push(s);     // Left column top-left (covers s, s+1, s+3, s+4)
                validCorners.push(s + 1); // Middle column top-left (covers s+1, s+2, s+4, s+5)
            }
        }

        const shuffled = validCorners.sort(() => 0.5 - Math.random());
        const selected = [];

        function cornersOverlap(c1, c2) {
            const set1 = [c1, c1 + 1, c1 + 3, c1 + 4];
            const set2 = [c2, c2 + 1, c2 + 3, c2 + 4];
            return set1.some(n => set2.includes(n));
        }

        for (let cand of shuffled) {
            if (selected.length === 3) break;
            const overlaps = selected.some(c => cornersOverlap(c, cand));
            if (!overlaps) {
                selected.push(cand);
            }
        }

        return selected;
    }

    // Helper: Check street coverage
    function isStreetHit(num, streets) {
        if (num === 0 || num === '0' || num === '00') return false;
        return streets.some(s => num >= s && num <= s + 2);
    }

    // Helper: Check corner coverage
    function isCornerHit(num, corners) {
        if (num === 0 || num === '0' || num === '00') return false;
        return corners.some(c => {
            const covered = [c, c + 1, c + 3, c + 4];
            return covered.includes(num);
        });
    }

    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.peakBankroll = bankroll;
        state.phase = 'streets'; // 'streets' or 'pyramid'
        state.streets = pick9ConsecutiveStreets();
        state.corners = [];
        state.streetUnits = 1;
        state.cornerUnits = 1;
    }

    // 2. Evaluate Last Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        const streetWon = isStreetHit(lastNum, state.streets);
        const cornerWon = state.phase === 'pyramid' && isCornerHit(lastNum, state.corners);

        if (state.phase === 'streets') {
            if (streetWon) {
                if (bankroll >= state.peakBankroll) {
                    // Win at session peak -> reset
                    state.peakBankroll = bankroll;
                    state.phase = 'streets';
                    state.streets = pick9ConsecutiveStreets();
                    state.corners = [];
                    state.streetUnits = 1;
                    state.cornerUnits = 1;
                } else {
                    // Win not at peak -> rebet and add 3 corners
                    state.phase = 'pyramid';
                    state.corners = pick3NonOverlappingCorners(state.streets);
                    state.cornerUnits = 1;
                }
            } else {
                // Loss -> rebet, increase all bets by base bet amount
                state.streetUnits++;
            }
        } else if (state.phase === 'pyramid') {
            if (cornerWon) {
                if (bankroll >= state.peakBankroll) {
                    // Corner win at session peak -> reset
                    state.peakBankroll = bankroll;
                    state.phase = 'streets';
                    state.streets = pick9ConsecutiveStreets();
                    state.corners = [];
                    state.streetUnits = 1;
                    state.cornerUnits = 1;
                } else {
                    // Corner win not at session peak -> rebet
                }
            } else if (streetWon) {
                // Push (street hit only) -> rebet
            } else {
                // Loss (total miss) -> rebet, increase all bets by base bet amount
                state.streetUnits++;
                state.cornerUnits++;
            }
        }
    }

    // Update session peak bankroll if reached
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 3. Assemble Bet Array
    const bets = [];
    const streetAmount = Math.min(maxBet, Math.max(baseUnit, state.streetUnits * baseUnit));

    for (let s of state.streets) {
        bets.push({
            type: 'street',
            value: s,
            amount: streetAmount
        });
    }

    if (state.phase === 'pyramid') {
        const cornerAmount = Math.min(maxBet, Math.max(baseUnit, state.cornerUnits * baseUnit));
        for (let c of state.corners) {
            bets.push({
                type: 'corner',
                value: c,
                amount: cornerAmount
            });
        }
    }

    return bets;
}