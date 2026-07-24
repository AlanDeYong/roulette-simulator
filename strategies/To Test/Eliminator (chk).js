/**
 * Source: https://www.youtube.com/watch?v=lAJE1LoYtW0 (The Roulette Master)
 * * The Logic:
 * The Eliminator strategy is a high-coverage system designed for low-rollers.
 * It tracks the last 4 unique winning streets (rows of 3 numbers) and excludes them.
 * Bets are placed on the remaining 8 streets out of the 12 possible streets.
 * * The Progression:
 * 1. Base Stage: Bet 1 unit on the 8 un-hit streets.
 * 2. On a Win at Base: Keep betting the same amount on the same 8 streets to collect profit.
 * 3. On a Loss: Stay flat. Rebet the exact same amount. Do not increase on a loss.
 * 4. On a Win AFTER a Loss (Recovery Phase):
 * - Remove the street that just hit from your active bets.
 * - Increase the bet size on all remaining active streets by 1 base unit.
 * * The Goal / Reset Conditions:
 * - If your bankroll reaches or exceeds your starting/target bankroll (Session Profit),
 * reset completely to the Base Stage ($1 bets on 8 new streets).
 * - If you hit a win while betting on 5 streets, you've reached the system's limit. 
 * You reset to tracking 8 streets again, but increase your base unit (e.g., to $2) 
 * to continue trying to recover the deficit.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const increment = config.incrementMode === 'base' ? config.betLimits.min : (config.minIncrementalBet || 1);
    const allStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

    // 1. Initialize State
    if (!state.initialized) {
        state.baseUnit = config.betLimits.min; 
        state.activeStreets = []; 
        state.currentBetAmount = state.baseUnit;
        state.targetBankroll = bankroll; // Initial target established
        state.inRecovery = false;
        state.lastResultWasLoss = false;
        state.initialized = true;
    }

    // 2. Process previous spin result
    if (spinHistory.length > 0 && state.activeStreets.length > 0) {
        let lastNum = spinHistory[spinHistory.length - 1].winningNumber;
        let lastStreet = (lastNum === 0 || lastNum === '00') ? null : Math.floor((lastNum - 1) / 3) * 3 + 1;
        
        let isWin = state.activeStreets.includes(lastStreet);
        
        if (isWin) {
            if (state.lastResultWasLoss || state.inRecovery) {
                // Progression / Recovery Phase
                state.inRecovery = true;
                
                if (bankroll >= state.targetBankroll) {
                    // Reached Session Profit -> Reset completely
                    state.activeStreets = []; 
                    state.baseUnit = config.betLimits.min; 
                    state.inRecovery = false;
                    state.lastResultWasLoss = false;
                    state.targetBankroll = bankroll; // Lock in the new high-water mark target
                } else {
                    // Still in recovery: Remove the winning street
                    state.activeStreets = state.activeStreets.filter(s => s !== lastStreet);
                    
                    if (state.activeStreets.length < 5) {
                        // Reached the limit of 4 streets without reaching profit.
                        // Reset the setup but increase the base unit to continue recovery.
                        state.baseUnit += increment;
                        state.activeStreets = []; 
                        state.inRecovery = false;
                        state.lastResultWasLoss = false;
                        // CRITICAL: We DO NOT update targetBankroll here. We retain the deficit target.
                    } else {
                        // Continue progression: increase bets on remaining active streets
                        state.currentBetAmount += increment;
                    }
                }
            } else {
                // Win at base level. Lock in new high bankroll target.
                state.targetBankroll = bankroll;
                state.lastResultWasLoss = false;
            }
        } else {
            // Loss -> Stay flat, mark as a loss to trigger recovery on next win
            state.lastResultWasLoss = true;
        }
    }

    // 3. Setup Base Stage (Initial or after a reset)
    if (state.activeStreets.length === 0) {
        let excludedStreets = [];
        for (let i = spinHistory.length - 1; i >= 0; i--) {
            let num = spinHistory[i].winningNumber;
            if (num === 0 || num === '00') continue;
            let street = Math.floor((num - 1) / 3) * 3 + 1;
            
            if (!excludedStreets.includes(street)) {
                excludedStreets.push(street);
            }
            if (excludedStreets.length === 4) break;
        }
        
        // Wait until we have 4 unique streets in history
        if (excludedStreets.length < 4) {
             return []; 
        }
        
        state.activeStreets = allStreets.filter(s => !excludedStreets.includes(s));
        state.currentBetAmount = state.baseUnit;
        state.inRecovery = false;
        state.lastResultWasLoss = false;
    }

    // 4. Calculate final bet amount and clamp to limits
    let amount = state.currentBetAmount;
    amount = Math.max(amount, config.betLimits.min);
    amount = Math.min(amount, config.betLimits.max);

    // 5. Construct bets
    let bets = [];
    for (let street of state.activeStreets) {
        bets.push({ type: 'street', value: street, amount: amount });
    }

    return bets;
}