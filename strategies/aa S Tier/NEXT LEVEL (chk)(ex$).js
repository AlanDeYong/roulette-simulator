/**
 * NEXT LEVEL ROULETTE STRATEGY
 * * Source: https://youtu.be/ZKburwZ2dW4 (Bet With Mo)
 * * The Full Logic in details:
 * This strategy uses a 9-level progression covering up to 12 inside bet spots (straight ups and splits).
 * It targets specific sections of the board, progressively expanding coverage and increasing 
 * bet sizes on losses to recover and profit.
 * * The Full Bet Progression in details:
 * Total units progression: 2 - 4 - 12 - 16 - 40 - 48 - 96 - 192 - 384
 * - Level 1: Straight 3 (1u), Split 2/5 (1u). 
 * - Level 2 (On Loss): Add Straight 8 (1u), Split 7/10 (1u).
 * - Level 3 (On Loss): Add Straight 15 (1u), Split 14/17 (1u), then double up all bets (each spot is now 2u).
 * - Level 4 (On Loss): Add Straight 20 (2u), Split 19/22 (2u).
 * - Level 5 (On Loss): Add Straight 27 (2u), Split 26/29 (2u), then double up all bets (each spot is now 4u).
 * - Level 6 (On Loss): Add Straight 32 (4u), Split 31/34 (4u).
 * - Level 7 (On Loss): Double up all 12 bets (8u each spot).
 * - Level 8 (On Loss): Double up all 12 bets (16u each spot).
 * - Level 9 (On Loss): Double up all 12 bets (32u each spot).
 * * - On Win: 
 * - If the current bankroll hits a new session peak profit, reset the progression to Level 1.
 * - If not at the peak profit, go down exactly 1 level.
 * - On Level 9 Loss: Resets to Level 1 (safety stop-loss).
 * * The Goal:
 * Achieve incremental profits. By benchmarking against a tracked session peak, the strategy aims 
 * to secure profit gradually and step down safely when winning during a recovery phase.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State 
    if (state.peakProfit === undefined) {
        state.peakProfit = bankroll;
        state.level = 1;
    }

    // 2. Evaluate previous spin outcome (Win/Loss and Peak Profit updates)
    if (spinHistory.length > 0) {
        const isWin = bankroll > state.lastBankroll;
        let peakReached = false;
        
        // Check and update peak profit
        if (bankroll >= state.peakProfit) {
            state.peakProfit = bankroll;
            peakReached = true;
        }

        if (isWin) {
            if (peakReached) {
                state.level = 1; // Reset on peak profit
            } else {
                state.level = Math.max(1, state.level - 1); // Go down 1 level
            }
        } else {
            // Loss progression
            state.level++;
            if (state.level > 9) {
                state.level = 1; // Safety reset after max level
            }
        }
    }

    // Track current bankroll for the next spin's win/loss detection
    state.lastBankroll = bankroll;

    // 3. Define the precise betting sequence (12 spots max)
    const spots = [
        { type: 'number', value: 3 },
        { type: 'split', value: [2, 5] },
        { type: 'number', value: 8 },
        { type: 'split', value: [7, 10] },
        { type: 'number', value: 15 },
        { type: 'split', value: [14, 17] },
        { type: 'number', value: 20 },
        { type: 'split', value: [19, 22] },
        { type: 'number', value: 27 },
        { type: 'split', value: [26, 29] },
        { type: 'number', value: 32 },
        { type: 'split', value: [31, 34] }
    ];

    // 4. Define Level configurations (active spots and base multiplier per spot)
    const levelConfigs = {
        1: { count: 2, multiplier: 1 },
        2: { count: 4, multiplier: 1 },
        3: { count: 6, multiplier: 2 },
        4: { count: 8, multiplier: 2 },
        5: { count: 10, multiplier: 4 },
        6: { count: 12, multiplier: 4 },
        7: { count: 12, multiplier: 8 },
        8: { count: 12, multiplier: 16 },
        9: { count: 12, multiplier: 32 }
    };

    const currentConfig = levelConfigs[state.level];
    const unit = config.betLimits.min; 
    const bets = [];
    let totalBetAmount = 0;

    // 5. Generate Bets 
    for (let i = 0; i < currentConfig.count; i++) {
        let amount = unit * currentConfig.multiplier;
        
        // CLAMP TO LIMITS
        amount = Math.max(amount, config.betLimits.min);
        amount = Math.min(amount, config.betLimits.max);

        // Ensure we don't exceed current available bankroll
        if (totalBetAmount + amount > bankroll) {
            break; 
        }

        bets.push({
            type: spots[i].type,
            value: spots[i].value,
            amount: amount
        });
        
        totalBetAmount += amount;
    }

    // Edge case: If we can't afford the full first spot of the progression, but can afford something
    if (bets.length === 0 && bankroll >= config.betLimits.min) {
        bets.push({
            type: spots[0].type,
            value: spots[0].value,
            amount: Math.min(bankroll, config.betLimits.max)
        });
    }

    return bets;
}