/**
 * Source: N/A - Custom User Strategy
 * * The Logic: 
 * Requires 37 spins of history to activate. Analyzes the last 37 spins to determine 
 * the top 5 most frequent ("hot") numbers, explicitly excluding '0'. It then places 
 * individual straight-up bets on '0' and those 5 hot numbers (6 bets total).
 * * The Progression:
 * Linear unit progression. The strategy starts at 1 unit (the table minimum).
 * On a loss, it adds 1 unit to the base multiplier for all covered numbers.
 * On a win, it resets the progression back to 1 unit.
 * * The Goal:
 * To capitalize on clustering/repeating numbers within a 37-spin window, utilizing a 
 * steady recovery progression to recoup losses when the hot numbers or '0' hit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State variables
    if (!state.currentUnit) state.currentUnit = 1;
    if (!state.lastBetNumbers) state.lastBetNumbers = [];

    // Strategy requires 37 spins to analyze hot numbers
    if (spinHistory.length < 37) {
        return [];
    }

    // 2. Progression Check (Win/Loss condition)
    if (state.lastBetNumbers.length > 0) {
        const lastResult = spinHistory[spinHistory.length - 1].winningNumber;
        
        if (state.lastBetNumbers.includes(lastResult)) {
            // Win condition met: reset unit
            state.currentUnit = 1;
        } else {
            // Loss condition met: increment unit
            state.currentUnit += 1;
        }
    }

    // 3. Analyze the last 37 spins
    const last37 = spinHistory.slice(-37);
    const frequencies = {};

    last37.forEach(spin => {
        const num = spin.winningNumber;
        // Exclude 0 so we always get 5 *other* distinct numbers
        if (num !== 0) {
            frequencies[num] = (frequencies[num] || 0) + 1;
        }
    });

    // Sort numbers by frequency descending. 
    // Tie-breaker: lower numbers take precedence to ensure deterministic sorting.
    const sortedNumbers = Object.keys(frequencies).sort((a, b) => {
        if (frequencies[b] === frequencies[a]) {
            return parseInt(a) - parseInt(b);
        }
        return frequencies[b] - frequencies[a];
    });

    // Extract top 5 hot numbers
    const hot5 = sortedNumbers.slice(0, 5).map(n => parseInt(n));

    // Edge Case: If the window had very few unique numbers, fill the rest with standard numbers
    let fillerNum = 1;
    while (hot5.length < 5) {
        if (!hot5.includes(fillerNum) && fillerNum !== 0) {
            hot5.push(fillerNum);
        }
        fillerNum++;
    }

    // 4. Calculate Bet Amount with strict limits
    const baseUnitAmount = config.betLimits.min;
    let betAmount = baseUnitAmount * state.currentUnit;

    // Clamp the amount between table minimum and maximum
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 5. Construct final bets (0 + top 5 hot numbers)
    const betsToPlace = [0, ...hot5];
    
    // Save state for the next spin's win/loss evaluation
    state.lastBetNumbers = betsToPlace;

    return betsToPlace.map(num => ({
        type: 'number',
        value: num,
        amount: betAmount
    }));
}