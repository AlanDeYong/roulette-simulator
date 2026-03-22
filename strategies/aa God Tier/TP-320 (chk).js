/*
 * ROULETTE STRATEGY: TP-320 (Dynamic Hot-Street & Zigzag Splits - 37 Spin Wait)
 * * SOURCE: "TP-320 Strategy. You don't go to the casino to 'hope.' You go to collect!"
 * URL: https://youtu.be/J9be1iv7gI4
 * CHANNEL: Spin Till You Win Creator of Wheel Pulse Pro Max
 * * THE LOGIC: 
 * The strategy FIRST waits and observes the table for 37 spins without betting. 
 * Once 37 spins are logged, it calculates the hottest street. It uses this hot street as the 
 * anchor to begin expanding table coverage. Splits are dynamically attached to the 
 * covered streets in a zigzag pattern (alternating bottom split [1/2] and top split [2/3]).
 * * THE PROGRESSION: 
 * 12-phase negative progression. 
 * - Loss: Phase advances by 1. We increase table coverage (adjacent streets) or increase unit multipliers.
 * - Win: Complete reset to Phase 1, and the Hot Street is recalculated based on the newest 37 spins.
 * - Phase > 12: Complete reset to Phase 1 (Stop-loss), and the Hot Street is recalculated.
 * * THE GOAL: 
 * Generate consistent session profits by attacking statistical hot zones and expanding coverage to recoup losses.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Observation Phase: Do absolutely nothing until we have 37 past spins
    if (spinHistory.length < 37) {
        return []; 
    }

    let shouldReset = false;

    // 2. Initialize State & Determine Win/Loss
    // We use state.isActive to ensure we only trigger the first bet calculation AFTER the 37 spin wait
    if (state.phase === undefined || !state.isActive) {
        state.phase = 0;
        state.lastBankroll = bankroll;
        state.isActive = true;
        shouldReset = true; 
    } else {
        const profit = bankroll - state.lastBankroll;
        
        if (profit > 0) {
            // Net win: Reset progression and trigger recalculation
            state.phase = 0;
            shouldReset = true;
        } else if (profit < 0) {
            // Net loss: Advance phase
            state.phase++;
        }
        
        // Safety / Stop-Loss Reset
        if (state.phase > 11) {
            state.phase = 0; 
            shouldReset = true;
        }
    }

    // Update bankroll tracker for the NEXT spin's calculation
    state.lastBankroll = bankroll;

    // 3. Calculate Hottest Street (Only before first active bet or after a reset)
    if (shouldReset) {
        const historyToUse = spinHistory.slice(-37);
        const streetCounts = {};
        const allStreets = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
        
        // Initialize counts
        allStreets.forEach(st => streetCounts[st] = 0);
        
        // Tally history
        historyToUse.forEach(spin => {
            const num = spin.winningNumber;
            if (num >= 1 && num <= 36) { // Ignore 0 / 00
                const streetStart = Math.floor((num - 1) / 3) * 3 + 1;
                streetCounts[streetStart]++;
            }
        });

        // Find highest frequency
        let maxCount = -1;
        let hottest = 1; // Default fallback
        for (const [street, count] of Object.entries(streetCounts)) {
            if (count > maxCount) {
                maxCount = count;
                hottest = parseInt(street);
            }
        }
        state.hotStreet = hottest;
    }

    // 4. Define Phase Configuration
    const phases = [
      { stCount: 1, spCount: 0, stM: 1, spM: 0 },   // Phase 1
      { stCount: 1, spCount: 1, stM: 1, spM: 1 },   // Phase 2
      { stCount: 2, spCount: 1, stM: 1, spM: 1 },   // Phase 3
      { stCount: 2, spCount: 2, stM: 1, spM: 1 },   // Phase 4
      { stCount: 2, spCount: 2, stM: 2, spM: 1 },   // Phase 5
      { stCount: 3, spCount: 2, stM: 2, spM: 1 },   // Phase 6
      { stCount: 3, spCount: 3, stM: 3, spM: 1 },   // Phase 7
      { stCount: 4, spCount: 3, stM: 3, spM: 1 },   // Phase 8
      { stCount: 4, spCount: 4, stM: 6, spM: 1 },   // Phase 9
      { stCount: 5, spCount: 4, stM: 6, spM: 1 },   // Phase 10
      { stCount: 6, spCount: 5, stM: 13, spM: 1 },  // Phase 11
      { stCount: 8, spCount: 6, stM: 13, spM: 1 }   // Phase 12
    ];

    const currentPhase = phases[state.phase];
    const baseUnit = config.betLimits.min;
    let bets = [];

    // 5. Calculate amounts and strictly clamp to limits
    let streetAmount = Math.max(baseUnit * currentPhase.stM, config.betLimits.min);
    streetAmount = Math.min(streetAmount, config.betLimits.max);

    let splitAmount = Math.max(baseUnit * currentPhase.spM, config.betLimits.min);
    splitAmount = Math.min(splitAmount, config.betLimits.max);

    // 6. Dynamically Build Bets Array based on Hot Street Anchor
    const allStreetsArray = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    const startIndex = allStreetsArray.indexOf(state.hotStreet);

    for (let i = 0; i < currentPhase.stCount; i++) {
        // Wrap around the board layout if we reach the end of the streets
        const streetStartValue = allStreetsArray[(startIndex + i) % 12];
        
        // Add Street Bet
        bets.push({
            type: 'street',
            value: streetStartValue,
            amount: streetAmount
        });

        // Add Corresponding Split Bet
        if (i < currentPhase.spCount && currentPhase.spM > 0) {
            let splitValues;
            
            // Zigzag Logic: Alternate between bottom split and top split
            if (i % 2 === 0) {
                // Bottom Split (e.g., Street 1 -> Split 1/2)
                splitValues = [streetStartValue, streetStartValue + 1];
            } else {
                // Top Split (e.g., Street 4 -> Split 5/6)
                splitValues = [streetStartValue + 1, streetStartValue + 2];
            }

            bets.push({
                type: 'split',
                value: splitValues,
                amount: splitAmount
            });
        }
    }

    return bets;
}