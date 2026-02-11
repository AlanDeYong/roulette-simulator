/**
 * STRATEGY: Higher Tier Roulette System
 * * SOURCE: 
 * YouTube: Casino Matchmaker - "This 'Higher Tier' Roulette System Shocked Me"
 * URL: https://www.youtube.com/watch?v=wNpBY8yaUaE
 * * THE LOGIC:
 * This strategy covers 24 numbers by combining the "Tier" (Tiers du Cylindre) section 
 * with the "High" (19-36) outside bet.
 * - The Tier bet covers 12 numbers (5, 8, 10, 11, 13, 16, 23, 24, 27, 30, 33, 36) using 6 splits.
 * - The High bet covers 19-36.
 * - Overlap ("Jackpot Numbers"): 23, 24, 27, 30, 33, 36 (High + Tier).
 * * BETTING CONFIGURATION (Per 'Unit' of the strategy):
 * - 6 Splits on Tier: 2 chips each (Total 12 chips)
 * - 1 High Bet: 15 chips
 * - Total Base Bet Cost: 27 chips
 * * PROGRESSION (Aggressive Staircase):
 * - ON LOSS: Increase the betting level by +2 units (e.g., Level 1 -> Level 3).
 * - ON WIN: 
 * 1. If Current Bankroll > Start Bankroll: RESET to Level 1.
 * 2. Else: Wait for 2 consecutive wins, then decrease level by 1.
 * * GOAL:
 * - Hit "Jackpot numbers" (High + Tier) to recover losses rapidly.
 * - Reset to base bet immediately upon reaching session profit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION & HELPER DATA ---
    
    // Define the Tier Split pairs
    const tierSplits = [
        [5, 8], [10, 11], [13, 16], 
        [23, 24], [27, 30], [33, 36]
    ];
    
    // Tier numbers for win checking (Set for O(1) lookup)
    const tierNumbers = new Set([5, 8, 10, 11, 13, 16, 23, 24, 27, 30, 33, 36]);

    // Minimum chip size. 
    // We assume the strategy's "2 chips" on Tier and "15 chips" on High 
    // are relative to the table minimum.
    const baseChip = config.betLimits.min; 

    // --- 2. STATE INITIALIZATION ---
    if (!state.initialized) {
        state.level = 1;              // Current betting multiplier
        state.winCounter = 0;         // Tracks consecutive wins for de-escalation
        state.startBankroll = bankroll; // Remember starting balance for profit reset
        state.lastTotalBet = 0;       // To calculate net result of previous spin
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS SPIN (Update Progression) ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Calculate Winnings manually to determine strategy outcome
        let winnings = 0;
        
        // Did we hit High? (19-36, excluding 0)
        if (winningNum >= 19 && winningNum <= 36) {
            // High pays 1:1. We bet 15 * level * baseChip
            const highBetAmt = 15 * state.level * baseChip;
            winnings += (highBetAmt * 2); // Return stake + profit
        }

        // Did we hit Tier?
        if (tierNumbers.has(winningNum)) {
            // Split pays 17:1. We bet 2 * level * baseChip on the specific split
            const splitBetAmt = 2 * state.level * baseChip;
            winnings += (splitBetAmt * 18); // Return stake (1) + profit (17)
        }

        const netResult = winnings - state.lastTotalBet;

        // --- PROGRESSION LOGIC ---
        if (netResult > 0) {
            // WIN
            if (bankroll > state.startBankroll) {
                // Scenario A: We are in profit -> Hard Reset
                state.level = 1;
                state.winCounter = 0;
            } else {
                // Scenario B: Recovery mode -> Check counter
                state.winCounter++;
                if (state.winCounter >= 2) {
                    // Level down after 2 consecutive wins
                    state.level = Math.max(1, state.level - 1);
                    state.winCounter = 0; // Reset counter after leveling down
                }
            }
        } else {
            // LOSS
            // Video: "Repeat bet add two units" (Aggressive)
            state.level += 2;
            state.winCounter = 0; // Reset win counter on loss
        }
    }

    // --- 4. CONSTRUCT BETS ---
    
    // Calculate chip values based on current level
    // Constraint: Level cannot result in bets exceeding table max
    // We must check the largest single bet (the High bet) against config.betLimits.max
    
    let safeLevel = state.level;
    const potentialHighBet = 15 * safeLevel * baseChip;
    
    if (potentialHighBet > config.betLimits.max) {
        // Cap the level if the High bet would exceed the limit
        safeLevel = Math.floor(config.betLimits.max / (15 * baseChip));
        // Ensure level is at least 1
        safeLevel = Math.max(1, safeLevel);
    }

    const tierChipValue = 2 * safeLevel * baseChip;
    const highBetValue = 15 * safeLevel * baseChip;

    const bets = [];

    // A. Place Tier Splits
    // Check if Tier bets meet minimum inside bet limit
    const finalTierBet = Math.max(tierChipValue, config.betLimits.min);
    
    tierSplits.forEach(pair => {
        bets.push({
            type: 'split',
            value: pair,
            amount: finalTierBet
        });
    });

    // B. Place High Bet
    // Check if High bet meets minimum outside bet limit
    const finalHighBet = Math.max(highBetValue, config.betLimits.minOutside);
    
    bets.push({
        type: 'high',
        amount: finalHighBet
    });

    // --- 5. UPDATE STATE & RETURN ---
    
    // Track total bet for next spin's profit calculation
    state.lastTotalBet = (finalTierBet * 6) + finalHighBet;

    return bets;
}