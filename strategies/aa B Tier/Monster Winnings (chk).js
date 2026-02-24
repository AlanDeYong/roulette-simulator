/**
 * Source: Modified based on user instructions adapting "ROULETTE JACKPOT" mechanics.
 * * The Logic: 
 * - Observation Phase: Waits for 37 spins initially.
 * - Rolling Analysis: BEFORE EVERY SPIN, analyzes the *last 37 spins* to find "hot" numbers.
 * - Targeting: Ranks the 3 Dozens by hot number frequency. 
 * - Bet Placement: Bets 3 units on the top 2 hottest Dozens. Finds the specific corner 
 * within the 3rd (coldest) Dozen containing the most hot numbers and bets 1 unit on it.
 * * The Progression: "Laddering" (Negative Progression). 
 * - Evaluates bankroll to determine win/loss.
 * - On a LOSS: Increments the base unit multiplier to recoup funds.
 * - On a WIN (Reset): Resets the base unit multiplier to 1.
 * * The Goal: Hit-and-run target profit (e.g., $200), stopping if the target is met 
 * or if the bankroll cannot support the minimum 7-unit spread.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.progression = 1; 
        state.lastBankroll = bankroll;
        state.targetProfit = 2000;
        state.placedBetLastSpin = false;
        
        // Map corners strictly contained within each dozen (by top-left number)
        state.dozenCorners = {
            1: [1, 2, 4, 5, 7, 8],
            2: [13, 14, 16, 17, 19, 20],
            3: [25, 26, 28, 29, 31, 32]
        };
    }

    // 2. Goal & Minimum Bankroll Checks
    if (bankroll >= state.initialBankroll + state.targetProfit) return []; 
    if (bankroll < (config.betLimits.min * 7)) return []; // Need at least 7 base units

    // 3. Initial Observation Period
    if (spinHistory.length < 37) {
        state.lastBankroll = bankroll;
        state.placedBetLastSpin = false;
        return []; 
    }

    // 4. Process Progression Logic (Check Win/Loss from previous spin)
    if (state.placedBetLastSpin) {
        if (bankroll < state.lastBankroll) {
            // Net Loss: Ladder up
            let increment = config.incrementMode === 'base' ? 1 : (config.minIncrementalBet || 1);
            state.progression += increment;
        } else if (bankroll > state.lastBankroll) {
            // Net Win (Reset): Reset multiplier
            state.progression = 1;
        }
    }
    state.lastBankroll = bankroll;

    // ========================================================================
    // 5. DYNAMIC PRE-SPIN ANALYSIS (Executes before every spin)
    // ========================================================================
    
    // Grab exactly the last 37 spins
    const recentSpins = spinHistory.slice(-37);
    const frequencies = {};
    for (let i = 0; i <= 36; i++) frequencies[i] = 0; 
    
    // Tally hot numbers
    recentSpins.forEach(spin => {
        if (spin.winningNumber !== undefined && frequencies[spin.winningNumber] !== undefined) {
            frequencies[spin.winningNumber]++;
        }
    });

    // Evaluate Dozens
    const dozenStats = [
        { dozenId: 1, hits: 0 },
        { dozenId: 2, hits: 0 },
        { dozenId: 3, hits: 0 }
    ];

    for (let i = 1; i <= 36; i++) {
        if (i <= 12) dozenStats[0].hits += frequencies[i];
        else if (i <= 24) dozenStats[1].hits += frequencies[i];
        else dozenStats[2].hits += frequencies[i];
    }

    // Sort to find the hottest dozens
    dozenStats.sort((a, b) => b.hits - a.hits);
    const hotDozen1 = dozenStats[0].dozenId;
    const hotDozen2 = dozenStats[1].dozenId;
    const coldDozen = dozenStats[2].dozenId;

    // Evaluate Corners inside the Cold Dozen
    const candidateCorners = state.dozenCorners[coldDozen];
    let bestCorner = candidateCorners[0];
    let maxCornerHits = -1;

    for (let cornerStart of candidateCorners) {
        let cornerHits = 
            frequencies[cornerStart] + 
            frequencies[cornerStart + 1] + 
            frequencies[cornerStart + 3] + 
            frequencies[cornerStart + 4];
            
        if (cornerHits > maxCornerHits) {
            maxCornerHits = cornerHits;
            bestCorner = cornerStart;
        }
    }

    // ========================================================================
    // 6. Construct Bets and Clamp Limits
    // ========================================================================
    
    let bets = [];
    const baseUnit = config.betLimits.min; 

    // Calculate amounts (3 units for dozens, 1 unit for corner) * progression
    let dozenAmount = baseUnit * state.progression * 3;
    let cornerAmount = baseUnit * state.progression * 1;

    // Clamp amounts strictly to table limits
    dozenAmount = Math.max(dozenAmount, config.betLimits.minOutside);
    dozenAmount = Math.min(dozenAmount, config.betLimits.max);
    
    cornerAmount = Math.max(cornerAmount, config.betLimits.min);
    cornerAmount = Math.min(cornerAmount, config.betLimits.max);

    // Push the finalized bets for this spin
    bets.push({ type: 'dozen', value: hotDozen1, amount: dozenAmount });
    bets.push({ type: 'dozen', value: hotDozen2, amount: dozenAmount });
    bets.push({ type: 'corner', value: bestCorner, amount: cornerAmount });

    state.placedBetLastSpin = true;
    return bets;
}