/**
 * STRATEGY: Joey’s Secret Roulette System (Hot Street Modified)
 * 
 * Source: Modified from "The Roulette Master" Joey's Secret System.
 * URL: https://www.youtube.com/watch?v=YlwUAD2CqGw
 * 
 * THE LOGIC:
 * 1. Observation Phase: The system waits and observes the first 37 spins without betting.
 * 2. Initial State: Analyzes the last 37 spins to find the "hottest" street (group of 3 numbers). 
 *    It then evaluates the adjacent streets (left/right) and selects the hotter of the two.
 *    These 2 streets (6 numbers) form the initial Straight Up bets.
 * 3. The "Climb" (On Loss): Every loss adds 1 full street (3 numbers) to the coverage, up to 
 *    a maximum of 24 numbers (8 streets). It selects the adjacent street bounding the current 
 *    group that was "hotter" over the last 37 spins.
 * 4. The "Ladder" (On Win): Once a win occurs (if coverage > 6 numbers):
 *    a. Remove the winning number from the active bet list.
 *    b. Increase the bet amount on all remaining active numbers by 1 unit.
 * 5. The Reset: The moment the session shows any net profit, the strategy resets. 
 *    It recalculates the hottest streets using the most recent 37 spins to pick the new starting 6 numbers.
 * 
 * THE PROGRESSION:
 * - Loss: Increase coverage (+3 numbers/1 street), keep unit size the same.
 * - Win: Decrease coverage (-1 number), increase unit size on remaining numbers.
 * 
 * THE GOAL:
 * - Recover session losses through the ladder mechanism and reset upon reaching any profit (> $0).
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min;
    const maxBet = config.betLimits.max;

    // 1. Wait for 37 spins of data before doing anything
    if (spinHistory.length < 37) {
        return []; 
    }

    // Helper: Calculate street hotness based on last 37 spins
    const getStreetCounts = () => {
        const historyTarget = spinHistory.slice(-37);
        const counts = {};
        for (let i = 1; i <= 12; i++) counts[i] = 0;
        
        historyTarget.forEach(spin => {
            const num = spin.winningNumber;
            // Ignore 0 or 00 for street calculations
            if (num > 0 && num <= 36) {
                const street = Math.ceil(num / 3);
                counts[street]++;
            }
        });
        return counts;
    };

    // Helper: Reset active numbers to the hottest 2 adjacent streets (6 numbers)
    const resetToHottestStreets = () => {
        const counts = getStreetCounts();
        
        // Find the absolute hottest street
        let hottestStreet = 1;
        let maxCount = -1;
        for (let i = 1; i <= 12; i++) {
            if (counts[i] > maxCount) { 
                maxCount = counts[i]; 
                hottestStreet = i; 
            }
        }

        // Find the hotter adjacent street
        let leftAdj = hottestStreet - 1;
        let rightAdj = hottestStreet + 1;
        let selectedAdj = null;

        if (leftAdj < 1) selectedAdj = rightAdj; // Edge case: Street 1
        else if (rightAdj > 12) selectedAdj = leftAdj; // Edge case: Street 12
        else {
            selectedAdj = counts[leftAdj] >= counts[rightAdj] ? leftAdj : rightAdj;
        }

        // Set bounds and active numbers
        state.minStreet = Math.min(hottestStreet, selectedAdj);
        state.maxStreet = Math.max(hottestStreet, selectedAdj);
        
        state.activeNumbers = [];
        for (let s = state.minStreet; s <= state.maxStreet; s++) {
            state.activeNumbers.push(s * 3 - 2, s * 3 - 1, s * 3);
        }
    };

    // 2. Initialize State (Triggered strictly on spin 38)
    if (!state.isActive) {
        state.isActive = true;
        state.sessionStartBankroll = bankroll; // Set our baseline AFTER waiting 37 spins
        state.currentUnit = minInside;
        resetToHottestStreets();
    } else {
        // 3. Process Previous Result (Only processed if we actually placed a bet)
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinNumber = lastSpin.winningNumber;
        const isWin = state.activeNumbers.includes(lastWinNumber);
        const currentProfit = bankroll - state.sessionStartBankroll;

        // RESET Condition: If we are in profit relative to our starting point
        if (currentProfit > 0) {
            state.sessionStartBankroll = bankroll; // Update watermark
            state.currentUnit = minInside;
            resetToHottestStreets();
        } 
        else if (isWin) {
            // WIN Logic: The "Ladder" descent
            if (state.activeNumbers.length > 6) {
                // Remove the winning number
                state.activeNumbers = state.activeNumbers.filter(n => n !== lastWinNumber);
                
                // Increase bet on remaining numbers
                let increment = config.incrementMode === 'base' ? minInside : (config.minIncrementalBet || 1);
                state.currentUnit += increment;
            }
        } 
        else {
            // LOSS Logic: The "Climb" (Add 3 numbers / 1 street)
            if (state.activeNumbers.length < 24) {
                const counts = getStreetCounts();
                let leftStreet = state.minStreet - 1;
                let rightStreet = state.maxStreet + 1;
                let nextStreet = null;

                // Determine which bounding street to add based on hotness
                if (leftStreet < 1 && rightStreet <= 12) {
                    nextStreet = rightStreet;
                } else if (rightStreet > 12 && leftStreet >= 1) {
                    nextStreet = leftStreet;
                } else if (leftStreet >= 1 && rightStreet <= 12) {
                    nextStreet = counts[leftStreet] >= counts[rightStreet] ? leftStreet : rightStreet;
                }
                
                if (nextStreet !== null) {
                    // Expand bounds
                    if (nextStreet === leftStreet) state.minStreet = leftStreet;
                    if (nextStreet === rightStreet) state.maxStreet = rightStreet;
                    
                    // Add the new street numbers
                    state.activeNumbers.push(nextStreet * 3 - 2, nextStreet * 3 - 1, nextStreet * 3);
                    
                    // Keep unit at current level, ensure it respects limits
                    state.currentUnit = Math.max(state.currentUnit, minInside);
                }
            }
        }
    }

    // 4. Construct Bets
    const bets = [];
    
    // Clamp the unit to table limits
    let finalAmountPerNumber = Math.min(Math.max(state.currentUnit, minInside), maxBet);

    state.activeNumbers.forEach(num => {
        bets.push({
            type: 'number',
            value: num,
            amount: finalAmountPerNumber
        });
    });

    // Check if total bet exceeds bankroll (Emergency scale down)
    const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBetAmount > bankroll && totalBetAmount > 0) {
        const scale = bankroll / totalBetAmount;
        bets.forEach(b => {
            b.amount = Math.floor(b.amount * scale);
        });
    }

    // Ensure we only return bets meeting the minimum inside limit
    return bets.filter(b => b.amount >= minInside);
}