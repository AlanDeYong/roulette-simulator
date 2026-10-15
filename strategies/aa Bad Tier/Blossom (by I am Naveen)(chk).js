/**
 * Strategy: Roulette Blossom (by I am Naveen)
 * Source: https://youtu.be/VfrnAISJSvs (Casino Matchmaker)
 * 
 * The Full Logic in details:
 * - This strategy uses straight-up bets covering up to 30 numbers, focusing on sectors centered around 2 and 16 on a European wheel.
 * - A "Win" is defined as any spin resulting in a net profit (payout > total bet).
 * - A "Loss" is defined as any total loss or partial loss (where a number hits but the payout is less than the total bet cost).
 * 
 * The Full Bet Progression in details:
 * - Level 1: Base bet on numbers 2 and 16, plus 7 neighbors on each side. (30 numbers total).
 * - Level 2: Keep Level 1, add 1 incremental bet to 2 and 16, plus 6 neighbors on each side. (26 numbers).
 * - Level 3+: Keep previous layers, add 1 incremental bet to 2 and 16, plus 5 neighbors on each side. (22 numbers).
 * - After a Loss: Go up 1 level and reset consecutive wins.
 * - After a Win: Increment consecutive wins. 
 *   - Normally, you need 2 consecutive wins to drop down 1 level.
 *   - EXCEPTION: If you are at Level 2 and climbed up from Level 1, you need 3 consecutive wins to drop back down to Level 1.
 * 
 * The Goal:
 * - Accumulate session profit dynamically through staggered risk recovery. Play continues indefinitely or until a player-defined profit target is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.consecutiveWins = 0;
        state.cameFromHigher = false;
        state.previousBankroll = bankroll;
    }

    // 2. Determine Win/Loss of previous spin
    if (spinHistory.length > 0 && state.previousBankroll !== undefined) {
        const netProfit = bankroll - state.previousBankroll;
        
        if (netProfit > 0) {
            // WIN
            state.consecutiveWins++;
            
            // Determine target consecutive wins to drop a level
            const targetWins = (state.level === 2 && !state.cameFromHigher) ? 3 : 2;
            
            if (state.level === 1) {
                // Stay at level 1, reset counter to avoid infinite accumulation
                state.consecutiveWins = 0; 
            } else if (state.consecutiveWins >= targetWins) {
                // Drop down one level
                state.level--;
                state.consecutiveWins = 0;
                state.cameFromHigher = true;
            }
        } else {
            // LOSS (Total or Partial)
            state.level++;
            state.consecutiveWins = 0;
            state.cameFromHigher = false;
        }
    }
    
    // Update bankroll tracker for the next execution
    state.previousBankroll = bankroll;

    // 3. Wheel Definition & Neighbor Helper
    const wheel = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    
    function getNeighbors(centerNum, distance) {
        const idx = wheel.indexOf(centerNum);
        const neighbors = [];
        for (let i = -distance; i <= distance; i++) {
            let offsetIdx = (idx + i + wheel.length) % wheel.length;
            neighbors.push(wheel[offsetIdx]);
        }
        return neighbors;
    }

    // 4. Calculate Bet Amounts
    const betsMap = {};
    const baseUnit = config.betLimits.min;
    const increment = config.incrementMode === 'base' ? baseUnit : config.minIncrementalBet;
    
    // Layer 1 (Level 1+)
    if (state.level >= 1) {
        const n2 = getNeighbors(2, 7);
        const n16 = getNeighbors(16, 7);
        [...n2, ...n16].forEach(num => {
            betsMap[num] = (betsMap[num] || 0) + baseUnit;
        });
    }
    
    // Layer 2 (Level 2+)
    if (state.level >= 2) {
        const n2 = getNeighbors(2, 6);
        const n16 = getNeighbors(16, 6);
        [...n2, ...n16].forEach(num => {
            betsMap[num] = (betsMap[num] || 0) + increment;
        });
    }
    
    // Layer 3 and above
    for (let l = 3; l <= state.level; l++) {
        const n2 = getNeighbors(2, 5);
        const n16 = getNeighbors(16, 5);
        [...n2, ...n16].forEach(num => {
            betsMap[num] = (betsMap[num] || 0) + increment;
        });
    }

    // 5. Construct & Clamp Final Bets Array
    const currentBets = [];
    for (const num in betsMap) {
        let amount = betsMap[num];
        
        // Clamp to limits
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);
        
        currentBets.push({
            type: 'number',
            value: parseInt(num),
            amount: amount
        });
    }

    return currentBets;
}