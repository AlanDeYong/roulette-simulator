/**
 * Strategy: "1 Up, 1 Down" (Fully Custom Configuration)
 * Source: https://youtu.be/PfZ6BTLqYkY (Channel: WillVegas)
 * * Logic:
 * This strategy covers 25 numbers on a European table using a base of 11 units:
 * - 1 unit on Straight Up Number 0
 * - 2 units each on 4 Double Streets (Six-Lines): 4/9, 10/15, 22/27, 28/33
 * - 1 unit each on 2 Double Streets (Six-Lines): 7/12, 25/30
 * * Bet Progression:
 * - On a Loss: Rebet and increase all bets by their respective base bet amount (Level increases by 1).
 * - On a Win: Rebet and decrease all bets by their respective base bet amount (Level decreases by 1, minimum Level 1).
 * - Peak Profit Reset: Reset the progression level back to 1 whenever the current session profit reaches or exceeds the highest profit achieved so far in this session.
 * * Target Goal:
 * - Session profit target of $30 - $50. Stop or reset upon hitting the target.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State variables on the first spin
    if (state.level === undefined) state.level = 1;
    if (state.peakProfit === undefined) state.peakProfit = 0;
    if (state.initialBankroll === undefined) state.initialBankroll = bankroll;

    // 2. Track Session Profit and Peak Profit
    const currentProfit = bankroll - state.initialBankroll;
    
    // Check if we hit a new session peak profit
    let reachedNewPeak = false;
    if (currentProfit > state.peakProfit) {
        state.peakProfit = currentProfit;
        reachedNewPeak = true;
    }

    // 3. Process the last spin's outcome to adjust progression level
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;

        // Determine if the winning number was covered by our strategy
        let isWin = false;

        // Check straight up 0
        if (winningNumber === 0) {
            isWin = true;
        }

        // Check the double streets (Six-lines start at the lowest number of the line)
        const activeLines = [4, 7, 10, 22, 25, 28];
        for (let i = 0; i < activeLines.length; i++) {
            const startNum = activeLines[i];
            if (winningNumber >= startNum && winningNumber <= startNum + 5) {
                isWin = true;
                break;
            }
        }

        // Apply progression adjustment based on outcome or peak reset
        if (reachedNewPeak) {
            state.level = 1; // Reset to base when a new session peak profit is reached
        } else if (isWin) {
            state.level = Math.max(1, state.level - 1); // "1 down" on win
        } else {
            state.level += 1; // "1 up" on loss
        }
    }

    // 4. Define position blueprints with their base unit multipliers
    const basePositions = [
        { type: 'number', value: 0, baseMultiplier: 1 },
        { type: 'line', value: 4, baseMultiplier: 2 },  // 4-9
        { type: 'line', value: 10, baseMultiplier: 2 }, // 10-15
        { type: 'line', value: 22, baseMultiplier: 2 }, // 22-27
        { type: 'line', value: 28, baseMultiplier: 2 }, // 28-33
        { type: 'line', value: 7, baseMultiplier: 1 },  // 7-12
        { type: 'line', value: 25, baseMultiplier: 1 }  // 25-30
    ];

    // 5. Build the bet orders and apply table limit restrictions
    const currentBets = basePositions.map(pos => {
        // Calculate bet based on current progression level and base multiplier
        let betAmount = pos.baseMultiplier * state.level;

        // Clamp the bet amount to the configuration table limits
        const minLimit = pos.type === 'number' ? config.betLimits.min : config.betLimits.minOutside;
        betAmount = Math.max(betAmount, minLimit);
        betAmount = Math.min(betAmount, config.betLimits.max);

        return {
            type: pos.type,
            value: pos.value,
            amount: betAmount
        };
    });

    // 6. Optional: Halt betting if the target session profit range ($30-$50) is reached
    if (currentProfit >= 500000) {
        return []; // Stop betting once maximum target is achieved
    }

    return currentBets;
}