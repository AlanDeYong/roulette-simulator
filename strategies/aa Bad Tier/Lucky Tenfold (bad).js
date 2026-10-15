/**
 * Strategy Name: Modified Lucky Tenfold / Multi-Dozen Corner Progression
 * Source: https://youtu.be/6P7qrzGiXA0 (Channel: WillVegas) - Custom User Rules Revision
 * 
 * --- FULL LOGIC ---
 * The strategy tracks winning dozen history and progresses through 3 stages based on wins and losses:
 * 
 * 1. Step 1 (Initial Bet):
 *    - Trigger: Session start or after any reset.
 *    - Bets: Place 2 units on each of 2 dozens.
 *      - On initial start: 2 random dozens.
 *      - On reset after a loss: 2 units each on the last winning dozen and the dozen prior to it.
 *    - Outcome:
 *      - Win: Advance to Step 2. Add 2 units to the winning dozen (Winning dozen = 4 units, Other dozen = 2 units).
 *      - Loss: Reset state to Step 1.
 * 
 * 2. Step 2 (Press Step):
 *    - Bets: 4 units on Dozen A, 2 units on Dozen B.
 *    - Outcome:
 *      - If Higher-Bet Dozen Wins (4 units): Advance to Step 3.
 *      - If Lower-Bet Dozen Wins (2 units): Rebet current configuration (or adjust active high-bet dozen).
 *      - Loss: Reset state to Step 1.
 * 
 * 3. Step 3 (Dozen & 4-Corner Step):
 *    - Bets:
 *      - 4 units on the dozen that did NOT win in Step 2.
 *      - 2 units each on 2 non-overlapping corners in the OTHER 2 dozens (4 corners total, 2 units each).
 *    - Outcome:
 *      - Win: Target profit hit. Reset state to Step 1.
 *      - Loss: Reset state to Step 1.
 * 
 * --- GOAL & STOP-LOSS ---
 * - Target Profit: Successfully complete Step 3 and reset.
 * - Stop Loss: Dependent on table maximums and available bankroll limits.
 * 
 * @param {Array} spinHistory - Array of past spin objects.
 * @param {number} bankroll - Current available bankroll.
 * @param {Object} config - Simulator config (bet limits, increment rules).
 * @param {Object} state - Persistent state between spins.
 * @param {Object} utils - Helper utilities.
 * @returns {Array} Array of bet objects.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Determine Base Units respecting bet limits
    const minOutside = config.betLimits.minOutside || 5;
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;

    // Helper function to extract dozen (1, 2, 3) from winning number
    const getDozen = (num) => {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0; // 0 or 00
    };

    // Helper function to safely clamp bet sizes
    const clampBet = (amount, isOutside) => {
        const minLimit = isOutside ? minOutside : minInside;
        return Math.min(Math.max(amount, minLimit), maxBet);
    };

    // 2. Initialize Persistent State
    if (!state.initialized) {
        state.step = 1;
        state.dozenBets = {}; // Maps dozen number (1,2,3) to unit multiplier
        state.historyDozens = []; // Tracks winning dozens sequence

        // Pick 2 random dozens for initial spin
        const possibleDozens = [1, 2, 3];
        const dozenA = possibleDozens.splice(Math.floor(Math.random() * possibleDozens.length), 1)[0];
        const dozenB = possibleDozens[Math.floor(Math.random() * possibleDozens.length)];

        state.dozenBets[dozenA] = 2;
        state.dozenBets[dozenB] = 2;
        state.initialized = true;
    }

    // 3. Process Last Spin Result
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;
        const winningDozen = getDozen(lastNum);

        if (winningDozen > 0) {
            state.historyDozens.push(winningDozen);
        }

        if (state.step === 1) {
            if (state.dozenBets[winningDozen]) {
                // WIN on Step 1: Add 2 units to winning dozen -> Move to Step 2
                state.dozenBets[winningDozen] += 2;
                state.step = 2;
            } else {
                // LOSS on Step 1: Reset to Step 1 with last 2 winning dozens
                resetToStep1(state);
            }
        } else if (state.step === 2) {
            if (state.dozenBets[winningDozen]) {
                // Check if the dozen with the higher bet won
                const highestBet = Math.max(...Object.values(state.dozenBets));
                const wonHighestDozen = state.dozenBets[winningDozen] === highestBet;

                if (wonHighestDozen) {
                    // WIN on Higher Bet: Move to Step 3
                    // Determine which dozen did NOT win in Step 2 among the two bet on
                    const activeDozens = Object.keys(state.dozenBets).map(Number);
                    const nonWinningDozenInStep2 = activeDozens.find(d => d !== winningDozen);

                    state.step = 3;
                    state.step3Dozen = nonWinningDozenInStep2; // 4 units on this dozen
                    state.step3WinningDozenStep2 = winningDozen;
                } else {
                    // WIN on Lower Bet: Re-press or stay at Step 2
                    state.dozenBets[winningDozen] += 2;
                }
            } else {
                // LOSS on Step 2: Reset to Step 1
                resetToStep1(state);
            }
        } else if (state.step === 3) {
            // Check if win occurred on dozen or corner bets
            const cornerAnchors = [1, 7, 13, 19, 25, 31]; // Non-overlapping corner anchors
            const hitCorner = cornerAnchors.some(anchor => {
                const covered = [anchor, anchor + 1, anchor + 3, anchor + 4];
                return covered.includes(lastNum);
            });

            if (winningDozen === state.step3Dozen || hitCorner) {
                // WIN on Step 3: Complete cycle reset
                resetToStep1(state);
            } else {
                // LOSS on Step 3: Reset to Step 1
                resetToStep1(state);
            }
        }
    }

    // Helper to reset state to Step 1 after loss or completion
    function resetToStep1(s) {
        s.step = 1;
        s.dozenBets = {};
        s.step3Dozen = null;

        // Use last winning dozen and the dozen before it
        const historyLen = s.historyDozens.length;
        if (historyLen >= 2) {
            const lastWin = s.historyDozens[historyLen - 1];
            const prevWin = s.historyDozens[historyLen - 2];

            if (lastWin !== prevWin) {
                s.dozenBets[lastWin] = 2;
                s.dozenBets[prevWin] = 2;
            } else {
                // If the last two winning dozens were identical, pick a distinct second dozen
                s.dozenBets[lastWin] = 2;
                const altDozen = lastWin === 1 ? 2 : 1;
                s.dozenBets[altDozen] = 2;
            }
        } else {
            // Default back to 2 random dozens if history is insufficient
            s.dozenBets[1] = 2;
            s.dozenBets[2] = 2;
        }
    }

    // 4. Generate Output Bets Based on Current Step
    const bets = [];

    if (state.step === 1 || state.step === 2) {
        // Place dozen bets based on state.dozenBets map
        for (const [dz, units] of Object.entries(state.dozenBets)) {
            const betAmount = clampBet(units * minOutside, true);
            bets.push({
                type: 'dozen',
                value: parseInt(dz, 10),
                amount: betAmount
            });
        }
    } else if (state.step === 3) {
        // Step 3: 4 units on the dozen that did not win in Step 2
        bets.push({
            type: 'dozen',
            value: state.step3Dozen,
            amount: clampBet(4 * minOutside, true)
        });

        // 2 units each on 2 non-overlapping corners in each of the OTHER 2 dozens
        // Dozen 1 corners: 1, 7 | Dozen 2 corners: 13, 19 | Dozen 3 corners: 25, 31
        const dozenCornersMap = {
            1: [1, 7],
            2: [13, 19],
            3: [25, 31]
        };

        const otherDozens = [1, 2, 3].filter(d => d !== state.step3Dozen);

        otherDozens.forEach(dz => {
            const corners = dozenCornersMap[dz];
            corners.forEach(cornerAnchor => {
                bets.push({
                    type: 'corner',
                    value: cornerAnchor,
                    amount: clampBet(2 * minInside, false)
                });
            });
        });
    }

    return bets;
}