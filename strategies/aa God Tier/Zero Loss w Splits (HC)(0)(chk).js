/**
 * STRATEGY: Zero Loss w/ Splits (Modified)
 * * Logic: 
 * 1. Analyze 37 spins to find 10 hottest non-overlapping splits + Zero.
 * 2. On Loss (No bet wins): Rebet the same amounts (Flat bet).
 * 3. On Win (One bet wins):
 * - If Bankroll >= (Peak + 20 units): Reset all bets to 1 unit and refresh hot numbers.
 * - If Bankroll < (Peak + 20 units): 
 * - The winning position maintains its current bet amount.
 * - All losing positions increase by 1 base unit.
 * * Goal: Reach 20 units of profit above the previous peak bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const unit = config.betLimits.min;
    const TARGET_PROFIT = 20 * unit;

    // 1. Initialize State
    if (!state.setup) {
        state.peakBankroll = bankroll;
        state.currentBets = []; // { type, value, amount, level }
        state.setup = true;
    }

    // 2. Wait for sufficient history (37 spins)
    if (spinHistory.length < 37) return [];

    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastWinningNumber = lastSpin.winningNumber;

    // 3. Logic: Determine if we should Reset or Progress
    let winnerFound = false;
    if (state.currentBets.length > 0) {
        winnerFound = state.currentBets.some(b => 
            (b.type === 'number' && b.value === lastWinningNumber) || 
            (b.type === 'split' && b.value.includes(lastWinningNumber))
        );
    }

    // A. Target Reached Check
    if (bankroll >= state.peakBankroll + TARGET_PROFIT) {
        state.peakBankroll = bankroll;
        state.currentBets = []; // Force recalculation
    }

    // B. Selection / Recalculation Logic
    if (state.currentBets.length === 0) {
        const frequencies = {};
        for (let i = 1; i <= 36; i++) frequencies[i] = 0;
        spinHistory.slice(-37).forEach(s => { if (s.winningNumber > 0) frequencies[s.winningNumber]++; });

        const sortedNumbers = Object.keys(frequencies).map(Number).sort((a, b) => frequencies[b] - frequencies[a]);
        const used = new Set();
        const selectedSplits = [];

        for (const num of sortedNumbers) {
            if (used.has(num) || selectedSplits.length >= 10) continue;
            const neighbors = getNeighbors(num).sort((a, b) => frequencies[b] - frequencies[a]);
            for (const neighbor of neighbors) {
                if (!used.has(neighbor)) {
                    selectedSplits.push([num, neighbor]);
                    used.add(num); used.add(neighbor);
                    break;
                }
            }
        }

        state.currentBets = [{ type: 'number', value: 0, amount: unit, level: 1 }];
        selectedSplits.forEach(pair => {
            state.currentBets.push({ type: 'split', value: pair, amount: unit, level: 1 });
        });
    } 
    // C. Progression Logic
    else if (winnerFound) {
        // "on win after a loss... increase all bets which did not win"
        // "do not increase on loss"
        state.currentBets.forEach(betObj => {
            const isThisWinner = (betObj.type === 'number' && betObj.value === lastWinningNumber) || 
                                (betObj.type === 'split' && betObj.value.includes(lastWinningNumber));
            
            if (!isThisWinner) {
                // Increment level for non-winners
                betObj.level += 1;
            } else {
                // Winner stays at same level (as per your request regarding split 17/20)
                // Note: If you want winners to reset eventually, logic would go here.
            }

            let increment = config.incrementMode === 'base' ? unit : (config.minIncrementalBet || 1);
            betObj.amount = Math.min(unit + ((betObj.level - 1) * increment), config.betLimits.max);
        });
    } 
    // D. Loss Logic
    else {
        // "do not increase bets on loss, just rebet"
        // We do nothing to levels; the amounts remain the same as previous spin.
    }

    // 4. Return Bet Objects
    const totalBetRequired = state.currentBets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBetRequired > bankroll) return [];

    return state.currentBets.map(b => ({ type: b.type, value: b.value, amount: b.amount }));

    // Helper for adjacency
    function getNeighbors(n) {
        const neighbors = [];
        if (n > 3) neighbors.push(n - 3);
        if (n < 34) neighbors.push(n + 3);
        if (n % 3 !== 0) neighbors.push(n + 1);
        if (n % 3 !== 1) neighbors.push(n - 1);
        return neighbors;
    }
}