/**
 * ============================================================================
 * ROULETTE STRATEGY: EDGING TO GLORY
 * ============================================================================
 * 
 * Source:
 * - Video URL: https://youtu.be/MmHOv1Fpcvw
 * - Channel: CEG Dealer School
 * 
 * The Full Logic in Details:
 * --------------------------
 * "Edging to Glory" (created by Short Money Dave) is a 3-step compounding / 
 * positive progression strategy designed for Electronic Table Games (ETG) or 
 * low-bankroll roulette play.
 * 
 * - Step 1: Bet 5 non-touching Corner bets using 1 base unit each (5 units total).
 *   - On Loss: Rebet Step 1 (stay at Step 1).
 *   - On Win: A winning corner pays 8:1 (returns 9 units total). Take the 9 units 
 *     and advance to Step 2.
 * 
 * - Step 2: Bet 9 units on a single Dozen or Column of choice.
 *   - On Loss: Reset back to Step 1.
 *   - On Win: A Dozen/Column pays 2:1 (returns 27 units total). Take the 27 units 
 *     and advance to Step 3.
 * 
 * - Step 3: Bet 27 units split equally across 9 Straight-Up numbers (3 units each).
 *   - On Loss: Reset back to Step 1.
 *   - On Win: A Straight-Up hit pays 35:1 (returns 108 units total). 
 *     Cycle complete! Reset back to Step 1.
 * 
 * The Goal:
 * ---------
 * Complete the 3-step cycle to turn a 5-unit risk into a 108-unit payout, or double
 * the starting bankroll.
 * ============================================================================
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.step === undefined) {
        state.step = 1;
        state.initialBankroll = bankroll;
    }

    // Determine result of previous spin if history exists
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        if (state.step === 1) {
            // Check if last spin hit any of our 5 corners
            // Corners: 1 (1,2,4,5), 7 (7,8,10,11), 13 (13,14,16,17), 19 (19,20,22,23), 25 (25,26,28,29)
            const winningCorners = [
                [1, 2, 4, 5],
                [7, 8, 10, 11],
                [13, 14, 16, 17],
                [19, 20, 22, 23],
                [25, 26, 28, 29]
            ];
            const hit = winningCorners.some(corner => corner.includes(lastNum));
            if (hit) {
                state.step = 2; // Advance to Step 2 on win
            } else {
                state.step = 1; // Stay at Step 1 on loss
            }
        } else if (state.step === 2) {
            // Step 2 bet was on 2nd Dozen (13-24)
            if (lastNum >= 13 && lastNum <= 24) {
                state.step = 3; // Advance to Step 3 on win
            } else {
                state.step = 1; // Reset to Step 1 on loss
            }
        } else if (state.step === 3) {
            // Step 3 bet was on 9 straight-up numbers: 1, 4, 7, 10, 13, 16, 19, 22, 25
            const straightNumbers = [1, 4, 7, 10, 13, 16, 19, 22, 25];
            const hit = straightNumbers.includes(lastNum);
            // Win or loss, completion of Step 3 resets cycle to Step 1
            state.step = 1;
        }
    }

    // 2. Determine Base Units & Bet Limits
    const minInside = config.betLimits.min || 1;
    const minOutside = config.betLimits.minOutside || 5;
    const maxBet = config.betLimits.max || 500;

    // Unit calculation based on limits (1 unit = $1 or minInside limit)
    const unit = Math.max(1, minInside);

    const bets = [];

    // 3. Construct Bets Based on Current Step
    if (state.step === 1) {
        // Step 1: 5 Non-touching Corner Bets (1 unit each = 5 units total)
        const cornerPositions = [1, 7, 13, 19, 25];
        const cornerBetAmount = Math.min(Math.max(unit, minInside), maxBet);

        cornerPositions.forEach(pos => {
            bets.push({
                type: 'corner',
                value: pos,
                amount: cornerBetAmount
            });
        });

    } else if (state.step === 2) {
        // Step 2: 9 units on Dozen 2 (13-24)
        let dozenBetAmount = 9 * unit;
        dozenBetAmount = Math.max(dozenBetAmount, minOutside);
        dozenBetAmount = Math.min(dozenBetAmount, maxBet);

        bets.push({
            type: 'dozen',
            value: 2,
            amount: dozenBetAmount
        });

    } else if (state.step === 3) {
        // Step 3: 27 units split across 9 Straight-Up numbers (3 units each)
        const targetNumbers = [1, 4, 7, 10, 13, 16, 19, 22, 25];
        let straightAmount = 3 * unit;
        straightAmount = Math.max(straightAmount, minInside);
        straightAmount = Math.min(straightAmount, maxBet);

        targetNumbers.forEach(num => {
            bets.push({
                type: 'number',
                value: num,
                amount: straightAmount
            });
        });
    }

    return bets;
}