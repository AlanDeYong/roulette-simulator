/**
 * Strategy: The Gaussian Apex
 * 
 * Source: https://youtu.be/pN5SbETVSvw (Channel: The Lucky Felt)
 * 
 * The Full Logic in details:
 * - This strategy is a "hunting" system. It tracks the last 9 unique numbers hit or identifies 
 *   statistical groupings (sections, high/low, or specific patterns like repeating numbers) 
 *   to determine the next 9 numbers to bet on. 
 * - In this simplified implementation, we bet on the last 9 winning numbers to simulate 
 *   "hunting" for repeaters.
 * 
 * The Full Bet Progression in details:
 * - Base Unit: Starts at the minimum inside bet limit (config.betLimits.min).
 * - Progression: This is a modified D'Alembert system.
 * - Initial: Place 1 unit on each of the 9 selected numbers.
 * - Loss: If the set of 9 numbers loses, keep betting the same amount for 3 spins. 
 *   If you lose 3 spins in a row, increase the bet by 1 unit per number.
 * - Win: Reset progression to base unit (1 unit per number) upon any win.
 * 
 * The Goal: 
 * - The goal is to accumulate small session profits. There is no strict mathematical 
 *   stop-loss provided in the video, but profit taking occurs when the session target is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (state.progressionLevel === undefined) state.progressionLevel = 1;
    if (state.consecutiveLosses === undefined) state.consecutiveLosses = 0;

    // 2. Analyze History to check for Win/Loss
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        // For simplicity, define a win as hitting any number we bet on
        // In this implementation, we bet on the last 9 unique numbers.
        const lastBets = state.lastBets || [];
        const isWin = lastBets.includes(lastSpin.winningNumber);

        if (isWin) {
            state.progressionLevel = 1;
            state.consecutiveLosses = 0;
        } else {
            state.consecutiveLosses++;
            // Increment level every 3 losses
            if (state.consecutiveLosses > 0 && state.consecutiveLosses % 3 === 0) {
                state.progressionLevel++;
            }
        }
    }

    // 3. Determine Bet Amounts
    const baseUnit = config.betLimits.min;
    let betAmount = baseUnit * state.progressionLevel;

    // 4. CLAMP TO LIMITS
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 5. Select 9 Numbers (Pattern: Last 9 unique winning numbers)
    // If we don't have enough history, fallback to a static set
    let selectedNumbers = [];
    if (spinHistory.length >= 9) {
        const uniqueNumbers = [...new Set(spinHistory.map(s => s.winningNumber))];
        selectedNumbers = uniqueNumbers.slice(-9);
    } else {
        selectedNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    }
    
    state.lastBets = selectedNumbers;

    // 6. Return Array of Bet Objects
    return selectedNumbers.map(num => ({
        type: 'number',
        value: num,
        amount: betAmount
    }));
}