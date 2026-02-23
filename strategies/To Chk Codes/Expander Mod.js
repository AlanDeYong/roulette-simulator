/**
 * Source: The Roulette Factory (YouTube) - https://www.youtube.com/watch?v=_i28F7ELMqo
 * * The Logic: The "Expander" strategy systematically increases board coverage 
 * by placing combinations of street and split bets that expand outward from the 
 * center of the board. To mitigate the extreme volatility of the base strategy, 
 * it employs consecutive loss protection: after a loss, real betting pauses, 
 * and the system waits for a "virtual win" on the covered area before resuming.
 * * The Progression: D'Alembert Ladder combined with an 8-stage expansion.
 * - On a Win: Move down 1 progression level (minimum level 0). Exit virtual mode.
 * - On a Loss: Move up 1 progression level (maximum level 7). Enter virtual mode.
 * * The Goal: Capitalize on winning streaks while shielding the bankroll during 
 * clustered losing streaks, systematically absorbing variance.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define the 8 Expansion Levels (Coverage + Multiplier)
    const expansionLevels = [
        { mult: 1,  streets: [16], splits: [[17,20]] }, // Level 1
        { mult: 1,  streets: [13, 16, 19], splits: [[14,17], [17,20], [20,23]] }, // Level 2
        { mult: 2,  streets: [13, 16, 19], splits: [[14,17], [17,20], [20,23]] }, // Level 3
        { mult: 2,  streets: [10, 13, 16, 19, 22], splits: [[11,14], [14,17], [17,20], [20,23], [23,26]] }, // Level 4
        { mult: 4,  streets: [10, 13, 16, 19, 22], splits: [[11,14], [14,17], [17,20], [20,23], [23,26]] }, // Level 5
        { mult: 4,  streets: [7, 10, 13, 16, 19, 22, 25], splits: [[8,11], [11,14], [14,17], [17,20], [20,23], [23,26], [26,29]] }, // Level 6
        { mult: 8,  streets: [7, 10, 13, 16, 19, 22, 25], splits: [[8,11], [11,14], [14,17], [17,20], [20,23], [23,26], [26,29]] }, // Level 7
        { mult: 16, streets: [7, 10, 13, 16, 19, 22, 25], splits: [[8,11], [11,14], [14,17], [17,20], [20,23], [23,26], [26,29]] }  // Level 8
    ];

    // 2. Initialize State Persistence
    if (state.levelIndex === undefined) state.levelIndex = 0;
    if (state.isVirtual === undefined) state.isVirtual = false;
    if (state.lastBets === undefined) state.lastBets = [];

    // 3. Determine Previous Spin Outcome (Real or Virtual)
    let wonLastSpin = false;
    let playedLastSpin = state.lastBets.length > 0 && spinHistory.length > 0;

    if (playedLastSpin) {
        const lastSpinNumber = spinHistory[spinHistory.length - 1].winningNumber;
        
        // Scan previous bets to see if the ball landed on our coverage
        for (let b of state.lastBets) {
            if (b.type === 'street') {
                // Street covers the start value and the next two numbers
                if (lastSpinNumber >= b.value && lastSpinNumber <= b.value + 2) {
                    wonLastSpin = true;
                    break;
                }
            } else if (b.type === 'split') {
                // Split covers two specific numbers in an array
                if (b.value.includes(lastSpinNumber)) {
                    wonLastSpin = true;
                    break;
                }
            }
        }

        // 4. Apply D'Alembert & Virtual Logic
        if (wonLastSpin) {
            state.levelIndex = Math.max(0, state.levelIndex - 1); // Step down
            state.isVirtual = false; // Resume real betting
        } else {
            state.levelIndex = Math.min(expansionLevels.length - 1, state.levelIndex + 1); // Step up
            state.isVirtual = true; // Pause real betting, wait for virtual win
        }
    }

    // 5. Generate Current Bets based on Progression Level
    const currentLevel = expansionLevels[state.levelIndex];
    let baseUnit = config.betLimits.min; 
    
    // Clamp the bet amount to strict limits
    let rawAmount = baseUnit * currentLevel.mult;
    let safeAmount = Math.max(config.betLimits.min, Math.min(rawAmount, config.betLimits.max));

    let betsToPlace = [];

    // Build Street Bets
    currentLevel.streets.forEach(startNum => {
        betsToPlace.push({ type: 'street', value: startNum, amount: safeAmount });
    });

    // Build Split Bets
    currentLevel.splits.forEach(splitArr => {
        betsToPlace.push({ type: 'split', value: splitArr, amount: safeAmount });
    });

    // Save intended bets to state for the next spin's win/loss calculation
    state.lastBets = betsToPlace;

    // 6. Return Action (Return null/empty if in Virtual Mode)
    if (state.isVirtual) {
        return []; 
    }

    return betsToPlace;
}