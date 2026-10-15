/**
 * Roulette Strategy: Double Dozens with Incremental Inside Bets
 * * Source: 
 * - Video: https://youtu.be/zf5Obe6bU6Q
 * - Channel: CEG Dealer School
 * * The Full Logic in details:
 * - This strategy strictly bets on 2 out of the 3 dozens on every spin.
 * - It utilizes an internal 3-step tier progression structure based on consecutive wins.
 * - Level 1 (Base): Bets 8 units each on 2 random dozens.
 * - Level 2 (First Win): Re-bets the same 8 units each on 2 random dozens, and adds 2 units each on 2 random double streets (six-lines) within those selected dozens.
 * - Level 3 (Second consecutive Win): Re-bets the same 2 dozens (8 units each) and 2 double streets (2 units each), and adds 1 unit each to 4 non-overlapping corners (2 corners inside each of the selected dozens).
 * - Condition Triggers:
 * - Any Loss: Immediately resets the progression to Level 1.
 * - Any Win: Advances to the next level (caps at Level 3, where it repeats Level 3 bets until a loss occurs).
 * * The Full Bet Progression in details:
 * - Level 1: 2 Dozens x 8 units = 16 units total.
 * - Level 2: 2 Dozens x 8 units + 2 Double Streets x 2 units = 20 units total.
 * - Level 3: 2 Dozens x 8 units + 2 Double Streets x 2 units + 4 Corners x 1 unit = 24 units total.
 * - On loss: Reset to Level 1.
 * * The Goal:
 * - Target profit: Designed for fast hits or short-session wins (~150-300 units depending on initial bankroll).
 * - Stop-loss: Governed by the user's total bankroll exhaustion or minimum unit thresholds.
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize State
    if (state.step === undefined) {
        state.step = 1;
        state.selectedDozens = [];
        state.selectedLines = [];
        state.selectedCorners = [];
    }

    // 2. Access History & Evaluate Previous Outcome to Transition Progression Step
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        let wonPrevious = false;

        if (state.selectedDozens.length > 0 && lastNum > 0) {
            // Determine which dozen won
            let winningDozen = 0;
            if (lastNum >= 1 && lastNum <= 12) winningDozen = 1;
            else if (lastNum >= 13 && lastNum <= 24) winningDozen = 2;
            else if (lastNum >= 25 && lastNum <= 36) winningDozen = 3;

            // If the winning dozen matches either of our bet dozens, the step won
            if (state.selectedDozens.includes(winningDozen)) {
                wonPrevious = true;
            }
        }

        // Apply Step Progression Transitions
        if (wonPrevious) {
            if (state.step < 3) {
                state.step++;
            }
        } else {
            state.step = 1; // Reset on loss or on a zero (0)
        }
    }

    // 3. Select Random Locations Based on Current Progression Level
    if (state.step === 1) {
        // Pick 2 random dozens safely
        const dozensPool = [1, 2, 3];
        dozensPool.sort(() => Math.random() - 0.5);
        state.selectedDozens = [dozensPool[0], dozensPool[1]].sort();

        // Table layouts references for sub-selections inside the dozens
        const dozenLayoutMap = {
            1: { lines: [1, 7], corners: [1, 4, 7, 10] },
            2: { lines: [13, 19], corners: [13, 16, 19, 22] },
            3: { lines: [25, 31], corners: [25, 28, 31, 34] }
        };

        // Pick 1 random double street (line) inside each selected dozen
        state.selectedLines = state.selectedDozens.map(doz => {
            const availableLines = dozenLayoutMap[doz].lines;
            return availableLines[Math.floor(Math.random() * availableLines.length)];
        });

        // Pick 2 random non-overlapping corners inside each selected dozen
        state.selectedCorners = [];
        state.selectedDozens.forEach(doz => {
            const availableCorners = [...dozenLayoutMap[doz].corners];
            availableCorners.sort(() => Math.random() - 0.5);
            state.selectedCorners.push(availableCorners[0], availableCorners[1]);
        });
    }

    // 4. Calculate Bet Amounts and Clamp to Config Limits
    const outsideBase = config.betLimits.minOutside;
    const insideBase = config.betLimits.min;

    const dozenAmount = Math.min(Math.max(outsideBase * 8, config.betLimits.minOutside), config.betLimits.max);
    const lineAmount = Math.min(Math.max(insideBase * 2, config.betLimits.min), config.betLimits.max);
    const cornerAmount = Math.min(Math.max(insideBase * 1, config.betLimits.min), config.betLimits.max);

    // 5. Construct Output Array Match For Current Step Structure
    let bets = [];

    // Step 1, 2, and 3 always place the Dozen Bets
    bets.push({ type: 'dozen', value: state.selectedDozens[0], amount: dozenAmount });
    bets.push({ type: 'dozen', value: state.selectedDozens[1], amount: dozenAmount });

    // Step 2 and 3 append the Double Street Bets
    if (state.step >= 2) {
        bets.push({ type: 'line', value: state.selectedLines[0], amount: lineAmount });
        bets.push({ type: 'line', value: state.selectedLines[1], amount: lineAmount });
    }

    // Step 3 appends the Corner Bets
    if (state.step === 3) {
        bets.push({ type: 'corner', value: state.selectedCorners[0], amount: cornerAmount });
        bets.push({ type: 'corner', value: state.selectedCorners[1], amount: cornerAmount });
        bets.push({ type: 'corner', value: state.selectedCorners[2], amount: cornerAmount });
        bets.push({ type: 'corner', value: state.selectedCorners[3], amount: cornerAmount });
    }

    // 6. Bankroll Limit Protection Safeguard
    const totalRequiredBet = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalRequiredBet > bankroll) {
        return []; 
    }

    return bets;
}