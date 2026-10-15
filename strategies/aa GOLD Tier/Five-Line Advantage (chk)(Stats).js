/**
 * ======================================================================================
 * ROULETTE STRATEGY: The Five-Line Advantage
 * ======================================================================================
 * - Source: http://www.youtube.com/watch?v=9efw2hOglNw
 * - Channel: The Roulette Master
 * - Strategy Author: Randall Pratt (Roulette Master Bracket Challenge Winner)
 *
 * FULL STRATEGY LOGIC & DETAILS:
 * --------------------------------------------------------------------------------------
 * 1. BET PLACEMENT (Coverage of 34 Numbers):
 *    The system covers 34 numbers using 5 Six-Line (Double Street) bets and 2 Split bets:
 *    - Six-Line bets (3 units each):
 *        * Line 4-9   (value: 4)
 *        * Line 10-15 (value: 10)
 *        * Line 16-21 (value: 16)
 *        * Line 22-27 (value: 22)
 *        * Line 28-33 (value: 28)
 *    - Split bets (1 unit each):
 *        * Split [2, 3]
 *        * Split [35, 36]
 *    - Uncovered numbers: 0 (and 00 in American), 1, and 34.
 *
 * 2. BET PROGRESSION (Recovery Mode):
 *    - BASE STATE:
 *        5 Lines @ 3 units each + 2 Splits @ 1 unit each = 17 units total.
 *        Any hit on a Six-Line wins 18 units - 17 = +1 unit net profit.
 *    - ON A LOSS (Uncovered number hits):
 *        Enter recovery mode. The remaining active bets are doubled (Martingale step).
 *    - DURING RECOVERY:
 *        When an active bet wins, the winning position is removed ("taken off the board")
 *        for subsequent recovery spins to lock in recovery payout and reduce total exposure.
 *    - RESET:
 *        Once cumulative session profit exceeds the prior high-water mark or hits target,
 *        reset all bets and active positions back to base level.
 *
 * 3. GOAL & STOP-LOSS:
 *    - Session Profit Target: +40 to +50 units (approx. $200–$250 profit in the video).
 *    - Stop-Loss: Stops betting if bankroll cannot cover the active layout.
 * ======================================================================================
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Establish base unit respecting inside bet minimums
    const minInside = (config && config.betLimits && config.betLimits.min) ? config.betLimits.min : 2;
    const maxLimit = (config && config.betLimits && config.betLimits.max) ? config.betLimits.max : 500;
    const baseSplitUnit = Math.max(minInside, 1);
    const baseLineUnit = baseSplitUnit * 3;

    // 2. Target profit and stop conditions
    const targetProfitUnits = 4500; // ~45-50 base units profit target
    const targetProfit = targetProfitUnits * baseSplitUnit;

    // 3. Initialize persistent state
    if (!state.initialized) {
        state.initialized = true;
        state.initialBankroll = bankroll;
        state.highWaterBankroll = bankroll;
        state.inRecovery = false;
        state.multiplier = 1;
        state.activeLines = [4, 10, 16, 22, 28];
        state.activeSplits = [[2, 3], [35, 36]];
    }

    // Update session high-water mark
    if (bankroll > state.highWaterBankroll) {
        state.highWaterBankroll = bankroll;
    }

    // Check if target profit has been achieved
    if ((bankroll - state.initialBankroll) >= targetProfit) {
        return []; // Target reached, stop betting
    }

    // Helper to reset layout to base level
    function resetToBase() {
        state.inRecovery = false;
        state.multiplier = 1;
        state.activeLines = [4, 10, 16, 22, 28];
        state.activeSplits = [[2, 3], [35, 36]];
    }

    // Helper: test if a number is inside a six-line
    function isNumInLine(num, startVal) {
        return num >= startVal && num <= startVal + 5;
    }

    // Helper: test if a number is inside a split
    function isNumInSplit(num, splitArr) {
        return splitArr.includes(num);
    }

    // 4. Process previous spin outcome
    if (spinHistory && spinHistory.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const lastNum = lastSpin.winningNumber;

        // Check if last spin was a winning or losing hit on active bets
        let hitLine = null;
        let hitSplit = null;

        for (let lineStart of state.activeLines) {
            if (isNumInLine(lastNum, lineStart)) {
                hitLine = lineStart;
                break;
            }
        }

        if (hitLine === null) {
            for (let split of state.activeSplits) {
                if (isNumInSplit(lastNum, split)) {
                    hitSplit = split;
                    break;
                }
            }
        }

        const isWin = (hitLine !== null || hitSplit !== null);

        if (!isWin) {
            // Total miss (0, 00, 1, 34 or uncovered position)
            state.inRecovery = true;
            state.multiplier *= 2;
            // Restore all positions if exhausted, or retain current remaining
            if (state.activeLines.length === 0 && state.activeSplits.length === 0) {
                state.activeLines = [4, 10, 16, 22, 28];
                state.activeSplits = [[2, 3], [35, 36]];
            }
        } else {
            // Win occurred
            if (state.inRecovery) {
                // Remove the winning bet position during recovery
                if (hitLine !== null) {
                    state.activeLines = state.activeLines.filter(line => line !== hitLine);
                } else if (hitSplit !== null) {
                    state.activeSplits = state.activeSplits.filter(s => !(s[0] === hitSplit[0] && s[1] === hitSplit[1]));
                }

                // If session reaches new profit or all recovery positions hit, reset to base
                if (bankroll >= state.highWaterBankroll || (state.activeLines.length === 0 && state.activeSplits.length === 0)) {
                    resetToBase();
                }
            } else {
                // Won in normal base play
                resetToBase();
            }
        }
    }

    // 5. Construct bet array
    const bets = [];

    // Add active line bets
    for (let lineStart of state.activeLines) {
        let lineAmount = baseLineUnit * state.multiplier;
        lineAmount = Math.max(lineAmount, minInside);
        lineAmount = Math.min(lineAmount, maxLimit);
        bets.push({
            type: 'line',
            value: lineStart,
            amount: lineAmount
        });
    }

    // Add active split bets
    for (let split of state.activeSplits) {
        let splitAmount = baseSplitUnit * state.multiplier;
        splitAmount = Math.max(splitAmount, minInside);
        splitAmount = Math.min(splitAmount, maxLimit);
        bets.push({
            type: 'split',
            value: split,
            amount: splitAmount
        });
    }

    // 6. Check total bet affordability against bankroll
    const totalWager = bets.reduce((sum, b) => sum + b.amount, 0);
    if (totalWager > bankroll || bets.length === 0) {
        return []; // Insufficient funds or no active bets
    }

    return bets;
}