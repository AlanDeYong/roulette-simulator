/**
 * DOCUMENTATION:
 * - Source: https://youtu.be/OwR4W1Ban8Q (The Lucky Felt)
 * - The Full Logic: Starts with a base unit bet on the 2nd Dozen. On consecutive losses, 
 *   it sequentially adds defensive inside bets (Double Street, Corner, Split, Straight) to 
 *   widen board coverage and build overlapping jackpot zones.
 * - The Full Bet Progression:
 *   - Level 0: 5 units on 2nd Dozen.
 *   - Level 1 (1st Loss): Rebet Dozen + 3 units on random Double Street (10/15 or 19/24).
 *   - Level 2 (2nd Loss): Rebet existing + 2 units on a random non-overlapping Corner in the opposite Double Street.
 *   - Level 3 (3rd Loss): Rebet existing + 2 units on a non-overlapping Split within that Corner's Double Street.
 *   - Level 4 (4th Loss): Rebet existing + 2 units on a Straight Up number within Double Street 16/21.
 *   - Level 5 (5th Loss): Reset progression level to 0, increase base dozen to 6 units, and increment all subsequent inside bet additions by +1 unit.
 *   - Reset: Any win completely resets the cycle back to Level 0 and the base 5-unit dozen bet.
 * - The Goal: Minimize vertical loss scaling while maximizing recovery potential via high-multiplying overlapping layout zones.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Variables
    if (state.level === undefined) {
        state.level = 0;
        state.baseDozenUnits = 5;
        state.selectedStreet = null;
        state.selectedCorner = null;
        state.selectedSplit = null;
        state.selectedStraight = null;
        state.coveredNumbers = [];
    }

    const lastSpin = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1] : null;

    // 2. Evaluate Previous Spin Outcome
    if (lastSpin) {
        if (state.coveredNumbers.includes(lastSpin.winningNumber)) {
            // Absolute reset on any win
            state.level = 0;
            state.baseDozenUnits = 5;
            state.selectedStreet = null;
            state.selectedCorner = null;
            state.selectedSplit = null;
            state.selectedStraight = null;
        } else {
            // Move to next progression step on loss
            if (state.level === 4) {
                // 5th loss triggers a base tier escalation and level reset
                state.baseDozenUnits += 1;
                state.level = 0;
                state.selectedStreet = null;
                state.selectedCorner = null;
                state.selectedSplit = null;
                state.selectedStraight = null;
            } else {
                state.level++;
            }
        }
    }

    const bets = [];
    const currentCovered = [];

    // Operational base limits
    const insideUnit = config.betLimits.min;
    const outsideUnit = config.betLimits.minOutside;
    const escalationUnits = state.baseDozenUnits - 5;

    // LEVEL 0: Main Anchor Bet (2nd Dozen)
    let dozenAmount = state.baseDozenUnits * outsideUnit;
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);
    
    bets.push({ type: 'dozen', value: 2, amount: dozenAmount });
    for (let i = 13; i <= 24; i++) {
        currentCovered.push(i);
    }

    // LEVEL 1: Add Double Street 10/15 or 19/24
    if (state.level >= 1) {
        if (!state.selectedStreet) {
            state.selectedStreet = Math.random() < 0.5 ? 10 : 19;
        }
        
        let streetAmount = (3 + escalationUnits) * insideUnit;
        streetAmount = Math.max(streetAmount, config.betLimits.min);
        streetAmount = Math.min(streetAmount, config.betLimits.max);

        bets.push({ type: 'line', value: state.selectedStreet, amount: streetAmount });
        for (let i = state.selectedStreet; i < state.selectedStreet + 6; i++) {
            currentCovered.push(i);
        }
    }

    // LEVEL 2: Add Corner within the opposite Double Street
    if (state.level >= 2) {
        if (!state.selectedCorner) {
            if (state.selectedStreet === 10) {
                state.selectedCorner = Math.random() < 0.5 ? 19 : 20;
            } else {
                state.selectedCorner = Math.random() < 0.5 ? 10 : 11;
            }
        }

        let cornerAmount = (2 + escalationUnits) * insideUnit;
        cornerAmount = Math.max(cornerAmount, config.betLimits.min);
        cornerAmount = Math.min(cornerAmount, config.betLimits.max);

        bets.push({ type: 'corner', value: state.selectedCorner, amount: cornerAmount });
        const c = state.selectedCorner;
        currentCovered.push(c, c + 1, c + 3, c + 4);
    }

    // LEVEL 3: Add Split inside the active corner's Double Street (Non-overlapping)
    if (state.level >= 3) {
        if (!state.selectedSplit) {
            if (state.selectedCorner === 19) state.selectedSplit = [21, 24];
            else if (state.selectedCorner === 20) state.selectedSplit = [19, 22];
            else if (state.selectedCorner === 10) state.selectedSplit = [12, 15];
            else if (state.selectedCorner === 11) state.selectedSplit = [10, 13];
        }

        let splitAmount = (2 + escalationUnits) * insideUnit;
        splitAmount = Math.max(splitAmount, config.betLimits.min);
        splitAmount = Math.min(splitAmount, config.betLimits.max);

        bets.push({ type: 'split', value: state.selectedSplit, amount: splitAmount });
        currentCovered.push(state.selectedSplit[0], state.selectedSplit[1]);
    }

    // LEVEL 4: Add Straight Up Number within Double Street 16/21 (Numbers 16-21)
    if (state.level >= 4) {
        if (!state.selectedStraight) {
            state.selectedStraight = Math.floor(Math.random() * 6) + 16;
        }

        let straightAmount = (2 + escalationUnits) * insideUnit;
        straightAmount = Math.max(straightAmount, config.betLimits.min);
        straightAmount = Math.min(straightAmount, config.betLimits.max);

        bets.push({ type: 'number', value: state.selectedStraight, amount: straightAmount });
        currentCovered.push(state.selectedStraight);
    }

    // Track state coverage footprint for checking win/loss metrics on subsequent spin execution
    state.coveredNumbers = [...new Set(currentCovered)];

    return bets;
}