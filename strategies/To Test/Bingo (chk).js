/**
 * STRATEGY: Roulette Bingo (Randomized Connection)
 * * Source: https://www.youtube.com/watch?v=I9EGlIPj2GQ
 * Channel: The Roulette Master
 * * THE LOGIC:
 * 1. TRIGGER: Wait for the first spin to complete. No bets are placed until history exists.
 * 2. SELECTION: Pick a random "connected" number (adjacent on the physical table layout) 
 * to the last winning number.
 * 3. PROGRESSION: On loss, add a new random connected number to the board.
 * 4. RECOVERY: Once a win occurs:
 * - If <= 15 numbers covered: Increment unit size + remove the winner.
 * - If > 15 numbers covered: Double the unit size + remove the winner.
 * * THE GOAL:
 * Reclaim the starting session bankroll through high-multiplier straight-up hits.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min;
    const maxBet = config.betLimits.max;
    const unitIncrement = config.minIncrementalBet || 1;

    // Helper: Find all physical neighbors on a standard table layout
    const getConnectedNumbers = (num) => {
        const neighbors = new Set();
        // Standard Grid Logic (3 columns)
        if (num > 0) {
            if (num > 3) neighbors.add(num - 3); // Above
            if (num < 34) neighbors.add(num + 3); // Below
            if (num % 3 !== 1) neighbors.add(num - 1); // Left
            if (num % 3 !== 0) neighbors.add(num + 1); // Right
            // Diagonals
            if (num > 3 && num % 3 !== 1) neighbors.add(num - 4);
            if (num > 3 && num % 3 !== 0) neighbors.add(num - 2);
            if (num < 34 && num % 3 !== 1) neighbors.add(num + 2);
            if (num < 34 && num % 3 !== 0) neighbors.add(num + 4);
        } else {
            neighbors.add(1); neighbors.add(2); neighbors.add(3); // 0 neighbors
        }
        return Array.from(neighbors).filter(n => n >= 0 && n <= 36);
    };

    // 1. Initial Wait: No betting until first spin is complete
    if (spinHistory.length === 0) return [];

    // 2. State Initialization
    if (state.sessionStartBankroll === undefined) {
        state.sessionStartBankroll = bankroll;
        state.numbersCovered = [];
        state.currentUnit = minInside;
        state.isRecoveryMode = false;
    }

    const lastResult = spinHistory[spinHistory.length - 1];
    const lastNum = lastResult.winningNumber;

    // 3. Logic to update board based on last result
    if (state.numbersCovered.length > 0) {
        const wonLastSpin = state.numbersCovered.includes(lastNum);

        if (bankroll >= state.sessionStartBankroll && wonLastSpin) {
            // Reset
            state.numbersCovered = [];
            state.currentUnit = minInside;
            state.isRecoveryMode = false;
        } else if (wonLastSpin) {
            state.isRecoveryMode = true;
            state.numbersCovered = state.numbersCovered.filter(n => n !== lastNum);
            state.currentUnit += (state.numbersCovered.length <= 15) ? unitIncrement : state.currentUnit;
        } else {
            // Loss: Find a new connected number to add
            const possibleConnections = getConnectedNumbers(lastNum)
                .filter(n => !state.numbersCovered.includes(n));
            
            if (possibleConnections.length > 0) {
                const randomChoice = possibleConnections[Math.floor(Math.random() * possibleConnections.length)];
                state.numbersCovered.push(randomChoice);
            }
            
            if (state.isRecoveryMode) state.currentUnit += unitIncrement;
        }
    }

    // 4. First Bet Logic: If board empty, pick a random neighbor of the last spin
    if (state.numbersCovered.length === 0) {
        const initialConnections = getConnectedNumbers(lastNum);
        const randomStart = initialConnections[Math.floor(Math.random() * initialConnections.length)];
        state.numbersCovered.push(randomStart);
    }

    // 5. Build Bet Array
    const bets = state.numbersCovered.map(num => ({
        type: 'number',
        value: num,
        amount: Math.min(Math.max(state.currentUnit, minInside), maxBet)
    }));

    const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
    return (totalWager > bankroll) ? [] : bets;
}