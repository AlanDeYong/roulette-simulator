/**
 * Roulette Strategy: Cash Rake 
 * Source: "Bet With Mo" (https://youtu.be/KceDM7DAXkA)
 *
 * THE LOGIC:
 * - Observation: Spin without betting to find the "winning dozen". If a 0 or 00 hits, ignore it and spin again.
 * - Bet Setup: Once a valid Dozen (1-3) hits, bets are placed to hedge against recent hits:
 * - 1st Dozen wins: 1 unit on the 3 missed streets in 1st Dz, 4 units on 1st Dz, 3 units on 1st st of 2nd Dz (13-15).
 * - 3rd Dozen wins: 1 unit on the 3 missed streets in 3rd Dz, 4 units on 3rd Dz, 3 units on 4th st of 2nd Dz (22-24).
 * - 2nd Dozen wins: 1 unit on the 3 missed streets in 2nd Dz, 4 units on 2nd Dz.
 * - If winning street is Left Half (13-15, 16-18): 3 units on 1st st of 3rd Dz (25-27).
 * - If winning street is Right Half (19-21, 22-24): 3 units on 4th st of 1st Dz (10-12).
 * * THE PROGRESSION (8 Levels):
 * - Level 1 (Initial): Standard base bets placed.
 * - Levels 2-5 (Losses 1-4): Rebet and increase each bet by its initial base amount.
 * - Levels 6-7 (Losses 5-6): Rebet and double the current bet amount.
 * - Level 8 (Loss 7): Rebet and add 10x the initial base bet amount to the current bet.
 * - Win/Reset: Any win resets the strategy back to the observation phase to find a new dozen. If Level 8 loses, it also resets.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (!state.mode) {
        state.mode = 'observe';  // 'observe' | 'bet'
        state.level = 1;
        state.baseBets = [];
        state.currentBets = [];
    }

    const lastSpin = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1] : null;

    // 2. Resolve Win/Loss Progression if we are in betting mode
    if (state.mode === 'bet' && lastSpin) {
        const winNum = lastSpin.winningNumber;
        let won = false;

        // Check if the winning number is covered by any of our current bets
        for (const b of state.currentBets) {
            if (b.type === 'street') {
                if (winNum >= b.value && winNum <= b.value + 2) won = true;
            } else if (b.type === 'dozen') {
                if (winNum >= (b.value - 1) * 12 + 1 && winNum <= b.value * 12) won = true;
            }
        }

        if (won) {
            // Reset to observation phase
            state.mode = 'observe';
            state.level = 1;
            state.baseBets = [];
            state.currentBets = [];
            return []; // SURGICAL FIX: Force an observation spin without betting
        } else {
            // Progress to next loss level
            state.level++;
            if (state.level > 8) {
                // Hard Stop-Loss reached, reset strategy
                state.mode = 'observe';
                state.level = 1;
                state.baseBets = [];
                state.currentBets = [];
                return []; // SURGICAL FIX: Force an observation spin without betting
            }
        }
    }

    // 3. Observation Mode Logic
    if (state.mode === 'observe') {
        // Continue spinning if no history or a zero hits
        if (!lastSpin || lastSpin.winningNumber === 0 || lastSpin.winningNumber === '00') {
            return []; 
        }

        const winNum = lastSpin.winningNumber;
        const winningDozen = Math.ceil(winNum / 12);
        const winningStreetStart = Math.floor((winNum - 1) / 3) * 3 + 1;

        // Calculate a safe base unit that respects both inside and outside minimums
        const unit = Math.max(config.betLimits.min, Math.ceil(config.betLimits.minOutside / 4));
        const newBets = [];

        // A. 1 unit on the 3 missed streets in the winning dozen
        const dozenStartNumber = (winningDozen - 1) * 12 + 1;
        for (let i = 0; i < 4; i++) {
            const streetStart = dozenStartNumber + (i * 3);
            if (streetStart !== winningStreetStart) {
                newBets.push({ type: 'street', value: streetStart, amount: 1 * unit });
            }
        }

        // B. 4 units on the winning dozen
        newBets.push({ type: 'dozen', value: winningDozen, amount: 4 * unit });

        // C. 3 units conditional street bet
        if (winningDozen === 1) {
            newBets.push({ type: 'street', value: 13, amount: 3 * unit });
        } else if (winningDozen === 3) {
            newBets.push({ type: 'street', value: 22, amount: 3 * unit });
        } else if (winningDozen === 2) {
            if (winningStreetStart === 13 || winningStreetStart === 16) {
                // Left half of 2nd dozen
                newBets.push({ type: 'street', value: 25, amount: 3 * unit }); 
            } else {
                // Right half of 2nd dozen
                newBets.push({ type: 'street', value: 10, amount: 3 * unit }); 
            }
        }

        // Lock in base bets and switch to betting mode
        state.baseBets = JSON.parse(JSON.stringify(newBets));
        state.currentBets = JSON.parse(JSON.stringify(newBets));
        state.mode = 'bet';
        state.level = 1;
    } 
    // 4. Progression Mode Logic
    else if (state.mode === 'bet') {
        for (let i = 0; i < state.currentBets.length; i++) {
            let current = state.currentBets[i];
            let base = state.baseBets[i];

            if (state.level >= 2 && state.level <= 5) {
                // Levels 2-5: Add initial base bet amount
                current.amount += base.amount;
            } else if (state.level === 6 || state.level === 7) {
                // Levels 6-7: Double the current bet amount
                current.amount *= 2;
            } else if (state.level === 8) {
                // Level 8: Add 10x the initial base bet amount
                current.amount += (10 * base.amount);
            }
        }
    }

    // 5. Finalize Bets and Clamp to Limits
    if (state.mode === 'bet') {
        const betsToReturn = [];
        for (const b of state.currentBets) {
            let finalAmount = b.amount;
            
            // Apply specific limits based on bet type
            if (b.type === 'dozen') {
                finalAmount = Math.max(finalAmount, config.betLimits.minOutside);
            } else {
                finalAmount = Math.max(finalAmount, config.betLimits.min);
            }
            
            // Hard clamp at maximum table limit
            finalAmount = Math.min(finalAmount, config.betLimits.max);

            betsToReturn.push({ type: b.type, value: b.value, amount: finalAmount });
        }
        return betsToReturn;
    }

    return [];
}