/**
 * Source: "The Roulette Factory" on YouTube (https://www.youtube.com/watch?v=QziZqubxlPY)
 * Strategy: Modified Spread Recovery with Virtual Wait
 *
 * The Logic:
 * - Base Mode: Covers 81% of the board. 3 units on Low (1-18) and 2 units on 3rd Dozen (25-36).
 * - Recovery Mode: If Base loses, shift coverage to avoid variance risk. 
 * Bets become 3 units on Low, 2 units on 1st Dozen (1-12), 2 units on 2nd Dozen (13-24).
 * - Safety Parameter (Virtual Wait): After ANY loss, betting completely stops.
 * The system waits for a "Virtual Win" (a spin between 1-18) before risking real money again.
 *
 * The Progression:
 * - Modified Progression: Based on config.incrementMode. 
 * - 'base': Increases by the initial bet amount on that position (maintains 3:2 ratio).
 * - 'fixed': Increases by config.minIncrementalBet flat value.
 * - On a win in Recovery mode: The tier holds steady to fish for consecutive wins.
 * - Reset: Once bankroll reaches or exceeds a new session high, everything resets to Base Mode.
 *
 * The Goal:
 * - Safely extract a 10% to 25% bankroll profit by using simulated sit-outs to bypass negative variance.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Machine
    if (!state.initialized) {
        state.initialized = true;
        state.mode = 'BASE'; // 'BASE', 'VIRTUAL_WAIT', 'RECOVERY'
        state.tier = 0;      // Number of increments applied in recovery
        state.sessionHigh = bankroll;
        state.placedRealBetLastSpin = false;
    }

    // 2. Track Profit Peaks & Reset Triggers
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
        // If we hit a new profit peak while in recovery, secure profits and reset
        if (state.mode === 'RECOVERY') {
            state.mode = 'BASE';
            state.tier = 0;
        }
    }

    // 3. Process the Previous Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const num = lastSpin.winningNumber;

        if (state.mode === 'BASE' && state.placedRealBetLastSpin) {
            // Base bet win condition: 1-18 or 25-36
            const isBaseWin = (num >= 1 && num <= 18) || (num >= 25 && num <= 36);
            if (!isBaseWin) {
                state.mode = 'VIRTUAL_WAIT';
                state.tier = 0; // Prepare for initial recovery bet
            }
        } 
        else if (state.mode === 'RECOVERY' && state.placedRealBetLastSpin) {
            // Recovery win condition: Only 1-18 is a true win (19-24 is a net loss)
            const isRecoveryWin = (num >= 1 && num <= 18);
            if (!isRecoveryWin) {
                state.tier++; // Increase multiplier/increment
                state.mode = 'VIRTUAL_WAIT'; // Sit out until variance passes
            }
            // If it won but didn't beat session high, it stays in RECOVERY at the current tier
        } 
        else if (state.mode === 'VIRTUAL_WAIT') {
            // Waiting for a 1-18 to hit before resuming.
            const isVirtualWin = (num >= 1 && num <= 18);
            if (isVirtualWin) {
                state.mode = 'RECOVERY';
            }
        }
    }

    // 4. Calculate and Place Bets
    let bets = [];
    state.placedRealBetLastSpin = false;

    // Define Base Proportions
    const baseUnit = config.betLimits.minOutside;
    const lowBaseAmount = 3 * baseUnit;
    const dozBaseAmount = 2 * baseUnit;

    if (state.mode === 'BASE') {
        let lowAmt = Math.min(Math.max(lowBaseAmount, config.betLimits.minOutside), config.betLimits.max);
        let dozAmt = Math.min(Math.max(dozBaseAmount, config.betLimits.minOutside), config.betLimits.max);

        bets.push({ type: 'low', amount: lowAmt });
        bets.push({ type: 'dozen', value: 3, amount: dozAmt });
        state.placedRealBetLastSpin = true;

    } else if (state.mode === 'RECOVERY') {
        let lowAmt = lowBaseAmount;
        let dozAmt = dozBaseAmount;

        // Apply Incremental Logic based on config
        if (state.tier > 0) {
            if (config.incrementMode === 'base') {
                lowAmt += state.tier * lowBaseAmount;
                dozAmt += state.tier * dozBaseAmount;
            } else {
                // Defaults to 'fixed' logic
                const increment = config.minIncrementalBet || 1;
                lowAmt += state.tier * increment;
                dozAmt += state.tier * increment;
            }
        }

        // Clamp to table limits
        lowAmt = Math.min(Math.max(lowAmt, config.betLimits.minOutside), config.betLimits.max);
        dozAmt = Math.min(Math.max(dozAmt, config.betLimits.minOutside), config.betLimits.max);

        bets.push({ type: 'low', amount: lowAmt });
        bets.push({ type: 'dozen', value: 1, amount: dozAmt });
        bets.push({ type: 'dozen', value: 2, amount: dozAmt });
        state.placedRealBetLastSpin = true;

    } else if (state.mode === 'VIRTUAL_WAIT') {
        // Return empty array to sit out the spin
        bets = [];
        state.placedRealBetLastSpin = false;
    }

    return bets;
}