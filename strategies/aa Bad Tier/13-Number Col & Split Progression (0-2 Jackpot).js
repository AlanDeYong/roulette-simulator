/*
 * Strategy Name: 13-Number Column & Split Progression (0-2 Jackpot)
 * Source: https://youtu.be/9E8-Nj-I7ew (Spin Till You Win)
 *
 * The Full Logic in details:
 * This strategy covers 13 unique numbers by placing two simultaneous bets: 
 * 1. The Volume Base: A bet on the 2nd Column (covering 12 numbers: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35).
 * 2. The Jackpot Target: A split bet covering 0 and 2. 
 * Since the number 2 is already part of the 2nd column, hitting a 2 acts as the "Jackpot Trigger," 
 * winning both the 2:1 column bet and the 17:1 split bet at the same time.
 * * The Full Bet Progression in details:
 * The strategy spans an 18-phase recovery progression. After a losing spin, the betting amounts increase 
 * according to the predefined multi-tier multiplier sequence to recover previous losses.
 * If a win occurs on either the 2nd column or the 0-2 split, the progression is immediately reset back to Phase 1.
 * * The Goal:
 * To achieve steady, small wins through the 2nd column floor while managing prolonged cold streaks 
 * through the 18-step progression, ultimately aiming for a high-multiplier payout on the 0-2 split. 
 * The stop-loss is reached if the 18th progressive phase is lost, requiring a structural reset.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // Define the 18-phase progression multipliers [Split 0-2, 2nd Column]
    // These multipliers are scaled against the table minimums.
    const progression = [
        { split: 1, col: 1 },
        { split: 1, col: 2 },
        { split: 1, col: 3 },
        { split: 1, col: 4 },
        { split: 2, col: 7 },
        { split: 3, col: 12 },
        { split: 4, col: 20 },
        { split: 7, col: 33 },
        { split: 11, col: 54 },
        { split: 18, col: 89 },
        { split: 29, col: 146 },
        { split: 47, col: 240 },
        { split: 77, col: 395 },
        { split: 126, col: 651 },
        { split: 207, col: 1073 },
        { split: 340, col: 1768 },
        { split: 559, col: 2914 },
        { split: 919, col: 4799 } 
    ];

    // 1. Initialize State
    if (typeof state.currentPhase === 'undefined') {
        state.currentPhase = 0;
    }

    // 2. Determine Win/Loss from the last spin
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
        const col2Numbers = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
        
        const isCol2Win = col2Numbers.includes(lastSpin);
        const isSplitWin = (lastSpin === 0 || lastSpin === 2);

        if (isCol2Win || isSplitWin) {
            // Win condition: Reset progression to Phase 1
            state.currentPhase = 0;
        } else {
            // Loss condition: Advance to the next recovery phase
            state.currentPhase++;
            
            // Stop-Loss: If the 18-phase sequence is exhausted, reset back to base
            if (state.currentPhase >= progression.length) {
                state.currentPhase = 0;
            }
        }
    }

    // 3. Calculate Bet Amounts
    const currentPhaseData = progression[state.currentPhase];
    
    // Scale the units based on table limits
    let splitAmount = currentPhaseData.split * config.betLimits.min;
    let colAmount = currentPhaseData.col * config.betLimits.minOutside;

    // 4. Clamp to Table Limits
    // Ensure bets meet the minimums
    splitAmount = Math.max(splitAmount, config.betLimits.min);
    colAmount = Math.max(colAmount, config.betLimits.minOutside);

    // Ensure bets do not exceed the absolute maximum
    splitAmount = Math.min(splitAmount, config.betLimits.max);
    colAmount = Math.min(colAmount, config.betLimits.max);

    // 5. Return the finalized bet placements
    return [
        { type: 'column', value: 2, amount: colAmount },
        { type: 'split', value: [0, 2], amount: splitAmount }
    ];
}