/**
 * ROULETTE STRATEGY: Dan's Magic Hit and Run Strategy (also known as Tim's / Dan's Magic Strategy)
 * 
 * Source:
 * - Channel: The Roulette Master
 * - Video URL: https://youtu.be/y2nTGvGVkrU
 * 
 * Full Logic in Details:
 * 1. Trigger Condition:
 *    - The strategy monitors the history of winning spins to identify any "sleeping" Dozen 
 *      (1st 12, 2nd 12, 3rd 12) or Column (1st Col, 2nd Col, 3rd Col) that has NOT hit in the last 9 consecutive spins.
 *    - Zero (0) and Double Zero (00) count as missed spins for all dozens and columns.
 *    - If a dozen or column meets the 9-spin sleeping criteria, a bet sequence is triggered.
 * 
 * 2. Full Bet Progression in Details ($600 Total Bankroll Session / 3-Step Progression):
 *    - Step 1 (Initial Bet):
 *      * Place $100 (20 outside units @ $5 min) on the Sleeping Group (Dozen or Column missing for 9+ spins).
 *      * Place $100 (20 outside units) on the Last-Hit Group (the Dozen or Column that won on the most recent spin).
 *      * Total bet: $200.
 *      * Win: Returns $300 (Net Profit +$100). Hit-and-Run success! Reset progression and target next trigger.
 *      * Loss: Proceed to Step 2.
 * 
 *    - Step 2 (After 1 Loss - $150 total bet):
 *      * Drop the last-hit group. Focus solely on the Sleeping Group.
 *      * Place $100 (20 outside units) on the Sleeping Group (now missed for 10 spins).
 *      * Place two $25 inside Corner "Jackpot" bets inside that sleeping group (e.g., corners 14 and 20 for 2nd Dozen).
 *      * Total bet: $150.
 *      * Win on Group: Recovers $300 (recovers $150 of accumulated loss). Reset to start.
 *      * Win on Corner: High payout jackpot recovery! Reset to start.
 *      * Loss: Proceed to Step 3.
 * 
 *    - Step 3 (After 2 Losses - $250 total bet):
 *      * Place $200 (40 outside units) on the Sleeping Group.
 *      * Place two $25 inside Corner "Jackpot" bets inside that sleeping group.
 *      * Total bet: $250.
 *      * Win: Recovers $600 (completely wipes out total accumulated losses of $200 + $150 + $250 = $600). Reset to start.
 *      * Loss: Max progression step reached ($600 total session bankroll lost). Reset state to search for new trigger.
 * 
 * 3. Goal & Stop-Loss:
 *    - Target Profit: +$100 net profit per successful hit-and-run round.
 *    - Stop-Loss: Maximum loss of $600 per session progression sequence.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (!state.step) state.step = 0;
    if (!state.activeGroup) state.stateGroup = null; // { category: 'dozen'|'column', value: 1|2|3 }
    if (!state.lastHitGroup) state.lastHitGroup = null;

    // Helper functions for Dozen / Column evaluation
    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return 0; // 0 or 00
    }

    function getColumn(num) {
        if (num >= 1 && num <= 36) {
            const rem = num % 3;
            if (rem === 1) return 1;
            if (rem === 2) return 2;
            if (rem === 0) return 3;
        }
        return 0; // 0 or 00
    }

    // Standard corner values associated with each dozen (for jackpot bets)
    const dozenCorners = {
        1: [1, 7],   // Corner 1 covers 1,2,4,5; Corner 7 covers 7,8,10,11
        2: [14, 20], // Corner 14 covers 14,15,17,18; Corner 20 covers 20,21,23,24
        3: [25, 31]  // Corner 25 covers 25,26,28,29; Corner 31 covers 31,32,34,35
    };

    // Evaluate result of previous spin if active in progression
    if (spinHistory.length > 0 && state.step > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        let won = false;
        if (state.activeGroup) {
            const hitGroup = state.activeGroup.category === 'dozen' ? getDozen(lastNum) : getColumn(lastNum);
            if (hitGroup === state.activeGroup.value) {
                won = true;
            }
        }

        if (state.step === 1 && state.lastHitGroup) {
            const hitLastGroup = state.lastHitGroup.category === 'dozen' ? getDozen(lastNum) : getColumn(lastNum);
            if (hitLastGroup === state.lastHitGroup.value) {
                won = true;
            }
        }

        if (won) {
            // Reset state on win (Hit & Run achieved)
            state.step = 0;
            state.activeGroup = null;
            state.lastHitGroup = null;
        } else {
            // Advance to next progression step on loss
            state.step += 1;
            if (state.step > 3) {
                // Max step lost ($600 total session bankroll lost)
                state.step = 0;
                state.activeGroup = null;
                state.lastHitGroup = null;
            }
        }
    }

    // 2. Scan History for 9-Spin Sleeping Trigger (if not currently in active progression)
    if (state.step === 0 && spinHistory.length >= 9) {
        const recent9 = spinHistory.slice(-9);

        // Check Dozens
        for (let d = 1; d <= 3; d++) {
            const hit = recent9.some(s => getDozen(s.winningNumber) === d);
            if (!hit) {
                const lastSpinNum = spinHistory[spinHistory.length - 1].winningNumber;
                const lastDozen = getDozen(lastSpinNum);
                state.activeGroup = { category: 'dozen', value: d };
                state.lastHitGroup = lastDozen > 0 ? { category: 'dozen', value: lastDozen } : null;
                state.step = 1;
                break;
            }
        }

        // If no sleeping dozen found, check Columns
        if (state.step === 0) {
            for (let c = 1; c <= 3; c++) {
                const hit = recent9.some(s => getColumn(s.winningNumber) === c);
                if (!hit) {
                    const lastSpinNum = spinHistory[spinHistory.length - 1].winningNumber;
                    const lastCol = getColumn(lastSpinNum);
                    state.activeGroup = { category: 'column', value: c };
                    state.lastHitGroup = lastCol > 0 ? { category: 'column', value: lastCol } : null;
                    state.step = 1;
                    break;
                }
            }
        }
    }

    // 3. Construct Bets based on Progression Step
    if (state.step === 0 || !state.activeGroup) {
        return []; // No trigger, skip spin
    }

    const minOutside = config.betLimits.minOutside || 5;
    const minInside = config.betLimits.min || 2;
    const maxBet = config.betLimits.max || 500;

    // Unit multipliers corresponding to base $100 / $25 relative to $5 minimum
    const unitRatio = Math.max(1, minOutside / 5);
    const bets = [];

    const clampOutside = (amt) => Math.min(Math.max(amt, minOutside), maxBet);
    const clampInside = (amt) => Math.min(Math.max(amt, minInside), maxBet);

    if (state.step === 1) {
        // Step 1: $100 on Sleeping Group + $100 on Last-Hit Group
        const amountSleeping = clampOutside(100 * unitRatio);
        bets.push({ type: state.activeGroup.category, value: state.activeGroup.value, amount: amountSleeping });

        if (state.lastHitGroup && state.lastHitGroup.value !== state.activeGroup.value) {
            const amountLast = clampOutside(100 * unitRatio);
            bets.push({ type: state.lastHitGroup.category, value: state.lastHitGroup.value, amount: amountLast });
        }
    } else if (state.step === 2) {
        // Step 2: $100 on Sleeping Group + Two $25 Corner Jackpot Bets
        const amountSleeping = clampOutside(100 * unitRatio);
        bets.push({ type: state.activeGroup.category, value: state.activeGroup.value, amount: amountSleeping });

        const cornerAmt = clampInside(25 * unitRatio);
        const targetDozen = state.activeGroup.category === 'dozen' ? state.activeGroup.value : 2;
        const corners = dozenCorners[targetDozen];

        bets.push({ type: 'corner', value: corners[0], amount: cornerAmt });
        bets.push({ type: 'corner', value: corners[1], amount: cornerAmt });
    } else if (state.step === 3) {
        // Step 3: $200 on Sleeping Group + Two $25 Corner Jackpot Bets
        const amountSleeping = clampOutside(200 * unitRatio);
        bets.push({ type: state.activeGroup.category, value: state.activeGroup.value, amount: amountSleeping });

        const cornerAmt = clampInside(25 * unitRatio);
        const targetDozen = state.activeGroup.category === 'dozen' ? state.activeGroup.value : 2;
        const corners = dozenCorners[targetDozen];

        bets.push({ type: 'corner', value: corners[0], amount: cornerAmt });
        bets.push({ type: 'corner', value: corners[1], amount: cornerAmt });
    }

    return bets;
}