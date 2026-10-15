/*
 * ROULETTE STRATEGY: Corner Splits
 * Source: https://www.youtube.com/watch?v=_d52w3QXAx0 (Bet With Mo)
 * * The Logic: 
 * - Bets are placed on 6 specific corners (designated by their top-left number: 1, 8, 13, 20, 25, 32).
 * - Bets are placed on 6 specific vertical splits ([2,5], [8,11], [14,17], [20,23], [26,29], [32,35]).
 * - Total of 12 internal bet positions.
 * - A "max win" occurs when a split hits, producing an overall positive net profit for the spin.
 * - Hitting a corner pays 8:1, resulting in a net negative return for the spin. This is treated as a "partial loss".
 * * The Progression:
 * - Employs a delayed 2-step Martingale sequence based on levels.
 * - Multiplier Sequence: Level 1 (1x), L2 (1x), L3 (2x), L4 (2x), L5 (4x), L6 (4x), L7 (8x)...
 * - On a total loss or partial loss (net profit <= 0), move UP 1 level.
 * - On a max win (net profit > 0), move DOWN 1 level (minimum level is 1).
 * * The Goal:
 * - Generate a consistent small profit per cycle by aggressively covering specific clusters. 
 * There is no explicit stop-loss coded; the strategy continues until bankroll depletion or manual intervention.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit, ensuring it meets the absolute minimum
    const baseUnit = Math.max(config.betLimits.min, 1);

    // 2. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.lastBankroll = bankroll;
    }

    // 3. Evaluate Previous Spin Win/Loss State
    if (spinHistory.length > 0) {
        // Calculate net change since last bet placement
        const profit = bankroll - state.lastBankroll;
        
        // "Win is max" translates to an overall positive return for the spin (Split hit)
        if (profit > 0) {
            state.level = Math.max(1, state.level - 1); // Go down 1 level
        } else {
            state.level += 1; // Partial loss (Corner hit) or total loss moves up 1 level
        }
    }

    // Update bankroll snapshot for the next spin's evaluation
    state.lastBankroll = bankroll;

    // 4. Calculate Bet Amount based on Progression Level
    // Formula generates sequence: 1, 1, 2, 2, 4, 4, 8, 8...
    const multiplier = Math.pow(2, Math.floor((state.level - 1) / 2));
    let amount = baseUnit * multiplier;

    // 5. Clamp to Limits
    amount = Math.max(amount, config.betLimits.min); 
    amount = Math.min(amount, config.betLimits.max);

    // 6. Define Bet Placements
    const corners = [1, 8, 13, 20, 25, 32];
    const splits = [[2, 5], [8, 11], [14, 17], [20, 23], [26, 29], [32, 35]];
    
    let currentBets = [];

    // Push Corner Bets
    for (let i = 0; i < corners.length; i++) {
        currentBets.push({ type: 'corner', value: corners[i], amount: amount });
    }

    // Push Split Bets
    for (let i = 0; i < splits.length; i++) {
        currentBets.push({ type: 'split', value: splits[i], amount: amount });
    }

    // 7. Return Bets
    return currentBets;
}