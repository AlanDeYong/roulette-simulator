/**
 * Power Up Roulette Strategy
 * 
 * Source:
 * - URL: https://youtu.be/fp1KOV9zkIY
 * - Channel: TeKKa Tools & Tallk (Strategy by Brent / All On Black)
 * 
 * Full Logic & Details:
 * - Bet Placements: Combines Outside bets on the First Column (Column 1) with Inside Corner bets 
 *   straddling the second and third columns (numbers 2-3, 5-6, 8-9, etc.).
 * - Progressive Coverage ("Power Up"): As losses occur, the strategy progressively expands coverage 
 *   by adding more corner positions and increases bet sizes across all active positions.
 * 
 * Progression Stages:
 * - Stage 1: Corner(2): 1u | Column 1: 2u (Total: 3u)
 * - Stage 2: Corners(2, 5): 2u each | Column 1: 6u (Total: 10u)
 * - Stage 3: Corners(2, 5, 8): 4u each | Column 1: 16u (Total: 28u)
 * - Stage 4: Corners(2, 5, 8, 11): 8u each | Column 1: 40u (Total: 72u)
 * - Stage 5: Corners(2, 5, 8, 11, 14): 16u each | Column 1: 96u (Total: 176u)
 * - Stage 6: Corners(2, 5, 8, 11, 14, 17): 32u each | Column 1: 224u (Total: 416u)
 * - Stage 7: Corners(2, 5, 8, 11, 14, 17, 20): 64u each | Column 1: 512u (Total: 960u)
 * - Stage 8+: Keep all 7 corners active; double all amounts each stage.
 * 
 * Sub-Level Progression Rules:
 * - Full Loss (0 payout): Move up 2 sub-levels (+1 full stage).
 * - Partial Loss (payout > 0 but spin net < 0): Move up 1 sub-level (2 partial losses = +1 stage).
 * - Spin Win without Session High: Stay at current level.
 * - Session High Win (Bankroll >= Peak Bankroll): Full reset to Stage 1 (Sub-level 1).
 * 
 * Goal:
 * - Capitalize on combined column and corner payouts to continuously hit new session high bankrolls and reset.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.peakBankroll = config.startingBankroll || bankroll;
        state.subLevel = 0; // 0-indexed sub-level (Stage = Math.floor(subLevel / 2))
        state.lastTotalBet = 0;
        state.lastBets = [];
    }

    // Update peak bankroll
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Evaluate Last Spin Result (if history exists)
    if (spinHistory.length > 0 && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;
        
        // Calculate payout from the last placed bets
        let payout = 0;
        for (const b of state.lastBets) {
            if (b.type === 'column' && b.value === 1) {
                // Column 1 covers numbers where num % 3 === 1 (1, 4, 7, ..., 34)
                if (winningNumber > 0 && winningNumber % 3 === 1) {
                    payout += b.amount * 3; // 2 to 1 payout + original bet returned
                }
            } else if (b.type === 'corner') {
                const topLeft = b.value;
                const covered = [topLeft, topLeft + 1, topLeft + 3, topLeft + 4];
                if (covered.includes(winningNumber)) {
                    payout += b.amount * 9; // 8 to 1 payout + original bet returned
                }
            }
        }

        const netProfit = payout - state.lastTotalBet;

        if (bankroll >= state.peakBankroll) {
            // New session high profit achieved -> Full Reset
            state.subLevel = 0;
        } else if (netProfit > 0) {
            // Profitable spin but not yet session high -> Stay at current level
            // state.subLevel remains unchanged
        } else if (payout > 0 && netProfit < 0) {
            // Partial loss -> Advance 1 sub-level
            state.subLevel += 1;
        } else {
            // Full loss (0 payout or no win) -> Advance 2 sub-levels (1 full stage)
            state.subLevel += 2;
        }
    }

    // 3. Determine Progression Stage
    const stage = Math.floor(state.subLevel / 2);

    // 4. Calculate Units per Position according to Stage
    // Base unit sizing respecting limits
    const unitInside = config.betLimits.min;
    const unitOutside = config.betLimits.minOutside;

    const cornerValues = [2, 5, 8, 11, 14, 17, 20];
    let activeCornerCount = 0;
    let cornerUnitMultiplier = 0;
    let columnUnitMultiplier = 0;

    if (stage === 0) {
        activeCornerCount = 1;
        cornerUnitMultiplier = 1;
        columnUnitMultiplier = 2;
    } else if (stage === 1) {
        activeCornerCount = 2;
        cornerUnitMultiplier = 2;
        columnUnitMultiplier = 6;
    } else if (stage === 2) {
        activeCornerCount = 3;
        cornerUnitMultiplier = 4;
        columnUnitMultiplier = 16;
    } else if (stage === 3) {
        activeCornerCount = 4;
        cornerUnitMultiplier = 8;
        columnUnitMultiplier = 40;
    } else if (stage === 4) {
        activeCornerCount = 5;
        cornerUnitMultiplier = 16;
        columnUnitMultiplier = 96;
    } else if (stage === 5) {
        activeCornerCount = 6;
        cornerUnitMultiplier = 32;
        columnUnitMultiplier = 224;
    } else if (stage === 6) {
        activeCornerCount = 7;
        cornerUnitMultiplier = 64;
        columnUnitMultiplier = 512;
    } else {
        // Stage 7 and beyond: All 7 corners active, doubling every subsequent stage
        const extraStages = stage - 6;
        activeCornerCount = 7;
        cornerUnitMultiplier = 64 * Math.pow(2, extraStages);
        columnUnitMultiplier = 512 * Math.pow(2, extraStages);
    }

    // 5. Construct Bets with Limit Clamping
    const bets = [];

    // Column Bet (Outside Bet)
    let columnAmount = columnUnitMultiplier * unitOutside;
    columnAmount = Math.max(columnAmount, config.betLimits.minOutside);
    columnAmount = Math.min(columnAmount, config.betLimits.max);

    bets.push({
        type: 'column',
        value: 1,
        amount: columnAmount
    });

    // Corner Bets (Inside Bets)
    for (let i = 0; i < activeCornerCount; i++) {
        let cornerAmount = cornerUnitMultiplier * unitInside;
        cornerAmount = Math.max(cornerAmount, config.betLimits.min);
        cornerAmount = Math.min(cornerAmount, config.betLimits.max);

        bets.push({
            type: 'corner',
            value: cornerValues[i],
            amount: cornerAmount
        });
    }

    // 6. Check Total Bet Against Bankroll
    let totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);

    // If total bet exceeds current bankroll, scale down or abort
    if (totalBetAmount > bankroll) {
        if (bankroll < config.betLimits.minOutside + config.betLimits.min) {
            state.lastBets = [];
            state.lastTotalBet = 0;
            return [];
        }
        // Scale down proportionally to fit bankroll
        const scale = bankroll / totalBetAmount;
        bets.forEach(b => {
            b.amount = Math.max(
                b.type === 'column' ? config.betLimits.minOutside : config.betLimits.min,
                Math.floor(b.amount * scale)
            );
        });
        totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
        if (totalBetAmount > bankroll) {
            return [];
        }
    }

    // Save current bet state for next spin analysis
    state.lastBets = bets;
    state.lastTotalBet = totalBetAmount;

    return bets;
}