/**
 * ROULETTE STRATEGY: TILT TACTIC (Bet With Mo)
 * * Source: https://www.youtube.com/watch?v=rWR4ryakeyA
 * Channel: Bet With Mo
 * * THE LOGIC:
 * This strategy focuses on dominating a specific sector (Low/High) using a combination of 
 * Outside bets (Dozen) and Inside bets (Double Streets/Lines and Splits) to cover numbers heavily.
 * It alternates sides (Low vs High) upon clearing a profit target.
 * * THE BETS (Symmetric):
 * Side A (Low Focus):
 * - 1st Dozen (Covers 1-12)
 * - Double Street (Line) 1-6 (Heavily weights the very low end)
 * - Splits: 5/8, 8/9 (Targeting the middle of the low sector)
 * * Side B (High Focus):
 * - 3rd Dozen (Covers 25-36)
 * - Double Street (Line) 31-36
 * - Splits: 29/30, 29/32
 * * THE PROGRESSION (The "Tilt"):
 * The strategy uses a 7-Level progression split into two phases:
 * Phase 1 (Levels 1-3): Gradual increase to recover small losses.
 * Phase 2 (Levels 4-7): The "Tilt" Phase. 
 * - Level 4 is a significant jump in stake (approx 3-4x Level 3).
 * - Levels 5-7 are direct "Double Ups" of the previous level.
 * * RESET & DROP RULES:
 * 1. Target Profit: The goal is to make small increments (e.g., +$20). If the session bankroll 
 * exceeds the `targetBankroll`, the system resets to Level 1 and flips sides.
 * 2. Deep Recovery: If a win occurs deep in the progression (Level 5+), the strategy 
 * drops back to Level 4 (the "Base High" level) rather than resetting completely, 
 * to ensure safety while still chasing the target.
 * 3. Loss: Progression increases by 1 level.
 * * NOTE on LIMITS:
 * This strategy ramps up quickly (Exponentially from Level 4). 
 * Bet amounts are clamped to `config.betLimits.max`.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MIN_CHIP = config.betLimits.min; // Base unit for splits
    const OUTSIDE_CHIP = Math.max(config.betLimits.minOutside, MIN_CHIP); // Base unit for Dozen
    
    // Multipliers roughly approximating the video's monetary jumps ($5 -> $15 -> $52 -> $100+)
    // Level 1: 1x, Level 2: 2x, Level 3: 3x (Phase 1)
    // Level 4: 10x, Level 5: 20x, Level 6: 40x, Level 7: 80x (Phase 2 - The Tilt)
    const TILT_MULTIPLIERS = [1, 2, 3, 10, 20, 40, 80]; 
    const PROFIT_TARGET_INCREMENT = 20; // Strategy aims for $20 steps

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 0; // 0-indexed, corresponds to TILT_MULTIPLIERS[0]
        state.side = 'low'; // 'low' (1-12 focus) or 'high' (25-36 focus)
        state.sessionStartBankroll = bankroll;
        state.targetBankroll = bankroll + PROFIT_TARGET_INCREMENT;
        state.initialized = true;
        // console.log(`[Tilt Tactic] Init. Target: ${state.targetBankroll}`);
    }

    // --- 3. PROCESS LAST SPIN (Progression Logic) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastWinAmount = lastSpin.totalPayout || 0;
        const lastBetAmount = state.lastTotalBet || 0;
        const isWin = lastWinAmount > 0;
        const netChange = lastWinAmount - lastBetAmount;

        // A. CHECK PROFIT TARGET
        // If we hit our target bankroll, we take the profit, Reset Level, and Flip Sides.
        if (bankroll >= state.targetBankroll) {
            // console.log(`[Tilt Tactic] Target Hit! Bankroll: ${bankroll}. Resetting.`);
            state.level = 0;
            state.side = (state.side === 'low') ? 'high' : 'low'; // Flip side
            state.targetBankroll = bankroll + PROFIT_TARGET_INCREMENT; // Set new target
        } 
        // B. HANDLING WINS (Standard)
        else if (netChange > 0) {
            // Logic from video: If deep in progression (Level 4+ aka index 3+), drop to Level 4.
            // "When you double up always go back down to the first number right before you start doubling up (Level 4)"
            if (state.level > 3) {
                state.level = 3; // Index 3 is Level 4
            } else {
                // If in early levels (1-3) and we win but didn't hit target, 
                // we technically "reset" the mini-progression or stay. 
                // The video implies resetting to Lvl 1 on good wins, or rebeting on small safety wins.
                // For safety in automation: we reset to 0 if profit was significant, otherwise repeat.
                // Heuristic: If net win covers previous loss, reset. Else repeat.
                // Simple implementation: Reset to 0 on any net profit win in Phase 1.
                state.level = 0;
            }
        } 
        // C. HANDLING LOSSES
        else {
            // Increase level
            state.level++;
            // Cap level at max defined
            if (state.level >= TILT_MULTIPLIERS.length) {
                state.level = TILT_MULTIPLIERS.length - 1; // Cap at max level
                // Optional: Stop loss could trigger here, but we just grind at max level per video style
            }
        }
    }

    // --- 4. CONSTRUCT BETS ---
    const multiplier = TILT_MULTIPLIERS[state.level];
    const bets = [];

    // Helper to add bets safely complying with limits
    function addBet(type, value, baseAmount) {
        let amount = baseAmount * multiplier;
        
        // Dynamic Limit Enforcement
        let limit = config.betLimits.max;
        let min = (type === 'dozen') ? config.betLimits.minOutside : config.betLimits.min;

        // Clamp
        amount = Math.max(amount, min);
        amount = Math.min(amount, limit);

        bets.push({ type, value, amount });
    }

    if (state.side === 'low') {
        // --- SIDE A (Low Focus) ---
        // 1. First Dozen (Outside Bet)
        addBet('dozen', 1, OUTSIDE_CHIP);
        
        // 2. First Double Street (Line 1-6)
        // Video uses $3 base for lines vs $1 for splits, roughly 3x ratio
        addBet('line', 1, MIN_CHIP * 3);

        // 3. Splits (5/8, 8/9)
        addBet('split', [5, 8], MIN_CHIP);
        addBet('split', [8, 9], MIN_CHIP);

    } else {
        // --- SIDE B (High Focus) ---
        // 1. Third Dozen (Outside Bet)
        addBet('dozen', 3, OUTSIDE_CHIP);

        // 2. Last Double Street (Line 31-36)
        addBet('line', 31, MIN_CHIP * 3);

        // 3. Splits (29/30, 29/32)
        // Symmetric to the low side structure
        addBet('split', [29, 30], MIN_CHIP);
        addBet('split', [29, 32], MIN_CHIP);
    }

    // Track total bet for net calculation next spin
    state.lastTotalBet = bets.reduce((sum, b) => sum + b.amount, 0);

    return bets;
}