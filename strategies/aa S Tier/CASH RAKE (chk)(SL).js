/**
 * Roulette Strategy: Cash Rake (with Virtual Betting)
 * Source: "Bet With Mo" (https://youtu.be/KceDM7DAXkA)
 *
 * THE LOGIC:
 * - Observation: Spin without betting to find the "winning dozen". If a 0 or 00 hits, ignore it and spin again.
 * - Bet Setup: Once a valid Dozen (1-3) hits, bets are placed to hedge against recent hits:
 * - 1st Dozen wins: 1 unit on 3 missed streets in 1st Dz, 4 units on 1st Dz, 3 units on 1st st of 2nd Dz.
 * - 3rd Dozen wins: 1 unit on 3 missed streets in 3rd Dz, 4 units on 3rd Dz, 3 units on 4th st of 2nd Dz.
 * - 2nd Dozen wins: 1 unit on 3 missed streets in 2nd Dz, 4 units on 2nd Dz.
 * - If winning street is Left Half: 3 units on 1st st of 3rd Dz.
 * - If winning street is Right Half: 3 units on 4th st of 1st Dz.
 * * * THE PROGRESSION (8 Levels with Virtual Break):
 * - Level 1 (Initial): Standard base bets placed.
 * - Levels 2-5 (Losses 1-4): Rebet and increase by 1x base amount (Multipliers: 2x, 3x, 4x, 5x).
 * - Level 5 Loss: Switch to VIRTUAL betting for 2 spins. Placements remain the same, but no money is wagered.
 * - If a virtual bet wins: Reset to observation mode, but resume the NEXT real bet at Level 6 sizing.
 * - If both virtual bets lose: Resume real betting immediately at Level 6 sizing.
 * - Level 6 (Post-Virtual): Resume betting starting at Level 6 sizing (Multiplier: 10x base amount).
 * - Level 7: Rebet and double the current bet amount (Multiplier: 20x base amount).
 * - Level 8: Add 10x the initial base bet amount (Multiplier: 30x base amount).
 * - Win/Reset: Any REAL win resets the strategy back to observation phase and Level 1.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State Persistence
    if (!state.mode) {
        state.mode = 'observe';  // 'observe' | 'bet' | 'virtual'
        state.sizeLevel = 1;
        state.baseBets = [];
        state.virtualSpinsLeft = 0;
    }

    const lastSpin = spinHistory.length > 0 ? spinHistory[spinHistory.length - 1] : null;

    // 2. Resolve Win/Loss Progression (Handles both 'bet' and 'virtual' modes)
    if ((state.mode === 'bet' || state.mode === 'virtual') && lastSpin) {
        const winNum = lastSpin.winningNumber;
        let won = false;

        // Check if the winning number is covered by our base bet layout
        for (const b of state.baseBets) {
            if (b.type === 'street') {
                if (winNum >= b.value && winNum <= b.value + 2) won = true;
            } else if (b.type === 'dozen') {
                if (winNum >= (b.value - 1) * 12 + 1 && winNum <= b.value * 12) won = true;
            }
        }

        if (won) {
            // SURGICAL FIX: Differentiate between a REAL win and a VIRTUAL win
            if (state.mode === 'virtual') {
                // Virtual win: we reset layout (find new dozen) but MUST resume at Level 6 to recover
                state.sizeLevel = 6;
            } else {
                // Real win: fully reset progression
                state.sizeLevel = 1;
            }
            state.mode = 'observe';
            state.baseBets = [];
            state.virtualSpinsLeft = 0;
            return []; // Force an observation spin without betting
        } else {
            // Loss detected
            if (state.mode === 'bet') {
                if (state.sizeLevel === 5) {
                    // Level 5 lost -> switch to virtual mode for 2 spins
                    state.mode = 'virtual';
                    state.virtualSpinsLeft = 2;
                } else {
                    // Normal progression
                    state.sizeLevel++;
                    if (state.sizeLevel > 8) {
                        // Hard Stop-Loss reached, reset strategy
                        state.mode = 'observe';
                        state.sizeLevel = 1;
                        state.baseBets = [];
                        return [];
                    }
                }
            } else if (state.mode === 'virtual') {
                // Virtual progression
                state.virtualSpinsLeft--;
                if (state.virtualSpinsLeft === 0) {
                    // End of virtual betting -> resume real betting at Level 6 sizing
                    state.mode = 'bet';
                    state.sizeLevel = 6;
                }
            }
        }
    }

    // 3. Virtual Mode Check
    if (state.mode === 'virtual') {
        // We are virtually tracking the outcome, so we return an empty array (no real bets placed)
        return [];
    }

    // 4. Observation Mode Logic
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
        state.baseBets = newBets;
        state.mode = 'bet';
        // SURGICAL FIX: Do not overwrite sizeLevel here so virtual wins can correctly resume at Level 6
        if (!state.sizeLevel) state.sizeLevel = 1; 
    } 

    // 5. Finalize Bets (Calculate Multipliers dynamically) and Clamp to Limits
    if (state.mode === 'bet') {
        // Multiplier map matching the exact progression rules:
        // L1: 1x, L2: 2x, L3: 3x, L4: 4x, L5: 5x, L6: 10x, L7: 20x, L8: 30x
        const multipliers = [0, 1, 2, 3, 4, 5, 10, 20, 30];
        const mult = multipliers[state.sizeLevel] || 30;

        const betsToReturn = [];
        for (const b of state.baseBets) {
            let finalAmount = b.amount * mult;
            
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