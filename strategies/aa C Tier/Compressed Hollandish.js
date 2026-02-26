/**
 * Strategy: Compressed Hollandish
 * Source: https://www.youtube.com/watch?v=dGK8Ifv0FoA (Ninja Gamblers)
 * * The Logic: 
 * - Bets are placed on an even-money outside bet (e.g., Black or Red).
 * - Cycles are dynamically closed based on the current tier to secure profit quickly.
 * - Colors alternate upon successfully closing a cycle.
 * * The Progression:
 * - Unit tier sequence: 1, 3, 5, 7, 9, 11, 13... (Increases by 2 units after the initial tier).
 * - If betting 1 or 3 units: A single win closes the cycle (resets to 1 unit).
 * - If betting 5 or more units: Two *consecutive* wins at the current unit tier are required to close the cycle.
 * - If a loss occurs at any point before a cycle closes, the next bet moves up one tier (e.g., losing the second bet at tier 5 pushes the next bet to tier 7).
 * * The Goal:
 * - Target profit: Complete a cycle.
 * - Stop-loss: If the progression hits or exceeds 40 units, the cycle is aborted and resets to 1 unit to prevent total bankroll wipeout.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.minOutside;
    const maxProgressionUnits = 40; // Stop-loss threshold

    // 1. Initialize State on first run
    if (state.unitLevel === undefined) {
        state.unitLevel = 1;
        state.consecutiveWins = 0;
        state.targetColor = 'black'; // Start with black
    }

    // 2. Process Previous Spin Results
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const isWin = (lastSpin.winningColor === state.targetColor);

        if (isWin) {
            if (state.unitLevel < 5) {
                // Won at 1 or 3 units -> Cycle Closed!
                _resetCycle(state);
            } else {
                // Won at 5+ units -> Need two in a row
                state.consecutiveWins++;
                if (state.consecutiveWins >= 2) {
                    // Two consecutive wins achieved -> Cycle Closed!
                    _resetCycle(state);
                }
                // Else: Do nothing to unitLevel, wait for 2nd spin at same level
            }
        } else {
            // Lost the spin
            if (state.unitLevel === 1) {
                state.unitLevel = 3;
            } else {
                state.unitLevel += 2; // Progress to next tier (e.g., 3->5, 5->7)
            }
            state.consecutiveWins = 0; // Reset consecutive win counter on any loss
        }
    }

    // 3. Check Hard Stop-Loss
    if (state.unitLevel >= maxProgressionUnits) {
        _resetCycle(state);
    }

    // 4. Calculate Bet Amount
    let betAmount = baseUnit * state.unitLevel;

    // 5. Clamp to Limits
    betAmount = Math.max(betAmount, config.betLimits.minOutside); 
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 6. Return Bet Object
    return [{ type: state.targetColor, amount: betAmount }];

    // Helper function to reset the cycle and alternate colors
    function _resetCycle(s) {
        s.unitLevel = 1;
        s.consecutiveWins = 0;
        s.targetColor = s.targetColor === 'black' ? 'red' : 'black';
    }
}