/**
 * THERAPY STRATEGY (ROULETTE THERAPY)
 * 
 * Source:
 * - Channel: The Roulette Master
 * - Video: "I CAN'T WAIT TO WIN WITH THIS TONIGHT!" (https://youtu.be/pGMsnim5jOY)
 * - Strategy Origin: Roulette Therapy
 * 
 * Strategy Logic & Mechanics:
 * 1. Street Layout:
 *    - Dozen 1 (1-12): Streets 1, 4, 7, 10
 *    - Dozen 2 (13-24): Streets 13, 16, 19, 22
 *    - Dozen 3 (25-36): Streets 25, 28, 31, 34
 * 
 * 2. Bet Selection:
 *    - Level 1: Covers the 2 most recently hit dozens (leaving out the coldest dozen).
 *      Within each selected dozen, 3 out of 4 streets are bet, leaving out the street
 *      that hit most recently in that dozen (6 streets total).
 *    - Level 2: Covers all 3 dozens (3 streets per dozen, leaving out the most recent
 *      hit street in each dozen, 9 streets total).
 * 
 * 3. Progression & Recovery:
 *    - Level 1: 6 streets at 1 unit each (6 units total).
 *      - Win: Session profit achieved, reset to Level 1.
 *      - Loss: Advance to Level 2.
 *    - Level 2: 9 streets at 2 units each (18 units total).
 *      - Win: Recovers previous 6-unit loss with profit (+6 units net). Reset to Level 1.
 *      - Loss: Advance to Level 3 (Deep Recovery).
 *    - Level 3+ (Deep Recovery):
 *      - Unit multiplier doubles (Level 3 = 4 units, Level 4 = 8 units, etc.).
 *      - Bets on active 9 streets.
 *      - On Win: If profit is recovered or new bankroll high is reached, reset to Level 1.
 *        Otherwise, remove the winning street (e.g. 9 -> 8 streets) and spin at same unit.
 *      - On Loss: Reset active streets to 9 and double unit multiplier.
 * 
 * 4. Goal & Bankroll Management:
 *    - Steady accumulation of small wins while utilizing 9-street coverage to recover quickly.
 *    - Clamped strictly to table limits (min inside bet and max table bet).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = (config && config.betLimits && config.betLimits.min) ? config.betLimits.min : 2;
    const maxBet = (config && config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;

    const DOZENS = {
        1: [1, 4, 7, 10],
        2: [13, 16, 19, 22],
        3: [25, 28, 31, 34]
    };

    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0; // 0 or 00
    }

    function getStreet(num) {
        if (num < 1 || num > 36) return null;
        return Math.floor((num - 1) / 3) * 3 + 1;
    }

    // Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.level = 1;              // 1: 6 streets, 2: 9 streets @ 2x, 3+: Deep recovery
        state.unitMultiplier = 1;     // Bet units per street
        state.baseBankroll = bankroll;
        state.peakBankroll = bankroll;
        state.lastHitStreet = { 1: 1, 2: 13, 3: 25 }; // Default excluded streets
        state.recentDozens = [1, 2];  // 2 most recent dozens
        state.activeStreets = [];     // Streets currently being bet
    }

    // Process last spin if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;
        const winningDozen = getDozen(winningNum);
        const winningStreet = getStreet(winningNum);

        // Update tracking of dozens and streets
        if (winningDozen > 0) {
            state.lastHitStreet[winningDozen] = winningStreet;
            state.recentDozens = state.recentDozens.filter(d => d !== winningDozen);
            state.recentDozens.unshift(winningDozen);
        }

        // Determine if last spin was a win
        const wasWin = state.activeStreets.includes(winningStreet);

        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
        }

        if (wasWin) {
            if (state.level === 1) {
                // Stay at level 1
                state.level = 1;
                state.unitMultiplier = 1;
            } else if (state.level === 2) {
                // Level 2 win immediately resets
                state.level = 1;
                state.unitMultiplier = 1;
            } else {
                // Level 3+ recovery win
                if (bankroll >= state.baseBankroll) {
                    // Profit recovered, reset
                    state.level = 1;
                    state.unitMultiplier = 1;
                    state.baseBankroll = bankroll;
                } else {
                    // Pull off winning street if we have multiple streets left
                    state.activeStreets = state.activeStreets.filter(s => s !== winningStreet);
                    if (state.activeStreets.length === 0) {
                        state.level = 1;
                        state.unitMultiplier = 1;
                    }
                }
            }
        } else {
            // Loss handling
            if (state.level === 1) {
                state.level = 2;
                state.unitMultiplier = 2;
            } else if (state.level === 2) {
                state.level = 3;
                state.unitMultiplier = 4;
            } else {
                // Level 3+ loss: double unit and reset to 9 streets
                state.unitMultiplier *= 2;
            }
        }
    }

    // Determine candidate streets
    function getStreetsForDozen(d) {
        const excluded = state.lastHitStreet[d];
        return DOZENS[d].filter(s => s !== excluded);
    }

    if (state.level === 1) {
        // Select 2 most recent dozens
        let d1 = state.recentDozens[0] || 1;
        let d2 = state.recentDozens[1] || 2;
        if (d1 === d2) d2 = (d1 % 3) + 1;

        state.activeStreets = [...getStreetsForDozen(d1), ...getStreetsForDozen(d2)];
        state.unitMultiplier = 1;
    } else if (state.level === 2) {
        // All 3 dozens, 9 streets
        state.activeStreets = [
            ...getStreetsForDozen(1),
            ...getStreetsForDozen(2),
            ...getStreetsForDozen(3)
        ];
        state.unitMultiplier = 2;
    } else {
        // Level 3+ (If activeStreets is empty or newly entered, populate all 9)
        if (!state.activeStreets || state.activeStreets.length === 0) {
            state.activeStreets = [
                ...getStreetsForDozen(1),
                ...getStreetsForDozen(2),
                ...getStreetsForDozen(3)
            ];
        }
    }

    // Calculate bet amount per street clamped to limits
    let betAmount = minInside * state.unitMultiplier;
    betAmount = Math.max(betAmount, minInside);
    betAmount = Math.min(betAmount, maxBet);

    // Build bets
    const bets = state.activeStreets.map(streetVal => ({
        type: 'street',
        value: streetVal,
        amount: betAmount
    }));

    return bets;
}