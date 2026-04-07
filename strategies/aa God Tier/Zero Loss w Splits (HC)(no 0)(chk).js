/**
 * STRATEGY: Zero Loss w/ Splits (Refined)
 * * Source: Zero Loss w/ Splits Strategy
 * * The Logic: 
 * 1. Wait for 37 spins to determine hot numbers (0-36).
 * 2. Identify 10 hottest non-overlapping splits. Zero is included in this selection 
 * and can be paired with 1, 2, or 3. No straight-up bet is placed on Zero.
 * 3. A "Loss" is defined as a spin where none of the 10 splits win.
 * 4. A "Win" is defined as a spin where one of the 10 splits wins.
 * * The Progression:
 * 1. On Loss: Rebet the same amounts (No increase).
 * 2. On Win:
 * - If Bankroll >= (Peak Bankroll + 20 units): Reset all bets and recalculate hot splits.
 * - If Bankroll < (Peak Bankroll + 20 units): Rebet. The winning split stays at its 
 * current amount. All 9 losing splits increase their level by 1 base unit.
 * * The Goal: 
 * Target a profit of 20 units ($40 if min is $2) above the last peak bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;
    const TARGET_PROFIT = 20 * unit;

    // 1. Initialize State
    if (!state.setup) {
        state.peakBankroll = bankroll;
        state.currentBets = []; // Stores: { type: 'split', value: [n1, n2], amount: X, level: Y }
        state.setup = true;
    }

    // 2. Wait for data
    if (spinHistory.length < 37) return [];

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastWinNum = lastSpin.winningNumber;

    // 3. Evaluate Previous Round
    let winnerFound = false;
    if (state.currentBets.length > 0) {
        winnerFound = state.currentBets.some(b => b.value.includes(lastWinNum));
    }

    // 4. Reset Condition
    if (bankroll >= state.peakBankroll + TARGET_PROFIT) {
        state.peakBankroll = bankroll;
        state.currentBets = []; 
    }

    // 5. Selection / Update Logic
    if (state.currentBets.length === 0) {
        // RECALCULATION: Find 10 hottest non-overlapping splits (including 0)
        const frequencies = {};
        for (let i = 0; i <= 36; i++) frequencies[i] = 0;
        
        spinHistory.slice(-37).forEach(s => {
            frequencies[s.winningNumber]++;
        });

        const sortedNumbers = Object.keys(frequencies)
            .map(Number)
            .sort((a, b) => frequencies[b] - frequencies[a]);

        const used = new Set();
        const selectedSplits = [];

        for (const num of sortedNumbers) {
            if (used.has(num) || selectedSplits.length >= 10) continue;

            // Find hottest available neighbor (including 0 for 1, 2, 3)
            const neighbors = getNeighbors(num).sort((a, b) => frequencies[b] - frequencies[a]);
            for (const neighbor of neighbors) {
                if (!used.has(neighbor)) {
                    selectedSplits.push([num, neighbor]);
                    used.add(num);
                    used.add(neighbor);
                    break;
                }
            }
        }

        // Initialize Level 1 Bets
        state.currentBets = selectedSplits.map(pair => ({
            type: 'split',
            value: pair,
            amount: unit,
            level: 1
        }));

    } else if (winnerFound) {
        // PROGRESSION ON WIN: Increase non-winners, keep winner level
        state.currentBets.forEach(betObj => {
            const isWinner = betObj.value.includes(lastWinNum);
            
            if (!isWinner) {
                betObj.level += 1;
            }
            // If isWinner, level remains unchanged (stays at current level)

            let increment = config.incrementMode === 'base' ? unit : (config.minIncrementalBet || 1);
            betObj.amount = Math.min(unit + ((betObj.level - 1) * increment), config.betLimits.max);
        });
    } else {
        // REBET ON LOSS: Do nothing to state, just maintain current levels and amounts
    }

    // 6. Final validation and return
    const totalBetRequired = state.currentBets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBetRequired > bankroll) return [];

    return state.currentBets.map(b => ({
        type: b.type,
        value: b.value,
        amount: b.amount
    }));

    /**
     * Helper: Valid Split Neighbors
     * Includes 0 as a neighbor for 1, 2, and 3.
     */
    function getNeighbors(n) {
        if (n === 0) return [1, 2, 3];
        
        const neighbors = [];
        if (n === 1 || n === 2 || n === 3) neighbors.push(0);
        
        // standard table layout logic
        if (n > 3) neighbors.push(n - 3); // Up
        if (n < 34) neighbors.push(n + 3); // Down
        if (n % 3 !== 0) neighbors.push(n + 1); // Right
        if (n % 3 !== 1) neighbors.push(n - 1); // Left
        
        return neighbors;
    }
}