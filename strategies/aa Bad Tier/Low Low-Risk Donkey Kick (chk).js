/**
 * ============================================================================
 * Strategy: The Low Low-Risk Donkey Kick Roulette System
 * Source: Ninja Gamblers (YouTube: https://youtu.be/MW4R7kQ1DkE)
 * Original Concept: Jack Ace's "Low Risk Donkey Kick" (scaled down)
 * ============================================================================
 * 
 * 1. THE FULL LOGIC IN DETAIL:
 * The Donkey Kick system is a 3-level progressive cycle designed to maximize win
 * probability on initial rounds and lock in defined cycle outcomes.
 * 
 * - Level 1 (High Coverage - 81%):
 *   Place equal bets on 5 non-overlapping double streets (six-lines), covering 30 numbers.
 *   Lines used: 1-6, 7-12, 13-18, 19-24, 25-30.
 *   Win condition: If any covered number hits, move to Level 2.
 *   Loss condition: If uncovered numbers (31-36, 0) hit, cycle ends (-5 units / -$50). Reset to Level 1.
 * 
 * - Level 2 (Medium Coverage - 65%):
 *   Triggered only after a win on Level 1.
 *   Place equal bets on 2 columns (Columns 1 & 2), covering 24 numbers.
 *   Win condition: If winning number is in Column 1 or 2, move to Level 3.
 *   Loss condition: If Column 3 or 0 hits, loss of 2 units on this round.
 *   Because Level 1 already banked +1 unit, net cycle outcome is -$10 (-1 unit). Reset to Level 1.
 * 
 * - Level 3 (Break-Even / Profit Expansion - 54%):
 *   Triggered only after a win on Level 2.
 *   Distribute equal straight-up bets across 20 distinct numbers using the profits banked from Levels 1 & 2.
 *   Win condition: If any of the 20 straight-up numbers hits, cycle achieves maximum payout (+3.6 units / +$36 total cycle profit). Reset to Level 1.
 *   Loss condition: If a non-selected number hits, round loss equals the exact profit banked from L1 and L2 (+2 units), resulting in a perfect $0 Break-Even cycle. Reset to Level 1.
 * 
 * 2. THE FULL BET PROGRESSION IN DETAIL:
 * - Level 1: 5 Double Streets (Lines) @ 10x base straight unit each (Total: 50x base unit).
 * - Level 2: 2 Columns @ 10x base straight unit each (Total: 20x base unit).
 * - Level 3: 20 Straight-up numbers @ 1x base straight unit each (Total: 20x base unit).
 * 
 * Progression Transitions:
 * - Level 1 Win -> Progress to Level 2
 * - Level 2 Win -> Progress to Level 3
 * - Level 3 Win -> Full Target Reached (+36x base unit). Reset to Level 1.
 * - Any Loss (at Level 1, 2, or 3) -> Reset immediately to Level 1.
 * 
 * 3. THE GOAL:
 * - Cycle Target: Reach and win Level 3 for a full cycle profit of +$36 (or 3.6x cycle unit).
 * - Cycle Downside Protection: More than half the cycles end flat or in profit (28% Win $36, 24% Break-even $0, 28% Lose $10, 19% Lose $50).
 */
function bet(spinHistory, bankroll, config, state, utils) {
    // 1. Initialize Strategy State
    if (!state.level) {
        state.level = 1;
    }

    // 2. Check Previous Spin Outcome (if history exists)
    if (spinHistory.length > 0 && state.lastBets && state.lastBets.length > 0) {
        const lastSpin = spinHistory[spinHistory.length - 1];
        const winningNum = lastSpin.winningNumber;

        let wonLastRound = false;

        if (state.lastLevel === 1) {
            // Level 1 bets are lines 1, 7, 13, 19, 25 (covering 1 through 30)
            if (winningNum >= 1 && winningNum <= 30) {
                wonLastRound = true;
            }
        } else if (state.lastLevel === 2) {
            // Level 2 bets are Column 1 and Column 2 (all numbers > 0 where num % 3 is 1 or 2)
            if (winningNum > 0 && (winningNum % 3 === 1 || winningNum % 3 === 2)) {
                wonLastRound = true;
            }
        } else if (state.lastLevel === 3) {
            // Level 3 bets: check if winning number was one of the 20 straight-up bets
            if (state.lastSelectedNumbers && state.lastSelectedNumbers.includes(winningNum)) {
                wonLastRound = true;
            }
        }

        // Update progression level based on outcome
        if (wonLastRound) {
            if (state.level === 1) {
                state.level = 2;
            } else if (state.level === 2) {
                state.level = 3;
            } else {
                // Completed Level 3 win -> Reset cycle
                state.level = 1;
            }
        } else {
            // Any loss resets cycle back to Level 1
            state.level = 1;
        }
    }

    // 3. Calculate Unit Sizes Respecting Limits
    const minInside = config.betLimits.min;
    const minOutside = config.betLimits.minOutside;
    const maxBet = config.betLimits.max;

    // Base straight-up unit (Inside bet)
    const straightUnit = Math.min(Math.max(minInside, 1), maxBet);

    // Multi-unit for Lines and Columns preserving the 10:1 ratio from the video ($10 line / $1 straight)
    const lineAmount = Math.min(Math.max(straightUnit * 10, minInside), maxBet);
    const columnAmount = Math.min(Math.max(straightUnit * 10, minOutside), maxBet);

    const bets = [];

    // 4. Place Bets According to Current Level
    if (state.level === 1) {
        // Level 1: 5 Double Streets (Lines covering 1-30)
        const lineStarts = [1, 7, 13, 19, 25];
        for (let i = 0; i < lineStarts.length; i++) {
            bets.push({
                type: 'line',
                value: lineStarts[i],
                amount: lineAmount
            });
        }
        state.lastLevel = 1;
        state.lastSelectedNumbers = null;
    } else if (state.level === 2) {
        // Level 2: Two Columns (Column 1 and Column 2)
        bets.push({
            type: 'column',
            value: 1,
            amount: columnAmount
        });
        bets.push({
            type: 'column',
            value: 2,
            amount: columnAmount
        });
        state.lastLevel = 2;
        state.lastSelectedNumbers = null;
    } else if (state.level === 3) {
        // Level 3: 20 Straight-up numbers
        const numbersToCover = [
            1, 2, 4, 5, 7, 8, 10, 11,
            13, 14, 16, 17, 19, 20, 22, 23,
            25, 26, 28, 29
        ];
        for (let i = 0; i < numbersToCover.length; i++) {
            bets.push({
                type: 'number',
                value: numbersToCover[i],
                amount: straightUnit
            });
        }
        state.lastLevel = 3;
        state.lastSelectedNumbers = numbersToCover;
    }

    // Save placed bets to state for tracking next turn
    state.lastBets = bets;

    return bets;
}