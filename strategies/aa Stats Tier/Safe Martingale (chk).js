/**
 * Safe Martingale Strategy
 * 
 * Source:
 * - Channel: The Roulette Master
 * - Video URL: https://youtu.be/qBlajs55GPc
 * - Title: SAFE MARTINGALE!
 * 
 * The Full Logic in Details:
 * 1. Phase 1 (Truncated Martingale):
 *    - Starts with outside bets on Low (1-18).
 *    - On a win, resets back to the base unit bet on Low.
 *    - On a loss, doubles the bet following a 3-step sequence: 1 unit -> 2 units -> 4 units.
 *    - If 3 consecutive losses occur in Phase 1 (total loss of 7 units), Phase 1 stops and 
 *      the strategy transitions into Phase 2 (Recovery Phase).
 * 
 * 2. Phase 2 (Street Recovery Phase):
 *    - Scans past spin history for the last winning number between 1 and 18.
 *    - Identifies the street (1-3, 4-6, 7-9, 10-12, 13-15, or 16-18) containing that number 
 *      and excludes it from betting.
 *    - Bets on all active remaining streets in 1-18 range.
 *    - Progression on Loss:
 *      - Step 1-4: Increase each street bet by +1 base unit per loss (1 unit -> 2 units -> 3 units -> 4 units).
 *      - Step 5-7: Increase each street bet by +2 base units per loss (4 units -> 6 units -> 8 units -> 10 units).
 *      - Step 8+: Increase each street bet by +5 base units per loss (10 units -> 15 units -> 20 units...).
 *    - Progression on Win:
 *      - When a street hits, that winning street is removed ("yanked off") from future bets.
 *      - Strategy continues betting on remaining active streets.
 *      - RESET CONDITION: The strategy ONLY resets back to Phase 1 when the current bankroll 
 *        reaches or exceeds the SESSION'S PEAK PROFIT (highest bankroll achieved during the entire session).
 * 
 * Goal / Target:
 * - Accumulate profit through Phase 1 wins while tracking peak session profit.
 * - Recover Phase 1 drawdowns via Phase 2 street progression until session peak bankroll is surpassed.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State & Track Peak Session Bankroll
    if (!state.initialized) {
        state.startingBankroll = bankroll;
        state.peakBankroll = bankroll; // Track highest bankroll achieved in the session
        state.phase = 1; // 1 = Martingale, 2 = Street Recovery
        state.p1Level = 1; // Martingale levels: 1, 2, 3 (1x, 2x, 4x)
        state.p2BetPerStreet = 1; // Base units per street in Phase 2
        state.excludedStreets = []; // List of street start values (e.g. 1, 4, 7...) excluded
        state.initialized = true;
    }

    // Update session peak profit if current bankroll strictly exceeds previous peak
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    // Base units respecting limits
    const baseUnitOutside = Math.max(config.betLimits.minOutside, 10);
    const baseUnitInside = Math.max(config.betLimits.min, 10);

    const allLowStreets = [1, 4, 7, 10, 13, 16];

    // Helper to find street start number (1, 4, 7, 10, 13, 16) for a given number 1-18
    function getStreetStart(num) {
        if (num < 1 || num > 18) return null;
        return Math.floor((num - 1) / 3) * 3 + 1;
    }

    // 2. Process Last Spin Outcome (if history exists)
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const isLowWin = (lastNum >= 1 && lastNum <= 18);

        if (state.phase === 1) {
            if (isLowWin) {
                // Reset Phase 1 level on Win
                state.p1Level = 1;
            } else {
                // Advance Martingale level on Loss
                state.p1Level += 1;
                
                // Transition to Phase 2 after 3 consecutive losses
                if (state.p1Level > 3) {
                    state.phase = 2;
                    state.p2BetPerStreet = 1; // Start at 1 unit ($10) per street
                    
                    // Find the last number in 1-18 that hit prior to entering Phase 2
                    let lastLowHitStreet = 1; // Default fallback to Street 1-3
                    for (let i = spinHistory.length - 1; i >= 0; i--) {
                        const num = spinHistory[i].winningNumber;
                        if (num >= 1 && num <= 18) {
                            lastLowHitStreet = getStreetStart(num);
                            break;
                        }
                    }
                    
                    state.excludedStreets = [lastLowHitStreet];
                }
            }
        } else if (state.phase === 2) {
            // STRICT RESET CONDITION: Only reset when current bankroll reaches or exceeds session peak profit
            if (bankroll >= state.peakBankroll) {
                state.phase = 1;
                state.p1Level = 1;
                state.excludedStreets = [];
            } else {
                const hitStreet = getStreetStart(lastNum);
                const activeStreets = allLowStreets.filter(s => !state.excludedStreets.includes(s));
                const wonStreet = (hitStreet !== null && activeStreets.includes(hitStreet));

                if (wonStreet) {
                    // Remove winning street from future bets
                    state.excludedStreets.push(hitStreet);

                    // Check if reaching/exceeding peak bankroll or all active streets exhausted
                    if (bankroll >= state.peakBankroll || state.excludedStreets.length >= allLowStreets.length) {
                        state.phase = 1;
                        state.p1Level = 1;
                        state.excludedStreets = [];
                    }
                } else {
                    // Loss in Phase 2: Increment bet size per street
                    if (state.p2BetPerStreet < 4) {
                        state.p2BetPerStreet += 1; // +1 unit ($10) up to 4 units ($40)
                    } else if (state.p2BetPerStreet < 10) {
                        state.p2BetPerStreet += 2; // +2 units ($20) up to 10 units ($100)
                    } else {
                        state.p2BetPerStreet += 5; // +5 units ($50) thereafter
                    }
                }
            }
        }
    }

    // 3. Construct Bets for the Current Spin
    let bets = [];

    if (state.phase === 1) {
        const multiplier = Math.pow(2, state.p1Level - 1);
        let betAmount = baseUnitOutside * multiplier;

        // Clamp to limits
        betAmount = Math.max(betAmount, config.betLimits.minOutside);
        betAmount = Math.min(betAmount, config.betLimits.max);

        bets.push({
            type: 'low',
            amount: betAmount
        });
    } else if (state.phase === 2) {
        const activeStreets = allLowStreets.filter(s => !state.excludedStreets.includes(s));

        // Fallback: If all streets excluded, reset to Phase 1
        if (activeStreets.length === 0) {
            state.phase = 1;
            state.p1Level = 1;
            state.excludedStreets = [];
            return [{
                type: 'low',
                amount: Math.max(baseUnitOutside, config.betLimits.minOutside)
            }];
        }

        let amountPerStreet = baseUnitInside * state.p2BetPerStreet;
        
        // Clamp street bet to limits
        amountPerStreet = Math.max(amountPerStreet, config.betLimits.min);
        amountPerStreet = Math.min(amountPerStreet, config.betLimits.max);

        for (const streetVal of activeStreets) {
            bets.push({
                type: 'street',
                value: streetVal,
                amount: amountPerStreet
            });
        }
    }

    return bets;
}