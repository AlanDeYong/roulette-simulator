/**
 * Source: "CAN YOU BEAT ROULETTE WITH MOVING DOUBLE STREETS? 100K-TESTED" by Roulette Strategy Lab
 * URL: https://www.youtube.com/watch?v=sug-kR8eZ9M
 *
 * The Logic:
 * - Observe the last valid winning number (ignoring zeroes).
 * - Determine if it falls in the 1st or 2nd "Double Street" (Line) of its respective Dozen.
 * - 1st Double Streets: 1-6, 13-18, 25-30
 * - 2nd Double Streets: 7-12, 19-24, 31-36
 * - Bet on the corresponding Double Streets across ALL THREE dozens.
 * - Example: If 7 hits (2nd double street of Dozen 1), bet on lines starting at 7, 19, and 31.
 *
 * The Progression:
 * - Flat bet 1 unit on the 3 corresponding double streets initially and after any win.
 * - After a loss, the bet for each line is aggressively increased: (previous_bet * 2) + base_unit.
 *
 * The Goal:
 * - Accumulate continuous profit through a high win rate (covering 18 numbers). 
 * - Note: Bankroll stress is severe. A string of bad luck forces exponentially larger bets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit for inside line bets
    const baseUnit = config.betLimits.min;

    // Wait for at least one spin to determine the pattern
    if (spinHistory.length === 0) return [];

    // 2. Find the last valid number (ignore 0/00 for determining the moving street)
    let targetNum = null;
    for (let i = spinHistory.length - 1; i >= 0; i--) {
        if (spinHistory[i].winningNumber !== 0) {
            targetNum = spinHistory[i].winningNumber;
            break;
        }
    }
    
    // If only zeroes have rolled so far, we can't determine a pattern yet
    if (targetNum === null) return [];

    // 3. Evaluate Win/Loss from the previous spin
    const lastSpin = spinHistory[spinHistory.length - 1];
    const lastNum = lastSpin.winningNumber;
    let isWin = false;

    if (state.lastBetLines && lastNum !== 0) {
        // A line bet covers 6 numbers starting from its 'value'. 
        // Check if the last number falls into any of our last bet lines.
        for (let lineStart of state.lastBetLines) {
            if (lastNum >= lineStart && lastNum <= lineStart + 5) {
                isWin = true;
                break;
            }
        }
    }

    // 4. Calculate Progression Amount
    let currentBetAmount;
    
    if (!state.lastBetAmount || isWin) {
        // Reset to base unit on win or on the very first bet
        currentBetAmount = baseUnit;
    } else {
        // Aggressive progression on loss: Double previous bet and add one base unit
        currentBetAmount = (state.lastBetAmount * 2) + baseUnit;
    }

    // Clamp to table limits to ensure we respect the casino ceiling
    currentBetAmount = Math.max(currentBetAmount, config.betLimits.min);
    currentBetAmount = Math.min(currentBetAmount, config.betLimits.max);

    // Update state with the new bet amount for the next round
    state.lastBetAmount = currentBetAmount;

    // 5. Determine which Double Streets to bet based on the targetNum
    // Math.ceil(targetNum / 6) maps numbers 1-36 to line groups 1-6.
    const targetLineNum = Math.ceil(targetNum / 6);
    const position = (targetLineNum % 2 !== 0) ? 1 : 2;

    let linesToBet;
    if (position === 1) {
        // 1st double street of each dozen
        linesToBet = [1, 13, 25]; 
    } else {
        // 2nd double street of each dozen
        linesToBet = [7, 19, 31];
    }

    // Save lines to state for the next spin's win/loss evaluation
    state.lastBetLines = linesToBet;

    // 6. Construct bets
    const bets = linesToBet.map(lineStart => {
        return {
            type: 'line',
            value: lineStart,
            amount: currentBetAmount
        };
    });

    // 7. Safety check: Ensure we have enough bankroll for the total bet
    const totalBetCost = currentBetAmount * 3;
    if (totalBetCost > bankroll) {
        // If the bankroll cannot support the aggressive progression, stop betting.
        return []; 
    }

    return bets;
}