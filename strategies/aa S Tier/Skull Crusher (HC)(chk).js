/**
 * Strategy: Dynamic Skull Crusher (Hot Number Variant)
 * Source: The Gambler Strategist (YouTube: https://www.youtube.com/watch?v=OeMQ1E1u-pY) - Modified
 * * * The Logic: 
 * This strategy dynamically adjusts its coverage based on short-term table trends. 
 * - Wait Phase: Observes the first 37 spins without betting.
 * - Targeting: Identifies the 7 "hottest" (most frequent) numbers from the last 37 spins.
 * - Placement: Places 7 Split bets covering these hot numbers. "Street" bets are then 
 * placed on the rows containing these splits to act as hedges. 
 * - Recalculation ("Reset"): Whenever a Jackpot is hit or a stop-loss is triggered, the 
 * strategy resets to Level 1 and recalculates the 7 hottest numbers using the most 
 * recent 37 spins.
 * * * The Progression:
 * - Level 1: 7 Splits covering the hot numbers. Cost: 7 units.
 * - Level 2 (After loss): 7 Splits (1 unit) + corresponding Streets (2 units).
 * - Level 3 (After loss): 7 Splits (2 units) + corresponding Streets (3 units).
 * - Level 4 (After loss): 7 Splits (3 units) + corresponding Streets (4 units).
 * * Win/Loss Handling:
 * - Jackpot (Ball lands in one of our Splits): Reset to Level 1, Recalculate targets.
 * - Hedge (Ball lands on our Street, but NOT a Split) on Level 2+: Stay at current level.
 * - Complete Miss: Advance to the next progression level.
 * - Loss at Level 4: Reset to Level 1, Recalculate targets (Stop-loss).
 * * * The Goal: 
 * Capitalize on statistical clusters ("hot" numbers) while utilizing the proven 
 * Skull Crusher hedge progression to absorb variance.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for a full 37-spin cycle to gather data
    if (spinHistory.length < 37) {
        return [];
    }

    // Helper Function: Calculate the 7 unique splits based on the last 37 spins
    function calculateHotTargets(history) {
        const recentSpins = history.slice(-37);
        const counts = {};
        
        // Initialize counts for 1-36 (ignore 0/00 for street compatibility)
        for (let i = 1; i <= 36; i++) counts[i] = 0; 
        
        recentSpins.forEach(spin => {
            if (spin.winningNumber > 0) {
                counts[spin.winningNumber]++;
            }
        });
        
        // Sort numbers by frequency descending
        const sortedNumbers = Object.keys(counts)
            .map(Number)
            .sort((a, b) => counts[b] - counts[a]);
            
        const targets = [];
        const seenSplits = new Set();
        
        // Extract top 7 distinct splits
        for (let i = 0; i < sortedNumbers.length; i++) {
            const num = sortedNumbers[i];
            let split;
            
            // Generate horizontal split containing the hot number
            if (num % 3 === 0) {
                split = [num - 1, num];
            } else {
                split = [num, num + 1];
            }
            
            const splitKey = split.join(',');
            
            // Ensure we don't duplicate splits if two hot numbers are next to each other
            if (!seenSplits.has(splitKey)) {
                seenSplits.add(splitKey);
                
                // Calculate the street starting number for this split
                let street = Math.floor((num - 1) / 3) * 3 + 1;
                
                targets.push({ split, street });
                
                if (targets.length === 7) break;
            }
        }
        return targets;
    }

    // 2. Initialize State and initial targets
    if (!state.active) {
        state.targets = calculateHotTargets(spinHistory);
        state.level = 1;
        state.active = true;
    } 
    // 3. Evaluate the previous spin if we placed bets
    else if (spinHistory.length > 37) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        let isJackpot = false;
        let isHedge = false;
        
        // Check last spin against our targeted zones
        state.targets.forEach(t => {
            if (lastSpin === t.split[0] || lastSpin === t.split[1]) {
                isJackpot = true;
            } else if (lastSpin >= t.street && lastSpin <= t.street + 2) {
                isHedge = true;
            }
        });
        
        if (isJackpot) {
            // Hit our exact split -> Reset progression and recalculate hot numbers
            state.level = 1;
            state.targets = calculateHotTargets(spinHistory);
        } else if (isHedge) {
            // Hit the street, but missed the split
            if (state.level === 1) {
                // Level 1 only uses splits, so hitting the street is a loss here
                state.level++;
            } else {
                // Level 2+ uses streets as hedges, stay at current level
                state.level = state.level; 
            }
        } else {
            // Complete miss
            state.level++;
            
            // Stop-loss at Level 4 -> Reset and recalculate
            if (state.level > 4) {
                state.level = 1; 
                state.targets = calculateHotTargets(spinHistory);
            }
        }
    }

    // 4. Determine base unit limits
    const baseUnit = config.betLimits.min;
    
    // 5. Define multipliers based on current Level
    let splitUnits = 0;
    let streetUnits = 0;

    switch (state.level) {
        case 1:
            splitUnits = 1;
            streetUnits = 0;
            break;
        case 2:
            splitUnits = 1;
            streetUnits = 2;
            break;
        case 3:
            splitUnits = 2;
            streetUnits = 3;
            break;
        case 4:
            splitUnits = 3;
            streetUnits = 4;
            break;
    }

    // 6. Calculate and Clamp Bet Amounts
    let splitAmount = splitUnits * baseUnit;
    splitAmount = Math.max(splitAmount, config.betLimits.min);
    splitAmount = Math.min(splitAmount, config.betLimits.max);

    let streetAmount = 0;
    if (streetUnits > 0) {
        streetAmount = streetUnits * baseUnit;
        streetAmount = Math.max(streetAmount, config.betLimits.min);
        streetAmount = Math.min(streetAmount, config.betLimits.max);
    }

    // 7. Construct the Bets Array
    let bets = [];

    // Add Split bets
    if (splitUnits > 0) {
        state.targets.forEach(t => {
            bets.push({
                type: 'split',
                value: t.split,
                amount: splitAmount
            });
        });
    }

    // Add Street bets (Deduplicate streets if two splits fall in the same row)
    if (streetUnits > 0) {
        const uniqueStreets = [...new Set(state.targets.map(t => t.street))];
        
        uniqueStreets.forEach(streetVal => {
            bets.push({
                type: 'street',
                value: streetVal,
                amount: streetAmount
            });
        });
    }

    return bets;
}