/**
 * STRATEGY: 11 Street Roulette (User Defined Logic)
 * * --- LOGIC DESCRIPTION ---
 * 1. BASE LEVEL:
 * - Start with 11 Streets covered (1 Hole).
 * - ON WIN: "Swap the Hole". Remove the bet from the street that just won. 
 * Place a bet on the street that was previously uncovered.
 * (Logic: Chase the hole).
 * - ON LOSS: Enter Recovery Mode.
 *
 * 2. RECOVERY MODE (Triggered by any loss):
 * - ACTION ON LOSING (Base or Recovery): "Rebet and increase all bets by 1 unit."
 * (Note: We keep the same streets, just increase the money).
 * * - ACTION ON WIN:
 * - Check: Have we reached 3 wins in recovery?
 * - YES: RESET strategy to Base Level (1 Unit, 11 Streets).
 * - NO: "Remove the street which just hit". (Reduction). 
 * Do not replace it. Bet size stays the same (or follows the loss rule if we lost previously).
 * * --- SUMMARY ---
 * - Base Win: Swap Hole.
 * - Base Loss: Unit + 1, Enter Recovery.
 * - Recovery Win: Reduce Streets. (If 3rd win -> Reset).
 * - Recovery Loss: Unit + 1. Rebet same streets.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // --- 1. CONFIGURATION ---
    const ALL_STREETS = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    const BASE_UNIT = config.betLimits.min; 

    const getStreetFromNumber = (num) => {
        const n = parseInt(num, 10);
        if (isNaN(n) || n < 1) return -1; 
        return Math.floor((n - 1) / 3) * 3 + 1;
    };

    // --- 2. INITIALIZATION ---
    if (!state.initialized) {
        state.unitSize = 1;
        state.mode = 'BASE'; // 'BASE' or 'RECOVERY'
        state.recoveryWinCount = 0;
        
        // Start: Bet all streets except 34 (Default Hole)
        state.activeStreets = [...ALL_STREETS];
        state.activeStreets.pop(); 
        
        state.initialized = true;
    }

    // --- 3. PROCESS PREVIOUS SPIN ---
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const lastStreet = getStreetFromNumber(lastNum);

        // Determine if we won based on OUR active streets
        const wonLastSpin = state.activeStreets.includes(lastStreet);

        if (state.mode === 'BASE') {
            if (wonLastSpin) {
                // --- BASE WIN (Swap) ---
                // 1. Identify the Old Hole
                const oldHole = ALL_STREETS.find(s => !state.activeStreets.includes(s));
                // 2. Remove the Winner (New Hole)
                state.activeStreets = state.activeStreets.filter(s => s !== lastStreet);
                // 3. Add the Old Hole
                if (oldHole !== undefined && !state.activeStreets.includes(oldHole)) {
                    state.activeStreets.push(oldHole);
                }
                // Unit size stays at 1 (or current base)
                state.unitSize = 1; 
            } else {
                // --- BASE LOSS (Trigger Recovery) ---
                state.mode = 'RECOVERY';
                state.recoveryWinCount = 0;
                state.unitSize++; // "Upon losing... increase by 1 unit"
                // "Rebet": We do not change activeStreets. We rebet the same ones that just lost.
            }
        } 
        else {
            // --- RECOVERY MODE ---
            if (wonLastSpin) {
                // --- RECOVERY WIN ---
                state.recoveryWinCount++;

                if (state.recoveryWinCount >= 3) {
                    // === RESET ON 3rd WIN ===
                    state.mode = 'BASE';
                    state.unitSize = 1;
                    state.recoveryWinCount = 0;
                    
                    // Reset Active Streets to full 11 (Random hole or default)
                    state.activeStreets = [...ALL_STREETS];
                    state.activeStreets.pop(); 
                } else {
                    // === REDUCTION (Not yet 3rd win) ===
                    // "Remove the street which just hit (do not replace)"
                    state.activeStreets = state.activeStreets.filter(s => s !== lastStreet);
                    
                    // Note: User didn't say to decrease unit on win, so unitSize stays.
                }
            } else {
                // --- RECOVERY LOSS ---
                // "Upon losing, rebet and increase all bets by 1 unit"
                state.unitSize++;
                // "Rebet": Keep activeStreets exactly as they are.
            }
        }
    }

    // --- 4. SAFETY ---
    // Prevent 0 bets (unless intention is to sit out, but usually sim requires action)
    if (state.activeStreets.length === 0) {
        // If we reduced to 0 streets, we must reset or pick one to continue.
        // Assuming Reset logic applies if we ran out of streets (unlikely with 3 win cap).
        state.activeStreets.push(1); 
    }

    // --- 5. BET CONSTRUCTION ---
    let betAmount = BASE_UNIT * state.unitSize;
    
    // Clamp
    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Bankroll Check
    if (betAmount * state.activeStreets.length > bankroll) return [];

    return state.activeStreets.map(streetStart => ({
        type: 'street',
        value: streetStart,
        amount: betAmount
    }));
}