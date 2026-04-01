/**
 * Strategy: Dynamic Hot Street 4x4 Stacking Chips (8 Splits)
 * Source: Modified from Stacking Chips (https://www.youtube.com/watch?v=CH2QyauPvo4)
 *
 * The Logic:
 * The system observes the wheel for the first 37 spins without placing bets. 
 * It analyzes these 37 spins to identify the 4 "hottest" streets (3-number rows). 
 * For each of these 4 hot streets, it places a pair of splits covering the numbers 
 * (e.g., if the street is 1,2,3, it places a split on [1,2] and [2,3]). This results 
 * in 8 total split bets, plus a constant straight-up bet on zero (0).
 *
 * The Progression:
 * Ladder progression. The bet size across all 9 covered positions is increased 
 * by 1 unit (or configured increment) after every spin that results in a net loss.
 *
 * The Goal:
 * To grind out a steady profit by targeting current wheel biases (hot numbers). 
 * When the current bankroll exceeds the highest recorded bankroll, it triggers a 
 * "reset": the progression drops back to 1 unit, and the system recalculates 
 * the 4 hottest streets using the most recent 37 spins before placing new bets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.highestBankroll = bankroll;
        state.progression = 1;
        state.lastBankroll = bankroll;
        state.targetSplits = null; // Will hold our 8 dynamic splits
        state.initialized = true;
    }

    // 2. Observation Period Check (Wait for 37 spins)
    if (spinHistory.length < 37) {
        // Keep our baseline high watermark accurate while we wait
        state.highestBankroll = Math.max(state.highestBankroll, bankroll);
        state.lastBankroll = bankroll;
        return []; 
    }

    let needsRecalculation = false;

    // 3. Determine Progression & Reset Triggers
    if (!state.targetSplits) {
        // First time hitting 37 spins, we need to calculate targets
        needsRecalculation = true;
    } else if (bankroll > state.highestBankroll) {
        // We reached a new high mark (profit). 
        // Reset progression AND recalculate hot numbers based on last 37 spins.
        state.highestBankroll = bankroll;
        state.progression = 1;
        needsRecalculation = true;
    } else if (bankroll < state.lastBankroll) {
        // Ladder up on a loss
        let increment = config.incrementMode === 'fixed' ? (config.minIncrementalBet || 1) : 1;
        state.progression += increment;
    }

    // 4. Calculate Hot Streets if necessary
    if (needsRecalculation) {
        const recentSpins = spinHistory.slice(-37);
        const streetCounts = {};
        
        // Initialize counts for all 12 streets
        for (let i = 1; i <= 12; i++) {
            streetCounts[i] = 0;
        }

        // Tally street frequencies
        recentSpins.forEach(spin => {
            const num = spin.winningNumber;
            if (num !== 0) {
                // Determine which street (1-12) the number belongs to
                const streetNum = Math.ceil(num / 3);
                streetCounts[streetNum]++;
            }
        });

        // Sort streets by frequency (highest to lowest)
        const sortedStreets = Object.keys(streetCounts).sort((a, b) => streetCounts[b] - streetCounts[a]);
        
        // Take the top 4 hottest streets
        const hotStreets = sortedStreets.slice(0, 4).map(Number);

        // Helper function to generate the two splits for a given street
        // Example: Street 1 (1, 2, 3) returns [[1, 2], [2, 3]]
        const getSplitsForStreet = (s) => {
            const startNum = (s - 1) * 3 + 1;
            return [
                [startNum, startNum + 1],
                [startNum + 1, startNum + 2]
            ];
        };

        // Assign the 8 splits (4 pairs) to state
        state.targetSplits = [];
        hotStreets.forEach(street => {
            state.targetSplits.push(...getSplitsForStreet(street));
        });
    }

    // Update last bankroll for the next spin's comparison
    state.lastBankroll = bankroll;

    // 5. Calculate Base Unit and Current Bet Amount
    const baseUnit = config.betLimits.min; 
    let amount = baseUnit * state.progression;

    // 6. Clamp Bet Amount to Table Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 7. Define Bets (8 Dynamic Splits + Constant Zero)
    const bets = state.targetSplits.map(split => ({
        type: 'split',
        value: split,
        amount: amount
    }));
    
    // Add the straight-up bet on zero
    bets.push({ type: 'number', value: 0, amount: amount });

    // 8. Bankroll Management Check
    const totalBetRequired = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalBetRequired > bankroll) {
        return []; // Not enough funds to cover the ladder progression
    }

    return bets;
}