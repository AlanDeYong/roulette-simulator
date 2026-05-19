/*
 * Strategy Name: Scouse Tiddly Winks (Dynamic Hot Numbers Variant - Corrected)
 * Source: YouTube (https://youtu.be/Q_XRQP3DqDA?si=AO-S-0pvZZUegyq2)
 * 
 * The Logic:
 * Phase 1 (Spins 1-37): Places standard static bets. 5 units on corners (2, 11, 20, 29) 
 * and 4 units on streets (7, 16, 25, 34).
 * Phase 2 (Spins 38+): Analyzes the previous 37 spins for hot numbers. Dynamically 
 * selects the top 4 non-overlapping corners and top 4 non-overlapping streets to bet on,
 * maintaining the 5-unit / 4-unit base structure.
 *
 * The Progression:
 * - On a Loss: Increase each bet by its initial base amount (moving up 1 multiplier level). 
 *   Consecutive win counter is reset.
 * - On a Win: 
 *      - If session profit is reached (current bankroll > sequence starting bankroll), 
 *        the progression completely resets to base bets.
 *      - If session profit is NOT reached:
 *          - 1st Win: Rebet the same amount once more (progression level stays the same).
 *          - 2nd Consecutive Win (and beyond): Go back 1 level in the progression until profit is achieved.
 *
 * The Goal:
 * To grind out a session profit using broad board coverage, shifting from a static starting 
 * position to a dynamic, trend-following position after 37 spins.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;

    // 1. Initialize Strategy State
    if (!state.level) {
        state.level = 1;                             
        state.consecutiveWins = 0;                   
        state.sequenceStartBankroll = bankroll;      
        state.lastCoveredNumbers = []; 
    }

    // 2. Process previous spin outcome
    if (spinHistory.length > 0 && state.lastCoveredNumbers.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const isWin = state.lastCoveredNumbers.includes(lastSpin.winningNumber);

        if (!isWin) {
            // LOSS: Increase bets by their initial base (go up 1 level)
            state.level++;
            state.consecutiveWins = 0;
        } else {
            // WIN: Register the win and evaluate session profit
            state.consecutiveWins++;

            if (bankroll > state.sequenceStartBankroll) {
                // Reached session profit -> Reset progression
                state.level = 1;
                state.consecutiveWins = 0;
                state.sequenceStartBankroll = bankroll; 
            } else {
                // Not reached session profit yet -> Apply streak logic
                if (state.consecutiveWins >= 2) {
                    state.level = Math.max(1, state.level - 1);
                }
            }
        }
    } else if (spinHistory.length === 0) {
        // Lock in starting bankroll on the very first spin
        state.sequenceStartBankroll = bankroll;
    }

    // 3. Determine Base Bets (Static Phase vs Dynamic Phase)
    let baseBets = [];
    const currentCoveredNumbersSet = new Set();

    if (spinHistory.length < 37) {
        // Phase 1: Static Initial Bets (Spins 1 to 37)
        baseBets = [
            { type: 'corner', value: 2, baseAmount: 5, nums: [2, 3, 5, 6] },
            { type: 'corner', value: 11, baseAmount: 5, nums: [11, 12, 14, 15] },
            { type: 'corner', value: 20, baseAmount: 5, nums: [20, 21, 23, 24] },
            { type: 'corner', value: 29, baseAmount: 5, nums: [29, 30, 32, 33] },
            { type: 'street', value: 7, baseAmount: 4, nums: [7, 8, 9] },
            { type: 'street', value: 16, baseAmount: 4, nums: [16, 17, 18] },
            { type: 'street', value: 25, baseAmount: 4, nums: [25, 26, 27] },
            { type: 'street', value: 34, baseAmount: 4, nums: [34, 35, 36] }
        ];
        
        // Track covered numbers for next spin evaluation
        baseBets.forEach(b => b.nums.forEach(n => currentCoveredNumbersSet.add(n)));

    } else {
        // Phase 2: Dynamic Hot Numbers (Spins 38+)
        const last37 = spinHistory.slice(-37);
        const frequencies = {};
        for (let i = 0; i <= 36; i++) frequencies[i] = 0;
        
        last37.forEach(spin => {
            frequencies[spin.winningNumber]++;
        });

        const allCorners = [];
        for (let row = 0; row < 11; row++) {
            const start = row * 3 + 1;
            allCorners.push({ value: start, nums: [start, start+1, start+3, start+4] });     
            allCorners.push({ value: start+1, nums: [start+1, start+2, start+4, start+5] }); 
        }

        const allStreets = [];
        for (let row = 0; row < 12; row++) {
            const start = row * 3 + 1;
            allStreets.push({ value: start, nums: [start, start+1, start+2] });
        }

        // Calculate heat scores
        allCorners.forEach(c => c.heat = c.nums.reduce((sum, n) => sum + frequencies[n], 0));
        allStreets.forEach(s => s.heat = s.nums.reduce((sum, n) => sum + frequencies[n], 0));

        // Sort by heat descending
        allCorners.sort((a, b) => b.heat - a.heat);
        allStreets.sort((a, b) => b.heat - a.heat);

        const selectedCorners = [];
        const selectedStreets = [];

        // Pick top 4 hot non-overlapping corners
        for (const corner of allCorners) {
            if (selectedCorners.length === 4) break;
            if (!corner.nums.some(n => currentCoveredNumbersSet.has(n))) {
                selectedCorners.push(corner);
                corner.nums.forEach(n => currentCoveredNumbersSet.add(n));
            }
        }

        // Pick top 4 hot non-overlapping streets
        for (const street of allStreets) {
            if (selectedStreets.length === 4) break;
            if (!street.nums.some(n => currentCoveredNumbersSet.has(n))) {
                selectedStreets.push(street);
                street.nums.forEach(n => currentCoveredNumbersSet.add(n));
            }
        }

        selectedCorners.forEach(c => baseBets.push({ type: 'corner', value: c.value, baseAmount: 5 }));
        selectedStreets.forEach(s => baseBets.push({ type: 'street', value: s.value, baseAmount: 4 }));
    }

    // 4. Save EXACT numbers covered this spin to accurately evaluate win/loss on the next spin
    state.lastCoveredNumbers = Array.from(currentCoveredNumbersSet);

    // 5. Generate and return the calculated bets
    const currentBets = [];
    for (const bet of baseBets) {
        let amount = bet.baseAmount * unit * state.level;
        
        // CLAMP: Ensure bets strictly respect table minimums and maximums
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        currentBets.push({
            type: bet.type,
            value: bet.value,
            amount: amount
        });
    }

    return currentBets;
}