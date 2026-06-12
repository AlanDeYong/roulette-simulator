/**
 * Strategy Name: Street Smart Roulette System (Corrected Layout Drops)
 * Source: https://youtu.be/MrvIyguKhCw (Channel: The Roulette Master)
 *
 * Full Logic & Rules:
 * - The strategy operates across 3 phases using 'line' (double street) bets.
 * - Base Level (Phase 1): Place a base bet on 5 out of the 6 double streets, omitting the 
 * double street that contains the last hit number.
 * - On a WIN: The strategy ALWAYS removes the winning double street from the next spin.
 * This occurs even during loss recovery (e.g., a win in recovery drops a street for the next spin).
 * The layout reduces consecutively: 5 streets (Phase 1) -> 4 streets (Phase 2) -> 3 streets (Phase 3).
 * - On a WIN at 3 streets: 
 * * If the session's peak profit is achieved, it resets back to the base 5-street layout.
 * * If peak profit is NOT reached yet, it rebets exactly 3 streets. To "avoid betting on the 
 * last winning double street", it swaps out the winning street for a previously omitted one.
 *
 * Bet Progression & Loss Recovery Logic:
 * - On any LOSS: The strategy stays in its current phase (keeping the same number of active 
 * double streets), maintains its layout (which already naturally avoids the last hit number), 
 * and enters recovery mode with a multiplier:
 * * Phase 1 (5 Streets): Triple (3x) the current bet amount. Requires 2 wins to fully clear.
 * * Phase 2 (4 Streets): Double (2x) the current bet amount. Requires 2 wins to fully clear.
 * * Phase 3 (3 Streets): Double (2x) the current bet amount. Requires 1 win to fully clear.
 * - If a win during recovery meets the required win streak OR brings the overall bankroll back 
 * to or above the session's peak profit, recovery immediately clears and resets to 5 streets.
 *
 * Target Goal:
 * - A target profit of +$200 or more above the starting bankroll triggers a stop condition.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const doubleStreets = [1, 7, 13, 19, 25, 31];

    // Helper: Map winning number to its double street start number
    function getDoubleStreetStart(number) {
        if (number === 0 || number === '0' || number === '00') return null;
        for (let start of doubleStreets) {
            if (number >= start && number <= start + 5) return start;
        }
        return null;
    }

    // 1. Initialize State
    if (!state.isInitialized) {
        state.phase = 1;             // 1 = 5 streets, 2 = 4 streets, 3 = 3 streets
        state.multiplier = 1;
        state.winStreakCount = 0;
        state.inRecovery = false;
        state.startingBankroll = bankroll;
        state.peakProfit = 0;

        if (spinHistory.length > 0) {
            const lastNum = spinHistory[spinHistory.length - 1].winningNumber;
            const lastHitStreet = getDoubleStreetStart(lastNum);
            let omit = lastHitStreet !== null ? lastHitStreet : doubleStreets[0];
            state.activeStreets = doubleStreets.filter(s => s !== omit);
        } else {
            state.activeStreets = doubleStreets.filter(s => s !== doubleStreets[0]); 
        }
        state.isInitialized = true;
    }

    const currentProfit = bankroll - state.startingBankroll;

    // Stop betting if target profit is met
    if (currentProfit >= 200) {
        return [];
    }

    // 2. Post-Spin Layout & Progression Handler
    if (spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNumber = lastSpin.winningNumber;
        const lastHitStreet = getDoubleStreetStart(lastNumber);
        const lastRoundWasWin = state.activeStreets.includes(lastHitStreet);

        if (lastRoundWasWin) {
            if (state.inRecovery) {
                state.winStreakCount++;
                let reqWins = (state.phase === 3) ? 1 : 2;
                
                // If required wins are reached OR win brings us back to peak profit
                if (state.winStreakCount >= reqWins || currentProfit >= state.peakProfit) {
                    state.inRecovery = false;
                    state.winStreakCount = 0;
                    state.multiplier = 1;
                    state.phase = 1;
                    
                    let omit = lastHitStreet !== null ? lastHitStreet : doubleStreets[0];
                    state.activeStreets = doubleStreets.filter(s => s !== omit);
                } else {
                    // Won, but still in recovery (e.g., 1st win of 2).
                    // We must still drop the winning street from the layout.
                    if (state.phase < 3) {
                        state.phase++;
                        state.activeStreets = state.activeStreets.filter(s => s !== lastHitStreet);
                    } else {
                        // Edge case: Rebetting 3 streets during recovery. Avoid hit street.
                        state.activeStreets = state.activeStreets.filter(s => s !== lastHitStreet);
                        for (let s of doubleStreets) {
                            if (!state.activeStreets.includes(s) && s !== lastHitStreet) {
                                state.activeStreets.push(s);
                                break;
                            }
                        }
                    }
                }
            } else {
                // Normal progression (Not in recovery)
                if (state.phase < 3) {
                    // Drop the winning street
                    state.phase++;
                    state.activeStreets = state.activeStreets.filter(s => s !== lastHitStreet);
                } else {
                    // Win at Phase 3 (3 streets)
                    if (currentProfit >= state.peakProfit) {
                        // Reached a new peak session profit -> Reset back to 5 streets
                        state.phase = 1;
                        let omit = lastHitStreet !== null ? lastHitStreet : doubleStreets[0];
                        state.activeStreets = doubleStreets.filter(s => s !== omit);
                    } else {
                        // Rebetting Phase 3 because peak profit isn't reached yet.
                        // We must swap out the last winning double street to avoid it.
                        state.activeStreets = state.activeStreets.filter(s => s !== lastHitStreet);
                        for (let s of doubleStreets) {
                            if (!state.activeStreets.includes(s) && s !== lastHitStreet) {
                                state.activeStreets.push(s);
                                break;
                            }
                        }
                    }
                }
                state.multiplier = 1;
            }
        } else {
            // Loss handling
            state.inRecovery = true;
            state.winStreakCount = 0;

            if (state.phase === 1) {
                state.multiplier *= 3;
            } else {
                state.multiplier *= 2;
            }
            // Active streets remain the exact same on a loss (which naturally avoids the losing hit)
        }

        // Maintain session peak profit reference for the next spin's logic checks
        if (currentProfit > state.peakProfit) {
            state.peakProfit = currentProfit;
        }
    }

    // 3. Size Bets & Enforce Configuration Limits
    const baseUnit = config.betLimits.min || 2;
    let betAmount = baseUnit * state.multiplier;

    betAmount = Math.max(betAmount, config.betLimits.min);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // Build valid 'line' bet structures for the current active streets
    return state.activeStreets.map(streetStart => ({
        type: 'line',
        value: streetStart,
        amount: betAmount
    }));
}