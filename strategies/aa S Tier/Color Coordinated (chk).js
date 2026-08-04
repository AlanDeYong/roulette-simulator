/**
 * Color Coordinated Roulette Strategy
 * 
 * Source: Gamblers University (https://youtu.be/cY5x7lVm82U)
 * 
 * The Full Logic in details: 
 * This strategy places 10 bets on the board: 9 split bets on vertically adjacent numbers 
 * that share the same color, plus 1 straight-up bet on the number 0.
 * The bet positions are: 
 * - Splits: 8/11 (Black), 9/12 (Red), 10/13 (Black), 16/19 (Red), 17/20 (Black), 
 *   18/21 (Red), 26/29 (Black), 27/30 (Red), 28/31 (Black).
 * - Straight-up: 0 (Green).
 * 
 * The Full Bet Progression in details:
 * 1. The strategy uses a level-based progression system. Each level represents the number of base units placed on each bet.
 * 2. Start at Level 1 (1 unit on each of the 10 positions).
 * 3. Track the highest session bankroll achieved.
 * 4. On a Loss: Increase the bet level by 1.
 * 5. On a Win: Check the current bankroll against the highest session bankroll.
 *    - If the current bankroll is a new session high, reset back to Level 1.
 *    - If the current bankroll is NOT a new session high, keep the bet level exactly the same (rebet) until the high is reached.
 * 
 * The Goal: $100 profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit based on increment mode or minimum bet
    const unit = config.incrementMode === 'base' ? config.betLimits.min : config.minIncrementalBet;
    
    // 2. Initialize State
    if (state.progression === undefined) {
        state.progression = 1;
        state.sessionHigh = bankroll;
    }

    // 3. Process the last spin outcome to adjust progression
    if (spinHistory.length > 0) {
        // Did we win or lose? Calculate net profit from the last spin by comparing bankrolls
        if (state.bankrollBeforeBet !== undefined) {
             if (bankroll > state.bankrollBeforeBet) {
                 // It was a win
                 if (bankroll >= state.sessionHigh) {
                     // Reached a new high, reset progression
                     state.progression = 1;
                 } else {
                     // Win, but not a new high, maintain progression level (rebet)
                 }
             } else {
                 // It was a loss, move up one level
                 state.progression += 1;
             }
        }
    }

    // Update session high
    if (bankroll > state.sessionHigh) {
        state.sessionHigh = bankroll;
    }

    // Record bankroll before bets are deducted for the next spin's calculation
    state.bankrollBeforeBet = bankroll;

    // 4. Calculate Bet Amount per position
    let amount = unit * state.progression;

    // CLAMP TO LIMITS
    amount = Math.max(amount, config.betLimits.min); 
    amount = Math.min(amount, config.betLimits.max);

    // 5. Define Bet Positions
    const bets = [];
    
    // Add the straight-up bet on 0
    bets.push({ type: 'number', value: 0, amount: amount });
    
    // Add the 9 main grid splits
    bets.push({ type: 'split', value: [8, 11], amount: amount });
    bets.push({ type: 'split', value: [9, 12], amount: amount });
    bets.push({ type: 'split', value: [10, 13], amount: amount });
    bets.push({ type: 'split', value: [16, 19], amount: amount });
    bets.push({ type: 'split', value: [17, 20], amount: amount });
    bets.push({ type: 'split', value: [18, 21], amount: amount });
    bets.push({ type: 'split', value: [26, 29], amount: amount });
    bets.push({ type: 'split', value: [27, 30], amount: amount });
    bets.push({ type: 'split', value: [28, 31], amount: amount });

    return bets;
}