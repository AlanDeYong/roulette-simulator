<<<<<<< HEAD
/**
 * Strategy: Atomic Voisins (Hybrid Voisins + Dozen)
 * * Source: 
 * Video: "Controlled Roulette Betting with Explosive Potential" by Casino Matchmaker
 * URL: https://www.youtube.com/watch?v=dlmJREnF6tM
 * * The Logic:
 * This is a "hybrid" strategy that covers ~65% of the wheel (24 numbers) by combining:
 * 1. A double-strength "Voisins du Zéro" (Neighbors of Zero) bet on the racetrack.
 * 2. A heavy bet on the Middle Dozen (Numbers 13-24).
 * * This creates tiered winning zones:
 * - Small Wins ($6 profit @ base): Non-overlapping numbers in Voisins OR Dozen.
 * - Medium Wins ($18 profit @ base): The 0/2/3 trio.
 * - Big Wins ($42 profit @ base): Overlap numbers (Voisins + Dozen).
 * - Atomic Win ($54 profit @ base): Number 2 (Specific overlap/weighting in this setup).
 * * The Progression:
 * - Base Unit: The video uses a $30 total bet model ($12 on Dozen, $18 on Voisins).
 * - ON LOSS: Increase the betting level by 1 (Arithmetic Progression: 1x -> 2x -> 3x).
 * - ON WIN: 
 * - If Session Profit is reached: Reset to Level 1.
 * - If "Big Win" hit (but no session profit): Decrease level by 1.
 * - If 3 Consecutive "Small Wins": Decrease level by 1.
 * * The Goal:
 * - Reach any session profit (Bankroll > Start Bankroll) and reset immediately.
 * - Survive variance using the "Small Win" de-escalation logic.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. State Initialization ---
    if (state.level === undefined) {
        state.level = 1;                // Current betting level (multiplier)
        state.startBankroll = bankroll; // Snapshot starting bankroll for session profit check
        state.smallWinStreak = 0;       // Track consecutive small wins for de-escalation
        state.lastBetTotal = 0;         // Track previous bet size to determine win/loss
    }

    // --- 2. Analyze Previous Spin (if any) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Calculate the payout from the last spin to determine win/loss
        // (We assume the engine added winnings to bankroll, so we check bankroll delta or calculate manually)
        // For accurate logic without complex simulation, we check if the number was a "Winner"
        
        const isVoisins = [0, 2, 3, 4, 7, 12, 15, 18, 19, 21, 22, 25, 26, 28, 29, 32, 35].includes(lastNumber);
        const isDozen2 = (lastNumber >= 13 && lastNumber <= 24);
        
        const isWin = isVoisins || isDozen2;

        if (isWin) {
            // Check for Session Profit
            if (bankroll > state.startBankroll) {
                state.level = 1;
                state.smallWinStreak = 0;
            } else {
                // Determine Win Quality for De-escalation
                const isBigWin = isVoisins && isDozen2; // Overlap
                // Note: The strategy calls 0,2,3 "Medium/Atomic" wins. We treat them as Big for de-escalation power
                // or keep strictly to the "Small Win" count logic.
                // Video Logic: "Three small winners drop it down a level... or one big winner come down a level"
                
                if (isBigWin || [0, 2, 3].includes(lastNumber)) {
                    // Big/Atomic Win -> Drop level immediately
                    state.level = Math.max(1, state.level - 1);
                    state.smallWinStreak = 0;
                } else {
                    // Small Win -> Increment streak
                    state.smallWinStreak++;
                    if (state.smallWinStreak >= 3) {
                        state.level = Math.max(1, state.level - 1);
                        state.smallWinStreak = 0; // Reset streak after drop
                    }
                }
            }
        } else {
            // Loss -> Increase Level
            state.level++;
            state.smallWinStreak = 0; // Reset streak on loss
        }
    }

    // --- 3. Determine Bet Sizes ---
    // The strategy is built on a $30 base profile:
    // - $12 on Dozen (40% of total)
    // - $18 on Voisins (60% of total)
    // We calculate a 'chip' value relative to the progression level.
    // Video base: Level 1 = $1 chip. 
    // Voisins splits get 2 chips (2x standard). Dozen gets 12 chips.
    
    // We must respect config.betLimits.min.
    // The smallest bet on the board is a Voisins split (2 chips in this strategy).
    // So: 2 * chipValue >= config.betLimits.min
    
    const minChipByLimit = config.betLimits.min / 2;
    const baseChipValue = Math.max(1, minChipByLimit); // Ensure at least 1 or limit-compliant
    
    // Apply Progression Level
    const currentChipValue = baseChipValue * state.level;
    
    // --- 4. Construct Bets ---
    const bets = [];

    // Helper to safely add bets within limits
    const addBet = (type, value, chipCount) => {
        let amount = chipCount * currentChipValue;
        
        // Clamp min (Standard limit check)
        if (['dozen', 'column', 'red', 'black', 'even', 'odd', 'high', 'low'].includes(type)) {
             amount = Math.max(amount, config.betLimits.minOutside);
        } else {
             amount = Math.max(amount, config.betLimits.min);
        }
        
        // Clamp max
        amount = Math.min(amount, config.betLimits.max);

        if (amount > 0) {
            bets.push({ type, value, amount });
        }
    };

    // A. Middle Dozen (12 chips)
    addBet('dozen', 2, 12);

    // B. Voisins du Zéro (Double Strength = 18 chips total)
    // Standard Voisins is 9 chips. This strategy uses "Double" (2x).
    
    // 0/2/3 Trio (Street/Basket) - Standard 2 chips -> Here 4 chips
    addBet('basket', 0, 4); // 'basket' usually handles 0,1,2 or 0,2,3 depending on engine. 
                            // If engine strictly uses 'street' for 0,2,3, logic might vary. 
                            // Standard US/EU basket 0-3 works for 0,2,3 coverage in many sims.
                            // If specific 0,2,3 street is needed:
                            // addBet('street', 0, 4); // Often 0-2-3 is key 0 street.

    // Corner 25/26/28/29 - Standard 2 chips -> Here 4 chips
    addBet('corner', 25, 4);

    // Splits - Standard 1 chip -> Here 2 chips
    addBet('split', [4, 7], 2);
    addBet('split', [12, 15], 2);
    addBet('split', [18, 21], 2);
    addBet('split', [19, 22], 2);
    addBet('split', [32, 35], 2);

    // --- 5. Safety Check & Return ---
    // Calculate total to ensure we aren't betting more than bankroll
    const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
    state.lastBetTotal = totalBetAmount;

    if (totalBetAmount > bankroll) {
        // Not enough funds for full progression. 
        // Option: Return null to stop, or return what we can. 
        // We'll return empty to stop the session safely.
        return [];
    }

    return bets;
=======
/**
 * Strategy: Atomic Voisins (Hybrid Voisins + Dozen)
 * * Source: 
 * Video: "Controlled Roulette Betting with Explosive Potential" by Casino Matchmaker
 * URL: https://www.youtube.com/watch?v=dlmJREnF6tM
 * * The Logic:
 * This is a "hybrid" strategy that covers ~65% of the wheel (24 numbers) by combining:
 * 1. A double-strength "Voisins du Zéro" (Neighbors of Zero) bet on the racetrack.
 * 2. A heavy bet on the Middle Dozen (Numbers 13-24).
 * * This creates tiered winning zones:
 * - Small Wins ($6 profit @ base): Non-overlapping numbers in Voisins OR Dozen.
 * - Medium Wins ($18 profit @ base): The 0/2/3 trio.
 * - Big Wins ($42 profit @ base): Overlap numbers (Voisins + Dozen).
 * - Atomic Win ($54 profit @ base): Number 2 (Specific overlap/weighting in this setup).
 * * The Progression:
 * - Base Unit: The video uses a $30 total bet model ($12 on Dozen, $18 on Voisins).
 * - ON LOSS: Increase the betting level by 1 (Arithmetic Progression: 1x -> 2x -> 3x).
 * - ON WIN: 
 * - If Session Profit is reached: Reset to Level 1.
 * - If "Big Win" hit (but no session profit): Decrease level by 1.
 * - If 3 Consecutive "Small Wins": Decrease level by 1.
 * * The Goal:
 * - Reach any session profit (Bankroll > Start Bankroll) and reset immediately.
 * - Survive variance using the "Small Win" de-escalation logic.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. State Initialization ---
    if (state.level === undefined) {
        state.level = 1;                // Current betting level (multiplier)
        state.startBankroll = bankroll; // Snapshot starting bankroll for session profit check
        state.smallWinStreak = 0;       // Track consecutive small wins for de-escalation
        state.lastBetTotal = 0;         // Track previous bet size to determine win/loss
    }

    // --- 2. Analyze Previous Spin (if any) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        
        // Calculate the payout from the last spin to determine win/loss
        // (We assume the engine added winnings to bankroll, so we check bankroll delta or calculate manually)
        // For accurate logic without complex simulation, we check if the number was a "Winner"
        
        const isVoisins = [0, 2, 3, 4, 7, 12, 15, 18, 19, 21, 22, 25, 26, 28, 29, 32, 35].includes(lastNumber);
        const isDozen2 = (lastNumber >= 13 && lastNumber <= 24);
        
        const isWin = isVoisins || isDozen2;

        if (isWin) {
            // Check for Session Profit
            if (bankroll > state.startBankroll) {
                state.level = 1;
                state.smallWinStreak = 0;
            } else {
                // Determine Win Quality for De-escalation
                const isBigWin = isVoisins && isDozen2; // Overlap
                // Note: The strategy calls 0,2,3 "Medium/Atomic" wins. We treat them as Big for de-escalation power
                // or keep strictly to the "Small Win" count logic.
                // Video Logic: "Three small winners drop it down a level... or one big winner come down a level"
                
                if (isBigWin || [0, 2, 3].includes(lastNumber)) {
                    // Big/Atomic Win -> Drop level immediately
                    state.level = Math.max(1, state.level - 1);
                    state.smallWinStreak = 0;
                } else {
                    // Small Win -> Increment streak
                    state.smallWinStreak++;
                    if (state.smallWinStreak >= 3) {
                        state.level = Math.max(1, state.level - 1);
                        state.smallWinStreak = 0; // Reset streak after drop
                    }
                }
            }
        } else {
            // Loss -> Increase Level
            state.level++;
            state.smallWinStreak = 0; // Reset streak on loss
        }
    }

    // --- 3. Determine Bet Sizes ---
    // The strategy is built on a $30 base profile:
    // - $12 on Dozen (40% of total)
    // - $18 on Voisins (60% of total)
    // We calculate a 'chip' value relative to the progression level.
    // Video base: Level 1 = $1 chip. 
    // Voisins splits get 2 chips (2x standard). Dozen gets 12 chips.
    
    // We must respect config.betLimits.min.
    // The smallest bet on the board is a Voisins split (2 chips in this strategy).
    // So: 2 * chipValue >= config.betLimits.min
    
    const minChipByLimit = config.betLimits.min / 2;
    const baseChipValue = Math.max(1, minChipByLimit); // Ensure at least 1 or limit-compliant
    
    // Apply Progression Level
    const currentChipValue = baseChipValue * state.level;
    
    // --- 4. Construct Bets ---
    const bets = [];

    // Helper to safely add bets within limits
    const addBet = (type, value, chipCount) => {
        let amount = chipCount * currentChipValue;
        
        // Clamp min (Standard limit check)
        if (['dozen', 'column', 'red', 'black', 'even', 'odd', 'high', 'low'].includes(type)) {
             amount = Math.max(amount, config.betLimits.minOutside);
        } else {
             amount = Math.max(amount, config.betLimits.min);
        }
        
        // Clamp max
        amount = Math.min(amount, config.betLimits.max);

        if (amount > 0) {
            bets.push({ type, value, amount });
        }
    };

    // A. Middle Dozen (12 chips)
    addBet('dozen', 2, 12);

    // B. Voisins du Zéro (Double Strength = 18 chips total)
    // Standard Voisins is 9 chips. This strategy uses "Double" (2x).
    
    // 0/2/3 Trio (Street/Basket) - Standard 2 chips -> Here 4 chips
    addBet('basket', 0, 4); // 'basket' usually handles 0,1,2 or 0,2,3 depending on engine. 
                            // If engine strictly uses 'street' for 0,2,3, logic might vary. 
                            // Standard US/EU basket 0-3 works for 0,2,3 coverage in many sims.
                            // If specific 0,2,3 street is needed:
                            // addBet('street', 0, 4); // Often 0-2-3 is key 0 street.

    // Corner 25/26/28/29 - Standard 2 chips -> Here 4 chips
    addBet('corner', 25, 4);

    // Splits - Standard 1 chip -> Here 2 chips
    addBet('split', [4, 7], 2);
    addBet('split', [12, 15], 2);
    addBet('split', [18, 21], 2);
    addBet('split', [19, 22], 2);
    addBet('split', [32, 35], 2);

    // --- 5. Safety Check & Return ---
    // Calculate total to ensure we aren't betting more than bankroll
    const totalBetAmount = bets.reduce((sum, b) => sum + b.amount, 0);
    state.lastBetTotal = totalBetAmount;

    if (totalBetAmount > bankroll) {
        // Not enough funds for full progression. 
        // Option: Return null to stop, or return what we can. 
        // We'll return empty to stop the session safely.
        return [];
    }

    return bets;
>>>>>>> origin/main
}