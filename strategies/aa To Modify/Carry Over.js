/**
 * SOURCE: Bet With Mo (Concept) / User-Defined (Specific Logic)
 * URL: https://www.youtube.com/watch?v=8xkeN9w69tA
 * * THE LOGIC:
 * 1. Operates on two "Sides" of the table (Low Start vs. High Start).
 * 2. Side 1 (Low): Starts with Numbers 1, 2 and Street 4.
 * 3. Side 2 (High): Starts with Numbers 35, 36 and Street 31 (Mirror).
 * 4. Progression: Each loss expands coverage (more numbers/streets) and increases unit weight.
 * 5. Mirroring: On reaching a $50 profit target, the system resets to Level 1 and switches sides.
 * * THE PROGRESSION (9 Levels):
 * - L1: +Nums(1,2), +Street(4) [1u each]
 * - L2: +Nums(7,8), +Street(10), Street(4)+1u
 * - L3: +Nums(13,14), +Street(16) [2u], Existing Streets +1u
 * - L4: +Nums(19,20), +Street(22) [3u], Existing Streets +1u, THEN DOUBLE ALL.
 * - L5: +Nums(25,26) [2u]
 * - L6: All Straights +1u, All Streets +2u
 * - L7: Double All
 * - L8: Double All Again
 * - L9: All Bets +1u, +Zero [2u]
 * * THE GOAL:
 * Reach incremental $50 profit targets (e.g., $50, $100, $150).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const min = config.betLimits.min;
    const max = config.betLimits.max;

    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.side = 1; // 1 = Low, 2 = High
        state.targetProfit = 50;
        state.initialBankroll = bankroll;
    }

    // 2. Logic for Profit Targets and Losses
    if (spinHistory.length > 0) {
        const currentProfit = bankroll - state.initialBankroll;

        if (currentProfit >= state.targetProfit) {
            // Target Hit: Reset Level, Switch Side, Update next $50 threshold
            state.level = 1;
            state.side = state.side === 1 ? 2 : 1;
            state.targetProfit = (Math.floor(currentProfit / 50) + 1) * 50;
        } else {
            // Check if last bet won (Simulation check)
            const lastSpin = spinHistory[spinHistory.length - 1].winningNumber;
            const wonLast = utils.wasWinner ? utils.wasWinner(lastSpin) : false; 
            
            // If the simulator doesn't provide wasWinner, we increment level on any spin that didn't hit target
            // as this is a progressive recovery system.
            if (!wonLast) {
                state.level++;
                if (state.level > 9) state.level = 1; 
            } else {
                // Optional: You could choose to stay at the same level on a win if target isn't hit,
                // but usually, these systems reset or stay level. User requested progression if loss.
            }
        }
    }

    // 3. Define the Pattern Map
    // Low Side (1) uses: [1,2], [7,8], [13,14], [19,20], [25,26] | Streets: 4, 10, 16, 22
    // High Side (2) uses: [35,36], [29,30], [23,24], [17,18], [11,12] | Streets: 31, 25, 19, 13
    const numbersMap = state.side === 1 ? [[1, 2], [7, 8], [13, 14], [19, 20], [25, 26]] : [[35, 36], [29, 30], [23, 24], [17, 18], [11, 12]];
    const streetsMap = state.side === 1 ? [4, 10, 16, 22] : [31, 25, 19, 13];

    let betArray = [];

    // 4. Build Level-Based Bets
    // LEVEL 1
    if (state.level >= 1) {
        betArray.push({ type: 'number', value: numbersMap[0][0], amount: min });
        betArray.push({ type: 'number', value: numbersMap[0][1], amount: min });
        betArray.push({ type: 'street', value: streetsMap[0], amount: min });
    }
    // LEVEL 2
    if (state.level >= 2) {
        betArray.push({ type: 'number', value: numbersMap[1][0], amount: min });
        betArray.push({ type: 'number', value: numbersMap[1][1], amount: min });
        betArray.push({ type: 'street', value: streetsMap[1], amount: min });
        // Increment L1 street
        let s1 = betArray.find(b => b.value === streetsMap[0]);
        if (s1) s1.amount += min;
    }
    // LEVEL 3
    if (state.level >= 3) {
        betArray.push({ type: 'number', value: numbersMap[2][0], amount: min });
        betArray.push({ type: 'number', value: numbersMap[2][1], amount: min });
        betArray.push({ type: 'street', value: streetsMap[2], amount: min * 2 });
        // Increment previous streets
        betArray.filter(b => b.type === 'street' && b.value !== streetsMap[2]).forEach(s => s.amount += min);
    }
    // LEVEL 4
    let multiplier = 1;
    if (state.level >= 4) {
        betArray.push({ type: 'number', value: numbersMap[3][0], amount: min });
        betArray.push({ type: 'number', value: numbersMap[3][1], amount: min });
        betArray.push({ type: 'street', value: streetsMap[3], amount: min * 3 });
        betArray.filter(b => b.type === 'street' && b.value !== streetsMap[3]).forEach(s => s.amount += min);
        multiplier = 2; // "Followed by doubling of all bets"
    }
    // LEVEL 5
    if (state.level >= 5) {
        betArray.push({ type: 'number', value: numbersMap[4][0], amount: min * 2 });
        betArray.push({ type: 'number', value: numbersMap[4][1], amount: min * 2 });
    }
    // LEVEL 6
    if (state.level === 6) {
        betArray.filter(b => b.type === 'number').forEach(n => n.amount += min);
        betArray.filter(b => b.type === 'street').forEach(s => s.amount += (min * 2));
    }
    // LEVEL 7
    if (state.level === 7) multiplier = 4; // Double of Level 6 (2 * 2)
    // LEVEL 8
    if (state.level === 8) multiplier = 8; // Double again (4 * 2)
    // LEVEL 9
    if (state.level === 9) {
        multiplier = 8;
        betArray.forEach(b => b.amount += min);
        betArray.push({ type: 'number', value: 0, amount: min * 2 }); // Zero hedge
    }

    // 5. Finalize: Apply Multiplier and Clamp to Limits
    return betArray.map(b => {
        let finalAmount = b.amount * multiplier;
        // Respect min/max limits
        finalAmount = Math.max(finalAmount, min);
        finalAmount = Math.min(finalAmount, max);
        return { type: b.type, value: b.value, amount: finalAmount };
    });
}