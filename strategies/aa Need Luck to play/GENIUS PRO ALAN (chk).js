/**
 * ROULETTE STRATEGY: Hot Numbers Double Street & Street Progression (Corrected)
 * * Source: YouTube Strategy
 * * The Full Logic in Details:
 * 1. Spin Data Accumulation: Tracks the frequency of winning numbers over the last 30 spins to identify 
 * "hot numbers" (numbers appearing 2 or more times).
 * 2. Bet Trigger: A bet session is triggered when 2 non-overlapping double streets (six-line bets) 
 * each contain at least 3 hot numbers. 
 * - Double streets can be any valid six-line combinations on the table layout (1-6, 4-9, 7-12, 10-15, 13-18, 
 * 16-21, 19-24, 22-27, 25-30, 28-33, 31-36).
 * - "Non-overlapping" means their number ranges must not intersect.
 * 3. Bet Selection: Once the two double streets are chosen:
 * - Within each chosen double street, place a 1 unit bet on the internal 3-number street containing the hot numbers 
 * (the street with the higher count of hot numbers).
 * - Place a 1 unit bet each on 2 independent streets that do not overlap with the chosen double streets.
 * 4. Pattern Persistence: Once a pattern is discovered, betting continues on that exact same pattern spin-after-spin.
 * * The Full Bet Progression in Details:
 * - Base Bets (Level 0): Each double street bet starts at 2 units, and each street bet starts at 1 unit.
 * - On Loss: Increase the double street bets following the Fibonacci sequence (2, 3, 5, 8, 13, 21, 34, ...).
 * Increase all street bets by the new double street bet amount divided by 4, rounded up to the nearest integer.
 * - On Win: If the current bankroll reaches or exceeds the peak session high, the progression completely resets 
 * to level 0. If a win occurs but the bankroll is still below the peak session high, the current bet level is 
 * maintained to continue recovery.
 * - Limits: All bets are strictly clamped using `config.betLimits.min` and `config.betLimits.max`.
 * * The Goal:
 * - Leverage short-term hot number clustering trends and recover losses through a structured Fibonacci progression 
 * until a new session bankroll peak is reached.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const HOT_WINDOW = 30;
    const dsUnits = [2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987];

    // --- Track Peak Session Bankroll ---
    if (state.peakBankroll === undefined) {
        state.peakBankroll = bankroll;
    }
    if (bankroll > state.peakBankroll) {
        state.peakBankroll = bankroll;
    }

    if (spinHistory.length === 0) {
        return [];
    }

    // --- Check Previous Outcome and Update Progression ---
    if (state.patternDiscovered) {
        const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;

        // Verify if the last spin was a winning number for any of our active bets
        const hitDS1 = (lastSpin >= state.ds1 && lastSpin <= state.ds1 + 5);
        const hitDS2 = (lastSpin >= state.ds2 && lastSpin <= state.ds2 + 5);
        const hitStreet1 = (lastSpin >= state.street1 && lastSpin <= state.street1 + 2);
        const hitStreet2 = (lastSpin >= state.street2 && lastSpin <= state.street2 + 2);
        const hitIndStreet1 = (lastSpin >= state.indStreet1 && lastSpin <= state.indStreet1 + 2);
        const hitIndStreet2 = (lastSpin >= state.indStreet2 && lastSpin <= state.indStreet2 + 2);

        const isWin = hitDS1 || hitDS2 || hitStreet1 || hitStreet2 || hitIndStreet1 || hitIndStreet2;

        if (isWin) {
            if (bankroll >= state.peakBankroll) {
                state.level = 0; // Reset to base bets when peak session high is hit
                state.peakBankroll = bankroll;
            }
            // If win but bankroll < peakBankroll, maintain the current level for recovery
        } else {
            state.level = (state.level || 0) + 1; // Progress on loss
        }
    }

    // --- Pattern Discovery Logic ---
    if (!state.patternDiscovered) {
        // Count frequencies inside the hot window
        const counts = {};
        const startIdx = Math.max(0, spinHistory.length - HOT_WINDOW);
        for (let i = startIdx; i < spinHistory.length; i++) {
            const num = spinHistory[i].winningNumber;
            if (num > 0 && num <= 36) {
                counts[num] = (counts[num] || 0) + 1;
            }
        }

        // Identify hot numbers (appeared 2 or more times)
        const hotNumbers = new Set();
        for (const num in counts) {
            if (counts[num] >= 2) {
                hotNumbers.add(parseInt(num, 10));
            }
        }

        // All 11 valid double streets starting numbers
        const doubleStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31];

        // Helper functions to check hot numbers inside layout segments
        const getHotInStreet = (s) => {
            let count = 0;
            for (let i = 0; i < 3; i++) {
                if (hotNumbers.has(s + i)) count++;
            }
            return count;
        };

        const getHotInDoubleStreet = (ds) => {
            let count = 0;
            for (let i = 0; i < 6; i++) {
                if (hotNumbers.has(ds + i)) count++;
            }
            return count;
        };

        // Find the optimal pair of non-overlapping double streets containing >= 3 hot numbers each
        let bestPair = null;
        let maxHotCount = -1;

        for (let i = 0; i < doubleStreets.length; i++) {
            for (let j = i + 1; j < doubleStreets.length; j++) {
                const ds1 = doubleStreets[i];
                const ds2 = doubleStreets[j];

                // Ensure no overlap between the two double streets
                if (Math.abs(ds1 - ds2) >= 6) {
                    const count1 = getHotInDoubleStreet(ds1);
                    const count2 = getHotInDoubleStreet(ds2);

                    if (count1 >= 3 && count2 >= 3) {
                        const totalHot = count1 + count2;
                        if (totalHot > maxHotCount) {
                            maxHotCount = totalHot;
                            bestPair = { ds1, ds2 };
                        }
                    }
                }
            }
        }

        if (bestPair) {
            state.patternDiscovered = true;
            state.ds1 = bestPair.ds1;
            state.ds2 = bestPair.ds2;
            state.level = 0;

            // Find the street within each double street containing the hot numbers
            state.street1 = getHotInStreet(state.ds1) >= getHotInStreet(state.ds1 + 3) ? state.ds1 : state.ds1 + 3;
            state.street2 = getHotInStreet(state.ds2) >= getHotInStreet(state.ds2 + 3) ? state.ds2 : state.ds2 + 3;

            // Find 2 independent streets that do not overlap with either double street
            const availableStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].filter(s => {
                return s !== state.ds1 && s !== state.ds1 + 3 && s !== state.ds2 && s !== state.ds2 + 3;
            });

            // Sort remaining streets by hot number frequency to maximize coverage quality
            availableStreets.sort((a, b) => getHotInStreet(b) - getHotInStreet(a));
            state.independentStreet1 = availableStreets[0] || 1;
            state.independentStreet2 = availableStreets[1] || 4;
        } else {
            // No valid pattern found yet: continue monitoring data without betting
            return [];
        }
    }

    // --- Calculate Bet Sizing based on Progression ---
    const baseUnit = config.betLimits.min;
    const level = Math.min(state.level || 0, dsUnits.length - 1);

    // Double street units follow the corrected sequence: 2, 3, 5, 8, 13...
    let currentDSUnits = dsUnits[level];
    let dsBetAmount = currentDSUnits * baseUnit;

    // Street units start at 1, then increase by Math.ceil(currentDSUnits / 4)
    let currentStreetUnits = 1;
    if (level > 0) {
        currentStreetUnits = 1 + Math.ceil(currentDSUnits / 4);
    }
    let streetBetAmount = currentStreetUnits * baseUnit;

    // Clamp values safely inside table limits
    dsBetAmount = Math.max(config.betLimits.min, Math.min(dsBetAmount, config.betLimits.max));
    streetBetAmount = Math.max(config.betLimits.min, Math.min(streetBetAmount, config.betLimits.max));

    // --- Return Constructed Bets ---
    return [
        { type: 'line', value: state.ds1, amount: dsBetAmount },
        { type: 'line', value: state.ds2, amount: dsBetAmount },
        { type: 'street', value: state.street1, amount: streetBetAmount },
        { type: 'street', value: state.street2, amount: streetBetAmount },
        { type: 'street', value: state.independentStreet1, amount: streetBetAmount },
        { type: 'street', value: state.independentStreet2, amount: streetBetAmount }
    ];
}