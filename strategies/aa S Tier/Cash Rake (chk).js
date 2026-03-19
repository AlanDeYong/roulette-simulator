/**
 * ROULETTE STRATEGY: Cash Rake (8 Levels)
 * Source: https://www.youtube.com/watch?v=KceDM7DAXkA (Bet With Mo)
 *
 * THE LOGIC:
 * - Trigger: Wait for a non-zero number to hit. Note its dozen and its street.
 * - Placements:
 * 1. Bet 4 base units on the Dozen that just hit.
 * 2. Bet 1 base unit on the other 3 streets inside that same Dozen (skipping the street that hit).
 * 3. Bet 3 base units on an adjacent street outside the Dozen (e.g., if D1 hits, bet street 13).
 * Total base ratio: 10 units.
 *
 * THE PROGRESSION:
 * - 8 Levels total.
 * - Win: Reset to Level 1 and wait for a new trigger dozen.
 * - Loss: Increase bet multipliers. Sequence: 1x, 2x, 3x, 4x, 5x, 10x, 20x, 40x.
 * - Bust: If Level 8 loses, reset to Level 1.
 *
 * THE GOAL:
 * - Grind consistent profits by covering ~75% of the board with a weighted spread.
 * - Capitalize on streaks within a hitting dozen while hedging with an adjacent street.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 0; // Progression level (0 to 7)
        state.waitingForTrigger = true;
        state.targetDozen = null;
        state.skippedStreetStart = null;
        state.adjStreetStart = null;
    }

    const lastSpin = spinHistory[spinHistory.length - 1];

    // 2. Resolve Previous Bet (Win/Loss)
    if (!state.waitingForTrigger && lastSpin) {
        const num = lastSpin.winningNumber;
        let isWin = false;

        if (num !== 0 && num !== '00') {
            const numDozen = Math.ceil(num / 12);
            const isAdjStreet = (num >= state.adjStreetStart && num <= state.adjStreetStart + 2);

            // Strategy covers the entire target dozen (via the Outside bet) AND the adjacent street.
            // Note: Hitting the skipped street is still a win (+2 net profit) because of the Dozen bet.
            if (numDozen === state.targetDozen || isAdjStreet) {
                isWin = true;
            }
        }

        if (isWin) {
            state.level = 0; // Reset progression on win
            state.waitingForTrigger = true; // Wait for a new trigger
        } else {
            state.level++;
            if (state.level > 7) {
                // Bust after 8 levels, reset
                state.level = 0;
                state.waitingForTrigger = true;
            }
        }
    }

    // 3. Process Trigger
    if (state.waitingForTrigger) {
        if (!lastSpin) return []; // First spin of session, wait

        const num = lastSpin.winningNumber;
        if (num === 0 || num === '00') return []; // Skip zeroes

        state.targetDozen = Math.ceil(num / 12);
        state.skippedStreetStart = Math.floor((num - 1) / 3) * 3 + 1;

        // Determine Adjacent Street (Static mapping to ensure it falls outside target dozen)
        if (state.targetDozen === 1) state.adjStreetStart = 13; // Street 5 (Left of D2)
        else if (state.targetDozen === 2) state.adjStreetStart = 10; // Street 4 (Right of D1)
        else state.adjStreetStart = 22; // Street 8 (Left of D3)

        state.waitingForTrigger = false;
    }

    // 4. Calculate Bet Amounts
    // Progression multipliers mapped to the 8 levels
    const multipliers = [1, 2, 3, 4, 5, 10, 20, 40];
    const currentMultiplier = multipliers[state.level];

    // Ensure base unit respects both inside and outside minimum limits dynamically
    const minOutside = config.betLimits.minOutside;
    const minInside = config.betLimits.min;
    const maxLimit = config.betLimits.max;

    // Base M must be large enough so 4*M >= minOutside AND 1*M >= minInside
    const baseM = Math.max(Math.ceil(minOutside / 4), minInside);
    const M = baseM * currentMultiplier;

    // Calculate and clamp individual bet amounts against table maximums
    let dozenAmount = Math.min(4 * M, maxLimit);
    let adjStreetAmount = Math.min(3 * M, maxLimit);
    let insideStreetAmount = Math.min(1 * M, maxLimit);

    // 5. Construct Bet Array
    let bets = [];

    // Add Dozen Bet
    bets.push({ type: 'dozen', value: state.targetDozen, amount: dozenAmount });

    // Add Adjacent Street Bet
    bets.push({ type: 'street', value: state.adjStreetStart, amount: adjStreetAmount });

    // Add Inside Street Bets (3 streets within target dozen, skipping the trigger street)
    const dozenStartNum = (state.targetDozen - 1) * 12 + 1;
    for (let i = 0; i < 4; i++) {
        const streetStart = dozenStartNum + (i * 3);
        if (streetStart !== state.skippedStreetStart) {
            bets.push({ type: 'street', value: streetStart, amount: insideStreetAmount });
        }
    }

    return bets;
}