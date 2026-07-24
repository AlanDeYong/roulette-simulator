/*
 * Strategy: Cover Me
 * Source: https://www.youtube.com/watch?v=mfIGEd4cNY0 (Junko Bodie)
 *
 * The Logic:
 * This is a high-coverage system targeting consistent, small wins. The strategy 
 * relies on identifying the 4-number "vertical" of the last spun number 
 * (e.g., the column segment within its specific dozen: 2, 5, 8, 11). 
 * You completely exclude this vertical from your bets and place straight-up 
 * inside bets on all remaining numbers on the board. Whenever you win by hitting 
 * a new number, you take that new number's vertical off the board as well, 
 * decreasing your risk exposure dynamically. If you hit a previously excluded 
 * number, you simply absorb the loss and continue the spin count.
 *
 * The Progression:
 * To recover from losses, the bet size is multiplied every 4 spins.
 * Multiplier sequence: 1x, 2x, 5x, 10x, 15x, 20x, 30x, 40x.
 *
 * The Goal:
 * "Hit and Run". The system targets a session profit of 10 base units.
 * Once the bankroll hits this threshold, the session resets, clears the 
 * excluded numbers, and waits for a new trigger number to restart.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Core Settings
    const baseUnit = config.betLimits.min;
    const targetProfit = baseUnit * 100000000;
    const progression = [1, 2, 5, 10, 15, 20, 30, 40];

    // Helper: Determine the 4-number vertical for any given number
    function getVertical(num) {
        // 0 or 00 don't belong to a standard dozen/column vertical
        if (num === 0 || num === 37 || num === '00') return [num];
        
        const col = (num - 1) % 3;
        const dozen = Math.floor((num - 1) / 12);
        const startNum = (dozen * 12) + col + 1;
        
        return [startNum, startNum + 3, startNum + 6, startNum + 9];
    }

    // 2. Initialize or Reset Session
    if (!state.active) {
        // We need at least one spin on the board to determine the initial excluded vertical
        if (spinHistory.length === 0) return []; 
        
        state.active = true;
        state.sessionStartBankroll = bankroll;
        state.spinCount = 0;
        
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        state.excludedNumbers = getVertical(lastNum);
    }

    // 3. Process Previous Spin & Check Goals
    if (state.active && state.spinCount > 0) {
        // Check if we reached our target profit
        if (bankroll >= state.sessionStartBankroll + targetProfit) {
            state.active = false;
            state.excludedNumbers = [];
            return []; // Session complete, returning empty array to pause and wait for a new trigger spin
        }

        // Process the last spin result
        const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        
        // If we hit a number we bet on (a win), remove its vertical from future bets
        if (!state.excludedNumbers.includes(lastNum)) {
            const newExcluded = getVertical(lastNum);
            newExcluded.forEach(n => {
                if (!state.excludedNumbers.includes(n)) {
                    state.excludedNumbers.push(n);
                }
            });
        }
    }

    // 4. Calculate Current Bet Amount based on Progression array
    let progressionIndex = Math.floor(state.spinCount / 4);
    if (progressionIndex >= progression.length) {
        progressionIndex = progression.length - 1; // Cap at max multiplier (40x)
    }

    let amount = baseUnit * progression[progressionIndex];
    
    // CRUCIAL: Clamp to table limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Generate Bets
    let bets = [];
    
    // Iterate through standard wheel numbers (0-36)
    for (let i = 0; i <= 36; i++) {
        if (!state.excludedNumbers.includes(i)) {
            bets.push({ 
                type: 'number', 
                value: i, 
                amount: amount 
            });
        }
    }

    // Increment spin count for the active session AFTER bets are generated
    state.spinCount++;

    return bets;
}