/*
 * Strategy Name: Safety 5
 * Source: CEG Dealer School - https://youtu.be/wqUGRDO2uPA
 * 
 * The Full Logic in details:
 * The strategy ("Safety 5") leverages early wins on outside bets to fund high-coverage inside bets.
 * - Stage 1 (Trigger): The player places 5 units on two different Dozens (1st and 2nd Dozen) for a total of 10 units.
 * - Stage 2 (House Money): If the Dozen bet hits, it nets a 5-unit profit. The player pulls back their original 10-unit bet 
 *   and uses the 5-unit profit to bet 1 unit each on 5 different Double Streets (Lines) touching each other.
 * 
 * The Full Bet Progression in details:
 * - Start at Stage 1. 
 * - Win at Stage 1: Move to Stage 2. Bet 1 unit each on 5 lines.
 * - Win at Stage 2: Press (increase) the bet on all 5 lines by 1 base unit (e.g., 2 units each, then 3 units each, etc.).
 * - Loss at ANY stage: Reset the progression entirely back to Stage 1.
 * 
 * The Goal:
 * - Target profit is 20 base units (representing the $100 goal mentioned in the video). 
 * - Once the target profit is achieved, the strategy resets to its initial state to lock in the profit.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit
    const unit = config.betLimits.min; 

    // 2. Initialize State
    if (state.stage === undefined) {
        state.stage = 1;
        state.level = 1; // Used for Stage 2 line progression
        state.startingBankroll = bankroll;
    }

    // 3. Check Stop-Profit / Goal Condition
    // Goal is roughly 20 units profit ($100 on a $5 table)
    if (bankroll >= state.startingBankroll + (unit * 20)) {
        state.stage = 1;
        state.level = 1;
        state.startingBankroll = bankroll; // Reset reference bankroll after hitting goal
    }

    // 4. Process previous spin result to adjust state progression
    if (spinHistory.length > 0 && state.lastBets) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        let won = false;
        
        // Evaluate if any of our last bets covered the winning number
        for (let b of state.lastBets) {
            if (b.type === 'dozen') {
                if (b.value === 1 && lastNumber >= 1 && lastNumber <= 12) won = true;
                if (b.value === 2 && lastNumber >= 13 && lastNumber <= 24) won = true;
                if (b.value === 3 && lastNumber >= 25 && lastNumber <= 36) won = true;
            } else if (b.type === 'line') {
                // Line bet value is the starting number (e.g., 1 covers 1-6)
                if (lastNumber >= b.value && lastNumber <= b.value + 5) won = true;
            }
        }

        if (!won) {
            // Loss: Reset to Stage 1
            state.stage = 1;
            state.level = 1;
        } else {
            // Win: Advance progression
            if (state.stage === 1) {
                state.stage = 2;
                state.level = 1;
            } else if (state.stage === 2) {
                // Press up by 1 unit on the lines
                state.level += 1;
            }
        }
    }

    // 5. Calculate and Place Bets
    let bets = [];

    if (state.stage === 1) {
        // Stage 1: Bet 5 units each on Dozen 1 and Dozen 2
        let amount = unit * 5;
        
        amount = Math.max(amount, config.betLimits.minOutside);
        amount = Math.min(amount, config.betLimits.max);

        bets.push({ type: 'dozen', value: 1, amount: amount });
        bets.push({ type: 'dozen', value: 2, amount: amount });
        
    } else if (state.stage === 2) {
        // Stage 2: Bet `state.level` units on 5 overlapping Lines
        let amount = unit * state.level;
        
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        // 5 Double streets touching: 1-6, 7-12, 13-18, 19-24, 25-30
        bets.push({ type: 'line', value: 1, amount: amount });
        bets.push({ type: 'line', value: 7, amount: amount });
        bets.push({ type: 'line', value: 13, amount: amount });
        bets.push({ type: 'line', value: 19, amount: amount });
        bets.push({ type: 'line', value: 25, amount: amount });
    }

    // Persist bets in state so we can check for a win/loss on the next spin
    state.lastBets = bets;

    return bets;
}