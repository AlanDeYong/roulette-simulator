/**
 * Strategy: The "Expander" System (8-Level Progression)
 * Source: Bet With Mo - https://www.youtube.com/watch?v=xCfGWXse1vo
 *
 * THE LOGIC:
 * This is a "Cover and Expand" strategy that focuses on the central area of the board 
 * (Numbers 13 through 24). It operates on a principle of increasing coverage ("Expanding") 
 * after a loss, combined with a negative progression (increasing bet size) to recover.
 *
 * 1. THE BETTING SHAPE (The "Expander"):
 * - Phase 1 (Base): Focus on the "Core" Splits. 
 * - Split 17/18
 * - Split 20/21
 * - Phase 2 (Expanded): Triggered after a loss. Adds "Side" protection.
 * - Adds Street 13-15
 * - Adds Street 22-24
 * (This effectively creates a massive block covering 13 through 24, minus 16/19).
 *
 * 2. THE PROGRESSION (8 Levels):
 * - The strategy uses a "Unit" system. 
 * - On Loss: Increase the Unit size by +1 (Level Up).
 * - On Win:
 * - If the "Micro-Goal" (Profit Target) is reached: Reset to Level 1.
 * - If Win but Goal not reached: Maintain current level or repeat bet.
 * - Max Level: 8. If Level 8 loses, the strategy typically resets to avoid catastrophic ruin, 
 * or stops (in this code, we resets to Level 1).
 *
 * 3. THE GOAL:
 * - The strategy sets "Micro-Goals" of +20 units (or similar small chunks).
 * - Once the current bankroll exceeds the (Session Start + 20 * N), it resets the progression.
 *
 * NOTE on Implementation:
 * The video demonstrates splitting 17/18 and 20/21. The "Streets below" are interpreted 
 * logically as the flanking streets (13-15 and 22-24) to widen the net as per the "Expander" name.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & CONSTANTS ---
    const MICRO_GOAL_INCREMENT = 20; // Target profit per cycle (in dollars/units)
    const MAX_LEVEL = 8;             // Maximum progression steps before forced reset
    const BASE_CHIP = config.betLimits.min; // Usually $1 or $2

    // --- 2. INITIALIZE STATE ---
    if (!state.initialized) {
        state.currentLevel = 1;          // Start at Level 1 (1 Unit)
        state.isExpanded = false;        // Start with tight core bets only
        state.sessionStartBankroll = bankroll;
        state.targetBankroll = bankroll + MICRO_GOAL_INCREMENT;
        state.currentSequenceProfit = 0; // Track profit for current betting sequence
        state.lastBankroll = bankroll;
        state.initialized = true;
    }

    // --- 3. ANALYZE PREVIOUS SPIN (If not first spin) ---
    if (spinHistory.length > 0) {
        const lastWinAmount = bankroll - state.lastBankroll;
        const wonLastSpin = lastWinAmount > 0;

        // A. CHECK PROFIT GOAL (Reset Trigger)
        if (bankroll >= state.targetBankroll) {
            // SUCCESS: We hit the micro-goal. Reset everything.
            state.currentLevel = 1;
            state.isExpanded = false;
            state.targetBankroll = bankroll + MICRO_GOAL_INCREMENT;
            // console.log(`[Expander] Goal Hit! New Target: ${state.targetBankroll}`);
        } 
        // B. HANDLE LOSS (Progression Trigger)
        else if (!wonLastSpin) {
            // If we weren't expanded yet, expand first before raising units
            if (!state.isExpanded) {
                state.isExpanded = true;
                // Keep level same, just expand coverage
            } else {
                // We are already expanded, so we must raise the bet level
                if (state.currentLevel < MAX_LEVEL) {
                    state.currentLevel++;
                } else {
                    // Safety Stop: Hit Max Level (8), reset to avoid blowing bankroll
                    state.currentLevel = 1;
                    state.isExpanded = false; // Reset shape too
                }
            }
        } 
        // C. HANDLE WIN (But Goal Not Met)
        else {
            // Usually we repeat the bet or step down. 
            // In the video, he says "Rebet" until goal is hit.
            // We stay at current settings.
        }
    }

    // Update last bankroll for next spin comparison
    state.lastBankroll = bankroll;

    // --- 4. CALCULATE BET SIZES ---
    // Ensure we respect table limits
    let unitSize = BASE_CHIP * state.currentLevel;
    
    // Clamp to Max Limit
    unitSize = Math.min(unitSize, config.betLimits.max);
    // Ensure at least Min Limit (for Inside bets)
    unitSize = Math.max(unitSize, config.betLimits.min);

    // --- 5. CONSTRUCT BETS ---
    const bets = [];

    // CORE BETS (Always Active)
    // Split 17/18 and Split 20/21
    bets.push({ type: 'split', value: [17, 18], amount: unitSize });
    bets.push({ type: 'split', value: [20, 21], amount: unitSize });

    // EXPANDED BETS (Active if state.isExpanded is true)
    // "Two streets right below" - Interpreted as Flanking Streets 13-15 and 22-24
    // to create a larger zone of coverage around the core.
    if (state.isExpanded) {
        bets.push({ type: 'street', value: 13, amount: unitSize }); // Covers 13, 14, 15
        bets.push({ type: 'street', value: 22, amount: unitSize }); // Covers 22, 23, 24
    }

    // --- 6. RETURN BETS ---
    return bets;
}