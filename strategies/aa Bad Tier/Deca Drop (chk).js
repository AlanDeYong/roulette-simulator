/**
 * Strategy: Deca Drop Roulette System (by Reed)
 * Source: "The Roulette Master" (https://youtu.be/4qiHoRsUw10)
 * 
 * THE FULL LOGIC IN DETAIL:
 * 1. Starting Setup:
 *    - The strategy begins by placing 1 unit on 10 specific split bets ("Deca") covering 
 *      same-color pairs and the zero split (0/00 on American tables, or 0/2 on European tables):
 *      - Red splits: [9, 12], [16, 19], [18, 21], [27, 30]
 *      - Black splits: [8, 11], [10, 13], [17, 20], [26, 29], [28, 31]
 *      - Zero split: [0, 00] (or [0, 2] on European tables)
 * 
 * 2. Progression Rules:
 *    - On Loss:
 *      - Retain all currently active splits.
 *      - Increase the bet amount on each active split by 1 unit (+config.betLimits.min).
 *    - On Win:
 *      - Check Session Profit: If the current bankroll exceeds the peak starting bankroll,
 *        the cycle immediately resets to 1 unit and all 10 original splits are restored.
 *      - If NOT in session profit:
 *        - "Deca Drop": Remove the winning split (or winning number) from the board so
 *          it is no longer bet on.
 *        - Keep the remaining active positions at their current unit amount for the next spin.
 *        - If down to the final split and one number hits, transition to a straight-up bet 
 *          on the single remaining sister number.
 * 
 * 3. The Goal:
 *    - Recover any accumulated drawdown through the higher payouts of inside split bets (17:1)
 *      or straight-up bets (35:1) with a slow d'Alembert-style unit escalation.
 *    - Lock in net session profit and reset back to base units.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    const minInside = config.betLimits.min;
    const maxBet = config.betLimits.max;
    const isAmerican = config.tableType === 'american';

    // 1. Initialise All 10 Default Splits
    const defaultSplits = [
        { id: 'split_0_00', type: 'split', value: isAmerican ? [0, 0] : [0, 2] },
        { id: 'split_9_12',  type: 'split', value: [9, 12] },
        { id: 'split_16_19', type: 'split', value: [16, 19] },
        { id: 'split_18_21', type: 'split', value: [18, 21] },
        { id: 'split_27_30', type: 'split', value: [27, 30] },
        { id: 'split_8_11',  type: 'split', value: [8, 11] },
        { id: 'split_10_13', type: 'split', value: [10, 13] },
        { id: 'split_17_20', type: 'split', value: [17, 20] },
        { id: 'split_26_29', type: 'split', value: [26, 29] },
        { id: 'split_28_31', type: 'split', value: [28, 31] }
    ];

    // Helper: Reset session to initial state
    function resetSession() {
        state.unitLevel = 1;
        state.activeBets = defaultSplits.map(s => ({
            id: s.id,
            type: s.type,
            value: s.value
        }));
    }

    // 2. Initialize State on first run
    if (!state.initialized) {
        state.initialized = true;
        state.peakBankroll = bankroll;
        resetSession();
    }

    // 3. Process Previous Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        // Check if last spin hit one of our active bets
        let hitIndex = -1;
        let hitBet = null;

        for (let i = 0; i < state.activeBets.length; i++) {
            const b = state.activeBets[i];
            if (b.type === 'split') {
                if (Array.isArray(b.value) && b.value.includes(winningNum)) {
                    hitIndex = i;
                    hitBet = b;
                    break;
                }
            } else if (b.type === 'number') {
                if (b.value === winningNum) {
                    hitIndex = i;
                    hitBet = b;
                    break;
                }
            }
        }

        const isWin = hitIndex !== -1;

        if (isWin) {
            // Check for new session profit
            if (bankroll > state.peakBankroll) {
                state.peakBankroll = bankroll;
                resetSession();
            } else {
                // Not in session profit: drop the winning bet
                if (hitBet.type === 'split') {
                    // If this was the last remaining split, drop to the single unhit sister number
                    if (state.activeBets.length === 1) {
                        const sisterNum = hitBet.value[0] === winningNum ? hitBet.value[1] : hitBet.value[0];
                        state.activeBets = [{
                            id: `num_${sisterNum}`,
                            type: 'number',
                            value: sisterNum
                        }];
                    } else {
                        // Remove the split that hit
                        state.activeBets.splice(hitIndex, 1);
                    }
                } else if (hitBet.type === 'number') {
                    // Straight up hit; reset back to full set
                    resetSession();
                }
                // Bet amount stays unchanged on a win spin
            }
        } else {
            // Loss: Increase unit level by 1
            const increment = (config.incrementMode === 'base') ? minInside : (config.minIncrementalBet || minInside);
            state.unitLevel += Math.max(1, Math.floor(increment / minInside));
        }
    }

    // If all positions were dropped or emptied, re-initialise
    if (!state.activeBets || state.activeBets.length === 0) {
        resetSession();
    }

    // 4. Construct and Clamp Bets
    const betPerSpot = Math.min(Math.max(minInside * state.unitLevel, minInside), maxBet);
    const totalRequired = betPerSpot * state.activeBets.length;

    // Bankroll check
    if (bankroll < totalRequired && bankroll < minInside) {
        return [];
    }

    return state.activeBets.map(b => ({
        type: b.type,
        value: b.value,
        amount: Math.min(betPerSpot, Math.max(minInside, Math.floor(bankroll / state.activeBets.length)))
    }));
}