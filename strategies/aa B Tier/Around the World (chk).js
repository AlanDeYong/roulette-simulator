/**
 * Source: https://www.youtube.com/watch?v=w8LZzUvmqoA (ROULETTE JACKPOT)
 * * The Logic: 
 * - Bets 1 unit straight up on all individual numbers in Column 1.
 * - Bets 1 unit straight up on all individual numbers in Column 3.
 * - Bets 1 unit on the 2/5 split.
 * - Bets 1 unit on the 32/35 split.
 * - Total numbers covered: 24 straight ups + 4 split numbers = 28 numbers. (Note: standard col 1+3 is 24, plus 4 from splits minus any overlap. 2 and 5 are in col 2; 32 and 35 are in col 2, so 28 total numbers covered).
 * * The Progression:
 * - Negative Progression / Recovery: On a loss, the bet amount for all positions is increased by 1 incremental unit.
 * - On any win that causes the current bankroll to hit or exceed the historical peak bankroll, the bet amount resets to 1 base unit.
 * * The Goal:
 * - Steadily grow the bankroll using high board coverage (approx 73.6% win rate on single zero).
 * - Recover from misses efficiently via flat uniform increases across all targeted betting positions.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State and Base Constraints
    const baseUnit = config.betLimits.min; 
    
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
    }
    if (state.progression === undefined) {
        state.progression = 1; 
    }

    // 2. Evaluate Previous Spin & Adjust Progression
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        
        // Update peak bankroll and reset if reached
        if (bankroll >= state.peakBankroll) {
            state.peakBankroll = bankroll;
            state.progression = 1; // Reset progression on new peak
        } else {
            // Determine if the last spin was a loss
            const isCol1 = lastNum !== 0 && lastNum % 3 === 1;
            const isCol3 = lastNum !== 0 && lastNum % 3 === 0;
            const isSplit2_5 = (lastNum === 2 || lastNum === 5);
            const isSplit32_35 = (lastNum === 32 || lastNum === 35);
            
            const isWin = isCol1 || isCol3 || isSplit2_5 || isSplit32_35;
            
            // If it was a loss and we haven't hit our peak bankroll, increment
            if (!isWin) {
                state.progression += 1;
            }
        }
    }

    // 3. Calculate Bet Amount
    let increment = config.incrementMode === 'fixed' ? config.minIncrementalBet : baseUnit;
    let amount = baseUnit + ((state.progression - 1) * increment);

    // Clamp to Limits
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 4. Build the Bets Array
    const bets = [];

    // Column 1 Straight Ups (1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34)
    for (let i = 1; i <= 34; i += 3) {
        bets.push({ type: 'number', value: i, amount: amount });
    }

    // Column 3 Straight Ups (3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36)
    for (let i = 3; i <= 36; i += 3) {
        bets.push({ type: 'number', value: i, amount: amount });
    }

    // Specific Splits
    bets.push({ type: 'split', value: [2, 5], amount: amount });
    bets.push({ type: 'split', value: [32, 35], amount: amount });

    return bets;
}