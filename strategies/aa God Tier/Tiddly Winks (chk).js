/**
 * Strategy Name: Tiddly Winks
 * Source: https://youtu.be/VIXKJCpDxoU?si=Zo8EzMSxY091WNb0 (CEG Dealer School)
 *
 * The Logic:
 * 1. Wait for the first 37 spins to gather frequency data.
 * 2. Find the hottest 4 streets and hottest 3 corners based on the last 37 spins.
 * 3. Crucial Rule: The 3 corners MUST NOT overlap with each other, and MUST NOT 
 *    overlap with the 4 chosen streets. The algorithm iterates through combinations 
 *    of the hottest streets to guarantee exactly 4 streets and 3 corners are found.
 * 4. Initial bet amounts: 2 base units on each street, 3 base units on each corner.
 * 
 * The Progression:
 * - On a loss: Rebet and increase all bets by 1 base unit amount (Streets 2->3->4, Corners 3->4->5).
 * - On a win (but no session profit): Reduce all bets by 1 base unit amount.
 * - On a win (session profit reached): Reset the progression and recalculate the hot 
 *   streets/corners based on the most recent 37 spins.
 *
 * The Goal:
 * - Achieve a session profit (current bankroll > bankroll at the start of the cycle).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Wait for at least 37 spins to gather data
    if (spinHistory.length < 37) {
        return [];
    }

    const baseUnit = config.betLimits.min;

    // 2. Initialize state for a new betting session
    if (!state.initialized) {
        state.initialized = true;
        state.cycleStartBankroll = bankroll;
        state.progLevel = 0; 
        state.lastBankroll = bankroll;
        state.activeBets = null;
    }

    // 3. Evaluate Win/Loss from the previous spin
    if (state.activeBets) {
        if (bankroll > state.cycleStartBankroll) {
            // Session Profit Reached: Reset cycle and force recalculation
            state.progLevel = 0;
            state.cycleStartBankroll = bankroll;
            state.activeBets = null; 
        } else if (bankroll > state.lastBankroll) {
            // Spin Win (no session profit yet): Reduce bets by 1 base unit
            state.progLevel = Math.max(0, state.progLevel - 1);
        } else if (bankroll < state.lastBankroll) {
            // Spin Loss: Increase bets by 1 base unit
            state.progLevel++;
        }
    }

    // 4. Calculate Hot Streets and Corners (Triggers on initialization and resets)
    if (!state.activeBets) {
        const recentSpins = spinHistory.slice(-37).map(s => s.winningNumber);

        // -- Evaluate Streets --
        const streetStarts = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
        let streetStats = streetStarts.map(s => {
            const nums = [s, s + 1, s + 2];
            const hits = recentSpins.filter(n => nums.includes(n)).length;
            return { startNum: s, nums: nums, hits: hits };
        });
        streetStats.sort((a, b) => b.hits - a.hits); // Sort hottest to coldest

        // -- Evaluate Corners --
        const cornerStarts = [
            1, 2, 4, 5, 7, 8, 10, 11, 13, 14, 16, 17,
            19, 20, 22, 23, 25, 26, 28, 29, 31, 32
        ];
        let cornerStats = cornerStarts.map(c => {
            const nums = [c, c + 1, c + 3, c + 4]; // European top-left corner calculation
            const hits = recentSpins.filter(n => nums.includes(n)).length;
            return { startNum: c, nums: nums, hits: hits };
        });
        cornerStats.sort((a, b) => b.hits - a.hits);

        // -- Combinatorial Search to GUARANTEE 4 streets and 3 non-overlapping corners --
        let bestStreets = null;
        let bestCorners = null;

        // Iterate through street combinations, preferring the hottest ones first
        for (let s1 = 0; s1 < streetStats.length - 3; s1++) {
            for (let s2 = s1 + 1; s2 < streetStats.length - 2; s2++) {
                for (let s3 = s2 + 1; s3 < streetStats.length - 1; s3++) {
                    for (let s4 = s3 + 1; s4 < streetStats.length; s4++) {
                        const currentStreets = [streetStats[s1], streetStats[s2], streetStats[s3], streetStats[s4]];
                        const covered = new Set();
                        
                        // Mark street numbers as covered
                        currentStreets.forEach(s => s.nums.forEach(n => covered.add(n)));

                        const currentCorners = [];
                        for (let i = 0; i < cornerStats.length; i++) {
                            const corner = cornerStats[i];
                            let overlap = false;
                            
                            // Check overlap against streets AND previously selected corners
                            for (let n of corner.nums) {
                                if (covered.has(n)) {
                                    overlap = true;
                                    break;
                                }
                            }
                            
                            if (!overlap) {
                                currentCorners.push(corner);
                                corner.nums.forEach(n => covered.add(n)); // Prevent corner-to-corner overlap
                                if (currentCorners.length === 3) break;
                            }
                        }

                        // If we successfully found 3 valid corners, lock it in
                        if (currentCorners.length === 3) {
                            bestStreets = currentStreets;
                            bestCorners = currentCorners;
                            break;
                        }
                    }
                    if (bestStreets) break;
                }
                if (bestStreets) break;
            }
            if (bestStreets) break;
        }

        // Extreme fallback (mathematically highly improbable, but ensures script doesn't crash)
        if (!bestStreets || bestCorners.length < 3) {
            bestStreets = streetStats.slice(0, 4);
            bestCorners = cornerStats.slice(0, 3); 
        }

        state.activeBets = {
            streets: bestStreets.map(s => s.startNum),
            corners: bestCorners.map(c => c.startNum)
        };
    }

    // 5. Determine Bet Amounts & Clamp to Limits
    let streetAmount = (2 + state.progLevel) * baseUnit;
    let cornerAmount = (3 + state.progLevel) * baseUnit;

    streetAmount = Math.max(config.betLimits.min, Math.min(streetAmount, config.betLimits.max));
    cornerAmount = Math.max(config.betLimits.min, Math.min(cornerAmount, config.betLimits.max));

    // 6. Build the array of bet objects (Always 4 streets and 3 corners)
    const bets = [];
    state.activeBets.streets.forEach(street => {
        bets.push({ type: 'street', value: street, amount: streetAmount });
    });

    state.activeBets.corners.forEach(corner => {
        bets.push({ type: 'corner', value: corner, amount: cornerAmount });
    });

    // 7. Update lastBankroll snapshot before returning bets
    state.lastBankroll = bankroll;

    return bets;
}