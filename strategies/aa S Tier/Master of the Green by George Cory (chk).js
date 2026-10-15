/*
 * Source: https://youtu.be/EwSwMQml6-E (The Roulette Master - Master of the Green by George Cory)
 * 
 * The Full Logic in Details:
 * - Start by betting on 5 non-overlapping corners that do not include the numbers 1, 2, or 3.
 *   (e.g., corners starting at 4, 10, 17, 23, 28).
 * - On the first loss, a "jackpot" Trio bet covering 0, 1, 2 (or 0-00-2 in American) is added.
 * - This brings the total active bets to 6 positions.
 * - If a bet wins, but overall bankroll is not at a new peak, the winning position is REMOVED 
 *   from the active bets, and the remaining bets are spun again without increasing the bet amount.
 * 
 * The Full Bet Progression in Details:
 * - Base bet size starts at 1 unit per position (scaled to config.betLimits.min).
 * - After a loss, the unit size for ALL active positions increases according to a stepped progression:
 *   - Current units < 9: Increase by 2 units (equivalent to +$10 in the video)
 *   - Current units < 20: Increase by 4 units (equivalent to +$20 in the video)
 *   - Current units >= 20: Increase by 10 units (equivalent to +$50 in the video)
 * - After a win that does not clear the deficit, the unit size stays the same, but the winning 
 *   position is removed to secure part of the recovery without compounding risk.
 * - When a win pushes the bankroll to a new session high (overall profit), the progression 
 *   fully RESETS to the original 5 corners at 1 unit each.
 * 
 * The Goal:
 * - Goal is to consistently secure session highs (new peak bankrolls) and reset. 
 * - Stop-loss is effectively the bankroll running out or hitting table limits.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine base unit for inside bets
    const baseUnit = Math.max(config.betLimits.min, 1);

    // Initial starting bets configuration
    const initialBets = [
        { type: 'corner', value: 4 },   // Covers 4, 5, 7, 8
        { type: 'corner', value: 10 },  // Covers 10, 11, 13, 14
        { type: 'corner', value: 17 },  // Covers 17, 18, 20, 21
        { type: 'corner', value: 23 },  // Covers 23, 24, 26, 27
        { type: 'corner', value: 28 }   // Covers 28, 29, 31, 32
    ];

    // Helper to evaluate if a local bet position won
    function isWin(betObj, num) {
        const nStr = num.toString();
        if (betObj.type === 'trio' || betObj.type === 'basket') {
            // Treat 0, 00, or 37 as a hit for the zero-zone jackpot
            if (nStr === '0' || nStr === '00' || nStr === '37') return true;
            if (Array.isArray(betObj.value) && betObj.value.includes(parseInt(nStr))) return true;
        }
        if (betObj.type === 'corner') {
            const c = parseInt(betObj.value);
            const covered = [c, c + 1, c + 3, c + 4];
            if (covered.includes(parseInt(nStr))) return true;
        }
        return false;
    }

    // 2. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.peakBankroll = bankroll;
        state.activeBets = [...initialBets];
        state.trioAdded = false;
        state.currentUnits = 1;
    }

    // 3. Process previous spin and update progression/bankroll
    if (spinHistory.length > 0) {
        // If we hit a new overall session profit, we reset entirely
        if (bankroll > state.peakBankroll) {
            state.peakBankroll = bankroll;
            state.activeBets = [...initialBets];
            state.trioAdded = false;
            state.currentUnits = 1;
        } else {
            // Still in a deficit, check what happened on the last spin
            const lastSpin = spinHistory[spinHistory.length - 1];
            const winningNumber = lastSpin.winningNumber;
            
            let wonAny = false;
            const remainingBets = [];

            // Identify winning positions and remove them from active tracking
            for (let b of state.activeBets) {
                if (isWin(b, winningNumber)) {
                    wonAny = true;
                } else {
                    remainingBets.push(b);
                }
            }

            state.activeBets = remainingBets;

            // If we won something (but didn't clear profit), bet size stays the same, 
            // but we removed the winning positions.
            if (!wonAny) {
                // If it's a loss:
                
                // Add the Trio jackpot on the very first loss if not active
                if (!state.trioAdded) {
                    state.activeBets.push({ type: 'trio', value: [0, 1, 2] });
                    state.trioAdded = true;
                }

                // Increment the units according to George Cory's stepped logic
                if (state.currentUnits < 9) {
                    state.currentUnits += 2;      // Equates to +$10 
                } else if (state.currentUnits < 20) {
                    state.currentUnits += 4;      // Equates to +$20 
                } else {
                    state.currentUnits += 10;     // Equates to +$50 
                }
            }

            // Failsafe: if we somehow removed all active bets but are still down, force reset
            if (state.activeBets.length === 0) {
                state.activeBets = [...initialBets];
                state.trioAdded = false;
                state.currentUnits = 1;
            }
        }
    }

    // 4. Calculate current bet amount and clamp to limits
    let amount = baseUnit * state.currentUnits;
    amount = Math.min(amount, config.betLimits.max);

    // 5. Construct and return the bet objects
    const currentSpinBets = state.activeBets.map(b => ({
        type: b.type,
        value: b.value,
        amount: amount
    }));

    return currentSpinBets;
}