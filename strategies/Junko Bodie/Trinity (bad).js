/**
 * Trinity Roulette Strategy
 * 
 * Source: https://youtu.be/5SuJSAGo54A
 * Channel: Junko Bodie
 * 
 * The Full Logic in Details:
 * 1. Base Setup ($10 base unit total):
 *    - 1st 12 Hedge Bets: 2 Street bets on Street 1 (covering 1-3) and Street 7 (covering 7-9).
 *    - 2nd & 3rd 12 Corner Bets: 8 Corner bets defined by top-left numbers:
 *      - 13 (covers 13,14,16,17)
 *      - 14 (covers 14,15,17,18)
 *      - 19 (covers 19,20,22,23)
 *      - 20 (covers 20,21,23,24)
 *      - 25 (covers 25,26,28,29)
 *      - 26 (covers 26,27,29,30)
 *      - 31 (covers 31,32,34,35)
 *      - 32 (covers 32,33,35,36)
 * 
 * 2. Hit / Removal Logic:
 *    - Corner Removal: When a winning number hits any active corner, that corner bet is removed for the remainder of the session.
 *    - First 12 Removal: When any number in 1-12 hits, the 1st 12 street hedge bets are satisfied and removed for the rest of the session.
 * 
 * 3. Bet Size Progression:
 *    - 1st 12 Hedge: If 1st 12 does not hit, add +1 unit to each street bet per spin (up to 4 units max).
 *    - Corner Progression: Every 3 spins in a session, double the bet size multiplier for all active corners (1x -> 2x -> 4x -> 8x...).
 * 
 * 4. Goal & Reset:
 *    - Target Profit: +15 units ($15) net profit per session.
 *    - Once profit reaches 15 units above session start bankroll or all corners are cleared, reset session back to base units.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit for inside bets
    const unit = config.betLimits.min || 1;

    // Define initial bet positions based on corrected corner layout
    const initial1st12Streets = [1, 7];
    const initialCorners = [13, 14, 19, 20, 25, 26, 31, 32];

    // 2. Initialize State
    if (!state.initialized) {
        state.sessionStartBankroll = bankroll;
        state.cornerMultiplier = 1;
        state.street12UnitCount = 1;
        state.activeCorners = [...initialCorners];
        state.active1st12 = true;
        state.spinCountInProgression = 0;
        state.initialized = true;
    }

    const sessionProfit = bankroll - state.sessionStartBankroll;

    // 3. Evaluate Previous Spin Results & Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Check 1st 12 Hedge status
        if (state.active1st12 && lastNum >= 1 && lastNum <= 12) {
            state.active1st12 = false; // Satisfied and removed
        } else if (state.active1st12) {
            if (state.street12UnitCount < 4) {
                state.street12UnitCount += 1;
            }
        }

        // Remove corner bet if last number landed on it
        state.activeCorners = state.activeCorners.filter(cValue => {
            const covered = [cValue, cValue + 1, cValue + 3, cValue + 4];
            return !covered.includes(lastNum);
        });

        // Corner progression step counter (double every 3 spins)
        state.spinCountInProgression += 1;
        if (state.spinCountInProgression >= 3) {
            state.cornerMultiplier *= 2;
            state.spinCountInProgression = 0;
        }

        // Check target profit (+15 units) or session reset trigger
        if (sessionProfit >= 15 * unit || state.activeCorners.length === 0) {
            state.sessionStartBankroll = bankroll;
            state.cornerMultiplier = 1;
            state.street12UnitCount = 1;
            state.activeCorners = [...initialCorners];
            state.active1st12 = true;
            state.spinCountInProgression = 0;
        }
    }

    // 4. Build Active Bet Array
    const bets = [];

    // Add 1st 12 street hedge bets
    if (state.active1st12) {
        let streetAmount = unit * state.street12UnitCount;
        streetAmount = Math.max(streetAmount, config.betLimits.min);
        streetAmount = Math.min(streetAmount, config.betLimits.max);

        for (const streetVal of initial1st12Streets) {
            bets.push({
                type: 'street',
                value: streetVal,
                amount: streetAmount
            });
        }
    }

    // Add active corner bets
    let cornerAmount = unit * state.cornerMultiplier;
    cornerAmount = Math.max(cornerAmount, config.betLimits.min);
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);

    for (const cornerVal of state.activeCorners) {
        bets.push({
            type: 'corner',
            value: cornerVal,
            amount: cornerAmount
        });
    }

    return bets;
}