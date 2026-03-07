/**
 * SOURCE: Inspired by https://www.youtube.com/watch?v=CVRpzHPXYLE (John's Crazy 8)
 * MODIFICATION: Win-After-Loss Progression & Dynamic Repositioning.
 * 
 * THE LOGIC:
 * 1. INITIALIZATION: Waits for 37 spins to gather frequency data.
 * 2. ROW & DOZEN ANALYSIS: 
 *    - Analyzes the last 37 spins to find the hottest Row (Top vs Bottom).
 *    - Places 6 corners covering that hottest row.
 *    - Analyzes the opposite row to find its hottest Dozen, placing the last 2 corners there.
 * 3. REPOSITIONING TRIGGER: This 37-spin analysis is re-run AFTER EVERY WIN to immediately 
 *    adapt to shifting hot zones. Bets are kept in place after a loss.
 * 
 * THE PROGRESSION:
 * 1. Start with base unit on all 8 corners.
 * 2. IF WIN AND SESSION PROFIT (New High): 
 *    - Reset bet size back to base unit.
 * 3. IF WIN AND NO SESSION PROFIT:
 *    - Did we win AFTER A LOSS? -> Increase bet size by 1 unit.
 *    - Did we win AFTER A WIN? -> Maintain the current bet size.
 * 4. IF LOSS: 
 *    - Maintain the current bet amount.
 *    - Do NOT reposition bets.
 * 
 * THE GOAL:
 * Track the hottest table sectors dynamically upon every win, while strictly protecting
 * the bankroll by only pressing bets when recovering from a loss, and resetting 
 * upon reaching a session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.highestBankroll === undefined) {
        state.highestBankroll = bankroll;
        state.currentLevel = 1;
        state.lastBankroll = bankroll;
        state.activeCorners = [];
        state.needsUpdate = true; 
        state.lastSpinWasLoss = false; // Track if the preceding spin was a loss
    }

    // 2. Data Collection Phase (Need 37 spins to start)
    if (spinHistory.length < 37) {
        return null; 
    }

    const baseUnit = config.betLimits.min;

    // 3. Handle Progression and Update Triggers
    if (spinHistory.length > 0) {
        const currentSpinWon = bankroll > state.lastBankroll;
        const currentSpinLost = bankroll < state.lastBankroll;

        if (currentSpinWon) {
            if (bankroll > state.highestBankroll) {
                // SESSION PROFIT HIT: Reset bet amount, update high, force reposition
                state.highestBankroll = bankroll;
                state.currentLevel = 1;
                state.needsUpdate = true;
            } else {
                // WIN BUT NO SESSION PROFIT
                if (state.lastSpinWasLoss) {
                    // Won AFTER a loss -> Increase bet
                    let increment = config.incrementMode === 'base' ? 1 : (config.minIncrementalBet || 1);
                    state.currentLevel += increment;
                }
                // If we won after a win, currentLevel remains the same.
                
                // Always reposition on any win
                state.needsUpdate = true;
            }
            // Reset the loss tracker since we just won
            state.lastSpinWasLoss = false; 

        } else if (currentSpinLost) {
            // LOSS
            state.lastSpinWasLoss = true;
            // currentLevel remains the same (do not increase on a loss)
            // needsUpdate remains false (do not reposition bets)
        }
    }

    state.lastBankroll = bankroll;

    // 4. Calculate Hot Row & Hot Dozen (Triggered initially, and after EVERY win)
    if (state.needsUpdate || state.activeCorners.length === 0) {
        const last37 = spinHistory.slice(-37);
        
        let topRowHits = 0;
        let bottomRowHits = 0;
        
        let topDozenHits = { 1: 0, 2: 0, 3: 0 };
        let bottomDozenHits = { 1: 0, 2: 0, 3: 0 };

        // Analyze the last 37 spins
        last37.forEach(spin => {
            const num = spin.winningNumber;
            if (num === 0) return; 

            let dozen = Math.ceil(num / 12);

            // Top Row (3, 6, 9...)
            if (num % 3 === 0) {
                topRowHits++;
                topDozenHits[dozen]++;
            } 
            // Bottom Row (1, 4, 7...)
            else if (num % 3 === 1) {
                bottomRowHits++;
                bottomDozenHits[dozen]++;
            }
        });

        const isTopHotter = topRowHits >= bottomRowHits;

        const topRowCorners = [2, 8, 14, 20, 26, 32]; 
        const bottomRowCorners = [1, 7, 13, 19, 25, 31];

        let selectedCorners = [];

        if (isTopHotter) {
            // Hot Row: Top
            selectedCorners = [...topRowCorners];
            
            // Hot Dozen: Look at opposite (Bottom) row
            let hottestDozen = 1;
            if (bottomDozenHits[2] > bottomDozenHits[1]) hottestDozen = 2;
            if (bottomDozenHits[3] > bottomDozenHits[hottestDozen]) hottestDozen = 3;

            if (hottestDozen === 1) selectedCorners.push(1, 7);
            if (hottestDozen === 2) selectedCorners.push(13, 19);
            if (hottestDozen === 3) selectedCorners.push(25, 31);
            
        } else {
            // Hot Row: Bottom
            selectedCorners = [...bottomRowCorners];
            
            // Hot Dozen: Look at opposite (Top) row
            let hottestDozen = 1;
            if (topDozenHits[2] > topDozenHits[1]) hottestDozen = 2;
            if (topDozenHits[3] > topDozenHits[hottestDozen]) hottestDozen = 3;

            if (hottestDozen === 1) selectedCorners.push(2, 8);
            if (hottestDozen === 2) selectedCorners.push(14, 20);
            if (hottestDozen === 3) selectedCorners.push(26, 32);
        }

        state.activeCorners = selectedCorners;
        state.needsUpdate = false; 
    }

    // 5. Define Bet Amount (Clamped to limits)
    let amountPerCorner = baseUnit * state.currentLevel;
    amountPerCorner = Math.max(amountPerCorner, config.betLimits.min);
    amountPerCorner = Math.min(amountPerCorner, config.betLimits.max);

    // 6. Return the 8 Corner Bets
    return state.activeCorners.map(cornerValue => {
        return {
            type: 'corner',
            value: cornerValue,
            amount: amountPerCorner
        };
    });
}