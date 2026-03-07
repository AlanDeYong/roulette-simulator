/**
 * Source: https://www.youtube.com/watch?v=nUZ95W5JnUU (Beyond the Casino)
 * 
 * The Logic:
 * - This is the modified "Tweaked" version of the "Never Lose" strategy.
 * - It covers Column 2, Column 3, and an even-money bet (High/Low).
 * - "Follow the Leader" Tactic: The even-money bet (High/Low) follows the last 
 *   winning number's range (1-18 for Low, 19-36 for High).
 * 
 * The Progression:
 * - Martingale-based: Doubles the progression level if the bankroll is below 
 *   the previous peak (loss recovery mode).
 * - Resets to level 1 upon reaching a new bankroll peak or meeting the profit goal.
 * 
 * The Ratio:
 * - Column 2: 1 Unit
 * - Column 3: 1 Unit
 * - High/Low: 3 Units (Modified per user request)
 * 
 * The Goal:
 * - Target profit of $50 above starting bankroll.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialBankroll) {
        state.initialBankroll = bankroll;
        state.maxBankroll = bankroll;
        state.progression = 1;
        state.targetProfit = 50000; 
        state.lastEvenMoneyBet = 'high'; // Initial placement
    }

    // 2. Check for Goal Completion
    if (bankroll >= state.initialBankroll + state.targetProfit) {
        return []; // Stop betting
    }

    // 3. Update Progression and "Follow the Leader" logic based on last spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastResult = lastSpin.winningNumber;

        // Progression Logic: Double if we are below our peak bankroll
        if (bankroll < state.maxBankroll) {
            state.progression *= 2;
        } else {
            state.progression = 1;
            state.maxBankroll = bankroll;
        }

        // Follow the Leader: Update High/Low position
        if (lastResult >= 1 && lastResult <= 18) {
            state.lastEvenMoneyBet = 'low';
        } else if (lastResult >= 19 && lastResult <= 36) {
            state.lastEvenMoneyBet = 'high';
        }
    }

    // 4. Calculate Bet Amounts (1:1:3 Ratio)
    const unit = config.betLimits.minOutside;
    
    let col2Amount = unit * state.progression;
    let col3Amount = unit * state.progression;
    let evenMoneyAmount = (unit * 3) * state.progression; // Updated to 3 units base

    // 5. Clamp to Table Limits
    const clamp = (amt) => Math.min(Math.max(amt, config.betLimits.minOutside), config.betLimits.max);
    
    col2Amount = clamp(col2Amount);
    col3Amount = clamp(col3Amount);
    evenMoneyAmount = clamp(evenMoneyAmount);

    // 6. Bankroll Protection
    const totalBet = col2Amount + col3Amount + evenMoneyAmount;
    if (totalBet > bankroll) {
        // If we can't afford the progression, check if we can afford a base unit reset (5 units total)
        if ((unit * 5) > bankroll) return []; 
        
        state.progression = 1;
        col2Amount = unit;
        col3Amount = unit;
        evenMoneyAmount = unit * 3;
    }

    // 7. Return Bets
    return [
        { type: 'column', value: 2, amount: col2Amount },
        { type: 'column', value: 3, amount: col3Amount },
        { type: state.lastEvenMoneyBet, amount: evenMoneyAmount }
    ];
}