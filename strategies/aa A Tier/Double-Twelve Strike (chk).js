/**
 * Roulette Strategy: The Double-Twelve Strike
 * Source: The Lucky Felt (https://youtu.be/pAta62ZXq0c)
 * * The Full Logic in details:
 * This strategy aims for a perfectly balanced 12:1 payout ratio between the 2nd Column and 12 specific inside numbers.
 * The board is divided into two layouts for the 1st and 3rd columns:
 * - "Corners": The outer rows of each dozen (Rows 1, 4, 5, 8, 9, 12). Numbers: 1, 3, 10, 12, 13, 15, 22, 24, 25, 27, 34, 36.
 * - "Middles": The inner rows of each dozen (Rows 2, 3, 6, 7, 10, 11). Numbers: 4, 6, 7, 9, 16, 18, 19, 21, 28, 30, 31, 33.
 * * - Normal Phase: Bet 12 base units on the 2nd Column, and 1 base unit on the 12 "Corner" numbers.
 * If any of these hit, you make exactly 12 base units of profit.
 * - Flow Adjustment: If a "Middle" number hits on the wheel, the system switches the 12 inside bets to the "Middles" 
 * layout. If a "Corner" hits, it switches back to "Corners". If 0 or the 2nd column hits, it maintains the current layout.
 * * The Full Bet Progression in details:
 * - Start with Progression 1 in Normal Phase.
 * - On any loss (a number not covered by the inside layout or the 2nd column), the system enters "Recovery Mode".
 * - In Recovery Mode: The 2nd column bet is REMOVED entirely. You only place the 12 inside number bets.
 * - After a loss, the progression level increases by 1 unit (e.g., from 1 unit per number to 2, then 3, 4, etc.).
 * - If a win occurs in Recovery Mode, but the bankroll has not yet reached a new high, the progression 
 * level remains exactly the same (a flat rebet) to steadily climb back to profit.
 * - Once the bankroll reaches or exceeds the highest recorded bankroll, the system completely resets to Normal Phase 
 * (Progression 1: 1 unit on numbers, 12 units on the 2nd column).
 * * The Goal:
 * A rapid 5-hit sprint to bank 60 units (or scalable to 200 units as demonstrated). The objective is efficient 
 * and uniform profit hits without heavy initial table exposure.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    // Define the specific layout grids
    const corners = [1, 3, 10, 12, 13, 15, 22, 24, 25, 27, 34, 36];
    const middles = [4, 6, 7, 9, 16, 18, 19, 21, 28, 30, 31, 33];
    const col2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];

    // 1. Initialize State Variables on First Run
    if (!state.init) {
        state.highestBankroll = bankroll;
        state.phase = 'normal';
        state.progression = 1;
        state.layoutType = 'corners';
        state.lastLayout = corners;
        state.init = true;
    }

    // 2. Process History to Adjust Progression and Flow
    if (spinHistory.length > 0) {
        let lastSpin = spinHistory[spinHistory.length - 1];
        let wn = lastSpin.winningNumber;
        
        // Determine if the last spin was a win
        let wonLastSpin = false;
        if (state.phase === 'normal') {
            if (col2.includes(wn) || state.lastLayout.includes(wn)) {
                wonLastSpin = true;
            }
        } else {
            // In recovery, column 2 is NOT covered
            if (state.lastLayout.includes(wn)) {
                wonLastSpin = true;
            }
        }

        // Update the highest watermark bankroll
        if (bankroll > state.highestBankroll) {
            state.highestBankroll = bankroll;
        }

        // Determine Phase and Progression adjustments
        if (bankroll >= state.highestBankroll) {
            state.phase = 'normal';
            state.progression = 1;
        } else {
            state.phase = 'recovery';
            if (!wonLastSpin) {
                // Increase progression on a loss. On a win in drawdown, we just rebet.
                state.progression += 1;
            }
        }

        // Adjust Layout to "Follow the Flow"
        if (corners.includes(wn)) {
            state.layoutType = 'corners';
        } else if (middles.includes(wn)) {
            state.layoutType = 'middles';
        }
        
        // Store layout for the next spin's win validation
        state.lastLayout = state.layoutType === 'corners' ? corners : middles;
    }

    // 3. Calculate Base Units and Increments
    // Inside numbers serve as the base 1 unit ratio
    let insideUnit = Math.max(1, minInside);
    let increment = config.incrementMode === 'base' ? insideUnit : (config.minIncrementalBet || 1);
    
    let insideBetAmount = state.phase === 'normal' 
        ? insideUnit 
        : insideUnit + (state.progression - 1) * increment;
        
    // Clamp inside bets to limits
    insideBetAmount = Math.max(insideBetAmount, minInside);
    insideBetAmount = Math.min(insideBetAmount, maxBet);

    // 4. Construct Bets Array
    let bets = [];
    
    // In normal phase, place the 12x Column 2 bet
    if (state.phase === 'normal') {
        let columnUnit = insideUnit * 12; // Maintain strict 12:1 ratio for breakeven/profit
        let colBetAmount = Math.max(columnUnit, minOutside);
        colBetAmount = Math.min(colBetAmount, maxBet);
        
        bets.push({ type: 'column', value: 2, amount: colBetAmount });
    }

    // Place the 12 individual inside straight-up bets based on active layout
    state.lastLayout.forEach(num => {
        bets.push({ type: 'number', value: num, amount: insideBetAmount });
    });

    return bets;
}