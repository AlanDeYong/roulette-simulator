/**
 * VIPER STRATEGIES - PRO MOD ROULETTE STRATEGY
 * * Source: https://www.youtube.com/watch?v=QbNylOBOgKk (VIPER STRATEGIES)
 * * The Logic:
 * - Uses "Recency Bias": It does not use fixed bet locations. Instead, it analyzes 
 * the last 5 spins to identify the hottest trend among Red, Black, High, or Low, 
 * and places the bet there.
 * - Incorporates session resets: If the bankroll reaches a target profit (~4 units) 
 * or hits a stop-loss (~20 units), the sequence completely resets to protect the bankroll.
 * * The Progression:
 * - Levels 1 to 3 (Soft Progression): Bets are 1, 2, and 3 units. A single win at 
 * any of these levels resets the progression back to Level 1. A loss moves it up one level.
 * - Level 4 and above (Match Play): The bet amount is (Level - 1) units (e.g., Level 4 = 3 units, 
 * Level 5 = 4 units). At these levels, it plays a "Best 2 out of 3" series.
 * - Getting 2 wins in the set drops the progression back down 1 level.
 * - Getting 2 losses in the set pushes the progression up 1 level.
 * * The Goal:
 * - A low-volatility grind designed to survive bad streaks and heavy concentrations of zeros 
 * while aiming for a steady 3-5 unit profit per session.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const baseUnit = config.betLimits.minOutside;

    // 1. Initialize State Variables
    if (state.level === undefined) {
        state.level = 1;
        state.setWins = 0;
        state.setLosses = 0;
        state.sessionStartBankroll = bankroll;
        state.lastBetType = null;
    }

    // 2. Check for Session Take-Profit or Stop-Loss
    const currentProfit = bankroll - state.sessionStartBankroll;
    if (currentProfit >= (4 * baseUnit) || currentProfit <= (-20 * baseUnit)) {
        // Reset session
        state.level = 1;
        state.setWins = 0;
        state.setLosses = 0;
        state.sessionStartBankroll = bankroll; 
    }

    // 3. Evaluate the Previous Spin
    if (spinHistory.length > 0 && state.lastBetType) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const num = lastResult.winningNumber;
        const color = lastResult.winningColor;
        
        let wonLastSpin = false;

        // Zeros are automatic losses for outside bets
        if (num !== 0 && num !== '00') {
            if (state.lastBetType === 'red' && color === 'red') wonLastSpin = true;
            else if (state.lastBetType === 'black' && color === 'black') wonLastSpin = true;
            else if (state.lastBetType === 'high' && num >= 19 && num <= 36) wonLastSpin = true;
            else if (state.lastBetType === 'low' && num >= 1 && num <= 18) wonLastSpin = true;
        }

        // 4. Update Progression Logic
        if (state.level <= 3) {
            // Soft Progression Phase
            if (wonLastSpin) {
                state.level = 1;
            } else {
                state.level++;
            }
        } else {
            // Match Play Phase (Best 2 out of 3)
            if (wonLastSpin) state.setWins++;
            else state.setLosses++;

            if (state.setWins === 2) {
                state.level--;
                state.setWins = 0;
                state.setLosses = 0;
            } else if (state.setLosses === 2) {
                state.level++;
                state.setWins = 0;
                state.setLosses = 0;
            }
        }
    }

    // 5. Determine Recency Bias (What to bet on)
    let nextBetType = 'red'; // Default fallback
    if (spinHistory.length > 0) {
        let counts = { red: 0, black: 0, high: 0, low: 0 };
        // Analyze up to the last 5 spins
        const recentSpins = spinHistory.slice(-5);
        
        recentSpins.forEach(spin => {
            const n = spin.winningNumber;
            if (n !== 0 && n !== '00') {
                if (spin.winningColor === 'red') counts.red++;
                if (spin.winningColor === 'black') counts.black++;
                if (n >= 19) counts.high++;
                if (n <= 18) counts.low++;
            }
        });

        // Find the most frequent outcome
        let maxCount = -1;
        for (const [type, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                nextBetType = type;
            }
        }
    }

    // Save the chosen bet type for the next spin's evaluation
    state.lastBetType = nextBetType;

    // 6. Calculate Bet Amount
    let unitsToBet = 1;
    if (state.level === 1) unitsToBet = 1;
    else if (state.level === 2) unitsToBet = 2;
    else if (state.level === 3) unitsToBet = 3;
    else unitsToBet = state.level - 1; // Level 4 is 3u, Level 5 is 4u, etc.

    let amount = unitsToBet * baseUnit;

    // 7. Clamp to Limits
    amount = Math.max(amount, config.betLimits.minOutside);
    amount = Math.min(amount, config.betLimits.max);

    // 8. Execute Bet
    return [{ type: nextBetType, amount: amount }];
}