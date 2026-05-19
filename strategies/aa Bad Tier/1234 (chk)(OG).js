/**
 * Source: WillVegas (https://www.youtube.com/watch?v=q8eeZqJfXmk) with custom progression modifications.
 * 
 * The Logic: Places bets on 3 to 5 double streets ('line' bets) to cover up to 30 numbers. 
 * A loss triggers a progression step to increase bet amounts and table coverage.
 * 
 * The Progression:
 * - Step 0 (Base): 1 base unit on 3 double streets.
 * - Step 1 (Loss 1): 2 base units on 3 double streets.
 * - Step 2 (Loss 2): 10 base units on 4 double streets.
 * - Step 3 (Loss 3): 60 base units on 5 double streets.
 * - Any win, or a loss at Step 3, resets the sequence back to Step 0.
 * 
 * The Goal: To recover accumulated losses from previous steps with a single win, resulting in a net session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State and Progression Map
    if (typeof state.level === 'undefined') {
        state.level = 0;
        state.lastBets = [];
    }

    const progressionSteps = [
        { lines: [1, 7, 13], multiplier: 1 },         // Base
        { lines: [1, 7, 13], multiplier: 2 },         // Loss 1
        { lines: [1, 7, 13, 19], multiplier: 10 },    // Loss 2
        { lines: [1, 7, 13, 19, 25], multiplier: 60 } // Loss 3
    ];

    // 2. Evaluate Previous Spin
    if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1].winningNumber;
        let won = false;

        // Check if the winning number falls within any of our placed line bets
        for (let b of state.lastBets) {
            // A 'line' bet on value X covers numbers X through X+5
            if (b.type === 'line' && lastResult >= b.value && lastResult <= b.value + 5) {
                won = true;
                break;
            }
        }

        if (won) {
            state.level = 0; // Reset on win
        } else {
            state.level++;   // Move up progression on loss
            if (state.level >= progressionSteps.length) {
                state.level = 0; // Reset if we fail the final step
            }
        }
    }

    // 3. Construct New Bets
    const currentStep = progressionSteps[state.level];
    const unit = config.betLimits.min; 
    let rawAmount = unit * currentStep.multiplier;

    // Clamp bet amount to configured table limits
    let finalAmount = Math.max(unit, Math.min(rawAmount, config.betLimits.max));

    let newBets = [];
    for (let startNum of currentStep.lines) {
        newBets.push({
            type: 'line',
            value: startNum,
            amount: finalAmount
        });
    }

    // 4. Save state for next evaluation and return
    state.lastBets = newBets;
    return newBets;
}