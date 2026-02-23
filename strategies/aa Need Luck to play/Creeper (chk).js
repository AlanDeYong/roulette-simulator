/**
 * Strategy: Expanding Double Street (aka "The Creeper" / "The Ex-Wife")
 * Source: ALL ON BLACK (YouTube) - DAY 77: The 98.07% Win Rate EZ MONEY Roulette Strategy!
 * URL: https://youtu.be/skGWlWK01l8
 *
 * The Logic: 
 * This is a progressive coverage strategy based on double streets (line bets covering 6 numbers each).
 * It relies on the probability of not missing expanding sections of the board 5 times in a row.
 * We always start betting from the first line (1-6) and add the next contiguous line upon losing.
 *
 * The Progression:
 * - Step 1: 1 unit on 1 double street (covers 6 numbers).
 * - Step 2 (on loss): 1 unit on 2 double streets (covers 12 numbers).
 * - Step 3 (on loss): 2 units on 3 double streets (covers 18 numbers).
 * - Step 4 (on loss): 5 units on 4 double streets (covers 24 numbers).
 * - Step 5 (on loss): 30 units on 5 double streets (covers 30 numbers).
 * - On any win, or after a Step 5 loss (total wipeout), the progression resets to Step 1.
 *
 * The Goal: 
 * Grind out small, consistent profits (+1 to +5 units per hit) with an extremely high 
 * probability of hitting before wiping out on the expensive 5th stage.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.currentStep === undefined) {
        state.currentStep = 0;
    }

    // Define the progression sequence: { lines to cover, units per line }
    const sequence = [
        { lines: 1, units: 1 },
        { lines: 2, units: 1 },
        { lines: 3, units: 2 },
        { lines: 4, units: 5 },
        { lines: 5, units: 30 }
    ];

    // 2. Process spin history to determine wins/losses
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Determine how many numbers were covered in the previous spin
        const linesCoveredLastSpin = sequence[state.currentStep].lines;
        const maxNumberCovered = linesCoveredLastSpin * 6;
        
        // Number 0 (and 00) is a loss. A win is any number between 1 and our max covered.
        let won = false;
        if (typeof lastNum === 'number' && lastNum >= 1 && lastNum <= maxNumberCovered) {
            won = true;
        }

        if (won) {
            state.currentStep = 0; // Reset progression on a win
        } else {
            state.currentStep++; // Progress to the next step on a loss
            
            // If we lose at the final step (Step 5 wipeout), reset to Step 1
            if (state.currentStep >= sequence.length) {
                state.currentStep = 0;
            }
        }
    }

    // 3. Calculate Bet Amounts
    const stepData = sequence[state.currentStep];
    const baseUnit = config.betLimits.min; // Line bets are inside bets
    
    let amountPerLine = stepData.units * baseUnit;
    
    // 4. Clamp to limits to respect table configuration
    amountPerLine = Math.max(amountPerLine, config.betLimits.min);
    amountPerLine = Math.min(amountPerLine, config.betLimits.max);

    // Bankroll safety check: Stop betting if we cannot afford the full progression spread
    const totalRequired = amountPerLine * stepData.lines;
    if (bankroll < totalRequired) {
        return []; 
    }

    // 5. Construct and return the bets
    const bets = [];
    
    // Line bet 'value' in the simulator is the starting number of the line (1, 7, 13, 19, 25)
    for (let i = 0; i < stepData.lines; i++) {
        const startNumber = (i * 6) + 1;
        bets.push({
            type: 'line',
            value: startNumber,
            amount: amountPerLine
        });
    }

    return bets;
}