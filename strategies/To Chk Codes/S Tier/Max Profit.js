
/**
 * Strategy: Max Profit Roulette (Evan's System)
 * Source: https://www.youtube.com/watch?v=8RC4w29hEfs (Starting around 15:30)
 * Channel: The Roulette Master
 *
 * Logic:
 * This strategy relies on covering specific sectors of the board using a combination of
 * 1 Straight-up, 4 Corners, and 3 Splits to maximize payout potential while maintaining reasonable coverage.
 *
 * Bet Layout (8 Units Total initially):
 * 1. Straight Up: 0
 * 2. Corner: 5, 6, 8, 9 (Top-left 5)
 * 3. Corner: 11, 12, 14, 15 (Top-left 11)
 * 4. Corner: 17, 18, 20, 21 (Top-left 17)
 * 5. Corner: 23, 24, 26, 27 (Top-left 23)
 * 6. Split: 13, 16 (Fills gap between C2 and C3)
 * 7. Split: 22, 25 (Fills gap between C3 and C4)
 * 8. Split: 29, 32 (Covers high numbers)
 *
 * Progression (Arithmetic):
 * - Base unit is determined by config.betLimits.minOutside (usually $5).
 * - On LOSS: Increase the unit size for ALL active bets by the base unit amount (e.g., $5 -> $10 -> $15).
 * It is NOT a Martingale (doubling); it is an arithmetic progression (+1 unit).
 *
 * Mechanics:
 * - On WIN (Corner): Remove the specific Corner bet that won from the rotation for subsequent spins.
 * Maintain the current betting unit level.
 * - On WIN (Split or Zero): These are the "Max Profit" triggers. Reset the entire system:
 * Reset unit size to base.
 * Re-activate all 8 bets.
 * - On WIN (General Session Target): If session profit exceeds a threshold (e.g., +$200), reset.
 *
 * Goal:
 * Survive the variance using the bankroll, hit a Split or Zero for a massive payout, or grind small profits
 * by removing hitting corners.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Define Betting Schema
    const BETS = {
        'zero': { type: 'number', value: 0 },
        'c_5':  { type: 'corner', value: 5,  covers: [5, 6, 8, 9] },
        'c_11': { type: 'corner', value: 11, covers: [11, 12, 14, 15] },
        'c_17': { type: 'corner', value: 17, covers: [17, 18, 20, 21] },
        'c_23': { type: 'corner', value: 23, covers: [23, 24, 26, 27] },
        's_13': { type: 'split',  value: [13, 16], covers: [13, 16] },
        's_22': { type: 'split',  value: [22, 25], covers: [22, 25] },
        's_29': { type: 'split',  value: [29, 32], covers: [29, 32] }
    };

    // 2. Initialize State
    const baseUnit = config.betLimits.minOutside || 5;
    
    if (state.unitSize === undefined) {
        state.unitSize = baseUnit;
        state.activeBets = Object.keys(BETS); // Start with all bets active
        state.initialBankroll = bankroll;
        state.sessionHigh = 0;
    }

    // 3. Process Last Spin (Win/Loss Logic)
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNumber = lastSpin.winningNumber;
        
        // Determine which of our ACTIVE bets hit
        let hitBetKey = null;
        let isWin = false;

        for (const key of state.activeBets) {
            const betDef = BETS[key];
            let covers = [];
            
            if (betDef.type === 'number') covers = [betDef.value];
            else if (betDef.covers) covers = betDef.covers;
            
            if (covers.includes(winningNumber)) {
                hitBetKey = key;
                isWin = true;
                break; 
            }
        }

        // Logic Implementation
        if (isWin) {
            // Check for "Max Profit" triggers (Splits or Zero)
            const isJackpot = hitBetKey.startsWith('s_') || hitBetKey === 'zero';
            
            // Check Session Profit Goal (Simulate "Cash Out" behavior)
            const currentProfit = bankroll - state.initialBankroll;
            const profitTargetMet = currentProfit >= 200; // $200 target as per video

            if (isJackpot || profitTargetMet || state.activeBets.length <= 1) {
                // RESET Condition
                state.unitSize = baseUnit;
                state.activeBets = Object.keys(BETS);
                state.initialBankroll = bankroll; // Reset profit tracking benchmark
            } else {
                // Corner Win Condition: Remove the bet
                state.activeBets = state.activeBets.filter(k => k !== hitBetKey);
                // Maintain current unit size (do not increase, do not reset)
            }
        } else {
            // LOSS Logic: Arithmetic Progression (+1 Base Unit)
            // Video 16:14: "Increase by what we started with"
            state.unitSize += baseUnit;
        }
    }

    // 4. Construct Bets
    const bets = [];
    
    // Safety clamp for unit size against max limits
    // We check against max bet per spot.
    let safeUnit = Math.max(state.unitSize, config.betLimits.min);
    safeUnit = Math.min(safeUnit, config.betLimits.max);

    // If unit size grew too large relative to bankroll, cap it to prevent immediate bust
    if (safeUnit * state.activeBets.length > bankroll) {
        safeUnit = Math.floor(bankroll / state.activeBets.length);
    }
    
    // Stop betting if bankroll is critically low
    if (safeUnit < config.betLimits.min) return [];

    for (const key of state.activeBets) {
        const betDef = BETS[key];
        bets.push({
            type: betDef.type,
            value: betDef.value,
            amount: safeUnit
        });
    }

    return bets;

}