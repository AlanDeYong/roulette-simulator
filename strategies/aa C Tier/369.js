
/**
 * The 369 Roulette Strategy
 *
 * Source:
 * "INCREDIBLE NEW TAMMY'S CORNER-TOWN ROULETTE SYSTEM!" by The Roulette Master
 * Video Segment: Starts approx 35:20 (The "369" system by Todd Hoover)
 * Video URL: https://youtu.be/N4JUBZQFugk
 *
 * The Logic:
 * 1. "Follow the Winner" on Dozens, but exclude the specific Street that hit.
 * 2. **Level 1 (Start)**: Identify the last winning Dozen. Bet on all 3 streets in that Dozen (excluding the winning street). 
 * Also bet on Zero. (Total 3 Streets + 0).
 * 3. **Level 2 (After Loss)**: If you lose, expand coverage. Keep previous bets. Add the streets of the NEW winning Dozen 
 * (excluding the specific winning street). Now covering ~6 Streets + 0.
 * 4. **Level 3 (After 2nd Loss)**: Expand again. Add the streets of the NEW winning Dozen. Now covering ~9 Streets + 0.
 *
 * The Progression (3-6-9 Cycle & Recovery):
 * - **Unit Sizing**: 
 * - Level 1: 1 unit.
 * - Level 2: 2 units.
 * - Level 3: 4 units.
 * - **Winning at Level 9 (The "Countdown")**:
 * - If you win while covering 9 streets: Remove the specific street that won. (Drop to 8 streets).
 * - Win again: Remove winner (Drop to 7 streets).
 * - Win at 7: RESET to Level 1.
 * - **Losing at Level 9 (The "Recovery")**:
 * - Enter "Recovery Mode".
 * - Calculate the active "Side" (1-18 vs 19-36) that has the most active street coverage.
 * - Place a Side Bet (High/Low) equal to the last loss amount.
 * - Continue until you win BOTH the Side Bet AND a Street Bet simultaneously.
 * - Then resume the Countdown (8->7).
 *
 * The Goal:
 * - Utilize the high probability of "Follow the Winner" combined with board coverage.
 * - Recover deep losses via the high-stakes Side Bet mechanism.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize Constants & State
    const MIN_BET = config.betLimits.min;
    const MAX_BET = config.betLimits.max;
    const MIN_OUTSIDE = config.betLimits.minOutside;

    // Helper: Map Numbers to Streets (Start number of the row)
    // 1->1, 2->1, 3->1, 4->4...
    const getStreetStart = (num) => {
        if (num === 0 || num === '00') return 0;
        return Math.floor((num - 1) / 3) * 3 + 1;
    };

    // Helper: Map Numbers to Dozens (1, 2, 3)
    const getDozen = (num) => {
        if (num === 0 || num === '00') return 0;
        if (num <= 12) return 1;
        if (num <= 24) return 2;
        return 3;
    };

    // Helper: Get all street starts for a given Dozen (1, 2, 3)
    const getStreetsInDozen = (dozenIdx) => {
        if (dozenIdx === 1) return [1, 4, 7, 10];
        if (dozenIdx === 2) return [13, 16, 19, 22];
        if (dozenIdx === 3) return [25, 28, 31, 34];
        return [];
    };

    // Initialize Persistent State
    if (!state.level) state.level = 1; // 1 (3sts), 2 (6sts), 3 (9sts)
    if (!state.activeStreets) state.activeStreets = []; // List of street start numbers
    if (!state.unitMultiplier) state.unitMultiplier = 1;
    if (!state.recoveryMode) state.recoveryMode = false;
    if (!state.recoveryAmount) state.recoveryAmount = 0;
    if (!state.lastTotalBet) state.lastTotalBet = 0;
    if (state.initialBankroll === undefined) state.initialBankroll = bankroll;

    // 2. Handle Spin History (Logic Trigger)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastWinAmount = utils.getRoundWin ? utils.getRoundWin() : (bankroll - state.lastBankroll + state.lastTotalBet); // Approximate if utils not avail
        const didWin = bankroll > state.lastBankroll;
        
        // --- RECOVERY MODE LOGIC ---
        if (state.recoveryMode) {
            // We need a "Double Win" (Side bet + Street bet) to exit recovery
            // Check if we hit a street we were betting on
            const hitStreet = state.activeStreets.includes(getStreetStart(lastNum));
            
            // Check if we hit the side bet
            // We determine which side we bet on dynamically below, but we need to know if we won it.
            // Re-calculate the side we *would have* bet on to check result
            let lowCount = state.activeStreets.filter(s => s < 19).length;
            let highCount = state.activeStreets.filter(s => s >= 19).length;
            const betLow = lowCount >= highCount;
            const hitSide = (betLow && lastNum >= 1 && lastNum <= 18) || (!betLow && lastNum >= 19 && lastNum <= 36);

            if (hitStreet && hitSide) {
                // Double Win! Exit Recovery.
                state.recoveryMode = false;
                state.recoveryAmount = 0;
                // Transition to Countdown (Drop to 8 streets)
                // Remove the winning street
                state.activeStreets = state.activeStreets.filter(s => s !== getStreetStart(lastNum));
                state.level = 3; // Treat as level 3 countdown phase
                // Unit size might need adjustment? Video implies sticking to the progression flow.
                // We'll keep current multiplier or reset to level 3 base (4 units).
            } else {
                // Failed to clear. Add loss to recovery amount.
                // Net loss for the round = Previous Total Bet - Win
                const netChange = bankroll - state.lastBankroll;
                if (netChange < 0) {
                    state.recoveryAmount += Math.abs(netChange);
                } else {
                    // We won something (maybe just street, maybe just side), reduce debt?
                    // Video says "Add loss". If we profited, we reduce the debt.
                    state.recoveryAmount -= netChange; // If positive, reduces amount.
                    if (state.recoveryAmount < 0) state.recoveryAmount = 0;
                }
            }
        } 
        // --- NORMAL MODE LOGIC ---
        else {
            if (didWin) {
                // WIN
                if (state.level < 3) {
                    // Win at Level 1 or 2: Check Session Profit or Reset
                    // Video usually implies resetting on clear wins early on.
                    if (bankroll > state.initialBankroll) {
                        state.level = 1;
                        state.activeStreets = [];
                        state.unitMultiplier = 1;
                    } else {
                        // If not in profit, maybe hold? Or Reset? 
                        // Video: "If you get the win early... restart."
                        state.level = 1;
                        state.activeStreets = [];
                        state.unitMultiplier = 1;
                    }
                } else {
                    // Win at Level 3 (9 Streets) -> Countdown (9->8->7)
                    // Remove the winning street
                    const winningStreet = getStreetStart(lastNum);
                    state.activeStreets = state.activeStreets.filter(s => s !== winningStreet);
                    
                    if (state.activeStreets.length < 7) {
                        // We cleared the countdown
                        state.level = 1;
                        state.activeStreets = [];
                        state.unitMultiplier = 1;
                    }
                    // Else: stay at Level 3 state, just fewer streets.
                }
            } else {
                // LOSS
                if (state.level === 3) {
                    // Loss at Level 3 (9 Streets) -> Trigger Recovery
                    state.recoveryMode = true;
                    state.recoveryAmount = Math.abs(bankroll - state.lastBankroll);
                } else {
                    // Loss at Level 1 or 2 -> Expand
                    state.level++;
                    
                    // Multiplier: L1(1) -> L2(2) -> L3(4)
                    state.unitMultiplier = (state.level === 2) ? 2 : 4;

                    // Add new streets based on "Follow the Winner"
                    // Get Dozen of the number that just beat us
                    const winningDozen = getDozen(lastNum);
                    const winningStreet = getStreetStart(lastNum);
                    
                    if (winningDozen !== 0) {
                        const newStreets = getStreetsInDozen(winningDozen);
                        // Add all streets from this dozen EXCEPT the specific one that hit
                        for (const s of newStreets) {
                            if (s !== winningStreet && !state.activeStreets.includes(s)) {
                                state.activeStreets.push(s);
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Setup Next Bets
    state.lastBankroll = bankroll;

    // On Level 1 Reset/Start: Define streets based on Last Spin (if exists) or Default
    if (state.level === 1 && state.activeStreets.length === 0) {
        state.unitMultiplier = 1;
        let targetDozen = 2; // Default to Middle if no history
        let avoidStreet = -1;

        if (spinHistory.length > 0) {
            const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
            targetDozen = getDozen(lastNum) || 2; // If 0, pick 2
            avoidStreet = getStreetStart(lastNum);
        }

        const potStreets = getStreetsInDozen(targetDozen);
        state.activeStreets = potStreets.filter(s => s !== avoidStreet);
    }

    const bets = [];
    const unit = Math.max(state.unitMultiplier * MIN_BET, MIN_BET);

    // 4. Place Street Bets
    // Ensure we don't exceed max limits or 0
    for (const streetVal of state.activeStreets) {
        bets.push({
            type: 'street',
            value: streetVal,
            amount: unit
        });
    }

    // 5. Place Zero Bet
    // Video: "Dollar on the 0"
    bets.push({
        type: 'number',
        value: 0,
        amount: unit
    });

    // 6. Place Recovery Bet (if active)
    if (state.recoveryMode) {
        // Count coverage
        let lowCount = state.activeStreets.filter(s => s < 19).length;
        let highCount = state.activeStreets.filter(s => s >= 19).length;
        
        let type = (lowCount >= highCount) ? 'low' : 'high'; // Bet where we have coverage
        
        // Amount is the accumulated loss
        let recAmount = state.recoveryAmount;
        recAmount = Math.max(recAmount, MIN_OUTSIDE);
        recAmount = Math.min(recAmount, MAX_BET);

        bets.push({
            type: type,
            amount: recAmount
        });
    }

    // Track total for next round calculation
    state.lastTotalBet = bets.reduce((sum, b) => sum + b.amount, 0);

    return bets;

}