/**
 * ============================================================================
 * STRATEGY: F Martingale (by Derek)
 * SOURCE:
 *   - Video: "Derek says F martingale and WINS BIG!"
 *   - Channel: The Roulette Master
 *   - URL: https://youtu.be/li3dQleBwII
 * ============================================================================
 *
 * THE FULL LOGIC IN DETAIL:
 * 1. Bet Types & Trigger:
 *    - The strategy plays exclusively on the 6 outside 1:1 even-money bets:
 *      'red', 'black', 'even', 'odd', 'low' (1-18), and 'high' (19-36).
 *    - Before each spin, the strategy scans the past spin history and tracks
 *      how many spins have passed since each of the 6 outside bets hit.
 *    - The bet is placed on the "sleeper" outside bet—the one that has gone
 *      the longest without hitting.
 *
 * 2. THE FULL BET PROGRESSION:
 *    - Base Bet: 1 unit (scaled to config.betLimits.minOutside).
 *    - Step Size: +1 unit per step upon loss (1u, 2u, 3u, 4u, 5u, 6u, ...).
 *    - Reset Rules on Wins:
 *      a) Level 1 (1 unit): Win produces +1 unit net profit -> Reset to 1 unit.
 *      b) Level 2 (2 units): Win covers the 1 unit loss and yields +1 unit net
 *         profit -> Reset to 1 unit.
 *      c) Level 3 (3 units): Win recovers the 1u + 2u = 3u loss (break-even).
 *         Derek's rule specifically dictates an automatic reset to 1 unit here.
 *      d) Level 4+ (4 units and above):
 *         - On Loss: Increase bet by 1 unit.
 *         - On Win: Check whether current bankroll is in session profit
 *           (i.e. bankroll >= highWaterMark).
 *           - If IN session profit: Reset back to 1 unit.
 *           - If NOT in session profit: Repeat the same bet amount on the next
 *             spin until session profit is achieved or another loss occurs.
 *
 * 3. GOAL & STOP CONDITIONS:
 *    - Target Profit: +30 units (e.g. +$300 when unit is $10), matching the
 *      video milestone.
 *    - Stop Loss: Cease betting if bankroll is insufficient to place the bet.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;
    const unit = minOutside;

    // 1. Initialize State
    if (!state.initialized) {
        state.initialized = true;
        state.baseBet = unit;
        state.unit = unit;
        state.currentBet = unit;
        state.progressionUnits = 1;
        state.highWaterMark = bankroll;
        state.targetProfit = unit * 3000; // Target +30 units (e.g. +$300 on $10 units)
        state.lastBankroll = bankroll;
        state.lastBetAmount = 0;
        state.lastBetType = null;
    }

    // 2. Target Check
    if (bankroll >= config.startingBankroll + state.targetProfit) {
        return []; // Target reached, session complete
    }

    // 3. Evaluate Outcome of Previous Spin (if history exists)
    if (spinHistory.length > 0 && state.lastBetAmount > 0) {
        const won = bankroll > state.lastBankroll;

        if (won) {
            // Update peak bankroll
            if (bankroll > state.highWaterMark) {
                state.highWaterMark = bankroll;
            }

            // Levels 1, 2, 3 (10, 20, 30) automatically reset on win
            if (state.progressionUnits <= 3) {
                state.progressionUnits = 1;
                state.currentBet = state.unit;
            } else {
                // Level 4+ (40, 50, 60...)
                if (bankroll >= state.highWaterMark) {
                    // Back in session profit -> Reset to base
                    state.progressionUnits = 1;
                    state.currentBet = state.unit;
                } else {
                    // Not in session profit -> Repeat the winning bet amount
                    // progressionUnits remains unchanged, currentBet remains unchanged
                }
            }
        } else {
            // Lost previous bet -> Increment progression by 1 unit
            state.progressionUnits += 1;
            state.currentBet = state.progressionUnits * state.unit;
        }
    }

    // 4. Clamp Bet to Table Limits & Bankroll
    let finalAmount = Math.max(state.currentBet, minOutside);
    finalAmount = Math.min(finalAmount, maxBet);

    if (bankroll < finalAmount) {
        finalAmount = bankroll;
    }

    if (finalAmount < minOutside) {
        return []; // Insufficient funds to meet table minimum
    }

    // 5. Select the "Sleeper" Outside Bet (longest since last hit)
    const outsideBets = ['red', 'black', 'even', 'odd', 'low', 'high'];
    const sleeperCounts = {
        red: 0,
        black: 0,
        even: 0,
        odd: 0,
        low: 0,
        high: 0
    };

    // Calculate how many spins ago each outside bet occurred
    for (const betType of outsideBets) {
        let count = 0;
        let found = false;

        for (let i = spinHistory.length - 1; i >= 0; i--) {
            const num = spinHistory[i].winningNumber;
            const color = spinHistory[i].winningColor;

            // Green / 0 matches none of the 1:1 outside bets
            if (num === 0 || color === 'green') {
                count++;
                continue;
            }

            let hit = false;
            if (betType === 'red' && color === 'red') hit = true;
            else if (betType === 'black' && color === 'black') hit = true;
            else if (betType === 'even' && num % 2 === 0) hit = true;
            else if (betType === 'odd' && num % 2 !== 0) hit = true;
            else if (betType === 'low' && num >= 1 && num <= 18) hit = true;
            else if (betType === 'high' && num >= 19 && num <= 36) hit = true;

            if (hit) {
                found = true;
                break;
            } else {
                count++;
            }
        }

        sleeperCounts[betType] = found ? count : spinHistory.length;
    }

    // Pick the outside bet with the largest sleeper count
    let chosenBet = outsideBets[0];
    let maxSleeper = -1;

    for (const betType of outsideBets) {
        if (sleeperCounts[betType] > maxSleeper) {
            maxSleeper = sleeperCounts[betType];
            chosenBet = betType;
        }
    }

    // 6. Record State for Next Spin
    state.lastBankroll = bankroll;
    state.lastBetAmount = finalAmount;
    state.lastBetType = chosenBet;

    return [{ type: chosenBet, amount: finalAmount }];
}