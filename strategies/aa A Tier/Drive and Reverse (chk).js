/**
 * Roulette Strategy: Modified Drive and Reverse
 * Source: WillVegas (https://youtu.be/DOLclbtjf9A) with Custom Progression
 * * The Full Logic in details:
 * This strategy plays on "double streets" (line bets, each covering 6 numbers).
 * The progression dynamically adjusts based on wins, losses, and the session's peak bankroll.
 * * The Full Bet Progression in details:
 * The strategy has 4 "gears" or levels:
 * - Level 1: Cover 2 lines (12 numbers). Bet 1x base unit per line.
 * - Level 2: Cover 3 lines (18 numbers). Bet 5x base unit per line.
 * - Level 3: Cover 4 lines (24 numbers). Bet 25x base unit per line.
 * - Level 4: Cover 5 lines (30 numbers). Bet 100x base unit per line.
 * Custom Progression logic:
 * - On a loss: Move up 1 level (max Level 4).
 * - On a win: 
 *   - If the current bankroll has NOT reached the peak session profit: Move down 1 level.
 *   - If the current bankroll HAS reached or exceeded the peak session profit: Reset to Level 1.
 * * The Goal:
 * To hit a stop-win profit of 300 base units (e.g., $300 with a $1 minimum). 
 * There is no fixed stop-loss; it plays until the bankroll is depleted or the target is reached.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State and determine base unit
    const unit = config.betLimits.min;

    if (state.gear === undefined) {
        state.gear = 0; // Represents indices 0 to 3 for Levels 1 to 4
        state.startingBankroll = bankroll;
        state.peakBankroll = bankroll;
        state.preBetBankroll = bankroll;
    } else if (spinHistory.length > 0) {
        // Determine if the last spin was a win or loss by comparing current bankroll to pre-bet bankroll
        if (bankroll > state.preBetBankroll) {
            // Win condition
            if (bankroll >= state.peakBankroll) {
                state.gear = 0; // Reset to Level 1
            } else {
                state.gear = Math.max(0, state.gear - 1); // Move down 1 level
            }
        } else {
            // Loss condition
            state.gear = Math.min(3, state.gear + 1); // Move up 1 level
        }
    }

    // Update Peak Bankroll
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Goal Check
    const currentProfit = bankroll - state.startingBankroll;
    if (currentProfit >= 30000 * unit) {
        return []; // Reached the +300 unit target, stop betting
    }

    // 3. Define Gears Configuration
    const multipliers = [1, 5, 25, 100];
    const linesCovered = [2, 3, 4, 5];

    const currentMultiplier = multipliers[state.gear];
    const currentLinesCount = linesCovered[state.gear];

    // 4. Calculate Bet Amount
    let amount = unit * currentMultiplier;

    // Clamp to table limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Build the Bets
    // Available starting numbers for the 6 line bets on a European/American board
    const availableLines = [1, 7, 13, 19, 25, 31];
    
    // Offset the selected lines slightly each spin to add variance
    const offset = spinHistory.length % availableLines.length;
    let bets = [];
    
    for (let i = 0; i < currentLinesCount; i++) {
        let lineIndex = (offset + i) % availableLines.length;
        bets.push({
            type: 'line',
            value: availableLines[lineIndex],
            amount: amount
        });
    }

    // 6. Bankroll Safeties
    const totalBet = amount * currentLinesCount;
    if (totalBet > bankroll) {
        // If we can't afford the current gear, fall back to betting what we can at minimum limits
        bets = [];
        let remainingBankroll = bankroll;
        for (let i = 0; i < currentLinesCount; i++) {
            if (remainingBankroll >= config.betLimits.min) {
                let lineIndex = (offset + i) % availableLines.length;
                bets.push({
                    type: 'line',
                    value: availableLines[lineIndex],
                    amount: config.betLimits.min
                });
                remainingBankroll -= config.betLimits.min;
            }
        }
        if (bets.length === 0) return []; // Out of money completely
    }

    // 7. Save current bankroll to evaluate win/loss on the next spin
    state.preBetBankroll = bankroll;

    return bets;
}