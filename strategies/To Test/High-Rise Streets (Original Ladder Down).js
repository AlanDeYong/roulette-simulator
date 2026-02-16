<<<<<<< HEAD
// High-Rise Streets (Original Ladder Down)
// Fixed for Roulette Simulator

const CONFIG = {
    // Amounts doubled to meet standard $2 min bet
    progression: [
        { level: 1, streets: 3, betPerStreet: 2 },
        { level: 2, streets: 4, betPerStreet: 2 },
        { level: 3, streets: 5, betPerStreet: 4 },
        { level: 4, streets: 6, betPerStreet: 4 },
        { level: 5, streets: 7, betPerStreet: 10 },
        { level: 6, streets: 8, betPerStreet: 10 },
        { level: 7, streets: 9, betPerStreet: 20 }
    ]
};

// Main Bet Function required by the simulator
function bet(spinHistory, bankroll, config, state) {
    const levels = CONFIG.progression;

    // 1. Initialize State (Persists across spins)
    if (state.currentLevelIndex === undefined) {
        state.currentLevelIndex = 0;
    }

    // 2. Determine Outcome of Last Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber; // Correct property is 'winningNumber'

        // Check previous level coverage
        const prevLevelConfig = levels[state.currentLevelIndex];
        const maxCoveredNumber = prevLevelConfig.streets * 3;

        let wonLast = false;
        // Check if number is valid (not 0/00) and within range
        if (typeof lastNum === 'number' && lastNum >= 1 && lastNum <= maxCoveredNumber) {
            wonLast = true;
        }

        // Adjust Progression
        if (wonLast) {
            // WIN: Ladder Down
            state.currentLevelIndex = Math.max(0, state.currentLevelIndex - 1);
        } else {
            // LOSS: Ladder Up
            if (state.currentLevelIndex + 1 >= levels.length) {
                state.currentLevelIndex = 0; // Reset on bust
            } else {
                state.currentLevelIndex++;
            }
        }
    }

    // 3. Construct Bets
    const currentConfig = levels[state.currentLevelIndex];
    const bets = [];
    
    for (let i = 0; i < currentConfig.streets; i++) {
        bets.push({ 
            type: 'street', 
            // Simulator uses 'value' for the starting number (1, 4, 7...)
            value: (i * 3) + 1, 
            amount: currentConfig.betPerStreet 
        }); 
    }

    return bets;
=======
// High-Rise Streets (Original Ladder Down)
// Fixed for Roulette Simulator

const CONFIG = {
    // Amounts doubled to meet standard $2 min bet
    progression: [
        { level: 1, streets: 3, betPerStreet: 2 },
        { level: 2, streets: 4, betPerStreet: 2 },
        { level: 3, streets: 5, betPerStreet: 4 },
        { level: 4, streets: 6, betPerStreet: 4 },
        { level: 5, streets: 7, betPerStreet: 10 },
        { level: 6, streets: 8, betPerStreet: 10 },
        { level: 7, streets: 9, betPerStreet: 20 }
    ]
};

// Main Bet Function required by the simulator
function bet(spinHistory, bankroll, config, state) {
    const levels = CONFIG.progression;

    // 1. Initialize State (Persists across spins)
    if (state.currentLevelIndex === undefined) {
        state.currentLevelIndex = 0;
    }

    // 2. Determine Outcome of Last Spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber; // Correct property is 'winningNumber'

        // Check previous level coverage
        const prevLevelConfig = levels[state.currentLevelIndex];
        const maxCoveredNumber = prevLevelConfig.streets * 3;

        let wonLast = false;
        // Check if number is valid (not 0/00) and within range
        if (typeof lastNum === 'number' && lastNum >= 1 && lastNum <= maxCoveredNumber) {
            wonLast = true;
        }

        // Adjust Progression
        if (wonLast) {
            // WIN: Ladder Down
            state.currentLevelIndex = Math.max(0, state.currentLevelIndex - 1);
        } else {
            // LOSS: Ladder Up
            if (state.currentLevelIndex + 1 >= levels.length) {
                state.currentLevelIndex = 0; // Reset on bust
            } else {
                state.currentLevelIndex++;
            }
        }
    }

    // 3. Construct Bets
    const currentConfig = levels[state.currentLevelIndex];
    const bets = [];
    
    for (let i = 0; i < currentConfig.streets; i++) {
        bets.push({ 
            type: 'street', 
            // Simulator uses 'value' for the starting number (1, 4, 7...)
            value: (i * 3) + 1, 
            amount: currentConfig.betPerStreet 
        }); 
    }

    return bets;
>>>>>>> origin/main
}