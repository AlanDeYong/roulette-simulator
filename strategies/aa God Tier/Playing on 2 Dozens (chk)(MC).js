/**
 * @fileoverview Roulette Strategy: Playing on 2 Dozens
 * @source https://www.youtube.com/watch?v=cbGzL8Fj8D0 (The Roulette Channel)
 * * THE FULL LOGIC:
 * - This strategy dynamically covers 2 out of the 3 available dozens on the table.
 * - The selection of the dozens is dynamic: the strategy always places bets on the 
 * two most recent unique dozens that have appeared in the spin history. 
 * - If a 0 or 00 hits, it counts as a loss, and the targeted dozens remain unchanged 
 * until a new valid dozen hits.
 * * THE FULL BET PROGRESSION:
 * - Base Level: Starts by placing a base bet unit on each of the two selected dozens.
 * - After a Loss: The bet size per dozen is doubled (e.g., 1x -> 2x -> 4x -> 8x...).
 * - Recovery Rule: While in a doubled progression state, the strategy requires 
 * TWO CONSECUTIVE WINS at the current bet level to successfully clear the loss 
 * sequence and reset back to the initial base bet level. 
 * - If a loss occurs before achieving two consecutive wins, the progression doubles again.
 * * THE GOAL:
 * - To achieve a net profit target of 20 times the base unit size (equivalent to the 
 * +100 units profit target on a 5-unit base bet seen in the source material). 
 * Once the goal is met, the strategy stops wagering.
 */

function bet(spinHistory, bankroll, config, state, utils) {
    // Helper function to map winning number to its respective dozen
    function getDozen(num) {
        if (num >= 1 && num <= 12) return 1;
        if (num >= 13 && num <= 24) return 2;
        if (num >= 25 && num <= 36) return 3;
        return null; // 0 or 00
    }

    // 1. Initialize State tracking variables
    if (!state.initialBankroll) {
        state.initialBankroll = bankroll;
        state.baseBet = config.betLimits.minOutside;
        state.currentMultiplier = 1;
        state.consecutiveWins = 0;
        state.lastBetDozens = null;
    }

    // 2. Check Target Profit Goal
    const profitTarget = state.baseBet * 20000; // 20 units of base bet profit
    if (bankroll >= state.initialBankroll + profitTarget) {
        return []; // Target reached, stop betting
    }

    // 3. Evaluate previous spin outcome to update progression state
    if (spinHistory.length > 0 && state.lastBetDozens) {
        const lastResult = spinHistory[spinHistory.length - 1];
        const lastWinningDozen = getDozen(lastResult.winningNumber);
        
        const isWin = lastWinningDozen && state.lastBetDozens.includes(lastWinningDozen);

        if (isWin) {
            if (state.currentMultiplier > 1) {
                state.consecutiveWins++;
                // If two consecutive wins are achieved during progression, reset
                if (state.consecutiveWins === 2) {
                    state.currentMultiplier = 1;
                    state.consecutiveWins = 0;
                }
            } else {
                // Win at base level keeps state flat
                state.consecutiveWins = 0;
            }
        } else {
            // Loss condition triggers doubling progression
            state.currentMultiplier *= 2;
            state.consecutiveWins = 0;
        }
    }

    // 4. Track and select the two most recent unique dozens from history
    const recentDozens = [];
    for (let i = spinHistory.length - 1; i >= 0; i--) {
        const doz = getDozen(spinHistory[i].winningNumber);
        if (doz && !recentDozens.includes(doz)) {
            recentDozens.push(doz);
            if (recentDozens.length === 2) break;
        }
    }

    // Fallbacks if history does not contain 2 unique dozens yet
    if (recentDozens.length < 2 && !recentDozens.includes(1)) recentDozens.push(1);
    if (recentDozens.length < 2 && !recentDozens.includes(2)) recentDozens.push(2);
    if (recentDozens.length < 2 && !recentDozens.includes(3)) recentDozens.push(3);

    // 5. Calculate and clamp the bet amount
    let betAmount = state.baseBet * state.currentMultiplier;
    betAmount = Math.max(betAmount, config.betLimits.minOutside);
    betAmount = Math.min(betAmount, config.betLimits.max);

    // 6. Save current tracking array to state for win/loss comparison next spin
    state.lastBetDozens = [recentDozens[0], recentDozens[1]];

    // 7. Construct and return the bet payload
    return [
        { type: 'dozen', value: recentDozens[0], amount: betAmount },
        { type: 'dozen', value: recentDozens[1], amount: betAmount }
    ];
}