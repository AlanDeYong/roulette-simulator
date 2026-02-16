/**
 * Strategy Name: Sure Money
 * Source: User Provided
 * * The Logic:
 * The strategy divides the roulette table into 3-column blocks (zones). It starts on the left 
 * side (numbers 1-9) with 1-unit straight up bets on the middle and right columns, and 2-unit 
 * double street (line) bets covering the entire zone.
 * * The Progression:
 * - Start: Play Zone 1.
 * - Loss 1: Add Zone 2 (Numbers 10-18).
 * - Loss 2: Add Zone 3 (Numbers 19-27).
 * - Loss 3, 4, 5: Increase all bets by 1 fold (Multiplier becomes 2x, 3x, 4x respectively).
 * - Loss 6+: Rebet and Double Up (Multiplier doubles: 8x, 16x, 32x, etc.).
 * - On Win (Net Profit < Session Target): Rebet exact same amounts.
 * - On Win (Net Profit >= Session Target): Reset progression, switch to the opposite side of 
 * the table (e.g., right side, starting with 28-36), and begin anew.
 * * The Goal:
 * To aggressively cover the board upon losses and multiply stakes until a session high-water mark 
 * (profit) is achieved, at which point the strategy resets and shifts directional focus.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on first run
    if (!state.initialized) {
        state.initialized = true;
        state.side = 'left'; 
        state.lossCount = 0;
        state.sessionStartBankroll = bankroll;
        state.previousBankroll = bankroll;
        state.mult = 1;
    }

    const minInside = config.betLimits.min;
    const maxBet = config.betLimits.max;
    let bets = [];

    // 2. Determine Win/Loss from previous spin
    if (spinHistory.length > 0) {
        // Evaluate net result of the last spin
        if (bankroll > state.previousBankroll) {
            // It's a Net Win
            if (bankroll > state.sessionStartBankroll) {
                // Session Profit Reached: Reset and Swap Sides
                state.side = state.side === 'left' ? 'right' : 'left';
                state.lossCount = 0;
                state.mult = 1;
                state.sessionStartBankroll = bankroll; 
            } else {
                // Win, but session profit not reached: Rebet
                // State remains exactly the same.
            }
        } else if (bankroll < state.previousBankroll) {
            // It's a Net Loss: Advance Progression
            state.lossCount++;
            
            if (state.lossCount === 1 || state.lossCount === 2) {
                // Add zones, multiplier remains 1
                state.mult = 1;
            } else if (state.lossCount >= 3 && state.lossCount <= 5) {
                // Increase by 1 fold per loss
                state.mult++;
            } else if (state.lossCount > 5) {
                // Double up
                state.mult *= 2;
            }
        }
    }

    // Save current bankroll for the next spin's comparison
    state.previousBankroll = bankroll;

    // 3. Define the Table Zones
    const zones = {
        'left': [
            { straights: [2, 3, 5, 6, 8, 9], lines: [1, 4] },         // Zone 1: 1-9
            { straights: [11, 12, 14, 15, 17, 18], lines: [10, 13] }, // Zone 2: 10-18
            { straights: [20, 21, 23, 24, 26, 27], lines: [19, 22] }  // Zone 3: 19-27
        ],
        'right': [
            { straights: [29, 30, 32, 33, 35, 36], lines: [28, 31] }, // Zone 1: 28-36
            { straights: [20, 21, 23, 24, 26, 27], lines: [19, 22] }, // Zone 2: 19-27
            { straights: [11, 12, 14, 15, 17, 18], lines: [10, 13] }  // Zone 3: 10-18
        ]
    };

    // 4. Determine Active Zones based on Loss Count
    let activeZoneCount = 1;
    if (state.lossCount >= 1) activeZoneCount = 2;
    if (state.lossCount >= 2) activeZoneCount = 3;

    let currentZones = zones[state.side];

    // 5. Generate Bets with Limit Clamping
    for (let i = 0; i < activeZoneCount; i++) {
        let zone = currentZones[i];

        // Base straight up amount (1 unit * multiplier)
        let straightAmount = minInside * state.mult;
        straightAmount = Math.max(minInside, Math.min(straightAmount, maxBet));

        // Base line amount (2 units * multiplier)
        let lineAmount = (minInside * 2) * state.mult;
        lineAmount = Math.max(minInside, Math.min(lineAmount, maxBet));

        // Add Straight Up Bets
        zone.straights.forEach(num => {
            bets.push({ type: 'number', value: num, amount: straightAmount });
        });

        // Add Double Street (Line) Bets
        zone.lines.forEach(lineStart => {
            bets.push({ type: 'line', value: lineStart, amount: lineAmount });
        });
    }

    return bets;
}