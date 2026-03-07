/**
 * Let It Ride Strategy
 * 
 * Source: https://www.youtube.com/watch?v=SsFlSNHbyjM 
 * 
 * The Logic: This strategy maximizes board coverage by placing 14 separate split bets 
 * per spin. This covers 28 numbers. The 14 splits cost a baseline of 14 units. A winning 
 * split pays 17-to-1 (returning 18 units total), netting a 4-unit profit per winning spin.
 * 
 * The Progression: Negative progression (Laddering). If a spin loses, the strategy 
 * accumulates the lost amount into a "deficit". On the next spin, it calculates the required 
 * unit size so that a single win will clear the entire deficit and still yield a base profit. 
 * If a spin wins, the deficit is cleared and the bet size resets to the minimum unit.
 * 
 * The Goal: The system aims for incremental session profit targets (defaulted to 50 base units). 
 * Once the bankroll hits this high-water mark, the session resets to lock in profits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define the 14 splits (covering 28 unique numbers)
    const splits = [
        [1, 4], [2, 5], [3, 6],
        [7, 10], [8, 11], [9, 12],
        [13, 16], [14, 17], [15, 18],
        [19, 22], [20, 23], [21, 24],
        [25, 28], [26, 29]
    ];

    const minUnit = config.betLimits.min;

    // 2. Initialize State
    if (state.deficit === undefined) {
        state.deficit = 0;
        state.lastUnit = minUnit;
        state.sessionStartBankroll = bankroll;
        state.profitTarget = 50 * minUnit; 
    }

    // 3. Process History and Update Deficit
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        
        // Check if the last spin hit any of our 14 splits
        let won = false;
        for (let split of splits) {
            if (split.includes(lastSpin)) {
                won = true;
                break;
            }
        }

        // Calculate win/loss impact on deficit
        // Cost: 14 units. Win pays: 18 units. Net on win: +4 units. Net on loss: -14 units.
        if (won) {
            state.deficit -= (4 * state.lastUnit);
        } else {
            state.deficit += (14 * state.lastUnit);
        }

        // Clamp deficit at 0 (we are in profit)
        if (state.deficit <= 0) {
            state.deficit = 0;
        }

        // Check if we hit the session profit target to lock in profits
        if (bankroll >= state.sessionStartBankroll + state.profitTarget) {
            state.sessionStartBankroll = bankroll;
            state.deficit = 0; 
        }
    }

    // 4. Calculate Next Bet Amount (Laddering)
    let nextUnit = minUnit;
    
    if (state.deficit > 0) {
        // Calculate unit size needed to clear deficit AND make a base profit (4 * minUnit)
        // Equation: (4 * nextUnit) >= deficit + (4 * minUnit)
        nextUnit = Math.ceil((state.deficit + 4 * minUnit) / 4);
    }

    // 5. Clamp to Limits
    nextUnit = Math.max(nextUnit, config.betLimits.min);
    nextUnit = Math.min(nextUnit, config.betLimits.max);

    // Ensure we have enough bankroll for all 14 bets
    if (nextUnit * 14 > bankroll) {
        nextUnit = Math.floor(bankroll / 14);
    }

    // If bankroll is completely depleted below minimums, stop betting
    if (nextUnit < config.betLimits.min || bankroll < nextUnit * 14) {
        return [];
    }

    // Save unit size for the next spin's math
    state.lastUnit = nextUnit;

    // 6. Return Bet Array
    return splits.map(splitArr => {
        return {
            type: 'split',
            value: splitArr,
            amount: nextUnit
        };
    });
}