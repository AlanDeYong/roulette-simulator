/**
 * Roulette Strategy: The Wiser Kings (User Specific Modification)
 * * Source:
 * - URL: https://youtu.be/nx4t0evsrk8
 * - Channel: Casino Matchmaker
 * * The Full Logic:
 * - Level 1 (Initial Bet): Places a 1-unit inside street bet on 6 initial streets: 4, 7, 16, 19, 28, 31.
 * - Level 2 (On Loss 1): Re-bets Level 1, adds 1 unit to streets 10, 22, and 34, then doubles the final total amount of all positions.
 * - Level 3 (On Loss 2): Re-bets Level 2, adds 2 units to the 6 double streets (4/9, 7/12, 16/21, 19/24, 28/33, 31/36), then doubles the final total amount of all positions.
 * - End State Rules: On win, if the bankroll reaches or exceeds the highest tracked bankroll peak, it resets to Level 1. Otherwise, it maintains the current layout (rebets).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Setup Parameters & Safety Limits
    const minInsideBet = config.betLimits.min;
    const maxTableBet = config.betLimits.max;

    // Helper to clamp bet sizes strictly within table limits
    const clampBet = (amount) => Math.max(minInsideBet, Math.min(amount, maxTableBet));

    // Define core structural markers
    const baseStreets = [4, 7, 16, 19, 28, 31];
    const levelTwoAdditions = [10, 22, 34];
    // Line bets (Double Streets) are defined by the lowest number of the 6-number sequence
    const levelThreeLines = [4, 7, 16, 19, 28, 31];

    // 2. Initialize Persistent State Machine
    if (!state.isInitialized) {
        state.progressionLevel = 1;
        state.peakBankroll = bankroll; // Track the session's absolute peak profit baseline
        state.isInitialized = true;
    }

    // Track historical absolute session peak profit
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // Process last spin behavior to modify progression tracking rules
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinningNumber = lastSpin.winningNumber;

        // Functional boundary helpers to check hits
        const hitStreet = (num, street) => num >= street && num <= (street + 2);
        const hitLine = (num, line) => num >= line && num <= (line + 5);

        let wasWin = false;

        // Assess win state depending on active matrix level
        if (state.progressionLevel === 1) {
            wasWin = baseStreets.some(st => hitStreet(lastWinningNumber, st));
        } else if (state.progressionLevel === 2) {
            wasWin = [...baseStreets, ...levelTwoAdditions].some(st => hitStreet(lastWinningNumber, st));
        } else if (state.progressionLevel === 3) {
            const hitBaseOrAddition = [...baseStreets, ...levelTwoAdditions].some(st => hitStreet(lastWinningNumber, st));
            const hitDoubleStreet = levelThreeLines.some(ln => hitLine(lastWinningNumber, ln));
            wasWin = hitBaseOrAddition || hitDoubleStreet;
        }

        if (wasWin) {
            // On win and reached session's peak profit, reset, else rebet
            if (bankroll >= state.peakBankroll) {
                state.progressionLevel = 1;
            }
            // Note: If win but bankroll < peakBankroll, progression level remains the same (rebet)
        } else {
            // Progression loss rules advance steps forward
            if (state.progressionLevel < 3) {
                state.progressionLevel += 1;
            }
        }
    }

    // 3. Assemble Target Bet Matrix Array Configuration
    let betsArray = [];

    if (state.progressionLevel === 1) {
        // Initial Bet: 6 base streets with 1 base unit
        baseStreets.forEach(street => {
            betsArray.push({
                type: 'street',
                value: street,
                amount: clampBet(minInsideBet)
            });
        });
    } else if (state.progressionLevel === 2) {
        // On loss, rebet and add 1 unit bet each to street 10,22,34, then double up all bets
        // Base streets get (1 unit + 0 added) * 2 = 2 units
        baseStreets.forEach(street => {
            betsArray.push({
                type: 'street',
                value: street,
                amount: clampBet(minInsideBet * 2)
            });
        });
        // Added streets get (0 units + 1 unit added) * 2 = 2 units
        levelTwoAdditions.forEach(street => {
            betsArray.push({
                type: 'street',
                value: street,
                amount: clampBet(minInsideBet * 2)
            });
        });
    } else if (state.progressionLevel === 3) {
        // On loss, rebet and add 2 units bet to 6 double streets... then double up all bets
        // Base streets: Level 2 was 2 units. Rebet and double it = 4 units.
        baseStreets.forEach(street => {
            betsArray.push({
                type: 'street',
                value: street,
                amount: clampBet(minInsideBet * 4)
            });
        });
        // Level 2 additions: Level 2 was 2 units. Rebet and double it = 4 units.
        levelTwoAdditions.forEach(street => {
            betsArray.push({
                type: 'street',
                value: street,
                amount: clampBet(minInsideBet * 4)
            });
        });
        // Six double streets: Added 2 units on this layout phase, then completely doubled = 4 units.
        levelThreeLines.forEach(line => {
            betsArray.push({
                type: 'line',
                value: line,
                amount: clampBet(minInsideBet * 4)
            });
        });
    }

    // 4. Verification Check and Return Execution Vector
    return betsArray.length > 0 ? betsArray : null;
}