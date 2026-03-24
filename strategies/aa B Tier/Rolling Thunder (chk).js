/**
 * Strategy: Rolling Thunder
 * * Source: The Lucky Felt - "The 'Thunderclap' Secret: Trigger Massive Chain Reactions!"
 * URL: https://www.youtube.com/watch?v=R6mV5F3_ElQ
 * * The Logic: 
 * This system plays 4 independent bets simultaneously: Two Dozens, and one Double Street 
 * (Line) inside each of those respective Dozens. By default, this script targets Dozen 1, 
 * Dozen 2, Line 7 (covers 7-12), and Line 19 (covers 19-24). The dozens act as a hedge 
 * while the lines build up pressure for a "thunderclap" overlap hit.
 * * The Progression:
 * Each of the 4 bets operates on its own independent linear progression.
 * - On a LOSS for a specific position: Add 1 unit (based on incrementMode) to that specific bet.
 * - On a WIN for a specific position: Reset that specific bet back to its base minimum.
 * * The Goal:
 * To catch an overlapping win (e.g., hitting a number inside the bet Line) when the board 
 * has built up pressure from previous losses. The session resets naturally as bets hit their 
 * respective targets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State on the first run
    if (!state.initialized) {
        state.initialized = true;
        
        // Define the 4 independent betting positions
        // We track the base unit required for each type (inside vs outside)
        state.positions = [
            { id: 'D1', type: 'dozen', value: 1, currentBet: config.betLimits.minOutside, baseUnit: config.betLimits.minOutside },
            { id: 'D2', type: 'dozen', value: 2, currentBet: config.betLimits.minOutside, baseUnit: config.betLimits.minOutside },
            { id: 'L1', type: 'line', value: 7, currentBet: config.betLimits.min, baseUnit: config.betLimits.min },
            { id: 'L2', type: 'line', value: 19, currentBet: config.betLimits.min, baseUnit: config.betLimits.min }
        ];
    }

    // 2. Evaluate the previous spin to update progressions
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;

        // Helper function to determine if a specific position won
        const isWin = (pos, num) => {
            if (num === 0) return false; // 0 is a loss for dozens and lines

            if (pos.type === 'dozen') {
                if (pos.value === 1 && num >= 1 && num <= 12) return true;
                if (pos.value === 2 && num >= 13 && num <= 24) return true;
                if (pos.value === 3 && num >= 25 && num <= 36) return true;
            } else if (pos.type === 'line') {
                // A line bet value is the start of the row, covering 6 numbers total
                return num >= pos.value && num <= (pos.value + 5);
            }
            return false;
        };

        // Update the bet amount for each position independently
        state.positions.forEach(pos => {
            if (isWin(pos, lastSpin)) {
                // WIN: Reset back to the absolute base unit
                pos.currentBet = pos.baseUnit;
            } else {
                // LOSS: Increment the bet
                const increment = config.incrementMode === 'base' 
                    ? pos.baseUnit 
                    : (config.minIncrementalBet || 1);
                
                pos.currentBet += increment;
            }

            // CLAMP LIMITS: Ensure no bet exceeds the table maximum
            pos.currentBet = Math.min(pos.currentBet, config.betLimits.max);
            
            // Safety check: Ensure it never drops below its required minimum
            pos.currentBet = Math.max(pos.currentBet, pos.baseUnit);
        });
    }

    // 3. Construct the final bets array for the simulator
    const currentBets = state.positions.map(pos => {
        return {
            type: pos.type,
            value: pos.value,
            amount: pos.currentBet
        };
    });

    return currentBets;
}