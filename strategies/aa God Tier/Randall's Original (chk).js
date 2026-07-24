/**
 * Randall's Original Roulette Strategy
 * Source: YouTube Video - https://youtu.be/kIyZqnEkC_E 
 * (Note: Specific YouTube channel name not explicitly stated, refer to URL)
 * 
 * The Full Logic in details:
 * - Trigger (Tracking Phase): The strategy tracks spins without betting until at least 2 unique 
 *   dozens and 2 unique columns have hit in the history.
 * - Selection: Once triggered, it identifies the "sleeping" dozen (the one that has not hit for 
 *   the longest time) and the "sleeping" column (similarly, hasn't hit for the longest time).
 * - Betting: Bets are placed simultaneously on this sleeping dozen and sleeping column.
 * 
 * The Full Bet Progression in details:
 * - The initial bet is 1 base unit (minOutside) on both the selected dozen and column.
 * - On Loss: The target remains the same (rebet). The bet amount increases by its base unit amount 
 *   (or according to config.incrementMode).
 * - On Win: The winning bet moves its target to the *new* sleeping dozen/column (the one that 
 *   currently hasn't hit for the longest time).
 * - Progression Rule: If a bet wins but the session is NOT at a new peak profit, the bet amount 
 *   is NOT reduced.
 * - Reset Rule: If the bankroll reaches or exceeds the session's peak profit (a new high), 
 *   BOTH bet progressions reset to their base 1-unit amount.
 * 
 * The Goal:
 * - Reach a new session peak profit by capitalizing on simultaneous/staggered dozen and column hits, 
 *   resetting the progressions once overall bankroll hits a new high to lock in profits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.minOutside;
    const increment = config.incrementMode === 'base' ? baseUnit : (config.minIncrementalBet || 1);

    // Helper: Map winning number to Dozen (1, 2, 3). Returns 0 for Green.
    const getDozen = (num) => {
        if (num === 0 || num === 37) return 0;
        return Math.ceil(num / 12);
    };

    // Helper: Map winning number to Column (1, 2, 3). Returns 0 for Green.
    const getColumn = (num) => {
        if (num === 0 || num === 37) return 0;
        return ((num - 1) % 3) + 1;
    };

    // Helper: Find the dozen or column that has not hit for the longest time
    const getSleeping = (history, type) => {
        let lastSeen = { 1: -1, 2: -1, 3: -1 };
        
        // Iterate backwards to find the most recent occurrence of each zone
        for (let i = history.length - 1; i >= 0; i--) {
            let num = history[i].winningNumber;
            let val = (type === 'dozen') ? getDozen(num) : getColumn(num);
            
            if (val > 0 && lastSeen[val] === -1) {
                lastSeen[val] = i;
            }
        }
        
        // Find the one with the smallest index (oldest), or -1 (unseen)
        let oldestIndex = Infinity;
        let sleeping = 1;
        for (let v = 1; v <= 3; v++) {
            if (lastSeen[v] === -1) return v; // Found one that hasn't hit at all
            if (lastSeen[v] < oldestIndex) {
                oldestIndex = lastSeen[v];
                sleeping = v;
            }
        }
        return sleeping;
    };

    // 1. Initial State Setup
    if (typeof state.isActive === 'undefined') {
        state.isActive = false;
        state.peakBankroll = bankroll;
        state.lastBetPlaced = false;
    }

    // 2. Tracking Phase (No bets placed yet)
    if (!state.isActive) {
        let seenDoz = new Set();
        let seenCol = new Set();
        
        // Check history for at least 2 unique dozens and columns
        for (let i = 0; i < spinHistory.length; i++) {
            let d = getDozen(spinHistory[i].winningNumber);
            let c = getColumn(spinHistory[i].winningNumber);
            if (d > 0) seenDoz.add(d);
            if (c > 0) seenCol.add(c);
        }

        // Trigger condition met
        if (seenDoz.size >= 2 && seenCol.size >= 2) {
            state.isActive = true;
            state.peakBankroll = bankroll; // Establish peak at start of betting
            state.dozenAmount = baseUnit;
            state.columnAmount = baseUnit;
            state.dozenTarget = getSleeping(spinHistory, 'dozen');
            state.columnTarget = getSleeping(spinHistory, 'column');
        } else {
            return []; // Continue tracking, place no bets
        }
    } 
    // 3. Evaluation Phase (Active Betting)
    else if (state.lastBetPlaced && spinHistory.length > 0) {
        let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        let lastDoz = getDozen(lastNum);
        let lastCol = getColumn(lastNum);

        let wonDoz = (lastDoz === state.dozenTarget);
        let wonCol = (lastCol === state.columnTarget);

        // Check if we've reached a new session peak profit
        let isPeak = bankroll >= state.peakBankroll;
        if (isPeak) {
            state.peakBankroll = bankroll;
        }

        // --- Dozen Progression ---
        if (wonDoz) {
            state.dozenTarget = getSleeping(spinHistory, 'dozen'); // Move to new sleeping dozen
            if (isPeak) state.dozenAmount = baseUnit; // Reset on peak
            // If not peak, amount remains exactly what it was (do not reduce)
        } else {
            // Loss on Dozen
            if (isPeak) state.dozenAmount = baseUnit; // Safety reset if overall bankroll tied/beat peak
            else state.dozenAmount += increment;      // Rebet and increase
        }

        // --- Column Progression ---
        if (wonCol) {
            state.columnTarget = getSleeping(spinHistory, 'column'); // Move to new sleeping column
            if (isPeak) state.columnAmount = baseUnit; // Reset on peak
            // If not peak, amount remains exactly what it was (do not reduce)
        } else {
            // Loss on Column
            if (isPeak) state.columnAmount = baseUnit;
            else state.columnAmount += increment;
        }
    }

    // 4. Place Bets (Clamped strictly to table limits)
    let finalDozAmt = Math.min(Math.max(state.dozenAmount, config.betLimits.minOutside), config.betLimits.max);
    let finalColAmt = Math.min(Math.max(state.columnAmount, config.betLimits.minOutside), config.betLimits.max);

    // Save state amounts to handle limit capping gracefully on next spin
    state.dozenAmount = finalDozAmt;
    state.columnAmount = finalColAmt;
    
    state.lastBetPlaced = true;

    return [
        { type: 'dozen', value: state.dozenTarget, amount: finalDozAmt },
        { type: 'column', value: state.columnTarget, amount: finalColAmt }
    ];
}