/**
 * MONEY HAMMER - ROULETTE STRATEGY (Updated Progression)
 * Source: https://youtu.be/SVMrmo7ADcM (Bet With Mo)
 * * * The Logic: 
 * Aims for large board coverage by betting on the 2nd Column and adding sets 
 * of 3 vertical splits (e.g., 1/4, 2/5, 3/6) progressively. A "Block" consists 
 * of these 3 splits + an increment to the 2nd Column bet.
 * * * The Progression (Loss Triggered):
 * - Start (Level 1): 3 splits (1u each), Col 2 (2u). Multiplier = 1.
 * - Loss 1: Add next 3 splits (1u each), add 2u to Col 2.
 * - Loss 2: Add next 3 splits (1u each), add 2u to Col 2. THEN double ALL bets. Multiplier becomes 2.
 * - Loss 3: Add next 3 splits (2u each), add 4u to Col 2.
 * - Loss 4: Add next 3 splits (2u each), add 4u to Col 2. THEN double ALL bets. Multiplier becomes 4.
 * - This alternating add/double pattern continues for subsequent losses.
 * - On Win: Rebet current amounts until the profit goal is reached, then reset.
 * * * The Goal: 
 * Incremental $20 profit targets (scaled to minimum limits). Resets to Level 1 upon reaching the target.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // Helper function to aggregate bets
    function addBet(st, type, value, amount) {
        const key = type + '_' + (Array.isArray(value) ? value.join('_') : value);
        if (!st.betMap[key]) {
            st.betMap[key] = { type: type, value: value, amount: 0 };
        }
        st.betMap[key].amount += amount;
    }

    // Helper to add a block of splits and increment the column
    function addBlock(st, lossCount, currentMultiplier) {
        // Cycle through the 6 blocks of numbers (0-5)
        const blockIndex = lossCount % 6; 
        const startNum = blockIndex * 6 + 1;
        const u = st.baseUnit * currentMultiplier;
        
        // Add 3 vertical splits for the current block
        addBet(st, 'split', [startNum, startNum + 3], u);
        addBet(st, 'split', [startNum + 1, startNum + 4], u);
        addBet(st, 'split', [startNum + 2, startNum + 5], u);
        
        // Increment the 2nd column
        addBet(st, 'column', 2, u * 2);
    }

    function resetLevel(st) {
        st.level = 1;
        st.multiplier = 1;
        st.betMap = {};
        addBlock(st, 0, st.multiplier); // 0 losses = initial block
    }

    // 1. Initialization
    if (!state.initialized || spinHistory.length === 0) {
        state.initialized = true;
        const minInside = config.betLimits.min || 1;
        const minOutside = config.betLimits.minOutside || 5;
        
        // Ensure 1u (splits) and 2u (column) respect table minimums
        state.baseUnit = Math.max(minInside, Math.ceil(minOutside / 2));
        
        // Target 20 units of profit per cycle
        state.profitTarget = bankroll + (20 * state.baseUnit);
        
        resetLevel(state);
    } else {
        // 2. Determine previous spin outcome
        const lastTotalBet = state.lastTotalBet || 0;
        const payout = bankroll - state.lastBankroll + lastTotalBet;
        
        if (payout > 0) {
            // Hit (Partial or Full Win)
            if (bankroll >= state.profitTarget) {
                // Profit goal reached -> Reset
                state.profitTarget = bankroll + (20 * state.baseUnit);
                resetLevel(state);
            }
            // If goal not reached -> Rebet (state.betMap remains unchanged)
        } else {
            // Miss (Loss) -> Advance Progression
            state.level += 1;
            const lossCount = state.level - 1; 
            
            // Step A: Add the next block using the CURRENT multiplier
            addBlock(state, lossCount, state.multiplier);
            
            // Step B: Double up logic on even losses (Loss 2, 4, 6...)
            if (lossCount % 2 === 0) {
                for (const key in state.betMap) {
                    state.betMap[key].amount *= 2;
                }
                // Update multiplier for future blocks
                state.multiplier *= 2;
            }
        }
    }
    
    // 3. Construct Bet Array & Clamp to Limits
    const bets = [];
    let currentTotalBet = 0;
    
    for (const key in state.betMap) {
        let b = state.betMap[key];
        let amount = b.amount;
        
        if (b.type === 'column') {
            amount = Math.max(amount, config.betLimits.minOutside);
        } else {
            amount = Math.max(amount, config.betLimits.min);
        }
        
        amount = Math.min(amount, config.betLimits.max);
        
        bets.push({ type: b.type, value: b.value, amount: amount });
        currentTotalBet += amount;
    }
    
    // 4. Update State
    state.lastTotalBet = currentTotalBet;
    state.lastBankroll = bankroll;
    
    return bets.length > 0 ? bets : null;
}