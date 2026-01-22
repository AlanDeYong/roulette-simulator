/**
 * ANACONDA ROULETTE STRATEGY
 * * Source: YouTube - "Roulette Strategy - Anaconda" (Concept from Roulette Community)
 * * The Logic:
 * This strategy is a "Cover" system that targets specific "Jackpot Numbers" (8, 11, 20, 23).
 * These numbers are mathematically significant because they are located in the 2nd Column 
 * AND are covered by the specific split bets used in the progression. 
 * Hitting a Jackpot Number pays both the Split (17:1) and the Column (2:1).
 * * The Progression (8 Levels):
 * It uses a steep negative progression (increasing bets after losses) to recover previous losses.
 * 1. Starter: Split 3/6 (1u) + Col 2 (2u).
 * 2. Extension: Adds Split 8/11 (1u) + Increases Col 2.
 * 3. First Double: Adds Split 15/18 (2u) + Doubles chips.
 * 4. Accumulation: Adds Split 20/23 (2u) + Increases Col 2.
 * 5. Major Double: Doubles all chips.
 * 6. High Roller: Doubles all chips.
 * 7. The Brink: Doubles all chips.
 * 8. Hail Mary: A massive recovery bet on Dozen 2 combined with flat bets on all splits.
 * * The Goal:
 * To profit from streaks in the 2nd Column or hit the specific Split numbers to reset the 
 * progression to Level 1.
 */

function bet(spinHistory, bankroll, config, state) {
    // --- 1. Constants & Helpers ---
    const COL_2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
    const DOZEN_2 = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];

    // Helper to calculate the result of the previous spin based on the level played
    const getProfitFromLastSpin = (lastNumber, level, unitSize) => {
        const numVal = parseInt(lastNumber);
        // Treat 0 and 00 as losses for this strategy
        if (lastNumber === '0' || lastNumber === '00' || lastNumber === 0) return -1;

        let wager = 0;
        let payout = 0;

        // Re-generate the bets placed in that level to calculate outcome
        const previousBets = generateBetConfig(level, unitSize);

        previousBets.forEach(b => {
            wager += b.amount;
            
            // Check Wins
            if (b.type === 'split') {
                if (b.numbers.includes(numVal)) {
                    // Payout 17:1 + Return Stake
                    payout += (b.amount * 17) + b.amount; 
                }
            } else if (b.type === 'column') {
                if (COL_2.includes(numVal)) {
                    // Payout 2:1 + Return Stake
                    payout += (b.amount * 2) + b.amount;
                }
            } else if (b.type === 'dozen') {
                if (DOZEN_2.includes(numVal)) {
                    // Payout 2:1 + Return Stake
                    payout += (b.amount * 2) + b.amount;
                }
            }
        });

        return payout - wager;
    };

    // Helper to define the specific bet units for each level
    const generateBetConfig = (level, unit) => {
        const bets = [];
        
        switch (level) {
            case 1:
                bets.push({ type: 'split', numbers: [3, 6], amount: 1 * unit });
                bets.push({ type: 'column', value: 2, amount: 2 * unit });
                break;
            case 2:
                bets.push({ type: 'split', numbers: [3, 6], amount: 1 * unit });
                bets.push({ type: 'split', numbers: [8, 11], amount: 1 * unit });
                bets.push({ type: 'column', value: 2, amount: 4 * unit });
                break;
            case 3:
                bets.push({ type: 'split', numbers: [3, 6], amount: 2 * unit });
                bets.push({ type: 'split', numbers: [8, 11], amount: 2 * unit });
                bets.push({ type: 'split', numbers: [15, 18], amount: 2 * unit });
                bets.push({ type: 'column', value: 2, amount: 12 * unit });
                break;
            case 4:
                bets.push({ type: 'split', numbers: [3, 6], amount: 2 * unit });
                bets.push({ type: 'split', numbers: [8, 11], amount: 2 * unit });
                bets.push({ type: 'split', numbers: [15, 18], amount: 2 * unit });
                bets.push({ type: 'split', numbers: [20, 23], amount: 2 * unit });
                bets.push({ type: 'column', value: 2, amount: 16 * unit });
                break;
            case 5:
                bets.push({ type: 'split', numbers: [3, 6], amount: 4 * unit });
                bets.push({ type: 'split', numbers: [8, 11], amount: 4 * unit });
                bets.push({ type: 'split', numbers: [15, 18], amount: 4 * unit });
                bets.push({ type: 'split', numbers: [20, 23], amount: 4 * unit });
                bets.push({ type: 'column', value: 2, amount: 32 * unit });
                break;
            case 6:
                bets.push({ type: 'split', numbers: [3, 6], amount: 8 * unit });
                bets.push({ type: 'split', numbers: [8, 11], amount: 8 * unit });
                bets.push({ type: 'split', numbers: [15, 18], amount: 8 * unit });
                bets.push({ type: 'split', numbers: [20, 23], amount: 8 * unit });
                bets.push({ type: 'column', value: 2, amount: 64 * unit });
                break;
            case 7:
                bets.push({ type: 'split', numbers: [3, 6], amount: 16 * unit });
                bets.push({ type: 'split', numbers: [8, 11], amount: 16 * unit });
                bets.push({ type: 'split', numbers: [15, 18], amount: 16 * unit });
                bets.push({ type: 'split', numbers: [20, 23], amount: 16 * unit });
                bets.push({ type: 'column', value: 2, amount: 128 * unit });
                break;
            case 8: // Hail Mary
                // $5 units on splits, massive on Dozen 2 ($404 in source text).
                // Ratio is approx 81:1 for Dozen vs Split unit.
                bets.push({ type: 'split', numbers: [3, 6], amount: 5 * unit });
                bets.push({ type: 'split', numbers: [8, 11], amount: 5 * unit });
                bets.push({ type: 'split', numbers: [15, 18], amount: 5 * unit });
                bets.push({ type: 'split', numbers: [20, 23], amount: 5 * unit });
                bets.push({ type: 'dozen', value: 2, amount: 404 * unit }); 
                break;
        }
        return bets;
    };

    // --- 2. Determine Base Unit Size ---
    // Ensure we respect both Inside (Split) and Outside (Column) minimums.
    // L1 uses 1 unit Split and 2 units Column.
    // Therefore: Unit >= MinInside AND 2*Unit >= MinOutside.
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 1;
    
    const baseUnit = Math.max(minInside, Math.ceil(minOutside / 2));

    // --- 3. Manage State (Progression) ---
    if (!state.currentLevel) {
        state.currentLevel = 1;
    }

    // If there is history, check the result of the LAST spin to determine if we move level
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        
        // Did the last bet win?
        const netProfit = getProfitFromLastSpin(lastSpin.winningNumber, state.currentLevel, baseUnit);

        if (netProfit > 0) {
            // Win: Reset to Level 1
            state.currentLevel = 1;
        } else {
            // Loss: Progress to next level
            if (state.currentLevel >= 8) {
                // If Level 8 is lost, usually the bankroll is depleted or we reset.
                // For simulation safety, we reset to 1.
                state.currentLevel = 1;
            } else {
                state.currentLevel++;
            }
        }
    }

    // --- 4. Generate Bets for Current Level ---
    const proposedBets = generateBetConfig(state.currentLevel, baseUnit);

    // --- 5. Format and Clamp Bets ---
    return proposedBets.map(b => {
        // Clamp to Max Limit
        let finalAmount = Math.min(b.amount, config.betLimits.max);
        
        // Ensure we don't accidentally go below min if math was weird (unlikely with baseUnit logic, but safe)
        const typeMin = (b.type === 'split') ? minInside : minOutside;
        finalAmount = Math.max(finalAmount, typeMin);

        // Format for output
        if (b.type === 'split') {
            return { type: 'split', value: b.numbers, amount: finalAmount };
        } else if (b.type === 'column') {
            return { type: 'column', value: b.value, amount: finalAmount }; // value: 1, 2, or 3
        } else if (b.type === 'dozen') {
            return { type: 'dozen', value: b.value, amount: finalAmount }; // value: 1, 2, or 3
        }
        return null;
    }).filter(Boolean); // Remove nulls
}