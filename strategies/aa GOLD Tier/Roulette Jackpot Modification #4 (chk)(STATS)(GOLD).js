/**
 * Roulette Strategy: Roulette Jackpot Modification #4
 * 
 * Source:
 *   - Video URL: https://youtu.be/Jci_MQrarjc
 *   - Channel: The Roulette Factory
 * 
 * The Full Logic in Detail:
 *   - The strategy bets primarily on 'high' (19-36) and gradually adds 6 overlapping corner bets on 
 *     the board to capture "jackpot numbers" (like 23, 25, 26, 29, 32, 35) when a losing streak occurs.
 *   - Level 1: Bet 1 unit on High (19-36).
 *   - Level 2: Bet 2 units on High.
 *   - Level 3: Bet 3 units on High.
 *   - Level 4: Bet 3 units on High + 2 corners (corners at 25 and 31) at 1 unit each.
 *   - Level 5: Bet 3 units on High + 4 corners (add corners at 26 and 32) at 1 unit each.
 *   - Level 6: Bet 3 units on High + 6 corners (add corners at 20 and 22) at 1 unit each.
 *   - Level 7+: High bet follows the Padovan sequence starting from 4 (4, 5, 7, 9, 12, 16, 21, 28, 37, 49...), 
 *     while all 6 corners increase by +1 unit each per level.
 * 
 * The Full Bet Progression in Detail:
 *   - On Loss: Advance to the next level in the progression sequence.
 *   - On Win:
 *     - If current bankroll reaches or exceeds the highest recorded session bankroll, reset back to Level 1.
 *     - If current bankroll is below the session high, hold current bet amounts without increasing or decreasing.
 * 
 * The Goal:
 *   - Continually lock in new session high watermarks and reset to base bet to protect bankroll.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.level === undefined) {
        state.level = 1;
        state.sessionHighBankroll = bankroll;
    }

    // 2. Track Session High & Handle Last Spin Results
    if (spinHistory.length > 0) {
        if (bankroll >= state.sessionHighBankroll) {
            // New session high reached -> Reset to Level 1
            state.sessionHighBankroll = bankroll;
            state.level = 1;
        } else {
            // Check win/loss from last spin
            const lastSpin = spinHistory[spinHistory.length - 1];
            const num = lastSpin.winningNumber;
            const isHighWin = num >= 19 && num <= 36;
            
            // Check if last spin hit any placed corner
            // Level 4+ has corners:
            // Corners: 25 (25,26,28,29), 31 (31,32,34,35), 26 (26,27,29,30), 32 (32,33,35,36), 20 (20,21,23,24), 22 (22,23,25,26)
            let cornerHit = false;
            if (state.level >= 4 && [25, 26, 28, 29, 31, 32, 34, 35].includes(num)) cornerHit = true;
            if (state.level >= 5 && [26, 27, 29, 30, 32, 33, 35, 36].includes(num)) cornerHit = true;
            if (state.level >= 6 && [20, 21, 23, 24, 22, 23, 25, 26].includes(num)) cornerHit = true;

            const isWin = isHighWin || cornerHit;

            if (isWin) {
                // On partial win below session high -> Hold level (do not advance level)
            } else {
                // On loss -> Advance level
                state.level += 1;
            }
        }
    }

    // Update highest recorded bankroll
    if (bankroll > state.sessionHighBankroll) {
        state.sessionHighBankroll = bankroll;
    }

    // 3. Define Units
    const outsideUnit = config.betLimits.minOutside || 5;
    const insideUnit = config.betLimits.min || 2;
    const maxLimit = config.betLimits.max || 500;

    // Padovan sequence for High bets from level 7 onwards (index 0 = level 7):
    const padovanSequence = [4, 5, 7, 9, 12, 16, 21, 28, 37, 49, 65, 86, 114, 151, 200, 265, 351, 465];

    let highBetAmount = 0;
    let cornerUnitMultiplier = 0;
    let activeCornerSets = 0;

    // 4. Calculate Bets based on Level
    if (state.level === 1) {
        highBetAmount = outsideUnit * 1;
    } else if (state.level === 2) {
        highBetAmount = outsideUnit * 2;
    } else if (state.level === 3) {
        highBetAmount = outsideUnit * 3;
    } else if (state.level === 4) {
        highBetAmount = outsideUnit * 3;
        activeCornerSets = 1; // 2 corners
        cornerUnitMultiplier = 1;
    } else if (state.level === 5) {
        highBetAmount = outsideUnit * 3;
        activeCornerSets = 2; // 4 corners
        cornerUnitMultiplier = 1;
    } else if (state.level === 6) {
        highBetAmount = outsideUnit * 3;
        activeCornerSets = 3; // 6 corners
        cornerUnitMultiplier = 1;
    } else {
        // Level 7+
        activeCornerSets = 3; // 6 corners
        const padovanIndex = Math.min(state.level - 7, padovanSequence.length - 1);
        const padovanVal = padovanSequence[padovanIndex];
        highBetAmount = outsideUnit * padovanVal;
        cornerUnitMultiplier = 1 + (state.level - 6);
    }

    // Clamp High bet
    highBetAmount = Math.max(highBetAmount, outsideUnit);
    highBetAmount = Math.min(highBetAmount, maxLimit);

    const bets = [];

    // Place High bet
    bets.push({ type: 'high', amount: highBetAmount });

    // Place Corner bets according to active sets
    const cornerPositions = [
        [25, 31], // Set 1: Corner covering (25,26,28,29) and (31,32,34,35)
        [26, 32], // Set 2: Corner covering (26,27,29,30) and (32,33,35,36)
        [20, 22]  // Set 3: Corner covering (20,21,23,24) and (22,23,25,26)
    ];

    for (let setIdx = 0; setIdx < activeCornerSets; setIdx++) {
        const cornersInSet = cornerPositions[setIdx];
        for (let cornerVal of cornersInSet) {
            let cornerAmount = insideUnit * cornerUnitMultiplier;
            cornerAmount = Math.max(cornerAmount, insideUnit);
            cornerAmount = Math.min(cornerAmount, maxLimit);

            bets.push({
                type: 'corner',
                value: cornerVal,
                amount: cornerAmount
            });
        }
    }

    return bets;
}