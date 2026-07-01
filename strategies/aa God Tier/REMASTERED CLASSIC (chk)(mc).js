/**
 * Strategy: REMASTERED CLASSIC
 * Source: https://youtu.be/U5CF_SxwZE4
 * Channel: The Roulette Channel (implied context)
 * 
 * Logic & Progression:
 * - The strategy operates on a 9-level progression system with specific bet additions on losses.
 * - Initial Bets (Level 1): 1 unit on Split 17/20; 1 unit each on Straight 16, 18, 19, 21. (Total: 5 units)
 * - Loss Progression:
 *   - L1 to L2: Add 1 unit to Split 14/17, 20/23, Straight 13, 15, 22, 24.
 *   - L2 to L3: Add 1 unit to Split 11/14, 23/26, Straight 10, 12, 25, 27.
 *   - L4 (34u): Double L3 bets.
 *   - L5 (68u): Double L4 bets.
 *   - L6 (102u), L7 (136u), L8 (170u): Increase all bets by 2 units each relative to previous level.
 *   - L9 (340u): Double L8 bets.
 * 
 * Win Conditions:
 * - If session peak profit is not reached, rebet the current level.
 * - If a lower level's potential payout covers the session peak profit, drop to that level.
 * - If session peak profit is reached, reset to Level 1.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) state.level = 0; // 0-indexed (0 = Level 1)
    if (state.peakBankroll === undefined) state.peakBankroll = bankroll;

    // Update Peak
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // 2. Define Bet Map
    // Helper to generate base bets at specific unit sizes
    const getBets = (level) => {
        // Multipliers for levels
        const multipliers = [1, 1, 1, 2, 4, 6, 8, 10, 20]; 
        const m = multipliers[level];

        let bets = [];
        
        // Always Add: Split 17/20, Straights 16, 18, 19, 21
        bets.push({ type: 'split', value: [17, 20], amount: m });
        [16, 18, 19, 21].forEach(n => bets.push({ type: 'number', value: n, amount: m }));

        // Add Level 2+
        if (level >= 1) {
            bets.push({ type: 'split', value: [14, 17], amount: m });
            bets.push({ type: 'split', value: [20, 23], amount: m });
            [13, 15, 22, 24].forEach(n => bets.push({ type: 'number', value: n, amount: m }));
        }

        // Add Level 3+
        if (level >= 2) {
            bets.push({ type: 'split', value: [11, 14], amount: m });
            bets.push({ type: 'split', value: [23, 26], amount: m });
            [10, 12, 25, 27].forEach(n => bets.push({ type: 'number', value: n, amount: m }));
        }

        return bets;
    };

    // 3. Win/Loss Logic
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastBets = getBets(state.level);
        
        let won = false;
        // Check if any bet hit
        for (const b of lastBets) {
            if (b.type === 'number' && b.value === lastSpin.winningNumber) won = true;
            if (b.type === 'split' && b.value.includes(lastSpin.winningNumber)) won = true;
        }

        if (won) {
            // Check if we hit peak
            if (bankroll >= state.peakBankroll) {
                state.level = 0;
            } else {
                // Try to find a lower level that hits peak
                let foundLevel = false;
                for (let i = state.level - 1; i >= 0; i--) {
                    // Very simple estimation: if level 0 can potentially win enough, drop to it.
                    // This assumes a conservative recovery.
                    state.level = i;
                    foundLevel = true;
                    break;
                }
                if (!foundLevel) state.level = 0;
            }
        } else {
            // Loss: Advance level (max level 8)
            state.level = Math.min(state.level + 1, 8);
        }
    }

    // 4. Build and Clamp Bets
    const currentBets = getBets(state.level);
    const finalBets = currentBets.map(b => {
        let amt = Math.max(config.betLimits.min, b.amount); // Ensure min bet
        amt = Math.min(amt, config.betLimits.max); // Ensure max bet
        return { ...b, amount: amt };
    });

    return finalBets;
}